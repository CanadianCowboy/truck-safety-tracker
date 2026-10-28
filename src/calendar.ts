import { canWriteFleetRecords, type ShopActor } from './shop-accounts';
import { InputError, validDate } from './validation';

export const CALENDAR_TIMEZONE = 'America/Winnipeg';
export interface CalendarEventInput {
  title: string;
  notes: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  truck_id: string | null;
  category: 'general' | 'inspection' | 'repair' | 'maintenance';
  recurrence: 'none' | 'weekly' | 'monthly';
  repeat_until: string;
}
interface CalendarEventRow extends Omit<CalendarEventInput, 'all_day'> {
  id: string;
  all_day: number;
  revision: string;
  created_by_name: string;
  updated_by_name: string;
  created_at: string;
  updated_at: string;
  unit_number: string | null;
}

function dayNumber(date: string): number { return Date.parse(date + 'T00:00:00Z') / 86400000; }
export function calendarRange(from: string | null, to: string | null): { from: string; to: string } {
  if (!from || !to || !validDate(from) || !validDate(to) || from > to || dayNumber(to) - dayNumber(from) > 92) {
    throw new InputError('Choose a valid calendar range of 93 days or fewer.');
  }
  return { from, to };
}

const localTimeFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: CALENDAR_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
// Test possible Winnipeg offsets against Intl instead of letting Date silently normalize a DST gap.
function validLocalTime(date: string, time: string): boolean {
  const wall = Date.parse(date + 'T' + time + ':00Z');
  return [300, 360].some(offset => {
    const parts = localTimeFormatter.formatToParts(new Date(wall + offset * 60000));
    const get = (type: string) => parts.find(part => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}` === date && `${get('hour')}:${get('minute')}` === time;
  });
}

function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * 86400000).toISOString().slice(0, 10);
}

function addCalendarMonths(start: string, months: number): string {
  const date = new Date(start + 'T12:00:00Z'), anchorDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(date);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  date.setUTCDate(Math.min(anchorDay, last.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

/** Expand only overlapping occurrences; each monthly date is anchored to the original day. */
export function calendarOccurrences(event: CalendarEventInput, from: string, to: string): Array<{ start_date: string; end_date: string }> {
  const duration = dayNumber(event.end_date) - dayNumber(event.start_date);
  const occurrences: Array<{ start_date: string; end_date: string }> = [];
  const until = event.recurrence === 'none' ? event.start_date : event.repeat_until;
  // Validation limits series to two years (at most 105 weekly or 25 monthly starts).
  for (let index = 0; index < 106; index++) {
    let start = event.start_date;
    if (event.recurrence === 'weekly') start = addDays(start, index * 7);
    if (event.recurrence === 'monthly') start = addCalendarMonths(start, index);
    if (start > until || start > to) break;
    const end = addDays(start, duration);
    if (end >= from && (event.all_day || end !== from || event.end_time !== '00:00')) occurrences.push({ start_date: start, end_date: end });
    if (event.recurrence === 'none') break;
  }
  return occurrences;
}

type CalendarAppointment = CalendarEventInput & { id: string };
type CalendarSlot = Pick<CalendarEventInput, 'start_date' | 'end_date' | 'start_time' | 'end_time' | 'all_day' | 'truck_id'>;
function slotBounds(event: CalendarSlot): [number, number] {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  return [dayNumber(event.start_date) * 1440 + (event.all_day ? 0 : minutes(event.start_time)),
    dayNumber(event.end_date) * 1440 + (event.all_day ? 1440 : minutes(event.end_time))];
}

/** Winnipeg wall-clock intervals are half-open: touching end/start times are not overlaps. */
export function calendarSlotsOverlap(a: CalendarSlot, b: CalendarSlot): boolean {
  if (!a.truck_id || a.truck_id !== b.truck_id) return false;
  const [startA, endA] = slotBounds(a), [startB, endB] = slotBounds(b);
  return startA < endB && startB < endA;
}

export function findCalendarConflicts(draft: CalendarEventInput, appointments: CalendarAppointment[], excludeId = '') {
  const until = draft.recurrence === 'none' ? draft.start_date : draft.repeat_until;
  const proposed = calendarOccurrences(draft, draft.start_date, until);
  const conflicts: Array<{ id: string; title: string; start_date: string; end_date: string; start_time: string; end_time: string; all_day: boolean; proposed_start_date: string }> = [];
  if (!draft.truck_id || !proposed.length) return { conflicts, truncated: false };
  const lastEnd = proposed[proposed.length - 1].end_date;
  for (const appointment of appointments) {
    if (appointment.id === excludeId || appointment.truck_id !== draft.truck_id) continue;
    let cursor = 0;
    for (const occurrence of calendarOccurrences(appointment, draft.start_date, lastEnd)) {
      const existing = { ...appointment, ...occurrence };
      const [start] = slotBounds(existing);
      while (cursor < proposed.length && slotBounds({ ...draft, ...proposed[cursor] })[1] <= start) cursor++;
      if (cursor === proposed.length) break;
      if (!calendarSlotsOverlap({ ...draft, ...proposed[cursor] }, existing)) continue;
      if (conflicts.length === 20) return { conflicts, truncated: true };
      conflicts.push({ id: appointment.id, title: appointment.title, ...occurrence, start_time: appointment.start_time,
        end_time: appointment.end_time, all_day: appointment.all_day, proposed_start_date: proposed[cursor].start_date });
    }
  }
  return { conflicts, truncated: false };
}

export function parseCalendarEvent(value: unknown): CalendarEventInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Expected a calendar event object.');
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !['title', 'notes', 'start_date', 'end_date', 'start_time', 'end_time', 'all_day', 'truck_id', 'revision', 'category', 'recurrence', 'repeat_until'].includes(key))) throw new InputError('Unsupported calendar event field.');
  const text = (key: string, max: number, required = false) => {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.trim().length > max || required && !value.trim()) throw new InputError(`Invalid ${key.replaceAll('_', ' ')}.`);
    return value.trim();
  };
  const title = text('title', 160, true), notes = text('notes', 4000);
  const start_date = text('start_date', 10, true), end_date = text('end_date', 10, true);
  if (!validDate(start_date) || !validDate(end_date) || end_date < start_date || dayNumber(end_date) - dayNumber(start_date) > 366) throw new InputError('Choose valid event dates, ending on or after the start (maximum 367 days).');
  if (typeof input.all_day !== 'boolean') throw new InputError('Choose all-day or timed.');
  const all_day = input.all_day;
  const start_time = all_day ? '' : text('start_time', 5, true), end_time = all_day ? '' : text('end_time', 5, true);
  if (!all_day) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start_time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end_time)) throw new InputError('Enter valid start and end times.');
    if (start_date === end_date && end_time <= start_time) throw new InputError('End time must be after start time.');
    if (!validLocalTime(start_date, start_time) || !validLocalTime(end_date, end_time)) throw new InputError('That time does not exist in Winnipeg because the clocks change. Choose another time.');
  }
  const truck_id = input.truck_id === null || input.truck_id === '' || input.truck_id === undefined ? null : text('truck_id', 128, true);
  const category = input.category ?? 'general', recurrence = input.recurrence ?? 'none';
  if (category !== 'general' && category !== 'inspection' && category !== 'repair' && category !== 'maintenance') throw new InputError('Choose a valid appointment category.');
  if (recurrence !== 'none' && recurrence !== 'weekly' && recurrence !== 'monthly') throw new InputError('Choose no repeat, weekly, or monthly.');
  const repeat_until = recurrence === 'none' ? '' : text('repeat_until', 10, true);
  if (recurrence !== 'none' && (!validDate(repeat_until) || repeat_until < start_date || repeat_until > addCalendarMonths(start_date, 24))) throw new InputError('Choose a repeat end date within two years of the first start date.');
  const event: CalendarEventInput = { title, notes, start_date, end_date, start_time, end_time, all_day, truck_id, category, recurrence, repeat_until };
  if (!all_day && recurrence !== 'none') {
    for (const occurrence of calendarOccurrences(event, start_date, repeat_until)) {
      if (!validLocalTime(occurrence.start_date, start_time) || !validLocalTime(occurrence.end_date, end_time)) throw new InputError('A repeat falls in a Winnipeg clock-change gap. Choose another time or an earlier repeat end date.');
    }
  }
  return event;
}

const SELECT_EVENTS = `SELECT e.*, t.unit_number FROM shop_calendar_events e LEFT JOIN trucks t ON t.id = e.truck_id`;
export async function handleCalendarApi(request: Request, db: D1Database, actor: ShopActor): Promise<Response> {
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  try {
    const url = new URL(request.url);
    const id = url.pathname.match(/\/api\/calendar\/events\/([^/]+)$/)?.[1];
    if (request.method === 'GET' && url.pathname.endsWith('/api/calendar')) {
      const { from, to } = calendarRange(url.searchParams.get('from'), url.searchParams.get('to'));
      const [appointments, inspections, documents] = await Promise.all([
        db.prepare(`${SELECT_EVENTS} WHERE e.start_date <= ?2 AND (e.end_date >= ?1 OR (e.recurrence <> 'none' AND date(e.repeat_until, '+' || CAST(julianday(e.end_date) - julianday(e.start_date) AS INTEGER) || ' days') >= ?1)) ORDER BY e.start_date, e.start_time, e.id LIMIT 2001`).bind(from, to).all<CalendarEventRow>(),
        db.prepare(`SELECT id, unit_number, next_due_date FROM trucks WHERE next_due_date BETWEEN ?1 AND ?2 ORDER BY next_due_date, id LIMIT 2001`).bind(from, to).all<{ id: string; unit_number: string; next_due_date: string }>(),
        db.prepare(`SELECT d.id, d.truck_id, d.document_type, d.label, d.expiry_date, t.unit_number FROM shop_unit_documents d JOIN trucks t ON t.id = d.truck_id WHERE d.expiry_date BETWEEN ?1 AND ?2 ORDER BY d.expiry_date, d.id LIMIT 2001`).bind(from, to).all<{ id: string; truck_id: string; document_type: string; label: string; expiry_date: string; unit_number: string }>(),
      ]);
      if ([appointments, inspections, documents].some(result => result.results.length > 2000)) throw new InputError('Too many entries in this range. Choose a shorter calendar range.', 413);
      const shopEvents = [];
      for (const row of appointments.results) {
        const event = { ...row, all_day: Boolean(row.all_day) };
        for (const occurrence of calendarOccurrences(event, from, to)) {
          shopEvents.push({ ...event, ...occurrence, kind: 'shop',
            id: event.recurrence === 'none' ? event.id : event.id + '@' + occurrence.start_date,
            series_id: event.id, series_start_date: event.start_date, series_end_date: event.end_date,
          });
          if (shopEvents.length + inspections.results.length + documents.results.length > 2000) throw new InputError('Too many entries in this range. Choose a shorter calendar range.', 413);
        }
      }
      if (shopEvents.length + inspections.results.length + documents.results.length > 2000) throw new InputError('Too many entries in this range. Choose a shorter calendar range.', 413);
      return json({ timezone: CALENDAR_TIMEZONE, can_edit: canWriteFleetRecords(actor), events: [
        ...shopEvents,
        ...inspections.results.map(unit => ({ id: 'inspection:' + unit.id, kind: 'inspection', title: 'Safety due · #' + unit.unit_number, start_date: unit.next_due_date, end_date: unit.next_due_date, all_day: true, start_time: '', end_time: '', truck_id: unit.id, unit_number: unit.unit_number })),
        ...documents.results.map(doc => ({ id: 'document:' + doc.id, kind: 'document', title: (doc.label || doc.document_type) + ' expires · #' + doc.unit_number, start_date: doc.expiry_date, end_date: doc.expiry_date, all_day: true, start_time: '', end_time: '', truck_id: doc.truck_id, unit_number: doc.unit_number })),
      ] });
    }
    // This POST validates an unsaved draft and reads appointments only; it never persists the draft.
    if (request.method === 'POST' && url.pathname.endsWith('/api/calendar/conflicts')) {
      const draft = parseCalendarEvent(await request.json());
      const exclude = url.searchParams.get('exclude') || '';
      if (exclude && !/^[a-f0-9-]{36}$/.test(exclude)) throw new InputError('Invalid event identifier.');
      if (!draft.truck_id) return json({ conflicts: [], truncated: false, timezone: CALENDAR_TIMEZONE });
      const proposed = calendarOccurrences(draft, draft.start_date, draft.recurrence === 'none' ? draft.start_date : draft.repeat_until);
      const to = proposed[proposed.length - 1].end_date;
      const rows = await db.prepare(`${SELECT_EVENTS} WHERE e.truck_id = ?1 AND e.id <> ?2 AND e.start_date <= ?4 AND (e.end_date >= ?3 OR (e.recurrence <> 'none' AND date(e.repeat_until, '+' || CAST(julianday(e.end_date) - julianday(e.start_date) AS INTEGER) || ' days') >= ?3)) ORDER BY e.start_date, e.id LIMIT 2001`).bind(draft.truck_id, exclude, draft.start_date, to).all<CalendarEventRow>();
      if (rows.results.length > 2000) throw new InputError('Too many appointments to check. Shorten the proposed series.', 413);
      return json({ ...findCalendarConflicts(draft, rows.results.map(row => ({ ...row, all_day: Boolean(row.all_day) })), exclude), timezone: CALENDAR_TIMEZONE });
    }
    const createRoute = request.method === 'POST' && url.pathname.endsWith('/api/calendar/events');
    const updateRoute = request.method === 'PUT' && Boolean(id);
    const deleteRoute = request.method === 'DELETE' && Boolean(id);
    if (!createRoute && !updateRoute && !deleteRoute) return json({ error: 'Calendar route not found.' }, 404);
    if (!canWriteFleetRecords(actor)) return json({ error: 'Viewer accounts can view the calendar but cannot change appointments.' }, 403);
    if (id && !/^[a-f0-9-]{36}$/.test(id)) throw new InputError('Invalid event identifier.');
    const current = id ? await db.prepare(`${SELECT_EVENTS} WHERE e.id = ?1`).bind(id).first<CalendarEventRow>() : null;
    if (id && !current) return json({ error: 'Appointment not found.' }, 404);
    if (request.method === 'DELETE' && id) {
      const revision = request.headers.get('If-Match');
      if (!revision) throw new InputError('Reload the appointment before deleting it.', 409);
      const result = await db.prepare('DELETE FROM shop_calendar_events WHERE id = ?1 AND revision = ?2').bind(id, revision).run();
      return result.meta.changes ? json({ ok: true }) : json({ error: 'This appointment changed. Reload before deleting.' }, 409);
    }
    const input: unknown = await request.json();
    const event = parseCalendarEvent(input);
    if (event.truck_id && !await db.prepare('SELECT id FROM trucks WHERE id = ?1').bind(event.truck_id).first()) throw new InputError('Choose an existing fleet unit.');
    const eventId = id || crypto.randomUUID(), revision = crypto.randomUUID();
    const values = [event.title, event.notes, event.start_date, event.end_date, event.start_time, event.end_time, Number(event.all_day), event.truck_id, actor.display_name, revision, event.category, event.recurrence, event.repeat_until];
    if (id) {
      const previous = (input as Record<string, unknown>).revision;
      if (typeof previous !== 'string') throw new InputError('Reload the appointment before saving.', 409);
      const result = await db.prepare(`UPDATE shop_calendar_events SET title=?1, notes=?2, start_date=?3, end_date=?4, start_time=?5, end_time=?6, all_day=?7, truck_id=?8, updated_by_name=?9, revision=?10, category=?11, recurrence=?12, repeat_until=?13, updated_at=datetime('now') WHERE id=?14 AND revision=?15`).bind(...values, eventId, previous).run();
      if (!result.meta.changes) throw new InputError('This appointment changed. Reload before saving.', 409);
    } else {
      await db.prepare(`INSERT INTO shop_calendar_events (title, notes, start_date, end_date, start_time, end_time, all_day, truck_id, updated_by_name, revision, category, recurrence, repeat_until, id, created_by_name) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?9)`).bind(...values, eventId).run();
    }
    return json({ event: await db.prepare(`${SELECT_EVENTS} WHERE e.id = ?1`).bind(eventId).first() }, id ? 200 : 201);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON request.' }, 400);
    console.error(JSON.stringify({ event: 'calendar_api_error' }));
    return json({ error: 'Could not load or save the calendar. Please retry.' }, 500);
  }
}
