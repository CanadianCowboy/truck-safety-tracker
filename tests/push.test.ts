import { describe, expect, it } from 'vitest';
import { localReminderTime, notificationPayload, validatePushEndpoint, validateSubscription } from '../src/push';

describe('native Web Push pure logic', () => {
  it('uses 7 AM Winnipeg across winter, summer and DST boundaries', () => {
    for (const date of ['2026-01-20', '2026-11-01', '2026-12-20']) {
      expect(localReminderTime(Date.parse(date + 'T13:00:00Z'))).toEqual({ date, hour: '07' });
      expect(localReminderTime(Date.parse(date + 'T12:00:00Z')).hour).not.toBe('07');
    }
    for (const date of ['2026-03-08', '2026-07-20', '2026-10-20']) {
      expect(localReminderTime(Date.parse(date + 'T12:00:00Z'))).toEqual({ date, hour: '07' });
      expect(localReminderTime(Date.parse(date + 'T13:00:00Z')).hour).not.toBe('07');
    }
  });

  it('rejects unsafe destinations and absent subscription credentials without contacting a push service', async () => {
    for (const endpoint of ['http://fcm.googleapis.com', 'https://127.0.0.1', 'https://localhost', 'https://fcm.googleapis.com.invalid', 'https://fcm.googleapis.com:8080', 'https://user:pw@fcm.googleapis.com']) expect(() => validatePushEndpoint(endpoint)).toThrow();
    for (const endpoint of ['https://fcm.googleapis.com/', 'https://updates.push.services.mozilla.com/', 'https://web.push.apple.com/']) expect(validatePushEndpoint(endpoint)).toBe(endpoint);
    await expect(validateSubscription(null)).rejects.toThrow();
    await expect(validateSubscription({})).rejects.toThrow();
  });

  it('constructs the actual privacy-safe notification payload without a fleet record', () => {
    expect(notificationPayload('/truck-safety')).toEqual({
      title: 'Truck Safety Tracker', body: 'Inspection reminders need attention. Unlock Safety Tracker to review.',
      icon: '/truck-safety/icon-192.png', badge: '/truck-safety/badge.png', tag: 'safety-daily', url: '/truck-safety/',
    });
    expect(notificationPayload('/truck-safety', true).body).toBe('Test notification. Background alerts are enabled for this device.');
  });
});
