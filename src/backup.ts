import type { AttachmentRow, InspectionRow, TruckRow } from './types';
import { InputError, validateDates, validateTruck } from './validation';

export const FLEET_BACKUP_FORMAT = 'truck-safety-tracker-backup';
export const FLEET_BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 30 * 1024 * 1024;
export const MAX_BACKUP_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_BACKUP_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_BACKUP_UNITS = 5000;
export const MAX_BACKUP_INSPECTIONS = 50000;
export const MAX_BACKUP_ATTACHMENTS = 50000;

export type BackupAttachment = Pick<AttachmentRow, 'id' | 'truck_id' | 'inspection_id' | 'file_name' | 'content_type' | 'size_bytes' | 'created_at'> & { file_data?: string };

export interface FleetBackup {
  format: typeof FLEET_BACKUP_FORMAT;
  version: typeof FLEET_BACKUP_VERSION;
  exported_at: string;
  includes_certificate_files: boolean;
  certificate_note: string;
  units: TruckRow[];
  inspections: InspectionRow[];
  attachments: BackupAttachment[];
}

const DATA_ONLY_NOTE = 'Certificate files are not included; only attachment metadata is preserved, and restored entries will show as unavailable.';
const WITH_FILES_NOTE = 'Private certificate files are included in this archive and will be restored to private object storage.';
const unitFields = ['id', 'unit_number', 'vehicle_type', 'gvwr', 'license_plate', 'vin', 'year', 'make', 'model', 'equipment_type', 'vin_data', 'reminder_days', 'last_inspection_date', 'next_due_date', 'interval_months', 'shop_name', 'sticker_number', 'status', 'notes', 'created_at', 'updated_at'] as const;
const inspectionFields = ['id', 'truck_id', 'inspection_date', 'expiration_date', 'shop_name', 'sticker_number', 'notes', 'created_at'] as const;
const attachmentFields = ['id', 'truck_id', 'inspection_id', 'file_name', 'content_type', 'size_bytes', 'created_at', 'file_data'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateRowShape(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).some(key => !fields.includes(key))) throw new InputError(`Backup contains an invalid ${label} record.`);
  return value;
}

function stringValue(row: Record<string, unknown>, key: string, max = 5000): string {
  const value = row[key];
  if (typeof value !== 'string' || value.length > max) throw new InputError(`Backup ${key} must be text of at most ${max} characters.`);
  return value;
}

function requiredString(row: Record<string, unknown>, key: string, max = 5000): string {
  const value = stringValue(row, key, max);
  if (!value) throw new InputError(`Backup ${key} is required.`);
  return value;
}

function validateIdentifier(value: string, label: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new InputError(`Backup has an invalid ${label}.`);
}

function validateUnit(value: unknown): TruckRow {
  const row = validateRowShape(value, unitFields, 'unit');
  const truck = {
    id: requiredString(row, 'id', 36), unit_number: requiredString(row, 'unit_number', 256),
    vehicle_type: stringValue(row, 'vehicle_type', 128) || 'Tractor', gvwr: stringValue(row, 'gvwr'),
    license_plate: stringValue(row, 'license_plate', 256), vin: stringValue(row, 'vin', 64),
    year: row.year === null ? null : Number(row.year), make: stringValue(row, 'make', 256),
    model: stringValue(row, 'model', 256), equipment_type: stringValue(row, 'equipment_type', 256),
    vin_data: stringValue(row, 'vin_data', 64 * 1024),
    reminder_days: row.reminder_days === undefined ? '' : stringValue(row, 'reminder_days', 64),
    last_inspection_date: stringValue(row, 'last_inspection_date', 10), next_due_date: stringValue(row, 'next_due_date', 10),
    interval_months: Number(row.interval_months), shop_name: stringValue(row, 'shop_name', 512),
    sticker_number: stringValue(row, 'sticker_number', 256), status: stringValue(row, 'status', 32),
    notes: stringValue(row, 'notes'), created_at: requiredString(row, 'created_at', 64),
    updated_at: requiredString(row, 'updated_at', 64),
  } satisfies TruckRow;
  validateIdentifier(truck.id, 'unit ID');
  if (truck.year !== null && !Number.isInteger(truck.year)) throw new InputError('Backup unit year is invalid.');
  validateTruck(truck);
  return truck;
}

