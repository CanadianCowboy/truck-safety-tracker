import { describe, expect, it } from 'vitest';
import type { AttachmentRow, InspectionRow, TruckRow, EnrichedTruck } from '../src/types';
import { createFleetBackup, getCertificateBytes, parseFleetBackup, planFleetRestore } from '../src/backup';
import { InputError } from '../src/validation';
import { effectiveReminderDays, isUnitReminderDue, normalizeReminderDayList, selectReminderTrucks } from '../src/reminders';

const unitId = '11111111-1111-4111-8111-111111111111';
const inspectionId = '22222222-2222-4222-8222-222222222222';
const attachmentId = '33333333-3333-4333-8333-333333333333';

const unit: TruckRow = {
  id: unitId, unit_number: 'Unit 12', vehicle_type: 'Tractor', gvwr: '', license_plate: '', vin: '', year: null,
  make: '', model: '', equipment_type: '', vin_data: '', reminder_days: '', last_inspection_date: '2026-01-01',
  next_due_date: '2027-01-01', interval_months: 12, shop_name: '', sticker_number: '', status: 'Active', notes: '',
  created_at: '2026-01-01 00:00:00', updated_at: '2026-01-01 00:00:00',
};
const inspection: InspectionRow = {
  id: inspectionId, truck_id: unitId, inspection_date: '2026-01-01', expiration_date: '2027-01-01',
  shop_name: '', sticker_number: '', notes: '', created_at: '2026-01-01 00:00:00',
};
const attachment: AttachmentRow = {
  id: attachmentId, truck_id: unitId, inspection_id: inspectionId, file_name: 'certificate.pdf',
  content_type: 'application/pdf', size_bytes: 9, r2_key: `truck-safety/${unitId}/${attachmentId}`, created_at: '2026-01-01 00:00:00',
};

function validBackup(includeFiles = false) {
  const files = includeFiles ? new Map([[attachmentId, btoa('%PDF-1.7\n')]]) : undefined;
  return createFleetBackup([unit], [inspection], [attachment], files);
}

describe('fleet backup validation and restore planning', () => {
  it('round-trips data-only metadata without exposing certificate bytes', () => {
    const parsed = parseFleetBackup(validBackup());
    expect(parsed.includes_certificate_files).toBe(false);
    expect(parsed.attachments[0].file_data).toBeUndefined();
    expect(getCertificateBytes(parsed.attachments[0])).toBeNull();
  });

  it('validates included certificate signatures and complete file sets', () => {
    const parsed = parseFleetBackup(validBackup(true));
    expect(new TextDecoder().decode(getCertificateBytes(parsed.attachments[0])!)).toBe('%PDF-1.7\n');
    const incomplete = validBackup(true);
    delete incomplete.attachments[0].file_data;
    expect(() => parseFleetBackup(incomplete)).toThrow(InputError);
    const invalid = validBackup(true);
    invalid.attachments[0].file_data = btoa('<html>bad</html>');
    invalid.attachments[0].size_bytes = 16;
    expect(() => parseFleetBackup(invalid)).toThrow(/allowed file type/);
  });

  it('rejects unsafe extra fields and conflicting existing unit numbers', () => {
    const withSecret = { ...validBackup(), secret: 'not allowed' };
    expect(() => parseFleetBackup(withSecret)).toThrow(/Unsupported or invalid/);
    const parsed = parseFleetBackup(validBackup());
    expect(() => planFleetRestore(parsed, [{ id: '44444444-4444-4444-8444-444444444444', unit_number: 'unit 12' }]))
      .toThrow(/belongs to a different existing unit/);
    expect(planFleetRestore(parsed, [{ id: unitId, unit_number: 'Unit 12' }])).toEqual(new Set([unitId]));
  });
});

function truck(days_remaining: number | null, reminder_days = '', status = 'Active'): EnrichedTruck {
  return { ...unit, days_remaining, reminder_days, status, safety_status: days_remaining === null ? 'no_date' : days_remaining < 0 ? 'overdue' : days_remaining <= 30 ? 'due_soon' : 'good', attachment_count: 0 };
}

describe('per-unit reminder schedules', () => {
  it('inherits fleet selections only for blank unit overrides', () => {
    expect([...effectiveReminderDays('', '14,7,1,0')]).toEqual(['14', '7', '1', '0']);
    expect([...effectiveReminderDays('none', '14,7,1,0')]).toEqual([]);
  });

  it('selects matching dates, overdue units and excludes inactive or undated units', () => {
    const fleet = [truck(7), truck(-1), truck(1, '1'), truck(0, 'none'), truck(null), truck(7, '', 'Inactive')];
    expect(selectReminderTrucks(fleet, '7,1,0,overdue')).toEqual([fleet[0], fleet[1], fleet[2]]);
    expect(isUnitReminderDue(truck(-1), '7,1,0')).toBe(false);
    expect(normalizeReminderDayList('0,7,14,overdue')).toBe('14,7,0,overdue');
    expect(() => normalizeReminderDayList('7,7')).toThrow(InputError);
    expect(() => normalizeReminderDayList('15')).toThrow(InputError);
  });
});
