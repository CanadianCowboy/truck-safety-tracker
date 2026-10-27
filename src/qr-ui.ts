import { UNIT_UUID_PATTERN } from './qr';

export function renderQrScript(): string {
  return String.raw`
    const uuidPattern = new RegExp(${JSON.stringify(UNIT_UUID_PATTERN)}, 'i');
    let pendingUnitId = null;
    let overviewRequest = 0;
    let selectedUnitId = null;
    let cameraStream = null;
    let cameraTimer = null;
    let cameraRequest = 0;
    let readerPromise = null;

    function setPendingUnit(id, pushHistory = false) {
      pendingUnitId = id;
      const url = new URL(location.href);
      const currentUnit = url.searchParams.get('unit');
      url.searchParams.set('unit', id);
      if (pushHistory && currentUnit !== id) {
        history.pushState({ unit: id }, '', url);
      } else {
        history.replaceState({ unit: id }, '', url);
      }
      document.getElementById('pending-unit-message').classList.remove('hidden');
    }

    function clearPendingUnit(fromPopState = false) {
      pendingUnitId = null;
      selectedUnitId = null;
      activeHistoryTruckId = null;
      overviewRequest++;
      if (!fromPopState) {
        const url = new URL(location.href);
        url.searchParams.delete('unit');
        history.replaceState(null, '', url);
      }
      document.getElementById('pending-unit-message').classList.add('hidden');
      const panel = document.getElementById('modal-unit');
      panel.classList.add('hidden');
      panel.removeAttribute('data-has-selection');
      const emptyBox = document.getElementById('detail-empty-state');
      const contentBox = document.getElementById('detail-selected-content');
      if (emptyBox) emptyBox.classList.remove('hidden');
      if (contentBox) contentBox.classList.add('hidden');
      document.getElementById('unit-title').textContent = 'Select a unit';
      document.getElementById('unit-details').innerHTML = '';
      const documentsList = document.getElementById('shop-document-list');
      if (documentsList) documentsList.innerHTML = '';
      const documentsForm = document.getElementById('form-shop-document');
      if (documentsForm) documentsForm.reset();
      const documentsTruckId = document.getElementById('shop-document-truck-id');
      if (documentsTruckId) documentsTruckId.value = '';
      document.getElementById('unit-actions').innerHTML = '';
      const secActions = document.getElementById('unit-secondary-actions');
      if (secActions) secActions.innerHTML = '';
      const badgeHost = document.getElementById('unit-status-badge-host');
      if (badgeHost) badgeHost.innerHTML = '';
      const subHost = document.getElementById('unit-subtitle-host');
      if (subHost) subHost.textContent = '';
      const print = document.getElementById('unit-print-label');
      print.classList.add('hidden');
      print.removeAttribute('href');
      updateSelectedUnitHighlight();
    }

    function parseVinData(value) {
      if (!value) return {};
      try {
        const data = JSON.parse(value);
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      } catch { return {}; }
    }

    function updateSelectedUnitHighlight() {
      document.querySelectorAll('[data-unit-row]').forEach(el => {
        const isSel = selectedUnitId && el.getAttribute('data-unit-row') === selectedUnitId;
        el.classList.toggle('is-selected', Boolean(isSel));
        el.setAttribute('aria-selected', String(Boolean(isSel)));
      });
    }

    async function openPendingUnit() {
      if (!pendingUnitId) return;
      const id = pendingUnitId;
      pendingUnitId = null;
      await openUnitOverview(id);
    }

    async function openUnitOverview(id, options = {}) {
      setPendingUnit(id, !options.fromPopState && !document.getElementById('gate-view').classList.contains('hidden') === false);
      if (!document.getElementById('gate-view').classList.contains('hidden')) return;
      pendingUnitId = null;
      selectedUnitId = id;
      activeHistoryTruckId = id;
      const generation = ++overviewRequest;
      const modal = document.getElementById('modal-unit');
      const emptyBox = document.getElementById('detail-empty-state');
      const contentBox = document.getElementById('detail-selected-content');
      const details = document.getElementById('unit-details');
      const actions = document.getElementById('unit-actions');
      const secActions = document.getElementById('unit-secondary-actions');
      const badgeHost = document.getElementById('unit-status-badge-host');
      const subHost = document.getElementById('unit-subtitle-host');
      const print = document.getElementById('unit-print-label');
      const historyList = document.getElementById('detail-history-list');
      const uploadSection = document.getElementById('detail-upload-section');
      const documentsSection = document.getElementById('detail-documents-section');
      const documentsTruckId = document.getElementById('shop-document-truck-id');
      const documentsList = document.getElementById('shop-document-list');

      if (emptyBox) emptyBox.classList.add('hidden');
      if (contentBox) contentBox.classList.remove('hidden');
      modal.setAttribute('data-has-selection', 'true');
      modal.classList.remove('hidden');
      updateSelectedUnitHighlight();

      const cachedUnit = fleetData.find(unit => unit.id === id);
      document.getElementById('unit-title').textContent = cachedUnit ? ('Unit #' + cachedUnit.unit_number) : 'Unit overview';
      if (subHost) {
        subHost.textContent = cachedUnit
          ? [cachedUnit.vehicle_type, cachedUnit.equipment_type, [cachedUnit.year, cachedUnit.make, cachedUnit.model].filter(Boolean).join(' ')].filter(Boolean).join(' · ')
          : 'Loading unit details…';
      }
      if (badgeHost) badgeHost.innerHTML = '';
      details.textContent = 'Loading unit…';
      actions.innerHTML = '';
      if (secActions) secActions.innerHTML = '';
      print.classList.add('hidden');
      print.removeAttribute('href');
      if (uploadSection) uploadSection.classList.add('hidden');
      if (documentsSection) documentsSection.classList.add('hidden');
      if (documentsTruckId) documentsTruckId.value = '';
      if (documentsList) documentsList.innerHTML = '';
      if (historyList) historyList.innerHTML = '<p class="muted-note">Loading inspection history…</p>';

      try {
        const response = await apiFetch('/trucks/' + encodeURIComponent(id));
        const { truck: t } = await response.json();
        if (generation !== overviewRequest || !document.getElementById('gate-view').classList.contains('hidden')) return;
        // Keep quick actions independent of the current dashboard filters.
        const existing = fleetData.findIndex(unit => unit.id === t.id);
        if (existing >= 0) {
          fleetData[existing] = t;
        } else {
          fleetData.push(t);
        }
        selectedUnitId = t.id;
        activeHistoryTruckId = t.id;
        updateSelectedUnitHighlight();

        document.getElementById('unit-title').textContent = 'Unit #' + t.unit_number;
        if (subHost) {
          subHost.textContent = [t.vehicle_type, t.equipment_type, [t.year, t.make, t.model].filter(Boolean).join(' '), t.license_plate ? ('Plate ' + t.license_plate) : ''].filter(Boolean).join(' · ');
        }
        if (badgeHost) {
          const dueNote = t.next_due_date ? ('Due ' + escapeHtml(t.next_due_date)) : 'No due date set';
          badgeHost.innerHTML = '<div class="safety-badge ' + escapeHtml(t.safety_status) + '"><span>' + escapeHtml(formatStatusWithIcon(t)) + '</span><small>' + dueNote + '</small></div>';
        }

        const formatReminderSchedule = (days) => {
          if (days === 'none') return 'No reminders (opted out)';
          const raw = days || (typeof appSettings !== 'undefined' && appSettings.notify_days) || '30,14,7,1,0';
          const prefix = days ? 'Custom: ' : 'Fleet default: ';
          const labels = String(raw).split(',').filter(Boolean).map(d => d === '0' ? 'due date' : d === 'overdue' ? 'overdue' : d === '1' ? '1d' : d + 'd');
          return prefix + (labels.join(', ') || 'None');
        };

        const summaryFields = [
          ['Safety status', formatDaysBadge(t)],
          ['Next safety due', t.next_due_date || 'No date set'],
          ...((t.document_expiries || []).length ? [['Expiring documents', (t.document_expiries || []).map(document => (document.label || document.document_type) + ': ' + document.expiry_date + ' (' + (document.days_remaining < 0 ? Math.abs(document.days_remaining) + 'd overdue' : document.days_remaining + 'd')).join(' · ')]] : []),
          ['Last inspection', t.last_inspection_date || 'No date set'],
          ['Inspection interval', (t.interval_months || 12) + ' months'],
          ['Reminder schedule', formatReminderSchedule(t.reminder_days)],
        ];
        const vinDataFields = Object.entries(parseVinData(t.vin_data));
        const unitFields = [
          ['Vehicle type', t.vehicle_type],
          ['Equipment / body type', t.equipment_type],
          ['Operational status', t.status],
          ['Vehicle', [t.year, t.make, t.model].filter(Boolean).join(' ')],
          ['Plate', t.license_plate],
          ['GVWR', t.gvwr],
          ['VIN', t.vin],
          ['Shop / mechanic', t.shop_name],
          ['Sticker / certificate', t.sticker_number],
          ['Permanent unit UUID', t.id],
        ];
        details.innerHTML =
          (t.status === 'Inactive' ? '<p role="status" class="truck-notes" style="margin-bottom:10px;">This unit is inactive.</p>' : '') +
          (t.notes ? '<div class="truck-notes" style="margin-bottom:10px;"><strong>Notes:</strong> ' + escapeHtml(t.notes) + '</div>' : '') +
          '<div class="detail-section-label">Inspection Summary</div>' +
          '<div class="meta-grid detail-summary-grid">' + summaryFields.map(([label, value]) => '<div class="meta-item"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || '—') + '</strong></div>').join('') + '</div>' +
          '<details class="detail-disclosure" open style="margin-top:12px;">' +
            '<summary>Unit Information & Specifications</summary>' +
            '<div class="detail-disclosure-body">' +
              '<div class="meta-grid">' + unitFields.map(([label, value]) => '<div class="meta-item"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || '—') + '</strong></div>').join('') + '</div>' +
            '</div>' +
          '</details>' +
          (vinDataFields.length
            ? '<details class="detail-disclosure" style="margin-top:12px;">' +
                '<summary>NHTSA VIN decode data (' + vinDataFields.length + ' fields)</summary>' +
                '<div class="detail-disclosure-body">' +
                  '<input type="search" id="detail-vin-filter" class="input-control" placeholder="Filter NHTSA VIN fields (e.g. EngineHP, PlantCity, ABS)…" aria-label="Filter NHTSA VIN fields" style="margin-bottom:8px; min-height:38px; padding:6px 10px; font-size:0.8rem;" />' +
                  '<div id="detail-vin-grid" class="meta-grid">' +
                    vinDataFields.map(([key, value]) => '<div class="meta-item" data-vin-kv="' + escapeHtml((key + ' ' + (value || 'Not provided by NHTSA')).toLowerCase()) + '"><span>NHTSA: ' + escapeHtml(key) + '</span><strong>' + escapeHtml(value || 'Not provided by NHTSA') + '</strong></div>').join('') +
                  '</div>' +
                '</div>' +
              '</details>'
            : '');
        const vinFilterInput = document.getElementById('detail-vin-filter');
        if (vinFilterInput) {
          vinFilterInput.addEventListener('input', (ev) => {
            const q = ev.target.value.trim().toLowerCase();
            document.querySelectorAll('#detail-vin-grid .meta-item').forEach(item => {
              item.classList.toggle('hidden', Boolean(q && !String(item.getAttribute('data-vin-kv') || '').includes(q)));
            });
          });
        }

        const latestAtt = fleetData[existing >= 0 ? existing : fleetData.length - 1]?.latest_attachment;
        const latestCertBtn = (latestAtt && latestAtt.file_available !== false)
          ? '<button type="button" class="btn btn-secondary btn-sm" data-view-file="' + escapeHtml(latestAtt.id) + '" data-file-name="' + escapeHtml(latestAtt.file_name) + '" data-file-type="' + escapeHtml(latestAtt.content_type) + '">📄 View Latest Cert</button>'
          : '';

        actions.innerHTML =
          '<button type="button" class="btn btn-success btn-sm" data-inspect="' + escapeHtml(t.id) + '">Log Safety</button>' +
          latestCertBtn +
          '<button type="button" class="btn btn-secondary btn-sm" data-history="' + escapeHtml(t.id) + '">History / certificates</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-edit="' + escapeHtml(t.id) + '">Edit unit</button>' +
          '<div class="danger-zone-box" style="width:100%; flex-basis:100%; margin-top:8px;">' +
            '<span style="font-size:0.78rem; color:var(--text-muted);">Permanent removal</span>' +
            '<button type="button" class="btn btn-danger btn-sm" data-delete="' + escapeHtml(t.id) + '" style="flex:0 0 auto;">Delete unit</button>' +
          '</div>';

        print.href = API_BASE + '/trucks/' + encodeURIComponent(t.id) + '/label';
        print.classList.remove('hidden');
        if (uploadSection) uploadSection.classList.remove('hidden');
        if (documentsSection) documentsSection.classList.remove('hidden');
        if (documentsTruckId) documentsTruckId.value = t.id;
        if (typeof loadShopDocuments === 'function') await loadShopDocuments(t.id);

        if (typeof loadDetailHistory === 'function') {
          await loadDetailHistory(t.id, generation);
        }
        if (options && options.scrollToHistory) {
          const histSec = document.getElementById('detail-history-section');
          if (histSec) histSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err) {
        if (err.message === 'Unauthorized') { setPendingUnit(id); return; }
        if (generation !== overviewRequest || !document.getElementById('gate-view').classList.contains('hidden')) return;
        if (subHost) subHost.textContent = 'Lookup error';
        if (badgeHost) badgeHost.innerHTML = '';
        if (uploadSection) uploadSection.classList.add('hidden');
        if (documentsSection) documentsSection.classList.add('hidden');
        if (historyList) historyList.innerHTML = '';
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
    window.addEventListener('popstate', () => {
      if (document.getElementById('gate-view').classList.contains('hidden')) {
        const unitParam = new URL(location.href).searchParams.get('unit');
        if (unitParam && uuidPattern.test(unitParam)) {
          openUnitOverview(unitParam.toLowerCase(), { fromPopState: true });
        } else if (selectedUnitId) {
          clearPendingUnit(true);
        }
      }
    });
    const requestedUnit = new URL(location.href).searchParams.get('unit');
    if (requestedUnit && uuidPattern.test(requestedUnit)) setPendingUnit(requestedUnit.toLowerCase());
  `;
}
