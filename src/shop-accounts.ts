import { InputError } from './validation';
import { hmacSha256Hex, SESSION_SECONDS, timingSafeEqualStr } from './utils';

const PBKDF2_ITERATIONS = 600_000;
const encoder = new TextEncoder();

export const SHOP_ROLES = ['owner', 'manager', 'technician', 'viewer'] as const;
export type ShopRole = (typeof SHOP_ROLES)[number];

export const SHOP_STATUSES = ['active', 'suspended'] as const;
export type ShopStatus = (typeof SHOP_STATUSES)[number];

export const SHOP_AVATAR_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
] as const;

export interface ShopAccountPublic {
  id: string;
  display_name: string;
  username: string;
  role: ShopRole;
  status: ShopStatus;
  job_title: string;
  badge_number: string;
  phone: string;
  notes: string;
  avatar_color: string;
  last_login_at: string;
  login_count: number;
  created_at: string;
  updated_at: string;
}

interface ShopAccountFullRow extends ShopAccountPublic {
  password_salt: string;
  password_hash: string;
  password_iterations: number;
}

export interface ShopActivityRow {
  id: string;
  account_id: string | null;
  actor_name: string;
  actor_username: string;
  actor_role: ShopRole;
  actor_badge: string;
  actor_color: string;
  action: string;
  target_type: string;
  target_id: string;
  summary: string;
  created_at: string;
}

export interface ShopActor {
  mode: 'passcode' | 'account' | 'send_only';
  account_id: string | null;
  display_name: string;
  username: string;
  role: ShopRole;
  badge_number: string;
  job_title: string;
  avatar_color: string;
}

