import type { Env, SafetyStatus, TruckRow, AttachmentRow, EnrichedTruck, AppSettings } from "./types";

import { InputError, validDate, validateWebhookUrl } from './validation';

const encoder = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacSha256Hex(keyStr: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function timingSafeEqualStr(a: string, b: string): Promise<boolean> {
  const hashA = await crypto.subtle.digest("SHA-256", encoder.encode(a));
  const hashB = await crypto.subtle.digest("SHA-256", encoder.encode(b));
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  if (viewA.byteLength !== viewB.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < viewA.byteLength; i++) {
    diff |= viewA[i] ^ viewB[i];
  }
  return diff === 0 && a.length === b.length;
}

export async function getActivePasscodeHash(env: Env): Promise<string> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'passcode_hash'")
    .first<{ value: string }>();
  if (row && row.value) {
    return row.value;
  }
  return hashPasscode(env.INITIAL_PASSCODE, env.SESSION_SECRET);
}

export async function hashPasscode(passcode: string, secret: string): Promise<string> {
  return hmacSha256Hex(secret, `passcode:${passcode}`);
}

export const SESSION_SECONDS = 30 * 24 * 60 * 60;

export async function createSessionToken(passcodeHash: string): Promise<string> {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomUUID();
  const payload = `${issuedAt}.${nonce}`;
  const sig = await hmacSha256Hex(passcodeHash, `session:${payload}`);
  return `${payload}.${sig}`;
}

