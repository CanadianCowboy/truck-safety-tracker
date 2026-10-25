import type {
  Env,
  TruckRow,
  InspectionRow,
  AttachmentRow,
  EnrichedTruck,
} from "./types";
import {
  getActivePasscodeHash,
  hashPasscode,
  createSessionToken,
  verifySessionToken,
  extractToken,
  timingSafeEqualStr,
  enrichTruck,
  getAppSettings,
  generateIcsCalendar,
  dispatchWebhookNotification,
  defaultExpiryDate,
  sessionCookie,
} from "./utils";
import {
  renderAppHtml,
  renderPwaManifest,
  renderAppIconSvg,
  renderServiceWorker,
} from "./ui";

import { InputError, validateDates, validateTruck, validateFile, validateWebhookUrl } from './validation';
import { renderUnitLabel } from './qr';
import qrReaderSource from 'jsqr/dist/jsQR.js?raw';
import { handlePushApi, localReminderTime, pushConfigured, sendFleetPush } from './push';
import { decodeVin } from './vin';
import { MAX_BACKUP_BYTES } from './backup';
import { exportFleetBackup, restoreFleetBackup } from './backup-worker';
import { normalizeReminderDayList, selectReminderTrucks } from './reminders';
import { normalizeReminderDayList as validateReminderDays } from './validation';

const corsHeaders: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

async function ensureTruckColumns(env: Env): Promise<void> {
  for (const [column, definition] of [
    ['equipment_type', "TEXT NOT NULL DEFAULT ''"],
    ['vin_data', "TEXT NOT NULL DEFAULT ''"],
    ['reminder_days', "TEXT NOT NULL DEFAULT ''"],
  ]) {
    try {
      await env.DB.prepare(`ALTER TABLE trucks ADD COLUMN ${column} ${definition}`).run();
    } catch {
      // Column already exists.
    }
  }
}

async function fetchEnrichedFleet(env: Env, warningDays: number): Promise<EnrichedTruck[]> {
  await ensureTruckColumns(env);
  const { results: trucks } = await env.DB.prepare(
    "SELECT * FROM trucks ORDER BY CASE WHEN next_due_date = '' THEN 1 ELSE 0 END ASC, next_due_date ASC, unit_number ASC"
  ).all<TruckRow>();

  const { results: attachments } = await env.DB.prepare(
    "SELECT * FROM attachments ORDER BY created_at DESC"
  ).all<AttachmentRow>();

  const countByTruck: Record<string, number> = {};
  const latestByTruck: Record<string, AttachmentRow> = {};

  for (const att of attachments || []) {
    countByTruck[att.truck_id] = (countByTruck[att.truck_id] || 0) + 1;
    if (!latestByTruck[att.truck_id] && !att.r2_key.startsWith('truck-safety-missing-backup/')) {
      latestByTruck[att.truck_id] = att;
    }
  }

  return (trucks || []).map((t) =>
    enrichTruck(
      t,
      warningDays,
      countByTruck[t.id] || 0,
      latestByTruck[t.id] || null
    )
  );
}

