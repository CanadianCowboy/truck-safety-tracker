import type { TruckRow } from './types';

export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validateDates(inspection: string, expiry: string, allowEmpty = false): void {
  if (allowEmpty && !inspection && !expiry) return;
  if (!validDate(expiry) || (inspection && !validDate(inspection))) throw new InputError('Enter valid inspection and expiry dates (YYYY-MM-DD).');
  if (inspection && expiry < inspection) throw new InputError('Expiry cannot be before the inspection date.');
}

export function normalizeReminderDayList(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') return trimmed;
  const allowed = ['30', '14', '7', '1', '0', 'overdue'];
  const parts = trimmed.split(',').map(day => day.trim());
  if (new Set(parts).size !== parts.length || parts.some(day => !allowed.includes(day))) {
    throw new InputError('Per-unit reminders must be selected from 30, 14, 7, 1, 0 days or overdue.');
  }
  return allowed.filter(day => parts.includes(day)).join(',');
}

export function validateTruck(t: Partial<TruckRow>): void {
  if (!String(t.unit_number || '').trim()) throw new InputError('Unit number is required.');
  validateDates(String(t.last_inspection_date || '').trim(), String(t.next_due_date || '').trim(), true);
  if (!['Tractor', 'Straight Truck', 'Trailer', 'Pickup / Service Truck', 'Other'].includes(String(t.vehicle_type || 'Tractor'))) throw new InputError('Invalid vehicle type.');
  if (!['Active', 'In Shop', 'Inactive'].includes(String(t.status || 'Active'))) throw new InputError('Invalid operational status.');
  if (![3, 6, 12, 24].includes(Number(t.interval_months ?? 12))) throw new InputError('Inspection interval must be 3, 6, 12 or 24 months.');
  if (t.year != null && (!Number.isInteger(Number(t.year)) || Number(t.year) < 1900 || Number(t.year) > 2100)) throw new InputError('Invalid vehicle year.');
  if (t.reminder_days !== undefined) normalizeReminderDayList(t.reminder_days);
  if (t.vin_data) {
    try {
      const decoded: unknown = JSON.parse(t.vin_data);
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded) || Object.values(decoded).some(value => typeof value !== 'string' || value.length > 1000)) throw new Error();
      const sourceVin = (decoded as Record<string, unknown>).VIN;
      if (typeof t.vin !== 'string' || typeof sourceVin !== 'string' || sourceVin.trim().toUpperCase() !== t.vin.trim().toUpperCase()) throw new Error();
      if (t.vin_data.length > 64 * 1024) throw new Error();
    } catch {
      throw new InputError('Decoded VIN data must be a JSON object containing text values of at most 1000 characters, and match the unit VIN.');
    }
  }
  for (const [key, value] of Object.entries(t)) if (typeof value === 'string' && key !== 'vin_data' && value.length > 5000) throw new InputError('A field is too long (maximum 5000 characters).');
}

export function validateWebhookUrl(value: string): void {
  if (!value) return;
  let url: URL;
  try { url = new URL(value); } catch { throw new InputError('Webhook URL is invalid.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname) || /^\d+(\.\d+){3}$/.test(url.hostname)) throw new InputError('Use a public HTTPS webhook URL without embedded credentials or a custom port.');
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function validateFile(file: File): Promise<void> {
  if (!file.size || file.size > MAX_FILE_BYTES) throw new InputError('Upload a nonempty file of 10 MB or less.', 413);
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new InputError('Only PDF, JPEG, PNG and WebP files are supported.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = new TextDecoder().decode(bytes);
  const valid = file.type === 'application/pdf' ? ascii.startsWith('%PDF-')
    : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : file.type === 'image/png' ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
    : ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  if (!valid) throw new InputError('The file contents do not match the selected PDF/photo type.');
}