export const PASSCODE_ACTOR: ShopActor = {
  mode: 'passcode',
  account_id: null,
  display_name: 'Shared Shop Passcode',
  username: 'shop-passcode',
  role: 'owner',
  badge_number: '',
  job_title: 'Full Fleet Access',
  avatar_color: '#3b82f6',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

const schemaReady = new WeakSet<D1Database>();

export async function ensureShopAccountSchema(db: D1Database): Promise<void> {
  if (schemaReady.has(db)) return;
  const { results } = await db.prepare('PRAGMA table_info(shop_accounts)').all<{ name: string }>();
  const columns = new Set(results.map(column => column.name));
  if (!columns.has('id')) throw new Error('Apply the shop account migrations before using staff accounts.');
  for (const [column, definition] of [
    ['role', "TEXT NOT NULL DEFAULT 'technician'"],
    ['status', "TEXT NOT NULL DEFAULT 'active'"],
    ['job_title', "TEXT NOT NULL DEFAULT ''"],
    ['badge_number', "TEXT NOT NULL DEFAULT ''"],
    ['phone', "TEXT NOT NULL DEFAULT ''"],
    ['notes', "TEXT NOT NULL DEFAULT ''"],
    ['avatar_color', "TEXT NOT NULL DEFAULT '#3b82f6'"],
    ['last_login_at', "TEXT NOT NULL DEFAULT ''"],
    ['login_count', 'INTEGER NOT NULL DEFAULT 0'],
  ]) {
    if (!columns.has(column)) {
      await db.prepare(`ALTER TABLE shop_accounts ADD COLUMN ${column} ${definition}`).run();
    }
  }
  await db.prepare(
      `CREATE TABLE IF NOT EXISTS shop_account_activity (
        id TEXT PRIMARY KEY,
        account_id TEXT,
        actor_name TEXT NOT NULL DEFAULT 'Shared Passcode',
        actor_username TEXT NOT NULL DEFAULT '',
        actor_role TEXT NOT NULL DEFAULT 'owner',
        actor_badge TEXT NOT NULL DEFAULT '',
        actor_color TEXT NOT NULL DEFAULT '#3b82f6',
        action TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT '',
        target_id TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_shop_account_activity_created ON shop_account_activity(created_at DESC, id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_shop_account_activity_target ON shop_account_activity(target_type, target_id)').run();
  schemaReady.add(db);
}

const ALLOWED_FIELDS = new Set([
  'display_name',
  'username',
  'password',
  'role',
  'status',
  'job_title',
  'badge_number',
  'phone',
  'notes',
  'avatar_color',
]);

interface ParsedAccountInput {
  displayName: string;
  username: string;
  password?: string;
  role: ShopRole;
  status: ShopStatus;
  jobTitle: string;
  badgeNumber: string;
  phone: string;
  notes: string;
  avatarColor: string;
}

function parseOptionalText(value: unknown, label: string, maxLength: number, fallback = ''): string {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new InputError(`${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new InputError(`${label} must be ${maxLength} characters or fewer.`);
  return trimmed;
}

function parseAccountPayload(value: unknown, requirePassword: boolean, defaults?: Partial<ShopAccountPublic>): ParsedAccountInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputError('Expected an account object.');
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some(key => !ALLOWED_FIELDS.has(key))) {
    throw new InputError('Request contains unsupported fields.');
  }

  const rawDisplayName = input.display_name !== undefined ? input.display_name : defaults?.display_name;
  const rawUsername = input.username !== undefined ? input.username : defaults?.username;
  if (typeof rawDisplayName !== 'string' || typeof rawUsername !== 'string') {
    throw new InputError('Name and username are required.');
  }
  const displayName = rawDisplayName.trim();
  const username = rawUsername.trim().toLowerCase();
  if (!displayName || displayName.length > 100) {
    throw new InputError('Name must be 1–100 characters.');
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
    throw new InputError('Username must be 3–32 letters, numbers, dots, underscores, or hyphens.');
  }

  let password: string | undefined;
  if (requirePassword) {
    if (typeof input.password !== 'string') throw new InputError('Name, username, and password are required.');
    if (input.password.length < 8 || input.password.length > 128) {
      throw new InputError('Password must be 8–128 characters.');
    }
    password = input.password;
  } else if (input.password !== undefined) {
    if (typeof input.password !== 'string') throw new InputError('Password must be text.');
    if (input.password.length > 0) {
      if (input.password.length < 8 || input.password.length > 128) {
        throw new InputError('Password must be 8–128 characters.');
      }
      password = input.password;
    }
  }

  const rawRole = input.role !== undefined ? input.role : (defaults?.role || 'technician');
  if (typeof rawRole !== 'string' || !SHOP_ROLES.includes(rawRole as ShopRole)) {
    throw new InputError('Role must be owner, manager, technician, or viewer.');
  }
  const role = rawRole as ShopRole;

  const rawStatus = input.status !== undefined ? input.status : (defaults?.status || 'active');
  if (typeof rawStatus !== 'string' || !SHOP_STATUSES.includes(rawStatus as ShopStatus)) {
    throw new InputError('Status must be active or suspended.');
  }
  const status = rawStatus as ShopStatus;

  const jobTitle = parseOptionalText(input.job_title, 'Job title', 80, defaults?.job_title || '');
  const badgeNumber = parseOptionalText(input.badge_number, 'Badge / certs', 64, defaults?.badge_number || '');
  const phone = parseOptionalText(input.phone, 'Phone / contact', 40, defaults?.phone || '');
  const notes = parseOptionalText(input.notes, 'Notes', 500, defaults?.notes || '');

  const rawColor = input.avatar_color !== undefined ? input.avatar_color : (defaults?.avatar_color || SHOP_AVATAR_COLORS[0]);
  if (typeof rawColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(rawColor.trim())) {
    throw new InputError('Avatar color must be a 6-digit hex color.');
  }
  const avatarColor = rawColor.trim().toLowerCase();

  return {
    displayName,
    username,
    password,
    role,
    status,
    jobTitle,
    badgeNumber,
    phone,
    notes,
    avatarColor,
  };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function derivePasswordHash(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createAccountSessionToken(accountId: string, passwordHash: string, sessionSecret: string): Promise<string> {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomUUID();
  const payload = `acct.${accountId}.${issuedAt}.${nonce}`;
  const signingKey = await hmacSha256Hex(sessionSecret, `account-key:${accountId}:${passwordHash}`);
  const sig = await hmacSha256Hex(signingKey, `account-session:${payload}`);
  return `${payload}.${sig}`;
}

export async function verifyAccountSessionToken(
  token: string | null | undefined,
  db: D1Database,
  sessionSecret: string
): Promise<ShopActor | null> {
  if (!token || !token.startsWith('acct.')) return null;
  const parts = token.trim().split('.');
  if (parts.length !== 5) return null;
  const [, accountId, issuedAt, nonce, sig] = parts;
  if (!accountId || !issuedAt || !nonce || !sig) return null;
  const issued = parseInt(issuedAt, 36);
  if (!Number.isFinite(issued) || issued > Date.now() || Date.now() - issued >= SESSION_SECONDS * 1000) {
    return null;
  }

  await ensureShopAccountSchema(db);
  const account = await db.prepare(
    `SELECT id, display_name, username, password_hash, role, status, job_title, badge_number, avatar_color
     FROM shop_accounts WHERE id = ?1`
  ).bind(accountId).first<ShopAccountFullRow>();
  if (!account || account.status !== 'active') return null;

  const signingKey = await hmacSha256Hex(sessionSecret, `account-key:${account.id}:${account.password_hash}`);
  const expectedSig = await hmacSha256Hex(signingKey, `account-session:acct.${accountId}.${issuedAt}.${nonce}`);
  const valid = await timingSafeEqualStr(sig, expectedSig);
  if (!valid) return null;

  return {
    mode: 'account',
    account_id: account.id,
    display_name: account.display_name,
    username: account.username,
    role: (SHOP_ROLES.includes(account.role as ShopRole) ? account.role : 'technician') as ShopRole,
    badge_number: account.badge_number || '',
    job_title: account.job_title || '',
    avatar_color: account.avatar_color || '#3b82f6',
  };
}

export async function authenticateShopAccount(
  db: D1Database,
  usernameRaw: string,
  passwordRaw: string,
  sessionSecret: string
): Promise<{ account: ShopAccountPublic; token: string; actor: ShopActor }> {
  await ensureShopAccountSchema(db);
  const username = usernameRaw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || passwordRaw.length < 8 || passwordRaw.length > 128) {
    throw new InputError('Username and password are required.', 400);
  }
  const row = await db.prepare(
    `SELECT id, display_name, username, password_salt, password_hash, password_iterations,
            role, status, job_title, badge_number, phone, notes, avatar_color,
            last_login_at, login_count, created_at, updated_at
     FROM shop_accounts WHERE lower(username) = ?1`
  ).bind(username).first<ShopAccountFullRow>();

  if (!row) {
    // Perform a dummy PBKDF2 derivation to mitigate username timing enumeration
    await derivePasswordHash(passwordRaw, new Uint8Array(16), PBKDF2_ITERATIONS);
    throw new InputError('Invalid username or password.', 401);
  }

  const candidateHash = await derivePasswordHash(
    passwordRaw,
    hexToBytes(row.password_salt),
    row.password_iterations || PBKDF2_ITERATIONS
  );
  const valid = await timingSafeEqualStr(row.password_hash, candidateHash);
  if (!valid) {
    throw new InputError('Invalid username or password.', 401);
  }

  if (row.status === 'suspended') {
    throw new InputError('This shop account is currently suspended. Contact the shop owner or manager.', 403);
  }

  const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
  await db.prepare(
    `UPDATE shop_accounts
     SET last_login_at = ?1, login_count = COALESCE(login_count, 0) + 1
     WHERE id = ?2`
  ).bind(nowIso, row.id).run();

  const actor: ShopActor = {
    mode: 'account',
    account_id: row.id,
    display_name: row.display_name,
    username: row.username,
    role: (SHOP_ROLES.includes(row.role as ShopRole) ? row.role : 'technician') as ShopRole,
    badge_number: row.badge_number || '',
    job_title: row.job_title || '',
    avatar_color: row.avatar_color || '#3b82f6',
  };

  await recordShopActivity(db, actor, 'account_login', `Signed in as ${row.display_name} (@${row.username})`, 'account', row.id);

  const token = await createAccountSessionToken(row.id, row.password_hash, sessionSecret);
  const { password_salt: _s, password_hash: _h, password_iterations: _i, ...publicAccount } = row;
  publicAccount.last_login_at = nowIso;
  publicAccount.login_count = (row.login_count || 0) + 1;

  return { account: publicAccount, token, actor };
}

export async function recordShopActivity(
  db: D1Database,
  actor: ShopActor,
  action: string,
  summary: string,
  targetType = '',
  targetId = ''
): Promise<void> {
  try {
    await ensureShopAccountSchema(db);
    await db.prepare(
      `INSERT INTO shop_account_activity (
        id, account_id, actor_name, actor_username, actor_role, actor_badge, actor_color,
        action, target_type, target_id, summary
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
    ).bind(
      crypto.randomUUID(),
      actor.account_id,
      actor.display_name,
      actor.username,
      actor.role,
      actor.badge_number,
      actor.avatar_color,
      action,
      targetType,
      targetId,
      summary
    ).run();
  } catch {
    console.error(JSON.stringify({ event: 'shop_activity_write_failed', action, target_type: targetType }));
  }
}

export async function fetchTargetAttributions(
  db: D1Database,
  targetType: string,
  targetIds: string[]
): Promise<Record<string, { actor_name: string; actor_username: string; actor_role: string; actor_badge: string; actor_color: string }>> {
  if (!targetIds.length) return {};
  if (targetIds.length > 80) {
    const combined: Awaited<ReturnType<typeof fetchTargetAttributions>> = {};
    for (let offset = 0; offset < targetIds.length; offset += 80) {
      Object.assign(combined, await fetchTargetAttributions(db, targetType, targetIds.slice(offset, offset + 80)));
    }
    return combined;
  }
  try {
    await ensureShopAccountSchema(db);
    const placeholders = targetIds.map((_, idx) => `?${idx + 2}`).join(', ');
    const { results } = await db.prepare(
      `SELECT target_id, actor_name, actor_username, actor_role, actor_badge, actor_color
       FROM shop_account_activity
       WHERE target_type = ?1 AND target_id IN (${placeholders})
       ORDER BY created_at ASC`
    ).bind(targetType, ...targetIds).all<{
      target_id: string;
      actor_name: string;
      actor_username: string;
      actor_role: string;
      actor_badge: string;
      actor_color: string;
    }>();
    const map: Record<string, { actor_name: string; actor_username: string; actor_role: string; actor_badge: string; actor_color: string }> = {};
    for (const row of results || []) {
      map[row.target_id] = {
        actor_name: row.actor_name,
        actor_username: row.actor_username,
        actor_role: row.actor_role,
        actor_badge: row.actor_badge,
        actor_color: row.actor_color,
      };
    }
    return map;
  } catch {
    console.error(JSON.stringify({ event: 'shop_attribution_read_failed', target_type: targetType }));
    return {};
  }
}

export function canManageAccounts(actor: ShopActor): boolean {
  return actor.mode === 'passcode' || actor.role === 'owner' || actor.role === 'manager';
}

export function canManageSettingsAndBackups(actor: ShopActor): boolean {
  return actor.mode === 'passcode' || actor.role === 'owner' || actor.role === 'manager';
}

export function canWriteFleetRecords(actor: ShopActor): boolean {
  return actor.mode === 'passcode' || actor.role === 'owner' || actor.role === 'manager' || actor.role === 'technician';
}

export function canDeleteUnits(actor: ShopActor): boolean {
  return actor.mode === 'passcode' || actor.role === 'owner' || actor.role === 'manager';
}

const PUBLIC_SELECT = `SELECT id, display_name, username, role, status, job_title, badge_number, phone, notes,
  avatar_color, last_login_at, login_count, created_at, updated_at FROM shop_accounts`;

/** Listing, creating, updating, and removing shop accounts + staff directory and activity log. */
export async function handleShopAccountsApi(
  request: Request,
  db: D1Database,
  actor: ShopActor = PASSCODE_ACTOR
): Promise<Response> {
  try {
    await ensureShopAccountSchema(db);
    const pathname = new URL(request.url).pathname;
    const accountId = pathname.match(/\/api\/shop-accounts\/([^/]+)\/?$/)?.[1];

    if (request.method === 'GET' && !accountId) {
      const [{ results: accounts }, { results: activity }] = await Promise.all([
        db.prepare(`${PUBLIC_SELECT} ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'technician' THEN 2 ELSE 3 END, lower(display_name), id`).all<ShopAccountPublic>(),
        db.prepare(
          `SELECT id, account_id, actor_name, actor_username, actor_role, actor_badge, actor_color,
                  action, target_type, target_id, summary, created_at
           FROM shop_account_activity ORDER BY created_at DESC, id LIMIT 40`
        ).all<ShopActivityRow>(),
      ]);
      return json({
        accounts: accounts || [],
        activity: activity || [],
        recent_activity: activity || [],
        actor,
        currentActor: actor,
        individualLoginEnabled: true,
        canManage: canManageAccounts(actor),
      });
    }

    if (!canManageAccounts(actor)) {
      return json({ error: 'Only shop owners, managers, or the shared shop passcode can create, edit, or remove staff accounts.' }, 403);
    }

    if (request.method === 'PUT' && accountId) {
      const decodedId = decodeURIComponent(accountId);
      const current = await db.prepare(`${PUBLIC_SELECT} WHERE id = ?1`).bind(decodedId).first<ShopAccountPublic>();
      if (!current) return json({ error: 'Shop account not found.' }, 404);

      const normalized = parseAccountPayload(await request.json(), false, current);
      if (actor.mode === 'account' && actor.role === 'manager' && (current.role === 'owner' || normalized.role === 'owner')) {
        throw new InputError('Managers cannot modify or assign the Owner role.', 403);
      }
      if (actor.mode === 'account' && actor.account_id === current.id && normalized.status === 'suspended') {
        throw new InputError('You cannot suspend the account you are currently signed in with.', 400);
      }

      if (normalized.password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const saltHex = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
        const passwordHash = await derivePasswordHash(normalized.password, salt);
        try {
          await db.prepare(
            `UPDATE shop_accounts
             SET display_name = ?1, username = ?2, password_salt = ?3, password_hash = ?4, password_iterations = ?5,
                 role = ?6, status = ?7, job_title = ?8, badge_number = ?9, phone = ?10, notes = ?11, avatar_color = ?12,
                 updated_at = datetime('now')
             WHERE id = ?13`
          ).bind(
            normalized.displayName,
            normalized.username,
            saltHex,
            passwordHash,
            PBKDF2_ITERATIONS,
            normalized.role,
            normalized.status,
            normalized.jobTitle,
            normalized.badgeNumber,
            normalized.phone,
            normalized.notes,
            normalized.avatarColor,
            current.id
          ).run();
        } catch (error) {
          if (String(error).toLowerCase().includes('unique')) throw new InputError('That username is already in use.', 409);
          throw error;
        }
      } else {
        try {
          await db.prepare(
            `UPDATE shop_accounts
             SET display_name = ?1, username = ?2, role = ?3, status = ?4, job_title = ?5,
                 badge_number = ?6, phone = ?7, notes = ?8, avatar_color = ?9, updated_at = datetime('now')
             WHERE id = ?10`
          ).bind(
            normalized.displayName,
            normalized.username,
            normalized.role,
            normalized.status,
            normalized.jobTitle,
            normalized.badgeNumber,
            normalized.phone,
            normalized.notes,
            normalized.avatarColor,
            current.id
          ).run();
        } catch (error) {
          if (String(error).toLowerCase().includes('unique')) throw new InputError('That username is already in use.', 409);
          throw error;
        }
      }

      const updated = await db.prepare(`${PUBLIC_SELECT} WHERE id = ?1`).bind(current.id).first<ShopAccountPublic>();
      await recordShopActivity(
        db,
        actor,
        'account_updated',
        `Updated ${normalized.displayName} (@${normalized.username}) · ${normalized.role}${normalized.status === 'suspended' ? ' [suspended]' : ''}${normalized.password ? ' · password rotated' : ''}`,
        'account',
        current.id
      );
      return json({
        account: updated || {
          ...current,
          display_name: normalized.displayName,
          username: normalized.username,
          role: normalized.role,
          status: normalized.status,
          job_title: normalized.jobTitle,
          badge_number: normalized.badgeNumber,
          phone: normalized.phone,
          notes: normalized.notes,
          avatar_color: normalized.avatarColor,
        },
        individualLoginEnabled: true,
      });
    }

    if (request.method === 'DELETE' && accountId) {
      const decodedId = decodeURIComponent(accountId);
      const current = await db.prepare(`${PUBLIC_SELECT} WHERE id = ?1`).bind(decodedId).first<ShopAccountPublic>();
      if (!current) return json({ error: 'Shop account not found.' }, 404);
      if (actor.mode === 'account' && actor.account_id === current.id) {
        return json({ error: 'You cannot delete the account you are currently signed in with.' }, 400);
      }
      if (actor.mode === 'account' && actor.role === 'manager' && current.role === 'owner') {
        return json({ error: 'Managers cannot delete an Owner account.' }, 403);
      }
      const result = await db.prepare('DELETE FROM shop_accounts WHERE id = ?1').bind(decodedId).run();
      if (!result.meta.changes) return json({ error: 'Shop account not found.' }, 404);
      await recordShopActivity(
        db,
        actor,
        'account_deleted',
        `Removed shop account ${current.display_name} (@${current.username})`,
        'account',
        decodedId
      );
      return json({ ok: true, individualLoginEnabled: true });
    }

    if (accountId || request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

    const input = parseAccountPayload(await request.json(), true);
    if (actor.mode === 'account' && actor.role === 'manager' && input.role === 'owner') {
      throw new InputError('Managers cannot assign the Owner role.', 403);
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
    const passwordHash = await derivePasswordHash(input.password!, salt);
    const id = crypto.randomUUID();
    try {
      await db.prepare(
        `INSERT INTO shop_accounts (
          id, display_name, username, password_salt, password_hash, password_iterations,
          role, status, job_title, badge_number, phone, notes, avatar_color
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
      ).bind(
        id,
        input.displayName,
        input.username,
        saltHex,
        passwordHash,
        PBKDF2_ITERATIONS,
        input.role,
        input.status,
        input.jobTitle,
        input.badgeNumber,
        input.phone,
        input.notes,
        input.avatarColor
      ).run();
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) throw new InputError('That username is already in use.', 409);
      throw error;
    }

    const created = await db.prepare(`${PUBLIC_SELECT} WHERE id = ?1`).bind(id).first<ShopAccountPublic>();
    await recordShopActivity(
      db,
      actor,
      'account_created',
      `Created ${input.role} account for ${input.displayName} (@${input.username})`,
      'account',
      id
    );
    return json({
      account: created || {
        id,
        display_name: input.displayName,
        username: input.username,
        role: input.role,
        status: input.status,
        job_title: input.jobTitle,
        badge_number: input.badgeNumber,
        phone: input.phone,
        notes: input.notes,
        avatar_color: input.avatarColor,
        last_login_at: '',
        login_count: 0,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      },
      individualLoginEnabled: true,
    }, 201);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: 'Invalid JSON request.' }, 400);
    console.error(JSON.stringify({ event: 'shop_accounts_error', error: String(error) }));
    return json({ error: 'Internal server error.' }, 500);
  }
}
