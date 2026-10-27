import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';
import { renderAppHtml } from '../src/ui';
import { createSessionToken, hashPasscode } from '../src/utils';
import { handleShopAccountsApi } from '../src/shop-accounts';
import type { Env } from '../src/types';

const migrations = readdirSync(`${process.cwd()}/migrations`)
  .filter(file => /^\d+_.*\.sql$/.test(file))
  .sort()
  .map(file => readFileSync(`${process.cwd()}/migrations/${file}`, 'utf8'));

class IsolatedD1 {
  private readonly sqlite = new DatabaseSync(':memory:');

  constructor() {
    this.sqlite.exec('PRAGMA foreign_keys = ON');
    for (const migration of migrations) this.sqlite.exec(migration);
  }

  prepare(query: string): D1PreparedStatement {
    return new IsolatedD1Statement(this.sqlite, query) as unknown as D1PreparedStatement;
  }

  async batch(statements: D1PreparedStatement[]): Promise<unknown[]> {
    const out: unknown[] = [];
    for (const stmt of statements) {
      out.push(await (stmt as unknown as IsolatedD1Statement).run());
    }
    return out;
  }
}

class IsolatedD1Statement {
  private values: unknown[] = [];
  constructor(private readonly sqlite: DatabaseSync, private readonly query: string) {}

  bind(...values: unknown[]): D1PreparedStatement {
    this.values = values;
    return this as unknown as D1PreparedStatement;
  }

  async first<T>(): Promise<T | null> {
    return (this.sqlite.prepare(this.query).get(...(this.values as never[])) as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.sqlite.prepare(this.query).all(...(this.values as never[])) as T[] };
  }

  async run(): Promise<unknown> {
    return this.sqlite.prepare(this.query).run(...(this.values as never[]));
  }
}

