import qrcode from 'qrcode-generator';

export const UNIT_UUID_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

export function renderUnitQr(uuid: string): string {
  if (!new RegExp(UNIT_UUID_PATTERN, 'i').test(uuid)) throw new Error('Invalid unit UUID');
  const qr = qrcode(0, 'Q');
  qr.addData(uuid.toLowerCase(), 'Byte');
  qr.make();
  // Four white modules on every edge are part of the 1.5-inch label.
  return qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true });
}

export function renderUnitLabel(uuid: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Print unit QR label</title>
<style>
  body { margin: 24px; color: #111; background: #fff; font: 16px system-ui, sans-serif; }
  #qr-label { width: 1.5in; height: 1.5in; background: white; break-inside: avoid; }
  #qr-label svg { display: block; width: 100%; height: 100%; }
  .controls { max-width: 32rem; margin-bottom: 24px; }
  button { padding: 10px 16px; cursor: pointer; }
  @page { margin: 0.5in; }
  @media print {
    body { margin: 0; }
    .controls { display: none !important; }
    #qr-label { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  }
</style></head><body>
<div class="controls"><h1>Unit QR label</h1>
<p>QR only · 1.5 × 1.5 inches, including the white scanning margin.</p>
<p>Print at <strong>100% / Actual size</strong>, disable browser headers and footers, and keep the white border when cutting. Laminate and test-scan before attaching.</p>
<p>This contains only a unit UUID. Open Safety Tracker and use Scan / Paste UUID; a normal phone camera will not open the app from this code.</p>
<button type="button" onclick="window.print()">Print label</button></div>
<div id="qr-label" aria-label="Unit UUID QR label">${renderUnitQr(uuid)}</div>
</body></html>`;
}