async function saveUploadedFileToR2(
  env: Env,
  file: File,
  truckId: string,
  inspectionId: string | null,
  statements: D1PreparedStatement[] = []
): Promise<AttachmentRow> {
  await validateFile(file);
  const attId = crypto.randomUUID();
  const safeName = (file.name || "certificate.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const r2Key = `truck-safety/${truckId}/${attId}-${safeName}`;
  const contentType = file.type || "application/octet-stream";
  const sizeBytes = file.size || 0;

  await env.FILES.put(r2Key, file.stream(), {
    httpMetadata: {
      contentType,
    },
    customMetadata: {
      truckId,
      inspectionId: inspectionId || "",
      fileName: file.name || safeName,
    },
  });

  try {
  await env.DB.batch([...statements, env.DB.prepare(
    `INSERT INTO attachments (id, truck_id, inspection_id, file_name, content_type, size_bytes, r2_key)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(attId, truckId, inspectionId, file.name || safeName, contentType, sizeBytes, r2Key)]);
  } catch (error) {
    await env.FILES.delete(r2Key);
    throw error;
  }

  const row = await env.DB.prepare("SELECT * FROM attachments WHERE id = ?1")
    .bind(attId)
    .first<AttachmentRow>();

  return (
    row || {
      id: attId,
      truck_id: truckId,
      inspection_id: inspectionId,
      file_name: file.name || safeName,
      content_type: contentType,
      size_bytes: sizeBytes,
      r2_key: r2Key,
      created_at: new Date().toISOString(),
    }
  );
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const basePath = (env.BASE_PATH || "/truck-safety").replace(/\/+$/, "");
    const pathname = url.pathname;

    // Support both prefixed (/truck-safety/...) and root paths (in case of workers.dev or local dev)
    if (pathname === "/") {
      return Response.redirect(`${url.origin}${basePath}`, 302);
    }

    if (pathname === basePath && request.method === 'GET') return Response.redirect(`${url.origin}${basePath}/`, 302);
    if (!pathname.startsWith(basePath + '/')) return jsonResponse({ error: 'Not found' }, 404);
    const subPath = pathname.slice(basePath.length) || '/';

    try {
      // Cookie-authenticated writes must originate from this app, not another website.
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const origin = request.headers.get('Origin');
        if ((origin && origin !== url.origin) || request.headers.get('Sec-Fetch-Site') === 'cross-site') return jsonResponse({ error: 'Cross-site request denied' }, 403);
      }
      if (request.body) {
        const limit = (request.headers.get('Content-Type') || '').includes('multipart/form-data') ? 11 * 1024 * 1024
          : subPath === '/api/backup/restore' ? MAX_BACKUP_BYTES
          : 64 * 1024;
        if (Number(request.headers.get('Content-Length') || 0) > limit) throw new InputError('Request body too large.', 413);
        let bytes = 0;
        const body = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            bytes += chunk.byteLength;
            if (bytes > limit) throw new InputError('Request body too large.', 413);
            controller.enqueue(chunk);
          },
        }));
        request = new Request(request, { body });
      }
      // Static / PWA routes
      if (request.method === "GET" && (subPath === "/" || subPath === "/index.html" || subPath === '/push-test')) {
        return new Response(renderAppHtml(basePath, subPath === '/push-test'), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
          },
        });
      }

      if (request.method === "GET" && subPath === "/manifest.json") {
        return new Response(renderPwaManifest(basePath), {
          status: 200,
          headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
        });
      }

      if (request.method === "GET" && subPath === "/icon.svg") {
        return new Response(renderAppIconSvg(), {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      if (request.method === "GET" && subPath === "/sw.js") {
        return new Response(renderServiceWorker(basePath), {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      }

      // Local, optional QR decoder. No camera frames or UUIDs are sent to an external service.
      if (request.method === 'GET' && subPath === '/qr-reader.js') {
        return new Response(qrReaderSource, { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
      }

      // Public API Health Check
      if (request.method === "GET" && subPath === "/api/health") {
        return jsonResponse({
          ok: true,
          service: "truck-safety-tracker",
          basePath,
          timestamp: new Date().toISOString(),
        });
      }

      // Public API Login Gate
      if (request.method === "POST" && subPath === "/api/auth/login") {
        const allowed = await env.LOGIN_LIMITER.limit({ key: `login:${request.headers.get('CF-Connecting-IP') || 'local'}` });
        if (!allowed.success) return jsonResponse({ error: 'Too many login attempts. Try again in a minute.' }, 429, { 'Retry-After': '60' });
        const body = (await request.json()) as { passcode?: string };
        const candidate = String(body.passcode || "");
        if (!candidate) {
          return jsonResponse({ error: "Passcode is required" }, 400);
        }
        const activeHash = await getActivePasscodeHash(env);
        const candidateHash = await hashPasscode(candidate, env.SESSION_SECRET);
        const valid = await timingSafeEqualStr(activeHash, candidateHash);
        if (!valid) {
          return jsonResponse({ error: "Invalid passcode" }, 401);
        }
        const token = await createSessionToken(activeHash);
        return jsonResponse({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, request, basePath) });
      }

      if (request.method === 'POST' && subPath === '/api/auth/logout') {
        return jsonResponse({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', request, basePath) });
      }

      // Require Authentication for all other /api/* routes
      if (subPath.startsWith("/api/")) {
        const token = extractToken(request);
        // A server-to-server token is send-only; it cannot read fleet data or manage devices.
        const sendOnly = subPath === '/api/push/send' && request.method === 'POST' &&
          request.headers.get('Authorization')?.startsWith('Bearer ') && env.PUSH_SEND_TOKEN &&
          await timingSafeEqualStr(token || '', env.PUSH_SEND_TOKEN);
        const isAuthenticated = sendOnly || await verifySessionToken(token, env);
        if (!isAuthenticated) {
          return jsonResponse({ error: "Unauthorized — valid passcode required" }, 401);
        }

        if (!['GET', 'HEAD'].includes(request.method)) {
          const allowed = await env.WRITE_LIMITER.limit({ key: 'fleet-writes' });
          if (!allowed.success) return jsonResponse({ error: 'Too many changes. Try again in a minute.' }, 429);
        }
        if (subPath.startsWith('/api/push/')) {
          if (request.method === 'POST' && ['/api/push/send', '/api/push/test'].includes(subPath)) {
            const allowed = await env.PUSH_LIMITER.limit({ key: subPath + ':' + (request.headers.get('CF-Connecting-IP') || 'local') });
            if (!allowed.success) return jsonResponse({ error: 'Too many notification requests. Try again in a minute.' }, 429, { 'Retry-After': '60' });
          }
          return await handlePushApi(request, env, subPath, basePath);
        }
        // GET /api/auth/verify
        if (request.method === "GET" && subPath === "/api/auth/verify") {
          return jsonResponse({ ok: true });
        }

        // Explicit POST avoids putting VINs in app URLs, history or query logs; shared write limiter applies.
        if (request.method === 'POST' && subPath === '/api/vin/decode') {
          return jsonResponse({ decoded: await decodeVin(await request.json()) });
        }

        // GET /api/trucks
        if (request.method === "GET" && subPath === "/api/trucks") {
          await ensureTruckColumns(env);
          const settings = await getAppSettings(env);
          const trucks = await fetchEnrichedFleet(env, settings.warning_days);
          return jsonResponse({ trucks, settings });
        }

        // POST /api/trucks
        if (request.method === "POST" && subPath === "/api/trucks") {
          await ensureTruckColumns(env);
          const body = (await request.json()) as Partial<TruckRow>;
          const unit_number = String(body.unit_number || "").trim();
          const inspection = String(body.last_inspection_date || '').trim();
          if (inspection) validateDates(inspection, inspection);
          const next_due_date = String(body.next_due_date || (inspection ? defaultExpiryDate(inspection, Number(body.interval_months || 12)) : '')).trim();
          const vin_data = String(body.vin_data || '').trim();
          const reminder_days = normalizeReminderDayList(body.reminder_days === undefined ? '' : String(body.reminder_days));
          if (!unit_number) {
            return jsonResponse(
              { error: "unit_number is required" },
              400
            );
          }

          validateTruck({ ...body, vin_data, reminder_days, last_inspection_date: inspection, next_due_date });
          const id = crypto.randomUUID();
          const vehicle_type = String(body.vehicle_type || "Tractor").trim();
          const gvwr = String(body.gvwr || "").trim();
          const license_plate = String(body.license_plate || "").trim();
          const vin = String(body.vin || "").trim();
          const year = body.year ? Number(body.year) : null;
          const make = String(body.make || "").trim();
          const model = String(body.model || "").trim();
          const equipment_type = String(body.equipment_type || "").trim();
          const last_inspection_date = inspection;
          const interval_months = Number(body.interval_months || 12);
          const shop_name = String(body.shop_name || "").trim();
          const sticker_number = String(body.sticker_number || "").trim();
          const status = String(body.status || "Active").trim();
          const notes = String(body.notes || "").trim();

          await env.DB.prepare(
            `INSERT INTO trucks (
              id, unit_number, vehicle_type, gvwr, license_plate, vin, year, make, model, equipment_type, vin_data, reminder_days,
              last_inspection_date, next_due_date, interval_months, shop_name, sticker_number, status, notes
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)`
          )
            .bind(
              id,
              unit_number,
              vehicle_type,
              gvwr,
              license_plate,
              vin,
              year,
              make,
              model,
              equipment_type,
              vin_data,
              reminder_days,
              last_inspection_date,
              next_due_date,
              interval_months,
              shop_name,
              sticker_number,
              status,
              notes
            )
            .run();

          // If initial inspection date is provided, also seed an initial inspection record
          if (last_inspection_date && next_due_date) {
            const insId = crypto.randomUUID();
            await env.DB.prepare(
              `INSERT INTO inspections (id, truck_id, inspection_date, expiration_date, shop_name, sticker_number, notes)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
            )
              .bind(
                insId,
                id,
                last_inspection_date,
                next_due_date,
                shop_name,
                sticker_number,
                notes ? `Initial entry: ${notes}` : "Initial safety record"
              )
              .run();
          }

          const created = await env.DB.prepare("SELECT * FROM trucks WHERE id = ?1")
            .bind(id)
            .first<TruckRow>();
          const settings = await getAppSettings(env);
          return jsonResponse(
            { truck: created ? enrichTruck(created, settings.warning_days) : null },
            201
          );
        }

        // Printing is authenticated just like viewing a unit; QR payloads never contain credentials.
        const labelMatch = subPath.match(/^\/api\/trucks\/([^/]+)\/label$/);
        if (labelMatch && request.method === 'GET') {
          const unit = await env.DB.prepare('SELECT id FROM trucks WHERE id = ?1').bind(decodeURIComponent(labelMatch[1])).first<{ id: string }>();
          if (!unit) return jsonResponse({ error: 'Unit not found or deleted' }, 404);
          return new Response(renderUnitLabel(unit.id), { headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
          } });
        }

        // Match /api/trucks/:id
        const truckMatch = subPath.match(/^\/api\/trucks\/([^/]+)$/);
        if (truckMatch) {
          const truckId = decodeURIComponent(truckMatch[1]);

          if (request.method === "GET") {
            await ensureTruckColumns(env);
            const row = await env.DB.prepare("SELECT * FROM trucks WHERE id = ?1")
              .bind(truckId)
              .first<TruckRow>();
            if (!row) return jsonResponse({ error: "Truck not found" }, 404);
            const settings = await getAppSettings(env);
            const { results: unitAttachments } = await env.DB.prepare(
              "SELECT * FROM attachments WHERE truck_id = ?1 ORDER BY created_at DESC"
            ).bind(truckId).all<AttachmentRow>();
            const latestAvailable = (unitAttachments || []).find(att => !att.r2_key.startsWith('truck-safety-missing-backup/')) || null;
            return jsonResponse({
              truck: enrichTruck(row, settings.warning_days, (unitAttachments || []).length, latestAvailable),
            });
          }

          if (request.method === "PUT") {
            await ensureTruckColumns(env);
            const existing = await env.DB.prepare("SELECT * FROM trucks WHERE id = ?1")
              .bind(truckId)
              .first<TruckRow>();
            if (!existing) return jsonResponse({ error: "Truck not found" }, 404);

            const body = (await request.json()) as Partial<TruckRow>;
            const unit_number = String(body.unit_number ?? existing.unit_number).trim();
            const vehicle_type = String(body.vehicle_type ?? existing.vehicle_type).trim();
            const gvwr = String(body.gvwr ?? existing.gvwr).trim();
            const license_plate = String(body.license_plate ?? existing.license_plate).trim();
            const vin = String(body.vin ?? existing.vin).trim();
            const year = body.year !== undefined ? (body.year ? Number(body.year) : null) : existing.year;
            const make = String(body.make ?? existing.make).trim();
            const model = String(body.model ?? existing.model).trim();
            const equipment_type = String(body.equipment_type ?? existing.equipment_type ?? "").trim();
            const reminder_days = normalizeReminderDayList(body.reminder_days !== undefined ? String(body.reminder_days || '').trim() : String(existing.reminder_days || ''));
            const vin_data = body.vin_data !== undefined
              ? String(body.vin_data || '').trim()
              : vin.toUpperCase() === existing.vin.trim().toUpperCase() ? String(existing.vin_data || '') : '';
            const interval_months = Number(body.interval_months ?? existing.interval_months);
            const last_inspection_date = String(
              body.last_inspection_date ?? existing.last_inspection_date
            ).trim();
            let next_due_date = String(
              body.next_due_date ?? existing.next_due_date
            ).trim();
            if (!next_due_date && last_inspection_date) {
              validateDates(last_inspection_date, last_inspection_date);
              next_due_date = defaultExpiryDate(last_inspection_date, interval_months);
            }
            const shop_name = String(body.shop_name ?? existing.shop_name).trim();
            const sticker_number = String(body.sticker_number ?? existing.sticker_number).trim();
            const status = String(body.status ?? existing.status).trim();
            const notes = String(body.notes ?? existing.notes).trim();
            validateTruck({
              ...existing,
              ...body,
              unit_number,
              vehicle_type,
              gvwr,
              license_plate,
              vin,
              year,
              make,
              model,
              equipment_type,
              vin_data,
              reminder_days,
              last_inspection_date,
              next_due_date,
              interval_months,
              shop_name,
              sticker_number,
              status,
              notes,
            });

            await env.DB.prepare(
              `UPDATE trucks SET
                unit_number = ?1,
                vehicle_type = ?2,
                gvwr = ?3,
                license_plate = ?4,
                vin = ?5,
                year = ?6,
                make = ?7,
                model = ?8,
                equipment_type = ?9,
                vin_data = ?10,
                reminder_days = ?11,
                last_inspection_date = ?12,
                next_due_date = ?13,
                interval_months = ?14,
                shop_name = ?15,
                sticker_number = ?16,
                status = ?17,
                notes = ?18,
                updated_at = datetime('now')
              WHERE id = ?19`
            )
              .bind(
                unit_number,
                vehicle_type,
                gvwr,
                license_plate,
                vin,
                year,
                make,
                model,
                equipment_type,
                vin_data,
                reminder_days,
                last_inspection_date,
                next_due_date,
                interval_months,
                shop_name,
                sticker_number,
                status,
                notes,
                truckId
              )
              .run();

            const updated = await env.DB.prepare("SELECT * FROM trucks WHERE id = ?1")
              .bind(truckId)
              .first<TruckRow>();
            const settings = await getAppSettings(env);
            return jsonResponse({
              truck: updated ? enrichTruck(updated, settings.warning_days) : null,
            });
          }

          if (request.method === "DELETE") {
            // Delete any R2 objects belonging to this truck first
            const { results: files } = await env.DB.prepare(
              "SELECT r2_key FROM attachments WHERE truck_id = ?1"
            )
              .bind(truckId)
              .all<{ r2_key: string }>();

            for (const f of files || []) {
              if (f.r2_key) {
                await env.FILES.delete(f.r2_key);
              }
            }

            await env.DB.prepare("DELETE FROM attachments WHERE truck_id = ?1").bind(truckId).run();
            await env.DB.prepare("DELETE FROM inspections WHERE truck_id = ?1").bind(truckId).run();
            await env.DB.prepare("DELETE FROM trucks WHERE id = ?1").bind(truckId).run();
            return jsonResponse({ ok: true });
          }
        }

        // Match /api/trucks/:id/inspections
        const insMatch = subPath.match(/^\/api\/trucks\/([^/]+)\/inspections$/);
        if (insMatch) {
          const truckId = decodeURIComponent(insMatch[1]);

          if (request.method === "GET") {
            const { results: inspections } = await env.DB.prepare(
              "SELECT * FROM inspections WHERE truck_id = ?1 ORDER BY inspection_date DESC, created_at DESC"
            )
              .bind(truckId)
              .all<InspectionRow>();

            const { results: attachments } = await env.DB.prepare(
              "SELECT * FROM attachments WHERE truck_id = ?1 ORDER BY created_at DESC"
            )
              .bind(truckId)
              .all<AttachmentRow>();

            const byInspection: Record<string, AttachmentRow[]> = {};
            const unlinked: AttachmentRow[] = [];

            for (const att of attachments || []) {
              if (att.inspection_id) {
                byInspection[att.inspection_id] = byInspection[att.inspection_id] || [];
                byInspection[att.inspection_id].push(att);
              } else {
                unlinked.push(att);
              }
            }

            const withAvailability = (items: AttachmentRow[]) => items.map(item => ({
              ...item,
              file_available: !item.r2_key.startsWith('truck-safety-missing-backup/'),
            }));
            const enrichedInspections = (inspections || []).map((ins) => ({
              ...ins,
              attachments: withAvailability(byInspection[ins.id] || []),
            }));

            return jsonResponse({
              inspections: enrichedInspections,
              unlinked_attachments: withAvailability(unlinked),
            });
          }

          if (request.method === "POST") {
            const truck = await env.DB.prepare("SELECT * FROM trucks WHERE id = ?1")
              .bind(truckId)
              .first<TruckRow>();
            if (!truck) return jsonResponse({ error: "Truck not found" }, 404);

            const contentType = request.headers.get("Content-Type") || "";
            let inspection_date = "";
            let expiration_date = "";
            let shop_name = "";
            let sticker_number = "";
            let notes = "";
            let uploadedFile: File | null = null;

            if (contentType.includes("multipart/form-data")) {
              const form = await request.formData();
              inspection_date = String(form.get("inspection_date") || "").trim();
              expiration_date = String(form.get("expiration_date") || "").trim();
              shop_name = String(form.get("shop_name") || "").trim();
              sticker_number = String(form.get("sticker_number") || "").trim();
              notes = String(form.get("notes") || "").trim();
              const fileField = form.get("file");
              if (fileField && typeof fileField === "object" && "arrayBuffer" in fileField) {
                uploadedFile = fileField as File;
              }
            } else {
              const body = (await request.json()) as Partial<InspectionRow>;
              inspection_date = String(body.inspection_date || "").trim();
              expiration_date = String(body.expiration_date || "").trim();
              shop_name = String(body.shop_name || "").trim();
              sticker_number = String(body.sticker_number || "").trim();
              notes = String(body.notes || "").trim();
            }

            if (!inspection_date) {
              inspection_date = new Date().toISOString().slice(0, 10);
            }
            if (!expiration_date) {
              validateDates(inspection_date, inspection_date);
              expiration_date = defaultExpiryDate(inspection_date, truck.interval_months || 12);
            }

            validateDates(inspection_date, expiration_date);
            if (uploadedFile) await validateFile(uploadedFile);
            const insId = crypto.randomUUID();
            const insertInspection = env.DB.prepare(
              `INSERT INTO inspections (id, truck_id, inspection_date, expiration_date, shop_name, sticker_number, notes)
               VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
            ).bind(insId, truckId, inspection_date, expiration_date, shop_name, sticker_number, notes);

            const updateTruck = env.DB.prepare(
              `UPDATE trucks SET
                last_inspection_date = ?1,
                next_due_date = ?2,
                shop_name = CASE WHEN ?3 != '' THEN ?3 ELSE shop_name END,
                sticker_number = CASE WHEN ?4 != '' THEN ?4 ELSE sticker_number END,
                updated_at = datetime('now')
               WHERE id = ?5`
            )
              .bind(inspection_date, expiration_date, shop_name, sticker_number, truckId);

            let savedAttachment: AttachmentRow | null = null;
            if (uploadedFile) {
              savedAttachment = await saveUploadedFileToR2(env, uploadedFile, truckId, insId, [insertInspection, updateTruck]);
            } else {
              await env.DB.batch([insertInspection, updateTruck]);
            }

            return jsonResponse(
              {
                ok: true,
                inspection_id: insId,
                attachment: savedAttachment,
              },
              201
            );
          }
        }

        // Match /api/trucks/:id/attachments (Direct upload to R2 for a truck)
        const truckAttMatch = subPath.match(/^\/api\/trucks\/([^/]+)\/attachments$/);
        if (truckAttMatch && request.method === "POST") {
          const truckId = decodeURIComponent(truckAttMatch[1]);
          const truck = await env.DB.prepare("SELECT id FROM trucks WHERE id = ?1")
            .bind(truckId)
            .first<{ id: string }>();
          if (!truck) return jsonResponse({ error: "Truck not found" }, 404);

          const form = await request.formData();
          const fileField = form.get("file");
          const inspectionId = form.get("inspection_id")
            ? String(form.get("inspection_id"))
            : null;

          if (!fileField || typeof fileField !== "object" || !("arrayBuffer" in fileField)) {
            return jsonResponse({ error: "No file uploaded" }, 400);
          }

          if (inspectionId) {
            const belongs = await env.DB.prepare('SELECT id FROM inspections WHERE id = ?1 AND truck_id = ?2').bind(inspectionId, truckId).first();
            if (!belongs) throw new InputError('Inspection does not belong to this unit.');
          }
          const saved = await saveUploadedFileToR2(env, fileField as File, truckId, inspectionId);
          return jsonResponse({ ok: true, attachment: saved }, 201);
        }

        // Match /api/attachments/:id (Stream from R2 for in-app preview/download or delete)
        const attMatch = subPath.match(/^\/api\/attachments\/([^/]+)$/);
        if (attMatch) {
          const attId = decodeURIComponent(attMatch[1]);
          const att = await env.DB.prepare("SELECT * FROM attachments WHERE id = ?1")
            .bind(attId)
            .first<AttachmentRow>();

          if (!att) return jsonResponse({ error: "Attachment not found" }, 404);

          if (request.method === "GET") {
            if (att.r2_key.startsWith('truck-safety-missing-backup/')) {
              return jsonResponse({ error: 'Certificate file was not included in the backup; only its metadata was restored.' }, 404);
            }
            const obj = await env.FILES.get(att.r2_key);
            if (!obj) {
              return jsonResponse({ error: "File object not found in R2" }, 404);
            }

            const isDownload = url.searchParams.get("download") === "1";
            const disposition = isDownload
              ? `attachment; filename="${att.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
              : `inline; filename="${att.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}"`;

            return new Response(obj.body, {
              status: 200,
              headers: {
                "Content-Type": att.content_type || "application/octet-stream",
                "Content-Disposition": disposition,
                "Cache-Control": "no-store",
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'",
                ...corsHeaders,
              },
            });
          }

          if (request.method === "DELETE") {
            await env.FILES.delete(att.r2_key);
            await env.DB.prepare("DELETE FROM attachments WHERE id = ?1").bind(attId).run();
            return jsonResponse({ ok: true });
          }
        }

        // Read-only fleet exports omit private R2 content but include metadata and explicitly say so.
        if (request.method === 'GET' && subPath === '/api/backup') {
          await ensureTruckColumns(env);
          return await exportFleetBackup(env, url.searchParams.get('include_files') === '1');
        }

        if (request.method === 'POST' && subPath === '/api/backup/restore') {
          await ensureTruckColumns(env);
          return await restoreFleetBackup(request, env);
        }

        // GET /api/calendar.ics
        if (request.method === "GET" && subPath === "/api/calendar.ics") {
          const settings = await getAppSettings(env);
          const trucks = await fetchEnrichedFleet(env, settings.warning_days);
          const ics = generateIcsCalendar(trucks, `${url.origin}${basePath}`);
          return new Response(ics, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/calendar; charset=utf-8",
              "Content-Disposition": 'attachment; filename="truck-safety-schedule.ics"',
            },
          });
        }

        // GET & PUT /api/settings
        if (subPath === "/api/settings") {
          if (request.method === "GET") {
            const settings = await getAppSettings(env);
            return jsonResponse({ settings });
          }

          if (request.method === "PUT") {
            const body = (await request.json()) as {
              warning_days?: number;
              webhook_url?: string;
              webhook_type?: string;
              notify_days?: string | string[];
              new_passcode?: string;
            };

            if (body.webhook_url !== undefined) validateWebhookUrl(String(body.webhook_url).trim());
            const notifyDays = body.notify_days === undefined ? undefined : validateReminderDays(Array.isArray(body.notify_days) ? body.notify_days.join(',') : String(body.notify_days));
            if (body.notify_days !== undefined && notifyDays === '') throw new InputError('Select at least one fleet reminder day.');
            if (body.webhook_type !== undefined && !['auto','ntfy','discord','slack','generic'].includes(body.webhook_type)) throw new InputError('Invalid webhook type.');
            if (body.warning_days !== undefined && (!Number.isInteger(body.warning_days) || body.warning_days < 1 || body.warning_days > 180)) throw new InputError('Warning threshold must be 1–180 days.');
            if (body.new_passcode && (body.new_passcode.trim().length < 8 || body.new_passcode.length > 128)) throw new InputError('New passcode must be 8–128 characters.');
            if (body.warning_days !== undefined) {
              const days = Math.max(1, Math.min(365, Number(body.warning_days) || 30));
              await env.DB.prepare(
                "INSERT INTO settings (key, value, updated_at) VALUES ('warning_days', ?1, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
              )
                .bind(String(days))
                .run();
            }

            if (body.webhook_url !== undefined) {
              await env.DB.prepare(
                "INSERT INTO settings (key, value, updated_at) VALUES ('webhook_url', ?1, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
              )
                .bind(String(body.webhook_url).trim())
                .run();
            }

            if (body.webhook_type !== undefined) {
              await env.DB.prepare(
                "INSERT INTO settings (key, value, updated_at) VALUES ('webhook_type', ?1, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
              )
                .bind(String(body.webhook_type).trim())
                .run();
            }

            if (notifyDays !== undefined) {
              await env.DB.prepare(
                "INSERT INTO settings (key, value, updated_at) VALUES ('notify_days', ?1, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
              )
                .bind(notifyDays)
                .run();
            }

            let newToken: string | undefined;
            if (body.new_passcode && String(body.new_passcode).trim().length > 0) {
              const newHash = await hashPasscode(String(body.new_passcode).trim(), env.SESSION_SECRET);
              await env.DB.prepare(
                "INSERT INTO settings (key, value, updated_at) VALUES ('passcode_hash', ?1, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
              )
                .bind(newHash)
                .run();
              newToken = await createSessionToken(newHash);
            }

            const settings = await getAppSettings(env);
            return jsonResponse({ ok: true, settings }, 200, newToken ? { 'Set-Cookie': sessionCookie(newToken, request, basePath) } : {});
          }
        }

        // POST /api/notifications/test
        if (request.method === "POST" && subPath === "/api/notifications/test") {
          const body = (await request.json()) as {
            webhook_url?: string;
            webhook_type?: "auto" | "ntfy" | "discord" | "slack" | "generic";
          };
          const settings = await getAppSettings(env);
          const targetUrl = (body.webhook_url ?? settings.webhook_url).trim();
          const targetType = body.webhook_type ?? settings.webhook_type;
          const trucks = await fetchEnrichedFleet(env, settings.warning_days);
          const result = await dispatchWebhookNotification(
            targetUrl,
            targetType,
            trucks.filter(t => t.status !== 'Inactive'),
            true,
            `${url.origin}${basePath}`
          );
          if (!result.ok) {
            return jsonResponse({ error: result.message }, 400);
          }
          return jsonResponse({ ok: true, message: result.message });
        }

        return jsonResponse({ error: "API route not found" }, 404);
      }

      return jsonResponse({ error: "Not found", path: pathname }, 404);
    } catch (err) {
      if (err instanceof InputError) return jsonResponse({ error: err.message }, err.status);
      if (err instanceof SyntaxError) return jsonResponse({ error: 'Invalid JSON request.' }, 400);
      console.error(JSON.stringify({ event: "worker_error", error: String(err) }));
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },

  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const local = localReminderTime(controller.scheduledTime);
    if (local.hour !== '07') return;
    const settings = await getAppSettings(env);

    const trucks = await fetchEnrichedFleet(env, settings.warning_days);
    const activeTrucks = trucks.filter((t) => t.status !== "Inactive");
    const reminderTrucks = selectReminderTrucks(activeTrucks, settings.notify_days);
    const needsAlert = reminderTrucks.length > 0;

    if (needsAlert && pushConfigured(env)) {
      const result = await sendFleetPush(env, (env.BASE_PATH || '/truck-safety').replace(/\/+$/, ''), local.date);
      console.log(JSON.stringify({ event: 'daily_push', date: local.date, ...result }));
      if (result.failed) throw new Error('Some daily push services did not accept delivery; inspect push_delivery statuses.');
    }

    // Optional legacy webhooks remain independent; native push never calls a notification platform.
    if (needsAlert && settings.webhook_url) {
      const result = await dispatchWebhookNotification(
        settings.webhook_url,
        settings.webhook_type,
        reminderTrucks,
        false
      );
      if (!result.ok) throw new Error(result.message);
    }
  },
} satisfies ExportedHandler<Env>;
