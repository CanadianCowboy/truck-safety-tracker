import { describe, it, expect } from 'vitest';
import { validDate, validateDates, validateTruck, validateWebhookUrl } from '../src/validation';
import {
  calculateDaysRemaining, computeSafetyStatus, addMonthsToDate, defaultExpiryDate,
  hashPasscode, createSessionToken, verifySignedToken, timingSafeEqualStr, SESSION_SECONDS,
} from '../src/utils';

async function signSession(payload: string, passcodeHash: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(passcodeHash), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode('session:' + payload)));
  return payload + '.' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

describe('pure date, validation and cryptographic logic (no service substitution)', () => {
  it('calculates overdue, due-soon and good statuses for dated units', () => {
    expect(calculateDaysRemaining('2026-10-10', '2026-10-20')).toBe(-10);
    expect(computeSafetyStatus(-10, 30)).toBe('overdue');
    expect(calculateDaysRemaining('2026-11-05', '2026-10-20')).toBe(16);
    expect(computeSafetyStatus(16, 30)).toBe('due_soon');
    expect(calculateDaysRemaining('2027-05-01', '2026-10-20')).toBe(193);
    expect(computeSafetyStatus(193, 30)).toBe('good');
  });

  it('adds calendar intervals and clamps month-end dates', () => {
    expect(addMonthsToDate('2026-10-20', 12)).toBe('2027-10-20');
    expect(addMonthsToDate('2026-10-20', 6)).toBe('2027-04-20');
    expect(addMonthsToDate('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonthsToDate('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonthsToDate('2023-08-31', 6)).toBe('2024-02-29');
  });

  it('defaults supported inspection intervals to month-end without altering explicit dates', () => {
    for (const [date, months, expected] of [
      ['2026-10-20', 12, '2027-10-31'], ['2026-10-20', 6, '2027-04-30'],
      ['2023-08-15', 6, '2024-02-29'], ['2024-02-29', 12, '2025-02-28'],
      ['2026-11-09', 3, '2027-02-28'], ['2026-10-20', 24, '2028-10-31'],
    ] as const) expect(defaultExpiryDate(date, months)).toBe(expected);
    expect(() => defaultExpiryDate('2026-02-30', 12)).toThrow();
    expect(() => defaultExpiryDate('2026-10-20', 999999999)).toThrow();
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2026-02-30')).toBe(false);
    expect(() => validateDates('', '', true)).not.toThrow();
    expect(() => validateDates('', '2026-02-30')).toThrow();
    expect(() => validateDates('2027-01-01', '2026-12-31')).toThrow();
    expect(() => validateTruck({})).toThrow('Unit number is required');
    expect(() => validateTruck({ unit_number: 'unit', vin: '1M8GDM9AXKP042788', vin_data: '{"VIN":"1M8GDM9AXKP042788","EngineHP":"400"}' })).not.toThrow();
    for (const vin_data of ['not-json', '[]', '{"EngineHP":400}', '{"EngineHP":"' + 'x'.repeat(1001) + '"}']) {
      expect(() => validateTruck({ unit_number: 'unit', vin_data })).toThrow('Decoded VIN data');
    }
  });

  it('rejects unsafe webhook destinations without sending a notification', () => {
    for (const url of ['http://localhost', 'https://127.0.0.1', 'https://localhost', 'https://user:pw@vpic.nhtsa.dot.gov', 'https://vpic.nhtsa.dot.gov:8080']) expect(() => validateWebhookUrl(url)).toThrow();
    expect(() => validateWebhookUrl('https://vpic.nhtsa.dot.gov/api/')).not.toThrow();
  });

  it('verifies actual HMAC tokens, expiry and revocation without replacing the clock', async () => {
    const secret = crypto.randomUUID();
    const passcode = crypto.randomUUID();
    const hash = await hashPasscode(passcode, secret);
    const rotatedHash = await hashPasscode(crypto.randomUUID(), secret);
    expect(await timingSafeEqualStr(hash, await hashPasscode(passcode, secret))).toBe(true);
    expect(await timingSafeEqualStr(hash, rotatedHash)).toBe(false);
    const token = await createSessionToken(hash);
    expect(token.split('.')).toHaveLength(3);
    expect(await verifySignedToken(token, hash)).toBe(true);
    expect(await verifySignedToken(token + 'x', hash)).toBe(false);
    expect(await verifySignedToken(token, rotatedHash)).toBe(false);
    const expired = (Date.now() - (SESSION_SECONDS + 60) * 1000).toString(36) + '.' + crypto.randomUUID();
    const future = (Date.now() + 3600000).toString(36) + '.' + crypto.randomUUID();
    expect(await verifySignedToken(await signSession(expired, hash), hash)).toBe(false);
    expect(await verifySignedToken(await signSession(future, hash), hash)).toBe(false);
  });
});