export function sessionCookie(token: string, request: Request, basePath: string): string {
  return `ts_token=${token}; Path=${basePath}/; Max-Age=${token ? SESSION_SECONDS : 0}; HttpOnly; SameSite=Strict${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}

export async function verifySessionToken(token: string | null | undefined, env: Env): Promise<boolean> {
  if (!token) return false;
  return verifySignedToken(token, await getActivePasscodeHash(env));
}

export async function verifySignedToken(token: string, passcodeHash: string): Promise<boolean> {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, nonce, sig] = parts;
  if (!issuedAt || !nonce || !sig) return false;
  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued) || issued > Date.now() || Date.now() - issued >= SESSION_SECONDS * 1000) return false;
  const expectedSig = await hmacSha256Hex(passcodeHash, `session:${issuedAt}.${nonce}`);
  return timingSafeEqualStr(sig, expectedSig);
}

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const c of cookies) {
      if (c.startsWith("ts_token=")) {
        return decodeURIComponent(c.slice("ts_token=".length));
      }
    }
  }
  return null;
}

/**
 * Calculate days remaining between referenceDate (YYYY-MM-DD, defaults to today UTC)
 * and targetDate (YYYY-MM-DD).
 */
export function calculateDaysRemaining(nextDueDate: string, referenceDateStr?: string): number {
  const todayStr = referenceDateStr || new Date().toISOString().slice(0, 10);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const [dy, dm, dd] = nextDueDate.slice(0, 10).split("-").map(Number);
  if (!ty || !tm || !td || !dy || !dm || !dd) return 0;
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const dueUtc = Date.UTC(dy, dm - 1, dd);
  return Math.round((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

export function computeSafetyStatus(daysRemaining: number, warningDays = 30): SafetyStatus {
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= warningDays) return "due_soon";
  return "good";
}

export function addMonthsToDate(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, lastDay));
  return dt.toISOString().slice(0, 10);
}

/** Default expiry is the final day of the interval's target month; manual dates stay unchanged. */
export function defaultExpiryDate(dateStr: string, months: number): string {
  if (!validDate(dateStr) || ![3, 6, 12, 24].includes(months)) throw new InputError('Use a valid inspection date and a 3, 6, 12 or 24 month interval.');
  const [year, month] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month + months, 0)).toISOString().slice(0, 10);
}

export function enrichTruck(
  truck: TruckRow,
  warningDays = 30,
  attachmentCount = 0,
  latestAttachment: AttachmentRow | null = null,
  referenceDateStr?: string
): EnrichedTruck {
  const hasDueDate = Boolean(truck.next_due_date && /^\d{4}-\d{2}-\d{2}$/.test(truck.next_due_date.slice(0, 10)));
  const days_remaining = hasDueDate ? calculateDaysRemaining(truck.next_due_date, referenceDateStr) : null;
  const safety_status = days_remaining === null ? "no_date" : computeSafetyStatus(days_remaining, warningDays);
  return {
    ...truck,
    equipment_type: truck.equipment_type || "",
    reminder_days: truck.reminder_days || "",
    days_remaining,
    safety_status,
    attachment_count: attachmentCount,
    latest_attachment: latestAttachment,
  };
}

export async function getAppSettings(env: Env): Promise<AppSettings> {
  const { results } = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('warning_days', 'webhook_url', 'webhook_type', 'notify_days')"
  ).all<{ key: string; value: string }>();

  const map: Record<string, string> = {};
  for (const row of results || []) {
    map[row.key] = row.value;
  }

  const warningDaysNum = parseInt(map.warning_days || "30", 10);
  const webhookTypeRaw = map.webhook_type || "auto";
  const webhook_type = webhookTypeRaw === "ntfy" || webhookTypeRaw === "discord" || webhookTypeRaw === "slack" || webhookTypeRaw === "generic" ? webhookTypeRaw : "auto";

  return {
    warning_days: Number.isFinite(warningDaysNum) && warningDaysNum > 0 ? warningDaysNum : 30,
    webhook_url: map.webhook_url || "",
    webhook_type,
    notify_days: map.notify_days || "30,14,7,1,0",
  };
}

export function generateIcsCalendar(trucks: EnrichedTruck[], appUrl: string): string {
  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  let uidHost = "truck-safety-tracker.local";
  try {
    uidHost = new URL(appUrl).hostname || uidHost;
  } catch {
    // Fallback for non-URL strings
  }
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Truck Safety Tracker//Safety Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Truck Safety Expirations",
  ];

  for (const t of trucks) {
    if (!t.next_due_date || !/^\d{4}-\d{2}-\d{2}$/.test(t.next_due_date.slice(0, 10))) continue;
    const dateClean = t.next_due_date.slice(0, 10).replace(/-/g, "");
    const nextDay = addMonthsToDate(t.next_due_date, 0);
    const [y, m, d] = nextDay.split("-").map(Number);
    const endDt = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");

    const summary = `Safety Due: Unit #${t.unit_number} (${t.vehicle_type || "Truck"})`;
    const descParts = [
      `Unit: #${t.unit_number}`,
      `Type: ${t.vehicle_type || "N/A"}`,
      t.gvwr ? `GVWR: ${t.gvwr}` : "",
      t.license_plate ? `Plate: ${t.license_plate}` : "",
      t.vin ? `VIN: ${t.vin}` : "",
      t.year || t.make || t.model || t.equipment_type ? `Vehicle: ${[t.year, t.make, t.model, t.equipment_type].filter(Boolean).join(" ")}` : "",
      t.sticker_number ? `Sticker/Cert #: ${t.sticker_number}` : "",
      t.shop_name ? `Last Shop: ${t.shop_name}` : "",
      `Manage at: ${appUrl}`,
    ].filter(Boolean);

    lines.push(
      "BEGIN:VEVENT",
      `UID:truck-safety-${t.id}-${dateClean}@${uidHost}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${dateClean}`,
      `DTEND;VALUE=DATE:${endDt}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(descParts.join("\n"))}`,
      "BEGIN:VALARM",
      "TRIGGER:-P14D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(summary)} in 14 days`,
      "END:VALARM",
      "BEGIN:VALARM",
      "TRIGGER:-P7D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(summary)} in 7 days`,
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  // Fold content lines at 75 UTF-8 octets (RFC 5545).
  return lines.map((line) => {
    let folded = '', bytes = 0;
    for (const char of line) {
      const size = encoder.encode(char).length;
      if (bytes + size > 75) { folded += '\r\n '; bytes = 1; }
      folded += char; bytes += size;
    }
    return folded;
  }).join("\r\n") + "\r\n";
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export async function dispatchWebhookNotification(
  webhookUrl: string,
  webhookType: AppSettings["webhook_type"],
  trucks: EnrichedTruck[],
  isTest = false,
  dashboardUrl?: string
): Promise<{ ok: boolean; status: number; message: string }> {
  if (!webhookUrl) {
    return { ok: false, status: 400, message: "No webhook URL configured" };
  }

  validateWebhookUrl(webhookUrl);
  const overdue = trucks.filter((t) => t.safety_status === "overdue");
  const dueSoon = trucks.filter((t) => t.safety_status === "due_soon");

  const title = isTest
    ? `🚛 Truck Safety Tracker — Test Alert (${overdue.length} Overdue, ${dueSoon.length} Due Soon)`
    : `🚛 Truck Safety Alert: ${overdue.length} Overdue, ${dueSoon.length} Due Soon`;

  const lines: string[] = [];
  if (overdue.length > 0) {
    lines.push("🔴 OVERDUE:");
    for (const t of overdue) {
      lines.push(
        `• Unit #${t.unit_number} (${t.vehicle_type}${t.license_plate ? ` • Plate ${t.license_plate}` : ""}) — Expired ${Math.abs(t.days_remaining ?? 0)}d ago (${t.next_due_date})`
      );
    }
  }
  if (dueSoon.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("🟡 DUE SOON:");
    for (const t of dueSoon) {
      lines.push(
        `• Unit #${t.unit_number} (${t.vehicle_type}${t.license_plate ? ` • Plate ${t.license_plate}` : ""}) — Due in ${t.days_remaining ?? 0}d (${t.next_due_date})`
      );
    }
  }
  if (lines.length === 0) {
    lines.push("🟢 All active trucks & trailers are up to date on safety inspections!");
  }
  if (dashboardUrl) {
    lines.push(`\nDashboard: ${dashboardUrl}`);
  }

  const bodyText = lines.join("\n");

  const resolvedType =
    webhookType === "auto"
      ? webhookUrl.includes("discord.com/api/webhooks")
        ? "discord"
        : webhookUrl.includes("hooks.slack.com")
        ? "slack"
        : webhookUrl.includes("ntfy.sh")
        ? "ntfy"
        : "generic"
      : webhookType;

  let res: Response;
  if (resolvedType === "discord") {
    res = await fetch(webhookUrl, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**${title}**\n${bodyText}`,
      }),
    });
  } else if (resolvedType === "slack") {
    res = await fetch(webhookUrl, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*${title}*\n${bodyText}`,
      }),
    });
  } else if (resolvedType === "ntfy") {
    res = await fetch(webhookUrl, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: {
        Title: title.replace(/[^\x20-\x7E]/g, "").trim(),
        Priority: overdue.length > 0 ? "high" : "default",
        Tags: overdue.length > 0 ? "rotating_light,truck" : "truck,warning",
      },
      body: bodyText,
    });
  } else {
    res = await fetch(webhookUrl, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        message: bodyText,
        overdue_count: overdue.length,
        due_soon_count: dueSoon.length,
        trucks: [...overdue, ...dueSoon].map((t) => ({
          id: t.id,
          unit_number: t.unit_number,
          vehicle_type: t.vehicle_type,
          license_plate: t.license_plate,
          next_due_date: t.next_due_date,
          days_remaining: t.days_remaining,
          safety_status: t.safety_status,
        })),
      }),
    });
  }

  await res.body?.cancel();
  return {
    ok: res.ok,
    status: res.status,
    message: res.ok ? `Sent via ${resolvedType}` : `Webhook returned HTTP ${res.status}`,
  };
}
