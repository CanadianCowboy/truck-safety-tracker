import type { EnrichedTruck } from './types';
import { normalizeReminderDayList } from './validation';
export { normalizeReminderDayList } from './validation';

export const REMINDER_DAY_OPTIONS = ['30', '14', '7', '1', '0', 'overdue'] as const;
export type ReminderDay = typeof REMINDER_DAY_OPTIONS[number];

export function parseReminderDayList(value: string): Set<ReminderDay> {
  const normalized = normalizeReminderDayList(value);
  if (!normalized || normalized === 'none') return new Set();
  return new Set(normalized.split(',') as ReminderDay[]);
}

export function effectiveReminderDays(unitDays: string, fleetDays: string): Set<ReminderDay> {
  return parseReminderDayList(unitDays === '' ? fleetDays : unitDays);
}

export function isUnitReminderDue(truck: Pick<EnrichedTruck, 'status' | 'days_remaining' | 'reminder_days'>, fleetDays: string): boolean {
  if (truck.status === 'Inactive' || truck.days_remaining === null) return false;
  const selected = effectiveReminderDays(truck.reminder_days || '', fleetDays);
  if (truck.days_remaining < 0) return selected.has('overdue');
  return selected.has(String(truck.days_remaining) as ReminderDay);
}

export function selectReminderTrucks<T extends EnrichedTruck>(trucks: T[], fleetDays: string): T[] {
  return trucks.filter(truck => isUnitReminderDue(truck, fleetDays));
}