function validateInspection(value: unknown): InspectionRow {
  const row = validateRowShape(value, inspectionFields, 'inspection');
  const inspection: InspectionRow = {
    id: requiredString(row, 'id', 36), truck_id: requiredString(row, 'truck_id', 36),
    inspection_date: requiredString(row, 'inspection_date', 10), expiration_date: requiredString(row, 'expiration_date', 10),
    shop_name: stringValue(row, 'shop_name', 512), sticker_number: stringValue(row, 'sticker_number', 256),
    notes: stringValue(row, 'notes'), created_at: requiredString(row, 'created_at', 64),
  };
  validateIdentifier(inspection.id, 'inspection ID');
  validateIdentifier(inspection.truck_id, 'inspection unit ID');
  validateDates(inspection.inspection_date, inspection.expiration_date);
  return inspection;
}

function decodeCertificateData(value: unknown, attachmentId: string, contentType: string, size: number): Uint8Array {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_BACKUP_FILE_BYTES * 4 / 3) + 8 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new InputError(`Backup certificate ${attachmentId} has invalid file data.`);
  }
  let decoded: string;
  try { decoded = atob(value); } catch { throw new InputError(`Backup certificate ${attachmentId} has invalid file data.`); }
  const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
  if (bytes.byteLength !== size || !size || size > MAX_BACKUP_FILE_BYTES) throw new InputError(`Backup certificate ${attachmentId} has an invalid size.`);
  const ascii = new TextDecoder().decode(bytes.slice(0, 12));
  const valid = contentType === 'application/pdf' ? ascii.startsWith('%PDF-')
    : contentType === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : contentType === 'image/png' ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
    : contentType === 'image/webp' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP'
    : false;
  if (!valid) throw new InputError(`Backup certificate ${attachmentId} does not match its allowed file type.`);
  return bytes;
}

function validateAttachment(value: unknown, includeFiles: boolean): BackupAttachment {
  const row = validateRowShape(value, attachmentFields, 'certificate metadata');
  const attachment: BackupAttachment = {
    id: requiredString(row, 'id', 36), truck_id: requiredString(row, 'truck_id', 36),
    inspection_id: row.inspection_id === null ? null : requiredString(row, 'inspection_id', 36),
    file_name: requiredString(row, 'file_name', 512), content_type: stringValue(row, 'content_type', 128),
    size_bytes: Number(row.size_bytes), created_at: requiredString(row, 'created_at', 64),
  };
  validateIdentifier(attachment.id, 'certificate metadata ID');
  validateIdentifier(attachment.truck_id, 'certificate unit ID');
  if (attachment.inspection_id) validateIdentifier(attachment.inspection_id, 'certificate inspection ID');
  if (!Number.isSafeInteger(attachment.size_bytes) || attachment.size_bytes < 0) throw new InputError('Backup certificate size is invalid.');
  if (includeFiles) {
    decodeCertificateData(row.file_data, attachment.id, attachment.content_type, attachment.size_bytes);
    attachment.file_data = row.file_data as string;
  } else if (row.file_data !== undefined) {
    throw new InputError('Data-only backups cannot contain certificate file data.');
  }
  return attachment;
}

export function createFleetBackup(units: TruckRow[], inspections: InspectionRow[], attachments: AttachmentRow[], certificateFiles?: Map<string, string>): FleetBackup {
  const includesFiles = certificateFiles !== undefined;
  return {
    format: FLEET_BACKUP_FORMAT, version: FLEET_BACKUP_VERSION, exported_at: new Date().toISOString(),
    includes_certificate_files: includesFiles, certificate_note: includesFiles ? WITH_FILES_NOTE : DATA_ONLY_NOTE,
    units, inspections,
    attachments: attachments.map(({ id, truck_id, inspection_id, file_name, content_type, size_bytes, created_at }) => ({
      id, truck_id, inspection_id, file_name, content_type, size_bytes, created_at,
      ...(certificateFiles ? { file_data: certificateFiles.get(id) || '' } : {}),
    })),
  };
}

