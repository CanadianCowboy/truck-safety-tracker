export function renderPushControls(basePath: string): string {
  return `<div id="modal-push" class="modal-backdrop hidden">
    <div class="modal-panel">
      <div class="modal-header"><h2 class="modal-title">Background notifications</h2><button type="button" class="close-btn" data-close="modal-push" aria-label="Close notifications">&times;</button></div>
      <p>Daily reminders at <strong>7:00 AM Winnipeg time</strong> when inspections are due soon or overdue. No unit numbers, plates, or other fleet details appear on your lock screen.</p>
      <p id="push-capabilities" style="margin-top:14px;overflow-wrap:anywhere;"></p>
      <p id="push-status" role="status" aria-live="polite" style="margin:14px 0;overflow-wrap:anywhere;"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" id="push-enable" class="btn btn-primary">Enable notifications</button>
        <button type="button" id="push-test" class="btn btn-secondary">Send test notification</button>
        <button type="button" id="push-disable" class="btn btn-secondary">Disable notifications</button>
        <button type="button" id="push-delete-all" class="btn btn-danger">Delete all devices’ notification data</button>
      </div>
      <p style="margin-top:14px;">After enabling, use Send test notification, then close the tab or Chrome normally and check your Android notification tray. Force-stop, battery restrictions, blocked permissions, and offline devices may prevent delivery. “Accepted” means the push service accepted it, not that your phone displayed it.</p>
      <p style="margin-top:10px;">If Edge Android subscribes but alerts never arrive, try Chrome, Firefox, or Samsung Internet.</p>
      <a class="btn btn-secondary" style="margin-top:14px;" href="${basePath}/push-test">Open browser/device compatibility page</a>
    </div>
  </div>`;
}