function request(method: string, body?: unknown, path = '/truck-safety/api/shop-accounts'): Request {
  return new Request(`https://shop.test${path}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createTestEnv(db: IsolatedD1, passcode = 'shop-account-test-passcode', secret = 'shop-account-test-session-secret'): Env {
  return {
    BASE_PATH: '/truck-safety',
    INITIAL_PASSCODE: passcode,
    SESSION_SECRET: secret,
    DB: db as unknown as D1Database,
    FILES: {} as unknown as R2Bucket,
    WRITE_LIMITER: { limit: async () => ({ success: true }) },
    LOGIN_LIMITER: { limit: async () => ({ success: true }) },
    PUSH_LIMITER: { limit: async () => ({ success: true }) },
  } as unknown as Env;
}

function extractCookieToken(res: Response): string {
  const cookie = res.headers.get('Set-Cookie') || '';
  const match = cookie.match(/ts_token=([^;]+)/);
  return match ? match[1] : '';
}

describe('shop accounts & staff directory (isolated SQLite; no production fleet records)', () => {
  it('renders dual gate sign-in, staff directory filters, role/profile controls, password tools, and activity feed', () => {
    const html = renderAppHtml('/truck-safety');
    expect(html).toContain('id="gate-tab-passcode"');
    expect(html).toContain('id="gate-tab-account"');
    expect(html).toContain('id="gate-username"');
    expect(html).toContain('id="gate-account-password"');
    expect(html).toContain('id="btn-open-shop-accounts"');
    expect(html).toContain('id="btn-tools-shop-accounts"');
    expect(html).toContain('id="modal-shop-accounts"');
    expect(html).toContain('id="form-shop-account"');
    expect(html).toContain('id="shop-account-role"');
    expect(html).toContain('id="shop-account-status-select"');
    expect(html).toContain('id="shop-account-title"');
    expect(html).toContain('id="shop-account-badge"');
    expect(html).toContain('id="shop-account-phone"');
    expect(html).toContain('id="shop-account-swatches"');
    expect(html).toContain('id="btn-shop-pw-generate"');
    expect(html).toContain('id="shop-account-activity-list"');
    expect(html).toContain('Both the shared shop passcode and active personal accounts can unlock the dashboard');
  });

  it('stores rich staff directory fields and salted PBKDF2 password hashes without leaking credentials', async () => {
    const db = new IsolatedD1();
    const response = await handleShopAccountsApi(
      request('POST', {
        display_name: 'Jordan Friesen',
        username: 'jordan.tech',
        password: 'distinct-test-password-1',
        role: 'technician',
        status: 'active',
        job_title: 'Lead Heavy-Duty Mechanic',
        badge_number: 'CVIP #882',
        phone: '(204) 555-0148',
        notes: 'Bay 2 lead · Air brake specialist',
        avatar_color: '#10b981',
      }),
      db as unknown as D1Database
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      account: Record<string, unknown>;
      individualLoginEnabled: boolean;
    };
    expect(body.individualLoginEnabled).toBe(true);
    expect(body.account).toMatchObject({
      display_name: 'Jordan Friesen',
      username: 'jordan.tech',
      role: 'technician',
      status: 'active',
      job_title: 'Lead Heavy-Duty Mechanic',
      badge_number: 'CVIP #882',
      phone: '(204) 555-0148',
      notes: 'Bay 2 lead · Air brake specialist',
      avatar_color: '#10b981',
    });
    expect(JSON.stringify(body)).not.toContain('distinct-test-password-1');

    const row = await db
      .prepare('SELECT password_salt, password_hash, password_iterations FROM shop_accounts WHERE username = ?1')
      .bind('jordan.tech')
      .first<{ password_salt: string; password_hash: string; password_iterations: number }>();
    expect(row?.password_salt).toMatch(/^[a-f0-9]{32}$/);
    expect(row?.password_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row?.password_iterations).toBeGreaterThanOrEqual(600_000);
    expect(row?.password_hash).not.toBe('distinct-test-password-1');

    const list = await handleShopAccountsApi(request('GET'), db as unknown as D1Database);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as {
      accounts: Array<Record<string, unknown>>;
      recent_activity: Array<Record<string, unknown>>;
      individualLoginEnabled: boolean;
    };
    expect(listBody.individualLoginEnabled).toBe(true);
    expect(listBody.accounts).toHaveLength(1);
    expect(listBody.accounts[0]).not.toHaveProperty('password_hash');
    expect(listBody.accounts[0]).not.toHaveProperty('password_salt');
    expect(listBody.recent_activity.length).toBeGreaterThanOrEqual(1);
  });

  it('supports both shared passcode login and personal staff account login with role enforcement and session revocation', async () => {
    const db = new IsolatedD1();
    const secret = 'shop-account-test-session-secret';
    const passcode = 'shop-account-test-passcode';
    const env = createTestEnv(db, passcode, secret);
    const passcodeHash = await hashPasscode(passcode, secret);
    const ownerToken = await createSessionToken(passcodeHash);

    // Anonymous access is blocked
    const anonymous = await worker.fetch(new Request('https://shop.test/truck-safety/api/shop-accounts'), env, {} as ExecutionContext);
    expect(anonymous.status).toBe(401);

    // Create a technician and a viewer account via passcode session
    const techRes = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/shop-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://shop.test',
          Cookie: `ts_token=${ownerToken}`,
        },
        body: JSON.stringify({
          display_name: 'Alex Mechanic',
          username: 'alex.mech',
          password: 'mechanic-password-8',
          role: 'technician',
          badge_number: 'Red Seal #4419',
          job_title: 'Shop Technician',
          avatar_color: '#f59e0b',
        }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(techRes.status).toBe(201);
    const techAccount = ((await techRes.json()) as { account: { id: string } }).account;

    const viewerRes = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/shop-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://shop.test',
          Cookie: `ts_token=${ownerToken}`,
        },
        body: JSON.stringify({
          display_name: 'Sam Dispatcher',
          username: 'sam.view',
          password: 'viewer-password-8',
          role: 'viewer',
        }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(viewerRes.status).toBe(201);

    // Sign in as technician via /api/auth/login
    const loginRes = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://shop.test' },
        body: JSON.stringify({ username: 'ALEX.MECH', password: 'mechanic-password-8' }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(loginRes.status).toBe(200);
    const loginData = (await loginRes.json()) as { ok: boolean; actor: { mode: string; username: string; role: string; badge_number: string } };
    expect(loginData.ok).toBe(true);
    expect(loginData.actor).toMatchObject({
      mode: 'account',
      username: 'alex.mech',
      role: 'technician',
      badge_number: 'Red Seal #4419',
    });
    const techToken = extractCookieToken(loginRes);
    expect(techToken).toMatch(/^acct\./);

    // Verify endpoint returns active technician actor
    const verifyRes = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/auth/verify', {
        headers: { Cookie: `ts_token=${techToken}` },
      }),
      env,
      {} as ExecutionContext
    );
    expect(verifyRes.status).toBe(200);
    expect(await verifyRes.json()).toMatchObject({
      ok: true,
      actor: { mode: 'account', username: 'alex.mech', role: 'technician' },
    });

    // Technician cannot create/delete staff accounts (403)
    const techManageAttempt = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/shop-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://shop.test',
          Cookie: `ts_token=${techToken}`,
        },
        body: JSON.stringify({
          display_name: 'Unauthorized Staff',
          username: 'unauth.user',
          password: 'password1234',
        }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(techManageAttempt.status).toBe(403);

    // Viewer can sign in and read fleet, but cannot write fleet records (403)
    const viewerLogin = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://shop.test' },
        body: JSON.stringify({ username: 'sam.view', password: 'viewer-password-8' }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(viewerLogin.status).toBe(200);
    const viewerToken = extractCookieToken(viewerLogin);

    const viewerRead = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/trucks', {
        headers: { Cookie: `ts_token=${viewerToken}` },
      }),
      env,
      {} as ExecutionContext
    );
    expect(viewerRead.status).toBe(200);

    const viewerWrite = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/trucks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://shop.test',
          Cookie: `ts_token=${viewerToken}`,
        },
        body: JSON.stringify({ unit_number: '999', vehicle_type: 'Tractor' }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(viewerWrite.status).toBe(403);

    // Suspending the technician account immediately revokes their session and blocks login
    const suspendRes = await worker.fetch(
      new Request(`https://shop.test/truck-safety/api/shop-accounts/${techAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://shop.test',
          Cookie: `ts_token=${ownerToken}`,
        },
        body: JSON.stringify({ status: 'suspended' }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(suspendRes.status).toBe(200);

    const revokedVerify = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/auth/verify', {
        headers: { Cookie: `ts_token=${techToken}` },
      }),
      env,
      {} as ExecutionContext
    );
    expect(revokedVerify.status).toBe(401);

    const suspendedLogin = await worker.fetch(
      new Request('https://shop.test/truck-safety/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://shop.test' },
        body: JSON.stringify({ username: 'alex.mech', password: 'mechanic-password-8' }),
      }),
      env,
      {} as ExecutionContext
    );
    expect(suspendedLogin.status).toBe(403);
  });

  it('rejects weak or malformed account details and duplicate usernames', async () => {
    const db = new IsolatedD1();
    const create = (username: string, password = 'distinct-test-password-2', extra: Record<string, unknown> = {}) =>
      handleShopAccountsApi(
        request('POST', {
          display_name: 'Shop Staff',
          username,
          password,
          ...extra,
        }),
        db as unknown as D1Database
      );

    expect((await create('ab')).status).toBe(400);
    expect((await create('staff.name', '1234567')).status).toBe(400);
    expect((await create('staff.eight', '12345678')).status).toBe(201);
    expect((await create('valid_owner', 'distinct-test-password-3', { role: 'owner' })).status).toBe(201);
    expect((await create('invalid_role', 'distinct-test-password-3', { role: 'superadmin' })).status).toBe(400);
    expect((await create('invalid_color', 'distinct-test-password-3', { avatar_color: 'not-a-color' })).status).toBe(400);
    expect((await create('staff.name')).status).toBe(201);
    const duplicate = await create('STAFF.NAME');
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({ error: 'That username is already in use.' });
  });
});
