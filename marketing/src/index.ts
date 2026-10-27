import { GITHUB_LOGO, renderPage, renderRemoval, REPO_URL, SITE_CSS, SITE_JS, type Language } from './page';
import { renderAppHtml } from '../../src/ui';
import { DEMO_STORE_JS } from './demo-store';

type Env = Cloudflare.Env;
const CONSENT_VERSION = 'interest-only-2026-10-25';
const TOKEN = /^[a-f0-9]{64}$/;

function response(body: BodyInit | null, status = 200, type = 'text/html; charset=utf-8'): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000',
    },
  });
}

function demoResponse(body: BodyInit | null, status = 200, type = 'text/html; charset=utf-8'): Response {
  const result = response(body, status, type);
  result.headers.set('Content-Security-Policy', "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; frame-src 'self' blob:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  return result;
}

function json(body: object, status = 200): Response {
  return response(JSON.stringify(body), status, 'application/json; charset=utf-8');
}

async function readForm(request: Request): Promise<URLSearchParams | null> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new URLSearchParams(new TextDecoder().decode(bytes));
}

async function hash(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function handlePost(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'origin' }, 403);
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const limited = await env.SIGNUP_LIMITER.limit({ key: ip });
  if (!limited.success) {
    const result = json({ error: 'rate' }, 429);
    result.headers.set('Retry-After', '60');
    return result;
  }
  const form = await readForm(request);
  if (!form) return json({ error: 'input' }, 400);
  if (url.pathname === '/api/remove') {
    const token = form.get('token') || '';
    if (!TOKEN.test(token)) return json({ error: 'input' }, 400);
    await env.SIGNUPS.prepare('DELETE FROM launch_signups WHERE removal_hash = ?1').bind(await hash(token)).run();
    return json({ ok: true });
  }
  const email = (form.get('email') || '').trim().toLowerCase();
  const language = form.get('language');
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email) || email.length > 254 || email.includes('..') ||
      (language !== 'en' && language !== 'fr') || form.get('consent') !== 'yes' || form.get('company_url')) {
    return json({ error: 'input' }, 400);
  }
  const now = Math.floor(Date.now() / 1000);
  const day = new Date().toISOString().slice(0, 10);
  // A persisted account-wide ceiling complements the platform's per-IP limiter.
  const count = await env.SIGNUPS.prepare(`INSERT INTO signup_daily_limits (day, attempts) VALUES (?1, 1)
    ON CONFLICT(day) DO UPDATE SET attempts = attempts + 1 WHERE attempts < 200 RETURNING attempts`).bind(day).first<{ attempts: number }>();
  if (!count) return json({ error: 'capacity' }, 503);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
  const result = await env.SIGNUPS.prepare(`INSERT INTO launch_signups (email, language, created_at, expires_at, consent_version, removal_hash)
    SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE (SELECT COUNT(*) FROM launch_signups) < 5000
    ON CONFLICT(email) DO NOTHING`).bind(email, language, now, now + 365 * 86400, CONSENT_VERSION, await hash(token)).run();
  if (!result.meta.changes) {
    const existing = await env.SIGNUPS.prepare('SELECT 1 AS present FROM launch_signups WHERE email = ?1').bind(email).first();
    if (!existing) return json({ error: 'capacity' }, 503);
  }
  // Same response for an existing address; re-submission never replaces its removal credential or preferences.
  return json({ ok: true, removalToken: token });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && (url.pathname === '/api/signup' || url.pathname === '/api/remove')) {
      try { return await handlePost(request, env, url); }
      catch {
        console.error(JSON.stringify({ event: 'coming_soon_request_failed', route: url.pathname }));
        return json({ error: 'unavailable' }, 503);
      }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return response('Method not allowed', 405, 'text/plain; charset=utf-8');
    let result: Response;
    if (url.pathname === '/github-lockup-white.svg') result = response(GITHUB_LOGO, 200, 'image/svg+xml');
    else if (url.pathname === '/site.css') result = response(SITE_CSS, 200, 'text/css; charset=utf-8');
    else    if (url.pathname === '/site.js') result = response(SITE_JS, 200, 'text/javascript; charset=utf-8');
    else if (url.pathname === '/favicon.svg') result = response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#0b1425"/><path d="M13 34V14h23v5H19v5h13v5H19v5" fill="#ffc45b"/></svg>', 200, 'image/svg+xml');
    else if (url.pathname === '/robots.txt') result = response('User-agent: *\nDisallow: /api/\nDisallow: /remove\n', 200, 'text/plain; charset=utf-8');
    else if (url.pathname === '/remove') result = response(renderRemoval(url.searchParams.get('lang') === 'fr' ? 'fr' : 'en'));
    else if (url.pathname === '/en/demo' || url.pathname === '/fr/demo') result = demoResponse(renderAppHtml('/' + url.pathname.slice(1, 3) + '/demo', false, true));
    else if (url.pathname.endsWith('/demo/demo-store.js')) result = demoResponse(DEMO_STORE_JS, 200, 'text/javascript; charset=utf-8');
    else if (url.pathname.endsWith('/demo/icon.svg')) result = response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111827"/><path d="M16 46V18h34v7H24v6h19v7H24v8" fill="#fbbf24"/></svg>', 200, 'image/svg+xml');
    else if (/\/demo\/(?:fonts\/[^/]+|icon-192\.png|manifest\.json)$/.test(url.pathname)) result = response('Not available in demo', 404, 'text/plain; charset=utf-8');
    else if (['/', '/en', '/en/', '/fr', '/fr/'].includes(url.pathname)) {
      const language: Language = url.pathname.startsWith('/fr') ? 'fr' : 'en';
      result = response(renderPage(language, env.CONTACT_EMAIL));
    } else result = response('Not found / Page introuvable', 404, 'text/plain; charset=utf-8');
    return request.method === 'HEAD' ? new Response(null, result) : result;
  },
  async scheduled(_event, env): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await env.SIGNUPS.batch([
      env.SIGNUPS.prepare('DELETE FROM launch_signups WHERE expires_at <= ?1').bind(now),
      env.SIGNUPS.prepare('DELETE FROM signup_daily_limits WHERE day < ?1').bind(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
    ]);
  },
} satisfies ExportedHandler<Env>;