export function renderPushScript(): string {
  return String.raw`
    function pushSupported() {
      return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    }
    function pushMessage(message) { document.getElementById('push-status').textContent = message; }
    function vapidToBytes(value) {
      const padded = value + '='.repeat((4 - value.length % 4) % 4);
      const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
      return Uint8Array.from(raw, char => char.charCodeAt(0));
    }
    async function getPushRegistration() {
      return await navigator.serviceWorker.getRegistration(BASE_PATH + '/');
    }
    async function currentPushSubscription() {
      if (!pushSupported()) return null;
      const registration = await getPushRegistration();
      return registration ? await registration.pushManager.getSubscription() : null;
    }
    async function pushApi(path, body) {
      const response = await apiFetch('/push/' + path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });
      return await response.json();
    }
    async function refreshPushState() {
      const supported = pushSupported();
      document.getElementById('push-capabilities').textContent = 'Secure context: ' + (window.isSecureContext ? 'yes' : 'no') +
        ' · Service worker: ' + ('serviceWorker' in navigator ? 'yes' : 'no') + ' · PushManager: ' + ('PushManager' in window ? 'yes' : 'no') +
        ' · Permission: ' + ('Notification' in window ? Notification.permission : 'unsupported') + ' · Browser: ' + navigator.userAgent;
      document.getElementById('push-enable').disabled = !supported;
      document.getElementById('push-test').disabled = true;
      document.getElementById('push-disable').disabled = true;
      if (!supported) { pushMessage('Unsupported browser or insecure connection. Open the HTTPS site in Chrome, Firefox, Samsung Internet, or Edge on Android.'); return; }
      const config = await pushApi('config');
      if (!config.configured) { pushMessage('Background notifications are not configured on the server yet.'); return; }
      const subscription = await currentPushSubscription();
      document.getElementById('push-disable').disabled = !subscription && !readPreference('truck_safety_push_cleanup', '');
      if (Notification.permission === 'denied') { pushMessage('Permission denied. Allow notifications in browser site settings before enabling. You can still delete existing notification data.'); return; }
      if (!subscription) { pushMessage('Not subscribed on this device. Enable notifications to receive background reminders.'); return; }
      const status = await pushApi('status', { endpoint: subscription.endpoint });
      document.getElementById('push-test').disabled = !status.registered;
      pushMessage(status.registered ? ('Subscribed. Reminders: 7:00 AM Winnipeg time.' + (status.lastStatus === 201 ? ' Last send accepted by the push service.' : status.lastStatus !== null ? ' Last delivery failed (HTTP ' + status.lastStatus + '). Try a test; on Edge Android consider Chrome, Firefox, or Samsung Internet.' : ' Send a test to check this device.')) : 'This device is no longer registered on the server. Enable notifications again.');
    }
    async function openPushPanel() {
      document.getElementById('modal-push').classList.remove('hidden');
      pushMessage('Checking this device…');
      try { await refreshPushState(); } catch (error) { pushMessage('Error checking notifications: ' + error.message); }
    }
    document.getElementById('btn-browser-notify').addEventListener('click', openPushPanel);
    const pushButtons = ['push-enable', 'push-test', 'push-disable', 'push-delete-all'];
    async function pushAction(action) {
      pushButtons.forEach(id => document.getElementById(id).disabled = true);
      try { await action(); }
      catch (error) { pushMessage('Error: ' + error.message); }
      finally {
        document.getElementById('push-enable').disabled = !pushSupported();
        document.getElementById('push-delete-all').disabled = false;
        const subscription = await currentPushSubscription().catch(() => null);
        document.getElementById('push-test').disabled = !subscription;
        document.getElementById('push-disable').disabled = !subscription && !readPreference('truck_safety_push_cleanup', '');
      }
    }
    document.getElementById('push-enable').addEventListener('click', () => pushAction(async () => {
      if (!pushSupported()) throw new Error('This browser does not support background Web Push.');
      // Permission is requested only in direct response to this button click.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { pushMessage(permission === 'denied' ? 'Permission denied. Change browser site settings to try again.' : 'Permission dismissed. Notifications remain off.'); return; }
      const config = await pushApi('config');
      if (!config.configured || !config.publicKey) throw new Error('Server push configuration is missing.');
      const registration = await navigator.serviceWorker.register(BASE_PATH + '/sw.js', { scope: BASE_PATH + '/' });
      if (!registration.active) await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const expected = vapidToBytes(config.publicKey);
      if (subscription) {
        const old = subscription.options.applicationServerKey;
        if (old && Array.from(new Uint8Array(old)).join(',') !== Array.from(expected).join(',')) {
          await pushApi('unsubscribe', { endpoint: subscription.endpoint });
          if (!await subscription.unsubscribe()) throw new Error('Unable to replace an old push subscription. Retry.');
          subscription = null;
        }
      }
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: expected });
      try {
        // Send the full standard PushSubscription JSON; no client-provided user ID.
        const result = await pushApi('subscribe', subscription.toJSON());
        savePreference('truck_safety_push_cleanup', '');
        pushMessage(result.message);
      } catch (error) {
        savePreference('truck_safety_push_cleanup', subscription.endpoint);
        throw error; // Keep endpoint for retry/delete if the server request was interrupted.
      }
    }));
    document.getElementById('push-test').addEventListener('click', () => pushAction(async () => {
      const subscription = await currentPushSubscription();
      if (!subscription) throw new Error('Enable notifications first.');
      pushMessage('Sending test…');
      const result = await pushApi('test', { endpoint: subscription.endpoint });
      pushMessage(result.message + ' Close the tab or Chrome normally and check the notification tray. If Edge Android shows nothing, try Chrome, Firefox, or Samsung Internet.');
    }));
    async function disableDevicePush() {
      const subscription = await currentPushSubscription();
      const endpoint = subscription ? subscription.endpoint : readPreference('truck_safety_push_cleanup', '');
      if (!endpoint) { pushMessage('Notifications are already off on this device.'); return; }
      // Retain only the endpoint until deletion succeeds, so a network failure can be retried.
      savePreference('truck_safety_push_cleanup', endpoint);
      if (subscription && !await subscription.unsubscribe()) throw new Error('Browser unsubscribe failed. Retry.');
      await pushApi('unsubscribe', { endpoint });
      savePreference('truck_safety_push_cleanup', '');
      pushMessage('Notifications disabled. This device’s subscription and delivery metadata were deleted. Browser permission can be revoked in site settings.');
    }
    document.getElementById('push-disable').addEventListener('click', () => pushAction(disableDevicePush));
    document.getElementById('push-delete-all').addEventListener('click', () => pushAction(async () => {
      if (!confirm('Delete notification subscriptions and delivery metadata for ALL fleet devices? Each device must enable again.')) return;
      await pushApi('unsubscribe', { all: true });
      const subscription = await currentPushSubscription();
      if (subscription && !await subscription.unsubscribe()) throw new Error('Server data deleted, but browser unsubscribe failed. Retry Disable notifications.');
      savePreference('truck_safety_push_cleanup', '');
      pushMessage('All devices’ subscription and delivery metadata deleted.');
    }));
  `;
}

export function renderPushWorkerScript(basePath: string): string {
  return `
const APP_PATH = ${JSON.stringify(basePath + '/')};
function safeAppUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin === self.location.origin && url.pathname.startsWith(APP_PATH)) return url.href;
  } catch {}
  return new URL(APP_PATH, self.location.origin).href;
}
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = {};
    try { const parsed = event.data ? event.data.json() : {}; if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed; } catch {}
    const text = (value, fallback, max) => typeof value === 'string' && value.trim() ? value.slice(0, max) : fallback;
    await self.registration.showNotification(text(data.title, 'Truck Safety Tracker', 80), {
      body: text(data.body, 'Open Safety Tracker to review your reminders.', 240),
      icon: safeAppUrl(data.icon || APP_PATH + 'icon-192.png'),
      badge: safeAppUrl(data.badge || APP_PATH + 'badge.png'),
      tag: text(data.tag, 'safety-reminder', 64),
      data: { url: safeAppUrl(data.url) }
    });
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = safeAppUrl(event.notification.data && event.notification.data.url);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith(APP_PATH)) {
        if (client.url !== url && 'navigate' in client) await client.navigate(url);
        await client.focus();
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
// No close telemetry: dismissal is not a reliable delivery/read receipt.
`;
}
