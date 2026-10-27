import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handleShopDocumentsApi } from '../src/shop-documents';
import { handleShopAccountsApi } from '../src/shop-accounts';
import { renderAppHtml } from '../src/ui';

const migrations = readdirSync(`${process.cwd()}/migrations`).filter(file => /^\d+_.*\.sql$/.test(file)).sort()
  .map(file => readFileSync(`${process.cwd()}/migrations/${file}`, 'utf8'));

class LocalD1 {
  private readonly sqlite = new DatabaseSync(':memory:');
  constructor() {
    this.sqlite.exec('PRAGMA foreign_keys = ON');
    for (const migration of migrations) this.sqlite.exec(migration);
    this.sqlite.exec("INSERT INTO trucks (id, unit_number, next_due_date) VALUES ('unit-real-id', 'SHOP-UNIT-1', '')");
  }
  prepare(query: string): D1PreparedStatement { return new LocalStatement(this.sqlite, query) as unknown as D1PreparedStatement; }
}

class LocalStatement {
  private values: unknown[] = [];
  constructor(private readonly sqlite: DatabaseSync, private readonly query: string) {}
  bind(...values: unknown[]): D1PreparedStatement { this.values = values; return this as unknown as D1PreparedStatement; }
  async first<T>(): Promise<T | null> { return (this.sqlite.prepare(this.query).get(...this.values as never[]) as T | undefined) ?? null; }
  async all<T>(): Promise<{ results: T[] }> { return { results: this.sqlite.prepare(this.query).all(...this.values as never[]) as T[] }; }
  async run(): Promise<unknown> {
    const result = this.sqlite.prepare(this.query).run(...this.values as never[]);
    return { meta: { changes: Number(result.changes) } };
  }
}

class LocalFiles {
  readonly objects = new Map<string, Uint8Array>();
  async put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string): Promise<void> {
    if (typeof value === 'string') this.objects.set(key, new TextEncoder().encode(value));
    else if (value instanceof ArrayBuffer) this.objects.set(key, new Uint8Array(value));
    else if (ArrayBuffer.isView(value)) this.objects.set(key, new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    else this.objects.set(key, new Uint8Array(await new Response(value).arrayBuffer()));
  }
  async get(key: string): Promise<R2ObjectBody | null> {
    const bytes = this.objects.get(key);
    if (!bytes) return null;
    return { body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) } as R2ObjectBody;
  }
  async delete(key: string): Promise<void> { this.objects.delete(key); }
}

function documentRequest(path: string, method: string, body?: BodyInit): Request {
  return new Request(`https://shop.test/truck-safety/api/trucks/unit-real-id/documents${path}`, { method, body });
}

describe('MIT shop unit documents', () => {
  it('exposes general documents in unit details while leaving the shared gate in place', () => {
    const html = renderAppHtml('/truck-safety');
    for (const marker of ['Unit Documents', 'Registration', 'Insurance', 'Maintenance', 'Expiry date (optional)', 'id="gate-view"']) expect(html).toContain(marker);
  });

  it('stores documents privately, validates expiry, edits metadata, and streams/deletes authorized unit files', async () => {
    const db = new LocalD1();
    const files = new LocalFiles();
    const form = new FormData();
    form.set('document_type', 'insurance');
    form.set('label', 'Annual policy');
    form.set('expiry_date', '2027-03-31');
    form.set('file', new File(['%PDF-1.7\ninsurance record'], 'policy.pdf', { type: 'application/pdf' }));
    const uploaded = await handleShopDocumentsApi(documentRequest('', 'POST', form), db as unknown as D1Database, files as unknown as R2Bucket);
    expect(uploaded.status).toBe(201);
    const result = await uploaded.json() as { document: { id: string; expiry_date: string; document_type: string } };
    expect(result.document).toMatchObject({ expiry_date: '2027-03-31', document_type: 'insurance' });

    const row = await db.prepare('SELECT r2_key FROM shop_unit_documents WHERE id = ?1').bind(result.document.id).first<{ r2_key: string }>();
    expect(row?.r2_key).toContain('/documents/');
    expect(files.objects.has(row!.r2_key)).toBe(true);
    const listed = await handleShopDocumentsApi(documentRequest('', 'GET'), db as unknown as D1Database, files as unknown as R2Bucket);
    expect(await listed.json()).toMatchObject({ documents: [{ id: result.document.id, label: 'Annual policy', expiry_date: '2027-03-31' }] });

    const invalidForm = new FormData();
    invalidForm.set('document_type', 'permit');
    invalidForm.set('expiry_date', '2027-02-30');
    invalidForm.set('file', new File(['%PDF-1.7\ninvalid date'], 'x.pdf', { type: 'application/pdf' }));
    expect((await handleShopDocumentsApi(documentRequest('', 'POST', invalidForm), db as unknown as D1Database, files as unknown as R2Bucket)).status).toBe(400);

    const updated = await handleShopDocumentsApi(documentRequest('/' + result.document.id, 'PUT', JSON.stringify({ label: 'Renewed policy', expiry_date: '', document_type: 'insurance' })), db as unknown as D1Database, files as unknown as R2Bucket);
    expect(await updated.json()).toMatchObject({ document: { label: 'Renewed policy', expiry_date: '' } });
    const streamed = await handleShopDocumentsApi(documentRequest('/' + result.document.id, 'GET'), db as unknown as D1Database, files as unknown as R2Bucket);
    expect(streamed.status).toBe(200);
    expect(streamed.headers.get('Cache-Control')).toBe('no-store');
    expect(await streamed.text()).toContain('%PDF-1.7');
    expect((await handleShopDocumentsApi(documentRequest('/missing', 'GET'), db as unknown as D1Database, files as unknown as R2Bucket)).status).toBe(404);

    expect((await handleShopDocumentsApi(documentRequest('/' + result.document.id, 'DELETE'), db as unknown as D1Database, files as unknown as R2Bucket)).status).toBe(200);
    expect(files.objects.size).toBe(0);
  });

  it('supports editing and removing shop accounts', async () => {
    const db = new LocalD1();
    const created = await handleShopAccountsApi(new Request('https://shop.test/api/shop-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: 'Owner', username: 'shop.owner', password: 'a-different-test-password' }) }), db as unknown as D1Database);
    const body = await created.json() as { account: { id: string } };
    const updated = await handleShopAccountsApi(new Request(`https://shop.test/api/shop-accounts/${body.account.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: 'Updated Owner', username: 'new.owner' }) }), db as unknown as D1Database);
    expect(await updated.json()).toMatchObject({ individualLoginEnabled: true, account: { display_name: 'Updated Owner', username: 'new.owner' } });
    expect((await handleShopAccountsApi(new Request(`https://shop.test/api/shop-accounts/${body.account.id}`, { method: 'DELETE' }), db as unknown as D1Database)).status).toBe(200);
    const accounts = await handleShopAccountsApi(new Request('https://shop.test/api/shop-accounts'), db as unknown as D1Database);
    expect(await accounts.json()).toMatchObject({ accounts: [] });
  });
});