export function parseFleetBackup(value: unknown): FleetBackup {
  if (!isRecord(value) || Object.keys(value).some(key => !['format', 'version', 'exported_at', 'includes_certificate_files', 'certificate_note', 'units', 'inspections', 'attachments'].includes(key)) ||
    value.format !== FLEET_BACKUP_FORMAT || value.version !== FLEET_BACKUP_VERSION || typeof value.includes_certificate_files !== 'boolean' ||
    !Array.isArray(value.units) || !Array.isArray(value.inspections) || !Array.isArray(value.attachments)) {
    throw new InputError('Unsupported or invalid fleet backup format.');
  }
  if (value.units.length > MAX_BACKUP_UNITS || value.inspections.length > MAX_BACKUP_INSPECTIONS || value.attachments.length > MAX_BACKUP_ATTACHMENTS) {
    throw new InputError('Backup exceeds the supported record limits.', 413);
  }
  const units = value.units.map(validateUnit);
  const inspections = value.inspections.map(validateInspection);
  const attachments = value.attachments.map(item => validateAttachment(item, value.includes_certificate_files as boolean));
  if (value.includes_certificate_files && attachments.some(item => item.file_data === undefined)) {
    throw new InputError('Certificate archive is incomplete; refusing a partial file restore.');
  }
  const totalFileBytes = attachments.reduce((total, item) => total + (item.file_data !== undefined ? item.size_bytes : 0), 0);
  if (totalFileBytes > MAX_BACKUP_TOTAL_FILE_BYTES) throw new InputError('Included certificate files exceed the 20 MB archive limit.', 413);
  const unitIds = new Set(units.map(unit => unit.id));
  const inspectionIds = new Set(inspections.map(inspection => inspection.id));
  if (unitIds.size !== units.length || inspectionIds.size !== inspections.length || new Set(attachments.map(file => file.id)).size !== attachments.length) {
    throw new InputError('Backup contains duplicate record IDs.');
  }
  if (inspections.some(inspection => !unitIds.has(inspection.truck_id))) throw new InputError('Backup inspection references a unit that is not included.');
  if (attachments.some(file => !unitIds.has(file.truck_id) || (file.inspection_id && !inspectionIds.has(file.inspection_id)))) {
    throw new InputError('Backup certificate metadata references a missing unit or inspection.');
  }
  if (new Set(units.map(unit => unit.unit_number.trim().toLowerCase())).size !== units.length) throw new InputError('Backup contains duplicate unit numbers.');
  return {
    format: FLEET_BACKUP_FORMAT, version: FLEET_BACKUP_VERSION,
    exported_at: typeof value.exported_at === 'string' ? value.exported_at : '',
    includes_certificate_files: value.includes_certificate_files,
    certificate_note: value.includes_certificate_files ? WITH_FILES_NOTE : DATA_ONLY_NOTE, units, inspections, attachments,
  };
}

export function parseFleetBackupJson(text: string): FleetBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new InputError('Backup must be 30 MB or smaller.', 413);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new InputError('Backup is not valid JSON.'); }
  return parseFleetBackup(value);
}

export function planFleetRestore(backup: FleetBackup, existingUnits: Array<Pick<TruckRow, 'id' | 'unit_number'>>): Set<string> {
  const ids = new Set<string>();
  const numbers = new Map<string, string>();
  for (const unit of existingUnits) { ids.add(unit.id); numbers.set(unit.unit_number.trim().toLowerCase(), unit.id); }
  const matchedUnitIds = new Set<string>();
  for (const unit of backup.units) {
    const matchById = ids.has(unit.id);
    const matchByNumber = numbers.get(unit.unit_number.trim().toLowerCase());
    if (matchByNumber && matchByNumber !== unit.id) throw new InputError(`Unit number ${unit.unit_number} belongs to a different existing unit. Resolve this conflict before restoring.`);
    if (matchById) matchedUnitIds.add(unit.id);
  }
  return matchedUnitIds;
}

export function getCertificateBytes(attachment: BackupAttachment): Uint8Array | null {
  return attachment.file_data === undefined ? null : decodeCertificateData(attachment.file_data, attachment.id, attachment.content_type, attachment.size_bytes);
}
