import type { Env, InspectionRow, TruckRow, AttachmentRow } from './types';
import { InputError } from './validation';
import { createFleetBackup, getCertificateBytes, parseFleetBackupJson, planFleetRestore } from './backup';

export async function exportFleetBackup(env: Env, includeFiles = false): Promise<Response> {
  const [unitRows, inspectionRows, attachmentRows] = await Promise.all([
    env.DB.prepare('SELECT * FROM trucks ORDER BY unit_number COLLATE NOCASE, id').all<TruckRow>(),
    env.DB.prepare('SELECT * FROM inspections ORDER BY truck_id, inspection_date, id').all<InspectionRow>(),
    env.DB.prepare('SELECT * FROM attachments ORDER BY truck_id, created_at, id').all<AttachmentRow>(),
  ]);
  const attachments = attachmentRows.results || [];
  if ((unitRows.results || []).length > 5000 || (inspectionRows.results || []).length > 50000 || attachments.length > 50000) throw new InputError('Fleet exceeds the supported backup record limits.', 413);
  const certificateFiles = includeFiles ? new Map<string, string>() : undefined;
  if (certificateFiles) {
    let totalBytes = 0;
    for (const attachment of attachments) {
      if (attachment.r2_key.startsWith('truck-safety-missing-backup/')) {
        throw new InputError(`Cannot create a complete backup with certificate files because ${attachment.file_name} was restored from a metadata-only backup and its file is unavailable.`, 409);
      }
      const object = await env.FILES.get(attachment.r2_key);
      if (!object) throw new InputError(`Cannot create a complete backup because certificate ${attachment.file_name} is missing from private storage.`, 409);
      // Check the object metadata before buffering bytes so an unexpectedly large R2 object cannot exhaust Worker memory.
      totalBytes += object.size;
      if (object.size !== attachment.size_bytes || object.size > 10 * 1024 * 1024 || totalBytes > 20 * 1024 * 1024) {
        throw new InputError('Certificate archive exceeds the supported 20 MB file limit or has inconsistent metadata.', 413);
      }
      const bytes = new Uint8Array(await object.arrayBuffer());
      if (bytes.byteLength !== attachment.size_bytes || bytes.byteLength > 10 * 1024 * 1024 || totalBytes > 20 * 1024 * 1024) {
        throw new InputError('Certificate archive exceeds the supported 20 MB file limit or has inconsistent metadata.', 413);
      }
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      certificateFiles.set(attachment.id, btoa(binary));
    }
  }
  const backup = createFleetBackup(unitRows.results || [], inspectionRows.results || [], attachments, certificateFiles);
  const body = JSON.stringify(backup);
  if (new TextEncoder().encode(body).byteLength > 30 * 1024 * 1024) throw new InputError('Backup exceeds the supported 30 MB archive limit.', 413);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="truck-safety-backup-${includeFiles ? 'with-certificates-' : ''}${date}.json"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function restoreFleetBackup(request: Request, env: Env): Promise<Response> {
  const backup = parseFleetBackupJson(await request.text());
  const existingResult = await env.DB.prepare('SELECT id, unit_number FROM trucks').all<Pick<TruckRow, 'id' | 'unit_number'>>();
  const existingUnits = existingResult.results || [];
  const matches = planFleetRestore(backup, existingUnits);
  const existingInspectionRows = await env.DB.prepare('SELECT id FROM inspections').all<{ id: string }>();
  const existingInspectionIds = new Set((existingInspectionRows.results || []).map(row => row.id));
  const existingAttachmentRows = await env.DB.prepare('SELECT id, truck_id, file_name, r2_key FROM attachments').all<Pick<AttachmentRow, 'id' | 'truck_id' | 'file_name' | 'r2_key'>>();
  const existingAttachmentsById = new Map((existingAttachmentRows.results || []).map(row => [row.id, row]));
  const unitNumbers = new Map(existingUnits.map(unit => [unit.unit_number.trim().toLowerCase(), unit.id]));
  const backupUnitIds = new Set(backup.units.map(unit => unit.id));
  const backupInspectionIds = new Set(backup.inspections.map(inspection => inspection.id));

  // Preflight every uniqueness constraint and construct all DB batches before mutating R2 or D1.
  for (const unit of backup.units) {
    const occupied = unitNumbers.get(unit.unit_number.trim().toLowerCase());
    if (occupied && occupied !== unit.id) throw new InputError(`Unit number ${unit.unit_number} belongs to a different existing unit. Resolve this conflict before restoring.`);
  }
  for (const inspection of backup.inspections) {
    if (!backupUnitIds.has(inspection.truck_id)) throw new InputError('Backup inspection references a missing unit.');
    if (existingInspectionIds.has(inspection.id)) {
      const current = await env.DB.prepare('SELECT truck_id FROM inspections WHERE id = ?1').bind(inspection.id).first<{ truck_id: string }>();
      if (current && current.truck_id !== inspection.truck_id) throw new InputError('An inspection ID is already associated with a different unit.');
    }
  }
  for (const item of backup.attachments) {
    if (item.inspection_id && !backupInspectionIds.has(item.inspection_id)) throw new InputError('Backup certificate references a missing inspection.');
    const occupied = unitNumbers.get(backup.units.find(unit => unit.id === item.truck_id)?.unit_number.trim().toLowerCase() || '');
    if (occupied && occupied !== item.truck_id) throw new InputError(`Unit number conflict prevents restoring certificate ${item.file_name}.`);
  }

  const statements: D1PreparedStatement[] = [];
  let unitsAdded = 0;
  let unitsUpdated = 0;
  let inspectionsAdded = 0;
  for (const truck of backup.units) {
    const exists = matches.has(truck.id);
    if (exists) unitsUpdated++;
    else unitsAdded++;
    statements.push(env.DB.prepare(`INSERT INTO trucks (
      id, unit_number, vehicle_type, gvwr, license_plate, vin, year, make, model, equipment_type, vin_data, reminder_days,
      last_inspection_date, next_due_date, interval_months, shop_name, sticker_number, status, notes, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)
    ON CONFLICT(id) DO UPDATE SET unit_number = excluded.unit_number, vehicle_type = excluded.vehicle_type,
      gvwr = excluded.gvwr, license_plate = excluded.license_plate, vin = excluded.vin, year = excluded.year,
      make = excluded.make, model = excluded.model, equipment_type = excluded.equipment_type,
      vin_data = excluded.vin_data, reminder_days = excluded.reminder_days,
      last_inspection_date = excluded.last_inspection_date, next_due_date = excluded.next_due_date,
      interval_months = excluded.interval_months, shop_name = excluded.shop_name,
      sticker_number = excluded.sticker_number, status = excluded.status, notes = excluded.notes,
      updated_at = excluded.updated_at`).bind(
      truck.id, truck.unit_number, truck.vehicle_type, truck.gvwr, truck.license_plate, truck.vin, truck.year,
      truck.make, truck.model, truck.equipment_type, truck.vin_data, truck.reminder_days,
      truck.last_inspection_date, truck.next_due_date, truck.interval_months, truck.shop_name,
      truck.sticker_number, truck.status, truck.notes, truck.created_at, truck.updated_at,
    ));
  }
  for (const inspection of backup.inspections) {
    if (!existingInspectionIds.has(inspection.id)) inspectionsAdded++;
    statements.push(env.DB.prepare(`INSERT INTO inspections (id, truck_id, inspection_date, expiration_date, shop_name, sticker_number, notes, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ON CONFLICT(id) DO UPDATE SET truck_id = excluded.truck_id,
      inspection_date = excluded.inspection_date, expiration_date = excluded.expiration_date,
      shop_name = excluded.shop_name, sticker_number = excluded.sticker_number, notes = excluded.notes, created_at = excluded.created_at`)
      .bind(inspection.id, inspection.truck_id, inspection.inspection_date, inspection.expiration_date,
        inspection.shop_name, inspection.sticker_number, inspection.notes, inspection.created_at));
  }
  const attachmentsToRestore: typeof backup.attachments = [];
  for (const attachment of backup.attachments) {
    const current = existingAttachmentsById.get(attachment.id);
    if (current) {
      if (current.truck_id !== attachment.truck_id) throw new InputError(`Certificate ${attachment.file_name} conflicts with an existing record.`);
      // Upgrade an existing metadata-only record if the incoming backup includes the certificate bytes.
      if (current.r2_key.startsWith('truck-safety-missing-backup/') && attachment.file_data !== undefined) {
        attachmentsToRestore.push(attachment);
      }
    } else {
      attachmentsToRestore.push(attachment);
    }
  }
  for (const item of attachmentsToRestore) {
    const bytes = getCertificateBytes(item);
    if (backup.includes_certificate_files && !bytes) throw new InputError('Certificate archive is incomplete; refusing a partial file restore.');
    if (bytes && bytes.byteLength !== item.size_bytes) throw new InputError(`Certificate ${item.file_name} has inconsistent metadata.`);
  }

  const batchSize = 50;
  const dbBatches: D1PreparedStatement[][] = [];
  for (let offset = 0; offset < statements.length; offset += batchSize) dbBatches.push(statements.slice(offset, offset + batchSize));
  const restoredObjectKeys: string[] = [];
  try {
    // Keep file bytes private in R2; DB metadata is linked only after object uploads succeed.
    for (const item of attachmentsToRestore) {
      const bytes = getCertificateBytes(item);
      let r2Key: string | null = null;
      if (bytes) {
        r2Key = `truck-safety/${item.truck_id}/${item.id}-restored`;
        await env.FILES.put(r2Key, bytes, {
          httpMetadata: { contentType: item.content_type },
          customMetadata: { truckId: item.truck_id, inspectionId: item.inspection_id || '', fileName: item.file_name },
        });
        restoredObjectKeys.push(r2Key);
      }
      // An unavailable certificate is represented only in D1 metadata; never create an empty R2 object.
      dbBatches.push([env.DB.prepare(`INSERT INTO attachments (id, truck_id, inspection_id, file_name, content_type, size_bytes, r2_key, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET r2_key = excluded.r2_key, content_type = excluded.content_type, size_bytes = excluded.size_bytes`)
        .bind(item.id, item.truck_id, item.inspection_id, item.file_name, item.content_type, item.size_bytes,
          r2Key || `truck-safety-missing-backup/${item.id}`, item.created_at)]);
    }
    for (const batch of dbBatches) await env.DB.batch(batch);
  } catch (error) {
    await Promise.allSettled(restoredObjectKeys.map(key => env.FILES.delete(key)));
    throw error;
  }
  return Response.json({ ok: true, units_added: unitsAdded, units_updated: unitsUpdated, inspections_added: inspectionsAdded,
    certificate_files_restored: attachmentsToRestore.filter(item => item.file_data !== undefined).length,
    certificate_files_missing: attachmentsToRestore.filter(item => item.file_data === undefined).length,
    certificate_note: backup.certificate_note }, {
    status: 200, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
