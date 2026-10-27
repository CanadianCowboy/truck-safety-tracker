import { InputError, MAX_FILE_BYTES, validateFile, validDate } from './validation';
import {
  canWriteFleetRecords,
  fetchTargetAttributions,
  PASSCODE_ACTOR,
  recordShopActivity,
  type ShopActor,
} from './shop-accounts';

interface ShopDocumentRow {
  id: string;
  truck_id: string;
  document_type: string;
  label: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  expiry_date: string;
  r2_key: string;
  created_at: string;
  updated_at: string;
}

const DOCUMENT_TYPES = new Set(['registration', 'insurance', 'permit', 'maintenance', 'general']);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  } });
}

function text(value: string | File | null, name: string, max: number): string {
  if (typeof value !== 'string') throw new InputError(`${name} is required.`);
  const result = value.trim();
  if (result.length > max) throw new InputError(`${name} must be ${max} characters or fewer.`);
  return result;
}

function safeFileName(name: string): string {
  return (name || 'document').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'document';
}

function publicDocument(row: ShopDocumentRow): Omit<ShopDocumentRow, 'r2_key'> {
  const { r2_key: _privateKey, ...document } = row;
  return document;
}

export async function handleShopDocumentsApi(
  request: Request,
  db: D1Database,
  files: R2Bucket,
  actor: ShopActor = PASSCODE_ACTOR
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const match = url.pathname.match(/\/api\/trucks\/([^/]+)\/documents(?:\/([^/]+))?\/?$/);
    if (!match) return json({ error: 'Document route not found.' }, 404);
    const truckId = decodeURIComponent(match[1]);
    const documentId = match[2] ? decodeURIComponent(match[2]) : null;
    if (!truckId || truckId.length > 128 || truckId.includes('/')) throw new InputError('Invalid unit identifier.');
    const truck = await db.prepare('SELECT id, unit_number FROM trucks WHERE id = ?1').bind(truckId).first<{ id: string; unit_number: string }>();
    if (!truck) return json({ error: 'Truck not found.' }, 404);

    if (!documentId && request.method === 'GET') {
      const { results } = await db.prepare(`SELECT id, truck_id, document_type, label, file_name,
        content_type, size_bytes, expiry_date, created_at, updated_at
        FROM shop_unit_documents WHERE truck_id = ?1 ORDER BY CASE WHEN expiry_date = '' THEN 1 ELSE 0 END,
        expiry_date, document_type, label COLLATE NOCASE, id`).bind(truckId).all<Omit<ShopDocumentRow, 'r2_key'>>();
      const docs = results || [];
      const attributions = await fetchTargetAttributions(db, 'document', docs.map(d => d.id));
      const enriched = docs.map(doc => ({
        ...doc,
        ...(attributions[doc.id] ? {
          logged_by_name: attributions[doc.id].actor_name,
          logged_by_username: attributions[doc.id].actor_username,
          logged_by_role: attributions[doc.id].actor_role,
          logged_by_badge: attributions[doc.id].actor_badge,
          logged_by_color: attributions[doc.id].actor_color,
        } : {}),
      }));
      return json({ documents: enriched });
    }

    if (!['GET', 'HEAD'].includes(request.method) && !canWriteFleetRecords(actor)) {
      return json({ error: 'Read-only Viewer accounts cannot upload, edit, or delete unit documents.' }, 403);
    }

    if (!documentId && request.method === 'POST') {
      if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('multipart/form-data')) throw new InputError('Upload a multipart/form-data document request.');
      const form = await request.formData();
      for (const key of form.keys()) if (!['document_type', 'label', 'expiry_date', 'file'].includes(key)) throw new InputError('Request contains unsupported fields.');
      const documentType = text(form.get('document_type'), 'Document type', 24);
      if (!DOCUMENT_TYPES.has(documentType)) throw new InputError('Choose registration, insurance, permit, maintenance, or general.');
      const label = text(form.get('label') ?? '', 'Label', 255);
      const expiryDate = text(form.get('expiry_date') ?? '', 'Expiry date', 10);
      if (expiryDate && !validDate(expiryDate)) throw new InputError('Enter a valid expiry date (YYYY-MM-DD).');
      const fileEntry = form.get('file');
      if (!fileEntry || typeof fileEntry === 'string' || typeof fileEntry.arrayBuffer !== 'function') throw new InputError('Choose a document file.');
      const file = fileEntry as File;
      await validateFile(file);
      if (file.size > MAX_FILE_BYTES) throw new InputError('Upload a nonempty file of 10 MB or less.', 413);

      const id = crypto.randomUUID();
      const fileName = safeFileName(file.name);
      const objectKey = `truck-safety/${truckId}/documents/${id}-${fileName}`;
      await files.put(objectKey, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { truckId, documentId: id, documentType },
      });
      try {
        await db.prepare(`INSERT INTO shop_unit_documents
          (id, truck_id, document_type, label, file_name, content_type, size_bytes, expiry_date, r2_key)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
          .bind(id, truckId, documentType, label, file.name || fileName, file.type, file.size, expiryDate, objectKey).run();
      } catch (error) {
        await files.delete(objectKey);
        throw error;
      }
      await recordShopActivity(
        db,
        actor,
        'document_uploaded',
        `Uploaded ${documentType} document${label ? ` (${label})` : ''} for Unit #${truck.unit_number}`,
        'document',
        id
      );
      const row = await db.prepare(`SELECT id, truck_id, document_type, label, file_name, content_type,
        size_bytes, expiry_date, r2_key, created_at, updated_at FROM shop_unit_documents WHERE id = ?1`)
        .bind(id).first<ShopDocumentRow>();
      const baseDoc = row ? publicDocument(row) : {
        id, truck_id: truckId, document_type: documentType, label, file_name: file.name || fileName,
        content_type: file.type, size_bytes: file.size, expiry_date: expiryDate,
      };
      return json({
        document: {
          ...baseDoc,
          logged_by_name: actor.display_name,
          logged_by_username: actor.username,
          logged_by_role: actor.role,
          logged_by_badge: actor.badge_number,
          logged_by_color: actor.avatar_color,
        },
      }, 201);
    }

    if (!documentId) return json({ error: 'Method not allowed.' }, 405);
    if (documentId.length > 128 || documentId.includes('/')) throw new InputError('Invalid document identifier.');
    const document = await db.prepare('SELECT * FROM shop_unit_documents WHERE truck_id = ?1 AND id = ?2')
      .bind(truckId, documentId).first<ShopDocumentRow>();
    if (!document) return json({ error: 'Document not found.' }, 404);

    if (request.method === 'GET') {
      const object = await files.get(document.r2_key);
      if (!object) return json({ error: 'Document file not found.' }, 404);
      const download = url.searchParams.get('download') === '1';
      return new Response(object.body, { headers: {
        'Content-Type': document.content_type,
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeFileName(document.file_name)}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'",
      } });
    }

    if (request.method === 'PUT') {
      const value: unknown = await request.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new InputError('Expected a document object.');
      const input = value as Record<string, unknown>;
      if (Object.keys(input).some(key => !['document_type', 'label', 'expiry_date'].includes(key))) throw new InputError('Request contains unsupported fields.');
      const documentType = input.document_type === undefined ? document.document_type : input.document_type;
      const labelValue = input.label === undefined ? document.label : input.label;
      const expiryValue = input.expiry_date === undefined ? document.expiry_date : input.expiry_date;
      if (typeof documentType !== 'string' || !DOCUMENT_TYPES.has(documentType)) throw new InputError('Invalid document type.');
      if (typeof labelValue !== 'string' || labelValue.trim().length > 255) throw new InputError('Label must be 255 characters or fewer.');
      if (typeof expiryValue !== 'string' || expiryValue !== '' && !validDate(expiryValue)) throw new InputError('Enter a valid expiry date (YYYY-MM-DD), or leave it blank.');
      await db.prepare(`UPDATE shop_unit_documents SET document_type = ?1, label = ?2, expiry_date = ?3,
        updated_at = datetime('now') WHERE truck_id = ?4 AND id = ?5`)
        .bind(documentType, labelValue.trim(), expiryValue, truckId, documentId).run();
      await recordShopActivity(
        db,
        actor,
        'document_updated',
        `Updated ${documentType} document${labelValue.trim() ? ` (${labelValue.trim()})` : ''} for Unit #${truck.unit_number}`,
        'document',
        documentId
      );
      return json({
        document: {
          ...publicDocument(document),
          document_type: documentType,
          label: labelValue.trim(),
          expiry_date: expiryValue,
          logged_by_name: actor.display_name,
          logged_by_username: actor.username,
          logged_by_role: actor.role,
          logged_by_badge: actor.badge_number,
          logged_by_color: actor.avatar_color,
        },
      });
    }

    if (request.method === 'DELETE') {
      // Delete the blob first. If D1 then fails, metadata remains truthful enough to retry.
      await files.delete(document.r2_key);
      await db.prepare('DELETE FROM shop_unit_documents WHERE truck_id = ?1 AND id = ?2').bind(truckId, documentId).run();
      await recordShopActivity(
        db,
        actor,
        'document_deleted',
        `Deleted ${document.document_type} document (${document.file_name}) from Unit #${truck.unit_number}`,
        'document',
        documentId
      );
      return json({ ok: true });
    }
    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON request.' }, 400);
    console.error(JSON.stringify({ event: 'shop_documents_error', error: String(error) }));
    return json({ error: 'Internal server error.' }, 500);
  }
}

export const shopDocumentValidation = { documentTypes: DOCUMENT_TYPES, safeFileName };
