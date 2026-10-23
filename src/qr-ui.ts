import { UNIT_UUID_PATTERN } from './qr';

export function renderQrScript(): string {
  return String.raw`
    const uuidPattern = new RegExp(${JSON.stringify(UNIT_UUID_PATTERN)}, 'i');
    let pendingUnitId = null;
    let overviewRequest = 0;
    let cameraStream = null;
    let cameraTimer = null;
    let cameraRequest = 0;
    let readerPromise = null;

    function setPendingUnit(id) {
      pendingUnitId = id;
      const url = new URL(location.href);
      url.searchParams.set('unit', id);
      history.replaceState(null, '', url);
      document.getElementById('pending-unit-message').classList.remove('hidden');
    }

    function clearPendingUnit() {
      pendingUnitId = null;
      overviewRequest++;
      const url = new URL(location.href);
      url.searchParams.delete('unit');
      history.replaceState(null, '', url);
      document.getElementById('pending-unit-message').classList.add('hidden');
    }

    async function openPendingUnit() {
      if (!pendingUnitId) return;
      const id = pendingUnitId;
      pendingUnitId = null;
      await openUnitOverview(id);
    }

    async function openUnitOverview(id) {
      setPendingUnit(id);
      if (!document.getElementById('gate-view').classList.contains('hidden')) return;
      pendingUnitId = null;
      const generation = ++overviewRequest;
      const modal = document.getElementById('modal-unit');
      const details = document.getElementById('unit-details');
      const actions = document.getElementById('unit-actions');
      const print = document.getElementById('unit-print-label');
      document.getElementById('unit-title').textContent = 'Unit overview';
      details.textContent = 'Loading unit…';
      actions.innerHTML = '';
      print.classList.add('hidden');
      print.removeAttribute('href');
      modal.classList.remove('hidden');
      try {
        const response = await apiFetch('/trucks/' + encodeURIComponent(id));
        const { truck: t } = await response.json();
        if (generation !== overviewRequest || !document.getElementById('gate-view').classList.contains('hidden')) return;
        // Keep quick actions independent of the current dashboard filters.
        const existing = fleetData.findIndex(unit => unit.id === t.id);
        if (existing >= 0) {
          const previous = fleetData[existing];
          fleetData[existing] = { ...t, attachment_count: previous.attachment_count, latest_attachment: previous.latest_attachment };
        } else fleetData.push(t);
        document.getElementById('unit-title').textContent = 'Unit #' + t.unit_number;
        const fields = [
          ['Vehicle type', t.vehicle_type], ['Equipment / body type', t.equipment_type], ['Operational status', t.status],
          ['Safety status', formatDaysBadge(t)], ['Next safety due', t.next_due_date || 'No date set'],
          ['Last inspection', t.last_inspection_date || 'No date set'], ['Inspection interval', t.interval_months + ' months'],
          ['Vehicle', [t.year, t.make, t.model].filter(Boolean).join(' ')],
          ['Plate', t.license_plate], ['VIN', t.vin], ['GVWR', t.gvwr],
          ['Shop / mechanic', t.shop_name], ['Sticker / certificate', t.sticker_number],
          ['Notes', t.notes], ['Permanent unit UUID', t.id],
        ];
        details.innerHTML = (t.status === 'Inactive' ? '<p role="status" class="truck-notes">This unit is inactive.</p>' : '') +
          '<div class="meta-grid">' + fields.map(([label, value]) => '<div class="meta-item"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || '—') + '</strong></div>').join('') + '</div>';
        actions.innerHTML = '<button type="button" class="btn btn-success" data-inspect="' + escapeHtml(t.id) + '">Log Safety</button>' +
          '<button type="button" class="btn btn-secondary" data-history="' + escapeHtml(t.id) + '">History / certificates</button>' +
          '<button type="button" class="btn btn-secondary" data-edit="' + escapeHtml(t.id) + '">Edit unit</button>';
        print.href = API_BASE + '/trucks/' + encodeURIComponent(t.id) + '/label';
        print.classList.remove('hidden');
      } catch (err) {
        if (err.message === 'Unauthorized') { setPendingUnit(id); return; }
        if (generation !== overviewRequest || !document.getElementById('gate-view').classList.contains('hidden')) return;
        details.textContent = err.message === 'Truck not found'
          ? 'Unit not found or deleted. This UUID is not linked to a unit in Safety Tracker. No record was created.'
          : 'Unable to open unit: ' + err.message;
      }
    }

    function openUnitScanner() {
      stopUnitCamera();
      document.getElementById('scan-status').textContent = 'Camera is optional. You can always paste a UUID instead.';
      document.getElementById('scan-uuid').value = '';
      document.getElementById('modal-scan').classList.remove('hidden');
      document.getElementById('scan-uuid').focus();
    }

    async function selectUnitUuid(value) {
      const id = value.trim().toLowerCase();
      if (!uuidPattern.test(id)) {
        document.getElementById('scan-status').textContent = 'Not a valid unit UUID. Use the UUID-only label, not a website address.';
        return;
      }
      stopUnitCamera();
      document.getElementById('modal-scan').classList.add('hidden');
      setPendingUnit(id);
      await openPendingUnit();
    }

    function stopUnitCamera() {
      cameraRequest++;
      if (cameraTimer !== null) clearTimeout(cameraTimer);
      cameraTimer = null;
      if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
      const video = document.getElementById('qr-camera');
      video.pause();
      video.srcObject = null;
      video.classList.add('hidden');
      document.getElementById('btn-start-camera').disabled = false;
      document.getElementById('btn-stop-camera').classList.add('hidden');
    }

    function loadQrReader() {
      if (window.jsQR) return Promise.resolve();
      if (!readerPromise) readerPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = BASE_PATH + '/qr-reader.js';
        script.onload = () => {
          if (typeof window.jsQR === 'function') resolve();
          else { readerPromise = null; script.remove(); reject(new Error('QR reader unavailable')); }
        };
        script.onerror = () => { readerPromise = null; script.remove(); reject(new Error('QR reader failed to load')); };
        document.head.appendChild(script);
      });
      return readerPromise;
    }

    async function startUnitCamera() {
      stopUnitCamera();
      const request = cameraRequest;
      const status = document.getElementById('scan-status');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = 'Camera unavailable in this browser. Open the HTTPS app, or paste the UUID.';
        return;
      }
      document.getElementById('btn-start-camera').disabled = true;
      document.getElementById('btn-stop-camera').classList.remove('hidden');
      status.textContent = 'Requesting camera access…';
      try {
        await loadQrReader();
        if (request !== cameraRequest) return;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } }, audio: false });
        if (request !== cameraRequest) { stream.getTracks().forEach(track => track.stop()); return; }
        cameraStream = stream;
        const video = document.getElementById('qr-camera');
        video.srcObject = stream;
        video.classList.remove('hidden');
        await video.play();
        if (request !== cameraRequest) return;
        status.textContent = 'Point the camera at the UUID QR label.';
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Camera frame reader unavailable');
        const readFrame = () => {
          if (request !== cameraRequest) return;
          try {
            if (video.readyState >= 2 && video.videoWidth > 0) {
              canvas.width = Math.min(video.videoWidth, 640);
              canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const image = context.getImageData(0, 0, canvas.width, canvas.height);
              const code = window.jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
              if (code && uuidPattern.test(code.data.trim())) {
                selectUnitUuid(code.data).catch(err => showToast(err.message, true));
                return;
              }
              if (code) status.textContent = 'This QR is not a unit UUID. Try a unit label, or paste its UUID.';
            }
            cameraTimer = setTimeout(readFrame, 250);
          } catch (err) {
            stopUnitCamera();
            status.textContent = 'Camera scan failed. You can still paste the UUID.';
          }
        };
        readFrame();
      } catch (err) {
        if (request !== cameraRequest) return;
        stopUnitCamera();
        status.textContent = 'Camera unavailable or permission denied. You can still paste the UUID.';
      }
    }

    document.getElementById('btn-scan-unit').addEventListener('click', openUnitScanner);
    document.getElementById('gate-scan-unit').addEventListener('click', openUnitScanner);
    document.getElementById('btn-start-camera').addEventListener('click', startUnitCamera);
    document.getElementById('btn-stop-camera').addEventListener('click', () => {
      stopUnitCamera();
      document.getElementById('scan-status').textContent = 'Camera stopped. Paste a UUID or start the camera again.';
    });
    document.getElementById('form-unit-lookup').addEventListener('submit', event => {
      event.preventDefault();
      selectUnitUuid(document.getElementById('scan-uuid').value).catch(err => showToast(err.message, true));
    });
    window.addEventListener('pagehide', stopUnitCamera);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') stopUnitCamera();
    });
    const requestedUnit = new URL(location.href).searchParams.get('unit');
    if (requestedUnit && uuidPattern.test(requestedUnit)) setPendingUnit(requestedUnit.toLowerCase());
  `;
}
