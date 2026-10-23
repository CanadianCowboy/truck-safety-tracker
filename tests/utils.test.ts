import { describe, it, expect, vi } from "vitest";
import { validateDates, validateTruck, validateWebhookUrl } from '../src/validation';
import {
  calculateDaysRemaining,
  computeSafetyStatus,
  addMonthsToDate,
  defaultExpiryDate,
  enrichTruck,
  generateIcsCalendar,
  hashPasscode,
  createSessionToken,
  verifySignedToken,
  dispatchWebhookNotification,
  timingSafeEqualStr,
} from "../src/utils";
import type { TruckRow } from "../src/types";

describe("Truck Safety Tracker core logic", () => {
  it("calculates days remaining and safety status accurately", () => {
    const refDate = "2026-10-20";
    expect(calculateDaysRemaining("2026-10-10", refDate)).toBe(-10);
    expect(computeSafetyStatus(-10, 30)).toBe("overdue");

    expect(calculateDaysRemaining("2026-11-05", refDate)).toBe(16);
    expect(computeSafetyStatus(16, 30)).toBe("due_soon");

    expect(calculateDaysRemaining("2027-05-01", refDate)).toBe(193);
    expect(computeSafetyStatus(193, 30)).toBe("good");
  });

  it("adds interval months to inspection date", () => {
    expect(addMonthsToDate("2026-10-20", 12)).toBe("2027-10-20");
    expect(addMonthsToDate("2026-10-20", 6)).toBe("2027-04-20");
  });

  it('defaults expiry to month-end across intervals, leap years and year boundaries', () => {
    expect(defaultExpiryDate('2026-10-20', 12)).toBe('2027-10-31');
    expect(defaultExpiryDate('2026-10-20', 6)).toBe('2027-04-30');
    expect(defaultExpiryDate('2023-08-15', 6)).toBe('2024-02-29');
    expect(defaultExpiryDate('2024-02-29', 12)).toBe('2025-02-28');
    expect(defaultExpiryDate('2026-11-09', 3)).toBe('2027-02-28');
    expect(defaultExpiryDate('2026-10-20', 24)).toBe('2028-10-31');
    expect(() => defaultExpiryDate('2026-02-30', 12)).toThrow();
    expect(() => defaultExpiryDate('2026-10-20', 999999999)).toThrow();
  });

  it('clamps month-end dates instead of rolling into the following month', () => {
    expect(addMonthsToDate('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonthsToDate('2026-08-31', 6)).toBe('2027-02-28');
    expect(addMonthsToDate('2023-08-31', 6)).toBe('2024-02-29');
  });

  it('rejects invalid dates, intervals and webhook destinations', () => {
    expect(() => validateDates('', '2026-02-30')).toThrow();
    expect(() => validateDates('2027-01-01', '2026-12-31')).toThrow();
    expect(() => validateDates('', '', true)).not.toThrow();
    expect(() => validateTruck({ unit_number: 'EQ-1', equipment_type: 'Skid Steer', last_inspection_date: '', next_due_date: '', interval_months: 12 })).not.toThrow();
    expect(() => validateTruck({ unit_number: 'A', next_due_date: '2030-01-01', interval_months: -12 })).toThrow();
    for (const url of ['http://example.com', 'https://127.0.0.1', 'https://localhost', 'https://user:pw@example.com', 'https://example.com:8080']) expect(() => validateWebhookUrl(url)).toThrow();
    expect(() => validateWebhookUrl('https://hooks.example.com/alert')).not.toThrow();
  });

  it("enriches truck rows with days_remaining, safety_status, and attachment info", () => {
    const sampleTruck: TruckRow = {
      id: "truck-1",
      unit_number: "101",
      vehicle_type: "Tractor",
      gvwr: "80,000 lbs",
      license_plate: "ON-99881",
      vin: "1XKYDP9X5NJ123456",
      year: 2023,
      make: "Kenworth",
      model: "T680",
      equipment_type: "Day Cab",
      last_inspection_date: "2025-11-01",
      next_due_date: "2026-11-01",
      interval_months: 12,
      shop_name: "North Bay Heavy Duty",
      sticker_number: "CVIP-88412",
      status: "Active",
      notes: "Steer tires at 14/32",
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T00:00:00Z",
    };

    const enriched = enrichTruck(sampleTruck, 30, 2, null, "2026-10-20");
    expect(enriched.days_remaining).toBe(12);
    expect(enriched.safety_status).toBe("due_soon");
    expect(enriched.attachment_count).toBe(2);
    expect(enriched.equipment_type).toBe("Day Cab");

    const undated = enrichTruck({ ...sampleTruck, last_inspection_date: "", next_due_date: "" }, 30, 0, null, "2026-10-20");
    expect(undated.days_remaining).toBeNull();
    expect(undated.safety_status).toBe("no_date");
  });

  it("generates valid iCalendar (.ics) output with VEVENT and VALARM blocks", () => {
    const sampleTruck: TruckRow = {
      id: "truck-1",
      unit_number: "101",
      vehicle_type: "Trailer",
      gvwr: "65,000 lbs",
      license_plate: "TR-5512",
      vin: "1UYVS2538GM123456",
      year: 2021,
      make: "Utility",
      model: "4000D-X",
      equipment_type: "Reefer",
      last_inspection_date: "2026-01-15",
      next_due_date: "2027-01-15",
      interval_months: 12,
      shop_name: "Fleet Shop",
      sticker_number: "S-123",
      status: "Active",
      notes: "",
      created_at: "2026-10-20T00:00:00Z",
      updated_at: "2026-10-20T00:00:00Z",
    };

    const enriched = enrichTruck(sampleTruck, 30, 0, null, "2026-10-20");
    const ics = generateIcsCalendar([enriched], "https://safety.example.com/truck-safety");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Safety Due: Unit #101 (Trailer)");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270115");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("hashes passcodes and generates verifiable HMAC session tokens", async () => {
    const h1 = await hashPasscode("passcode", "test-secret");
    const h2 = await hashPasscode("passcode", "test-secret");
    const hWrong = await hashPasscode("wrong", "test-secret");

    expect(await timingSafeEqualStr(h1, h2)).toBe(true);
    expect(await timingSafeEqualStr(h1, hWrong)).toBe(false);

    const token = await createSessionToken(h1);
    expect(token.split(".")).toHaveLength(3);
    expect(await verifySignedToken(token, h1)).toBe(true);
    expect(await verifySignedToken(token + 'x', h1)).toBe(false);
    expect(await verifySignedToken(token, hWrong)).toBe(false);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 31 * 86400000);
      expect(await verifySignedToken(token, h1)).toBe(false);
    } finally { vi.useRealTimers(); }
  });

  it('formats notifications and surfaces provider failures', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', mock);
    try {
      const result = await dispatchWebhookNotification('https://hooks.example.com/alert', 'generic', [], true);
      expect(result.ok).toBe(true);
      expect(JSON.parse(mock.mock.calls[0][1].body).title).toContain('Test Alert');
      expect(mock.mock.calls[0][1].redirect).toBe('error');
      mock.mockResolvedValue(new Response(null, { status: 503 }));
      expect((await dispatchWebhookNotification('https://hooks.example.com/alert', 'slack', [], true)).ok).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });
});
