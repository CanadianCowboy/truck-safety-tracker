import { describe, expect, it } from 'vitest';
import { calendarOccurrences, calendarRange, calendarSlotsOverlap, findCalendarConflicts, parseCalendarEvent } from '../src/calendar';

describe('calendar validation (pure logic, no substituted services)', () => {
  it('bounds query ranges and validates real calendar dates', () => {
    expect(calendarRange('2026-10-01', '2026-11-11')).toEqual({ from: '2026-10-01', to: '2026-11-11' });
    expect(() => calendarRange('2026-02-30', '2026-03-01')).toThrow();
    expect(() => calendarRange('2026-11-01', '2026-10-01')).toThrow();
    expect(() => calendarRange('2026-01-01', '2026-12-31')).toThrow();
    expect(() => calendarRange(null, null)).toThrow();
  });

  it('normalizes all-day input, bounds text, and rejects malformed fields', () => {
    const input = { title: '  Shop appointment  ', start_date: '2026-10-26', end_date: '2026-10-26', all_day: true };
    expect(parseCalendarEvent(input)).toEqual({ title: 'Shop appointment', notes: '', start_date: '2026-10-26', end_date: '2026-10-26', start_time: '', end_time: '', all_day: true, truck_id: null, category: 'general', recurrence: 'none', repeat_until: '' });
    for (const invalid of [null, [], { ...input, title: '' }, { ...input, title: 'a'.repeat(161) }, { ...input, notes: 'a'.repeat(4001) }, { ...input, all_day: 1 }, { ...input, end_date: '2026-10-25' }, { ...input, role: 'owner' }]) expect(() => parseCalendarEvent(invalid)).toThrow();
  });

  it('validates categories and bounded recurrence without accepting unsupported schedules', () => {
    const input = { title: 'Appointment', start_date: '2026-10-26', end_date: '2026-10-26', all_day: true, category: 'repair', recurrence: 'weekly', repeat_until: '2027-01-01' };
    expect(parseCalendarEvent(input).category).toBe('repair');
    for (const change of [{ category: 'unknown' }, { recurrence: 'daily' }, { repeat_until: '' }, { repeat_until: '2026-10-25' }, { repeat_until: '2030-01-01' }, { repeat_until: '2028-10-27' }, { repeat_until: '2027-02-30' }]) expect(() => parseCalendarEvent({ ...input, ...change })).toThrow();
    expect(parseCalendarEvent({ ...input, repeat_until: '2028-10-26' }).repeat_until).toBe('2028-10-26');
    expect(() => parseCalendarEvent({ ...input, start_date: '2026-03-01', end_date: '2026-03-01', repeat_until: '2026-03-15', all_day: false, start_time: '02:30', end_time: '04:00' })).toThrow('clock-change gap');
  });

  it('expands weekly series inclusively, preserving multi-day overlap and stopping at the end date', () => {
    const event = parseCalendarEvent({ title: 'Appointment', start_date: '2026-10-26', end_date: '2026-10-28', all_day: true, recurrence: 'weekly', repeat_until: '2026-11-09' });
    expect(calendarOccurrences(event, '2026-10-28', '2026-11-10')).toEqual([
      { start_date: '2026-10-26', end_date: '2026-10-28' },
      { start_date: '2026-11-02', end_date: '2026-11-04' },
      { start_date: '2026-11-09', end_date: '2026-11-11' },
    ]);
    expect(calendarOccurrences(event, '2026-11-12', '2026-12-31')).toEqual([]);
    expect(calendarOccurrences({ ...event, recurrence: 'none', repeat_until: '' }, '2026-10-27', '2026-11-01')).toEqual([{ start_date: '2026-10-26', end_date: '2026-10-28' }]);
  });

  it('anchors monthly repeats to the original day across short months and leap years', () => {
    const event = parseCalendarEvent({ title: 'Appointment', start_date: '2027-12-31', end_date: '2027-12-31', all_day: true, recurrence: 'monthly', repeat_until: '2028-03-31' });
    expect(calendarOccurrences(event, '2027-12-01', '2028-04-30').map(e => e.start_date)).toEqual(['2027-12-31', '2028-01-31', '2028-02-29', '2028-03-31']);
    expect(calendarOccurrences({ ...event, start_date: '2026-01-31', end_date: '2026-01-31', repeat_until: '2026-03-31' }, '2026-02-01', '2026-03-31').map(e => e.start_date)).toEqual(['2026-02-28', '2026-03-31']);
  });

  it('does not include a timed appointment on the date of its exclusive midnight end', () => {
    const event = parseCalendarEvent({ title: 'Appointment', start_date: '2026-10-26', end_date: '2026-10-27', all_day: false, start_time: '23:00', end_time: '00:00' });
    expect(calendarOccurrences(event, '2026-10-27', '2026-10-27')).toEqual([]);
    expect(calendarOccurrences(event, '2026-10-26', '2026-10-27')).toEqual([{ start_date: '2026-10-26', end_date: '2026-10-27' }]);
    expect(calendarOccurrences({ ...event, all_day: true }, '2026-10-27', '2026-10-27')).toHaveLength(1);
    expect(calendarOccurrences({ ...event, recurrence: 'weekly', repeat_until: '2026-11-02' }, '2026-11-03', '2026-11-03')).toEqual([]);
  });

  it('detects same-unit overlaps, not back-to-back, other-unit, or unlinked appointments', () => {
    const slot = parseCalendarEvent({ title: 'Appointment', truck_id: 'unit-a', start_date: '2026-10-26', end_date: '2026-10-26', all_day: false, start_time: '09:00', end_time: '10:00' });
    expect(calendarSlotsOverlap(slot, { ...slot, start_time: '09:30', end_time: '11:00' })).toBe(true);
    expect(calendarSlotsOverlap(slot, { ...slot, start_time: '10:00', end_time: '11:00' })).toBe(false);
    expect(calendarSlotsOverlap(slot, { ...slot, start_time: '08:00', end_time: '09:00' })).toBe(false);
    expect(calendarSlotsOverlap(slot, { ...slot, truck_id: 'unit-b' })).toBe(false);
    expect(calendarSlotsOverlap({ ...slot, truck_id: null }, { ...slot, truck_id: null })).toBe(false);
    expect(calendarSlotsOverlap(slot, { ...slot, all_day: true })).toBe(true);
    expect(calendarSlotsOverlap(slot, { ...slot, start_date: '2026-10-25', end_date: '2026-10-26', start_time: '23:00', end_time: '09:30' })).toBe(true);
    expect(calendarSlotsOverlap(slot, { ...slot, all_day: true, start_date: '2026-10-25', end_date: '2026-10-25' })).toBe(false);
  });

  it('checks recurring drafts beyond the visible month, includes overnight overlaps, and excludes the edited series', () => {
    const draft = parseCalendarEvent({ title: 'Appointment', truck_id: 'unit-a', start_date: '2026-01-31', end_date: '2026-01-31', all_day: true, recurrence: 'monthly', repeat_until: '2026-04-30' });
    const existing = { ...parseCalendarEvent({ title: 'Existing appointment', truck_id: 'unit-a', start_date: '2026-02-28', end_date: '2026-02-28', all_day: false, start_time: '09:00', end_time: '10:00' }), id: 'existing' };
    expect(findCalendarConflicts(draft, [existing]).conflicts).toMatchObject([{ id: 'existing', start_date: '2026-02-28', proposed_start_date: '2026-02-28' }]);
    expect(findCalendarConflicts(draft, [existing], 'existing').conflicts).toEqual([]);
    expect(findCalendarConflicts({ ...draft, repeat_until: '2026-01-31' }, [existing]).conflicts).toEqual([]);
    const weekly = { ...existing, recurrence: 'weekly' as const, repeat_until: '2026-03-28' };
    expect(findCalendarConflicts(draft, [weekly]).conflicts.map(e => e.start_date)).toEqual(['2026-02-28']);
    const overnight = { ...existing, start_date: '2026-02-27', end_date: '2026-02-28', start_time: '23:00', end_time: '01:00' };
    expect(findCalendarConflicts(draft, [overnight]).conflicts).toHaveLength(1);
    expect(findCalendarConflicts({ ...draft, truck_id: null }, [existing]).conflicts).toEqual([]);
    const many = Array.from({ length: 21 }, (_,i) => ({ ...existing, id: String(i) }));
    expect(findCalendarConflicts(draft, many)).toMatchObject({ truncated: true, conflicts: expect.arrayContaining([{ id: '0', title: existing.title, start_date: existing.start_date, end_date: existing.end_date, start_time: existing.start_time, end_time: existing.end_time, all_day: false, proposed_start_date: '2026-02-28' }]) });
    expect(findCalendarConflicts(draft, many).conflicts).toHaveLength(20);
  });

  it('accepts valid timed and multi-day events but rejects backwards times and Winnipeg DST gaps', () => {
    const input = { title: 'Appointment', start_date: '2026-10-26', end_date: '2026-10-26', all_day: false, start_time: '09:00', end_time: '10:00' };
    expect(parseCalendarEvent(input).start_time).toBe('09:00');
    expect(() => parseCalendarEvent({ ...input, end_time: '08:00' })).toThrow();
    expect(() => parseCalendarEvent({ ...input, start_time: '25:00' })).toThrow();
    expect(() => parseCalendarEvent({ ...input, start_date: '2026-03-08', end_date: '2026-03-08', start_time: '02:30', end_time: '04:00' })).toThrow('clocks change');
    expect(parseCalendarEvent({ ...input, start_date: '2026-11-01', end_date: '2026-11-01', start_time: '01:30', end_time: '02:30' }).start_time).toBe('01:30');
    expect(parseCalendarEvent({ ...input, start_time: '23:00', end_date: '2026-10-27', end_time: '01:00' }).end_time).toBe('01:00');
  });
});
