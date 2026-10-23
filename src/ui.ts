import { renderQrScript } from './qr-ui';
import { renderPushControls, renderPushScript, renderPushWorkerScript } from './push-ui';

export function renderPwaManifest(basePath: string): string {
  return JSON.stringify(
    {
      name: "Truck Safety Tracker",
      short_name: "TruckSafety",
      description: "Fleet safety inspection & expiry tracker with R2 certificate storage",
      start_url: `${basePath}/`,
      scope: `${basePath}/`,
      display: "standalone",
      background_color: "#0b0f19",
      theme_color: "#0b0f19",
      icons: [
        { src: `${basePath}/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${basePath}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        {
          src: `${basePath}/icon.svg`,
          sizes: "any",
          type: "image/svg+xml",
          purpose: "any maskable",
        },
      ],
    },
    null,
    2
  );
}

export function renderAppIconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <rect width="256" height="256" rx="52" fill="#0f172a"/>
  <rect x="16" y="16" width="224" height="224" rx="40" fill="none" stroke="#38bdf8" stroke-width="6" stroke-opacity="0.35"/>
  <path d="M36 84h112v84H36z" fill="#38bdf8" rx="10"/>
  <path d="M148 108h42l26 32v28h-68z" fill="#0284c7"/>
  <rect x="158" y="118" width="26" height="20" rx="3" fill="#e0f2fe"/>
  <circle cx="74" cy="172" r="22" fill="#1e293b" stroke="#f8fafc" stroke-width="8"/>
  <circle cx="182" cy="172" r="22" fill="#1e293b" stroke="#f8fafc" stroke-width="8"/>
  <circle cx="92" cy="126" r="24" fill="#10b981"/>
  <path d="M82 126l7 7 14-14" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

export function renderServiceWorker(basePath: string): string {
  return `const CACHE_NAME = 'truck-safety-shell-v3';
const ASSETS = ['${basePath}/', '${basePath}/manifest.json', '${basePath}/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('truck-safety-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !ASSETS.includes(url.pathname) || event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(async () => (await caches.match(event.request)) || new Response('Offline. Connect to load the tracker.', { status: 503 }))
  );
});
${renderPushWorkerScript(basePath)}
`;
}

export function renderAppHtml(basePath: string, pushTestPage = false): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Truck Safety Tracker — Fleet Inspection & R2 Certificate Vault</title>
  <meta name="theme-color" content="#0b0f19" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="manifest" href="${basePath}/manifest.json" />
  <link rel="icon" type="image/svg+xml" href="${basePath}/icon.svg" />
  <link rel="apple-touch-icon" href="${basePath}/icon-192.png" />
  <script>
    // Apply the saved theme before first paint; storage restrictions never block the app.
    try { document.documentElement.dataset.theme = localStorage.getItem('truck_safety_theme') === 'light' ? 'light' : 'dark'; }
    catch { document.documentElement.dataset.theme = 'dark'; }
  </script>
  <style>
    @layer reset, tokens, base, layout, components, utilities, motion;

    @layer tokens {
      :root {
        color-scheme: dark;
        --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
        --font-mono: "JetBrains Mono", "SF Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

        /* Linear Carbon & Specular Glass Dark Palette */
        --bg: #080a0f;
        --bg-elev: rgba(16, 20, 29, 0.78);
        --bg-card: rgba(18, 23, 35, 0.72);
        --bg-card-solid: #111622;
        --bg-hover: rgba(30, 39, 58, 0.85);
        --input-bg: #0b0f19;
        --header-bg: rgba(8, 10, 15, 0.78);
        --gate-glow: rgba(56, 189, 248, 0.16);
        --meta-bg: rgba(10, 14, 23, 0.68);
        --spec-strip-bg: rgba(255, 255, 255, 0.025);
        --notes-bg: rgba(30, 41, 59, 0.45);

        --border: rgba(255, 255, 255, 0.085);
        --border-strong: rgba(255, 255, 255, 0.16);
        --specular-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.09);

        --text: #f8fafc;
        --text-secondary: #cbd5e1;
        --text-muted: #8b9bb4;

        --accent: #38bdf8;
        --accent-hover: #0ea5e9;
        --accent-glow: rgba(56, 189, 248, 0.24);
        --on-accent: #041e30;
        --blue-text: #7dd3fc;

        /* High-contrast status tokens (WCAG >= 4.5:1) */
        --red: #f43f5e;
        --red-text: #fecdd3;
        --red-bg: #3b1019;
        --red-border: rgba(244, 63, 94, 0.45);

        --yellow: #f59e0b;
        --yellow-text: #fde68a;
        --yellow-bg: #362207;
        --yellow-border: rgba(245, 158, 11, 0.45);

        --green: #10b981;
        --on-success: #022c22;
        --green-text: #a7f3d0;
        --green-bg: #092e22;
        --green-border: rgba(16, 185, 129, 0.45);

        --nodate-bg: #171f2e;
        --nodate-border: rgba(148, 163, 184, 0.28);
        --nodate-text: #e2e8f0;

        --shadow-sm: 0 2px 8px -2px rgba(0, 0, 0, 0.45);
        --shadow: 0 14px 34px -8px rgba(0, 0, 0, 0.55), var(--specular-top);
        --shadow-lg: 0 28px 64px -12px rgba(0, 0, 0, 0.78), var(--specular-top);

        --radius-sm: 8px;
        --radius: 14px;
        --radius-lg: 18px;
        --radius-pill: 9999px;

        --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
        --ease-snappy: cubic-bezier(0.16, 1, 0.3, 1);
      }

      :root[data-theme="light"] {
        color-scheme: light;
        /* Keep exact rgb(241, 245, 249) body & rgb(248, 250, 252) input-bg for test verification & crisp Alabaster look */
        --bg: #f1f5f9;
        --bg-elev: rgba(255, 255, 255, 0.92);
        --bg-card: #ffffff;
        --bg-card-solid: #ffffff;
        --bg-hover: #e2e8f0;
        --input-bg: #f8fafc;
        --header-bg: rgba(255, 255, 255, 0.86);
        --gate-glow: rgba(14, 165, 233, 0.14);
        --meta-bg: #f8fafc;
        --spec-strip-bg: #f1f5f9;
        --notes-bg: #f1f5f9;

        --border: rgba(15, 23, 42, 0.11);
        --border-strong: rgba(15, 23, 42, 0.22);
        --specular-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.8);

        --text: #090d16;
        --text-secondary: #334155;
        --text-muted: #52627a;

        --accent: #0284c7;
        --accent-hover: #0369a1;
        --accent-glow: rgba(2, 132, 199, 0.18);
        --on-accent: #ffffff;
        --blue-text: #075985;

        --red: #e11d48;
        --red-text: #991b1b;
        --red-bg: #fef2f2;
        --red-border: #fca5a5;

        --yellow: #d97706;
        --yellow-text: #854d0e;
        --yellow-bg: #fffbeb;
        --yellow-border: #fcd34d;

        --green: #047857;
        --on-success: #ffffff;
        --green-text: #065f46;
        --green-bg: #ecfdf5;
        --green-border: #6ee7b7;

        --nodate-bg: #f8fafc;
        --nodate-border: #cbd5e1;
        --nodate-text: #0f172a;

        --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.05);
        --shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.07), 0 2px 6px -1px rgba(15, 23, 42, 0.04);
        --shadow-lg: 0 24px 54px -12px rgba(15, 23, 42, 0.16);
      }

      @supports (color: oklch(0.5 0.1 200)) {
        :root {
          --accent-glow: color-mix(in oklch, var(--accent) 26%, transparent);
        }
      }
    }

    @layer reset {
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
    }

    @layer base {
      html {
        -webkit-text-size-adjust: 100%;
        scroll-behavior: smooth;
      }

      body {
        font-family: var(--font-sans);
        background-color: var(--bg);
        background-image:
          radial-gradient(ellipse 80% 50% at 50% -15%, var(--gate-glow), transparent 70%),
          radial-gradient(circle at 85% 10%, rgba(16, 185, 129, 0.04), transparent 45%);
        background-attachment: fixed;
        color: var(--text);
        min-height: 100vh;
        line-height: 1.5;
        letter-spacing: -0.011em;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-feature-settings: "cv02", "cv03", "cv04", "cv11";
      }

      /* Lock page scroll automatically when any modal is open using modern :has() */
      body:has(.modal-backdrop:not(.hidden)) {
        overflow: hidden;
      }

      button, input, select, textarea {
        font: inherit;
        color: inherit;
        letter-spacing: inherit;
      }

      h1, h2, h3, .modal-title, .gate-title {
        text-wrap: balance;
        letter-spacing: -0.025em;
      }

      p {
        text-wrap: pretty;
      }
    }

    @layer utilities {
      .hidden {
        display: none !important;
      }
    }

    @layer layout {
      /* LOCK GATE OVERLAY */
      .gate-wrap {
        min-height: 100vh;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        position: relative;
        background:
          radial-gradient(circle at 50% 0%, var(--gate-glow) 0%, transparent 62%),
          var(--bg);
      }

      .gate-card {
        width: 100%;
        max-width: 420px;
        background: var(--bg-elev);
        backdrop-filter: blur(24px) saturate(160%);
        -webkit-backdrop-filter: blur(24px) saturate(160%);
        border: 1px solid var(--border-strong);
        border-radius: 22px;
        padding: 36px 30px;
        box-shadow: var(--shadow-lg);
        text-align: center;
        position: relative;
      }

      .gate-logo {
        width: 64px;
        height: 64px;
        margin: 0 auto 18px;
        border-radius: 16px;
        box-shadow: 0 12px 28px -4px var(--accent-glow), 0 0 0 1px var(--border-strong);
      }

      .gate-title {
        font-size: 1.45rem;
        font-weight: 750;
        margin-bottom: 6px;
      }

      .gate-sub {
        color: var(--text-muted);
        font-size: 0.9rem;
        margin-bottom: 26px;
        line-height: 1.5;
      }

      /* HEADER */
      .app-header {
        position: sticky;
        top: 0;
        z-index: 30;
        background: var(--header-bg);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 1px solid var(--border);
        box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.03);
        padding: 12px 24px;
      }

      .header-inner {
        max-width: 1340px;
        margin: 0 auto;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 13px;
        min-width: 0;
      }

      .brand img {
        width: 40px;
        height: 40px;
        border-radius: 11px;
        box-shadow: 0 4px 14px var(--accent-glow), 0 0 0 1px var(--border-strong);
      }

      .brand-title {
        font-size: 1.12rem;
        font-weight: 750;
        letter-spacing: -0.022em;
        line-height: 1.2;
      }

      .brand-sub {
        font-size: 0.76rem;
        color: var(--text-muted);
        overflow-wrap: anywhere;
      }

      .header-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      /* MAIN CONTENT */
      .container {
        max-width: 1340px;
        margin: 0 auto;
        padding: 26px 24px 80px;
      }

      .site-footer {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        max-width: 1340px;
        margin: 0 auto;
        padding: 0 24px 28px;
        color: var(--text-muted);
        font-size: 0.8rem;
        text-align: center;
      }

      .site-footer a {
        color: var(--text-secondary);
        text-decoration: none;
        text-underline-offset: 3px;
        transition: color 0.16s var(--ease-snappy);
      }

      .site-footer a:hover {
        color: var(--accent);
        text-decoration: underline;
      }

      .site-footer-separator {
        color: var(--text-muted);
        user-select: none;
      }

      /* KPI STATUS CARDS (Bento Specular Strip) */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 22px;
      }

      @media (max-width: 820px) {
        .kpi-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* FILTER BAR */
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-end;
        justify-content: space-between;
        background: var(--bg-elev);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 14px 16px;
        margin-bottom: 22px;
        box-shadow: var(--shadow-sm), var(--specular-top);
      }

      .toolbar-left, .toolbar-right {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 10px;
      }

      .toolbar-left {
        flex: 1;
        min-width: 240px;
      }

      /* FLEET CONTAINER & GRID */
      #fleet-container {
        container-type: inline-size;
        container-name: fleet;
      }

      .fleet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
        gap: 18px;
      }

      @container fleet (max-width: 480px) {
        .fleet-grid {
          grid-template-columns: 1fr;
        }
      }
    }

    @layer components {
      /* INPUTS & CONTROLS */
      .input-group {
        text-align: left;
        margin-bottom: 14px;
      }

      .input-group label {
        display: block;
        font-size: 0.76rem;
        font-weight: 650;
        color: var(--text-muted);
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.055em;
      }

      .input-control, .search-input, .select-filter {
        background: var(--input-bg);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 10px 13px;
        min-height: 46px;
        font-size: 0.95rem;
        color: var(--text);
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
        transition: border-color 0.16s var(--ease-snappy), box-shadow 0.16s var(--ease-snappy), background-color 0.16s var(--ease-snappy);
      }

      .input-control {
        width: 100%;
      }

      .input-control:hover:not(:disabled), .search-input:hover, .select-filter:hover {
        border-color: var(--border-strong);
      }

      .input-control:focus, .search-input:focus, .select-filter:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-glow);
      }

      .input-control:disabled {
        opacity: 0.48;
        cursor: not-allowed;
      }

      /* BUTTONS */
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        padding: 10px 16px;
        min-height: 44px;
        min-width: 44px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.88rem;
        letter-spacing: -0.008em;
        border: 1px solid transparent;
        cursor: pointer;
        touch-action: manipulation;
        transition: transform 0.14s var(--ease-snappy), background-color 0.14s var(--ease-snappy), border-color 0.14s var(--ease-snappy), box-shadow 0.14s var(--ease-snappy), filter 0.14s var(--ease-snappy);
        text-decoration: none;
        white-space: nowrap;
        user-select: none;
      }

      .btn:active:not(:disabled) {
        transform: scale(0.98);
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 92%, #ffffff 8%) 0%, var(--accent) 100%);
        color: var(--on-accent);
        border-color: rgba(255, 255, 255, 0.16);
        box-shadow: 0 4px 14px -2px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        font-weight: 650;
      }

      .btn-primary:hover:not(:disabled) {
        background: var(--accent-hover);
        color: #ffffff;
        box-shadow: 0 6px 20px -2px var(--accent-glow);
      }

      .btn-secondary {
        background: var(--bg-card);
        border-color: var(--border);
        color: var(--text);
        box-shadow: var(--specular-top), var(--shadow-sm);
      }

      .btn-secondary:hover:not(:disabled) {
        background: var(--bg-hover);
        border-color: var(--border-strong);
      }

      .btn-success {
        background: linear-gradient(180deg, color-mix(in srgb, var(--green) 92%, #ffffff 8%) 0%, var(--green) 100%);
        color: var(--on-success);
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.22);
        font-weight: 650;
      }

      .btn-success:hover:not(:disabled) {
        filter: brightness(1.07);
      }

      .btn-danger {
        background: var(--red-bg);
        border-color: var(--red-border);
        color: var(--red-text);
      }

      .btn-danger:hover:not(:disabled) {
        filter: brightness(1.12);
        border-color: var(--red);
      }

      .btn-sm {
        padding: 8px 12px;
        font-size: 0.84rem;
        border-radius: 9px;
      }

      .btn-full {
        width: 100%;
      }

      button:focus-visible, a:focus-visible, summary:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, .kpi-card:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      /* KPI CARDS */
      .kpi-card {
        position: relative;
        overflow: hidden;
        background: var(--bg-elev);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 18px 20px;
        cursor: pointer;
        box-shadow: var(--shadow);
        transition: transform 0.22s var(--ease-spring), border-color 0.18s var(--ease-snappy), box-shadow 0.18s var(--ease-snappy);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .kpi-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        border-radius: 4px 0 0 4px;
      }

      .kpi-card:hover {
        transform: translateY(-2px);
        border-color: var(--border-strong);
      }

      .kpi-card.active-filter {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent), var(--shadow);
      }

      .kpi-card.kpi-overdue::before { background: var(--red); }
      .kpi-card.kpi-overdue {
        background: radial-gradient(120% 100% at 0% 0%, rgba(244, 63, 94, 0.12) 0%, var(--bg-elev) 75%);
      }

      .kpi-card.kpi-due-soon::before { background: var(--yellow); }
      .kpi-card.kpi-due-soon {
        background: radial-gradient(120% 100% at 0% 0%, rgba(245, 158, 11, 0.12) 0%, var(--bg-elev) 75%);
      }

      .kpi-card.kpi-good::before { background: var(--green); }
      .kpi-card.kpi-good {
        background: radial-gradient(120% 100% at 0% 0%, rgba(16, 185, 129, 0.12) 0%, var(--bg-elev) 75%);
      }

      .kpi-card.kpi-all::before { background: var(--accent); }
      .kpi-card.kpi-all {
        background: radial-gradient(120% 100% at 0% 0%, rgba(56, 189, 248, 0.10) 0%, var(--bg-elev) 75%);
      }

      .kpi-label {
        font-size: 0.75rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 6px;
      }

      .kpi-val {
        font-size: 2rem;
        font-weight: 800;
        line-height: 1.05;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }

      .kpi-sub {
        font-size: 0.76rem;
        color: var(--text-muted);
        margin-top: 4px;
      }

      /* TOOLBAR ITEMS */
      .search-input {
        flex: 1 1 240px;
        min-width: 200px;
      }

      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 100%;
        min-width: 0;
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
      }

      .filter-field .select-filter {
        width: 100%;
        min-width: 0;
        color: var(--text);
        text-transform: none;
        letter-spacing: normal;
        font-weight: 500;
      }

      .filter-help {
        width: 100%;
        font-size: 0.78rem;
        color: var(--text-muted);
        padding-top: 2px;
      }

      .filter-results {
        margin-bottom: 14px;
        color: var(--text-muted);
        font-size: 0.85rem;
        font-weight: 500;
        font-variant-numeric: tabular-nums;
      }

      /* SEGMENTED VIEW SWITCHER */
      .view-switch {
        display: none;
        gap: 4px;
        align-items: center;
        background: var(--input-bg);
        padding: 3px;
        border-radius: 11px;
        border: 1px solid var(--border);
      }

      .view-switch .btn {
        border: none;
        background: transparent;
        box-shadow: none;
        min-height: 38px;
        padding: 6px 12px;
        border-radius: 8px;
        color: var(--text-muted);
      }

      .view-switch .btn[aria-pressed="true"] {
        background: var(--accent);
        color: var(--on-accent);
        box-shadow: 0 2px 8px var(--accent-glow);
      }

      /* STREAMLINED HIERARCHY UNIT CARDS */
      .truck-card {
        background: var(--bg-card);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 14px;
        position: relative;
        min-width: 0;
        box-shadow: var(--shadow);
        transition: transform 0.22s var(--ease-spring), border-color 0.18s var(--ease-snappy), box-shadow 0.22s var(--ease-spring);
      }

      .truck-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 16px;
        right: 16px;
        height: 3px;
        border-radius: 0 0 4px 4px;
        opacity: 0.9;
      }

      .truck-card:hover {
        transform: translateY(-3px);
        border-color: var(--border-strong);
        box-shadow: var(--shadow-lg);
      }

      .truck-card.status-overdue::before {
        background: linear-gradient(90deg, var(--red), #fb7185);
        box-shadow: 0 2px 12px rgba(244, 63, 94, 0.45);
      }

      .truck-card.status-due_soon::before {
        background: linear-gradient(90deg, var(--yellow), #fbbf24);
        box-shadow: 0 2px 12px rgba(245, 158, 11, 0.4);
      }

      .truck-card.status-good::before {
        background: linear-gradient(90deg, var(--green), #34d399);
      }

      .truck-card.status-no_date::before {
        background: linear-gradient(90deg, #64748b, #94a3b8);
      }

      .truck-top {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .unit-title {
        font-size: 1.28rem;
        font-weight: 800;
        letter-spacing: -0.025em;
        display: flex;
        align-items: center;
        gap: 7px;
        flex-wrap: wrap;
        overflow-wrap: anywhere;
        font-variant-numeric: tabular-nums;
      }

      .type-pill {
        font-size: 0.69rem;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: var(--radius-pill);
        background: rgba(56, 189, 248, 0.12);
        color: var(--blue-text);
        border: 1px solid rgba(56, 189, 248, 0.28);
        text-transform: uppercase;
        letter-spacing: 0.045em;
      }

      .op-pill {
        font-size: 0.7rem;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: var(--radius-pill);
        background: rgba(148, 163, 184, 0.13);
        border: 1px solid var(--border);
        color: var(--text-secondary);
      }

      .truck-sub {
        color: var(--text-muted);
        font-size: 0.86rem;
        font-weight: 500;
        margin-top: 3px;
        overflow-wrap: anywhere;
      }

      /* SAFETY STATUS PILL / BANNER */
      .safety-badge {
        padding: 8px 12px;
        border-radius: 11px;
        font-size: 0.82rem;
        font-weight: 750;
        letter-spacing: -0.01em;
        font-variant-numeric: tabular-nums;
      }

      .truck-card .safety-badge {
        width: 100%;
        text-align: left;
        font-size: 1.05rem;
        padding: 11px 14px;
        margin-top: 6px;
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: 6px;
      }

      .safety-badge small {
        display: block;
        font-size: 0.82rem;
        font-weight: 550;
        opacity: 0.92;
      }

      .safety-badge.overdue {
        background: var(--red-bg);
        border: 1px solid var(--red-border);
        color: var(--red-text);
      }

      .safety-badge.due_soon {
        background: var(--yellow-bg);
        border: 1px solid var(--yellow-border);
        color: var(--yellow-text);
      }

      .safety-badge.good {
        background: var(--green-bg);
        border: 1px solid var(--green-border);
        color: var(--green-text);
      }

      .safety-badge.no_date {
        background: var(--nodate-bg);
        border: 1px solid var(--nodate-border);
        color: var(--nodate-text);
      }

      /* STREAMLINED HIERARCHY: Primary Focus + Sleek Secondary Spec Strip */
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1px;
        background: var(--border);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
        font-size: 0.82rem;
        font-variant-numeric: tabular-nums;
      }

      .meta-item {
        background: var(--bg-card-solid);
        padding: 10px 11px;
        min-width: 0;
      }

      /* Secondary spec strip inside cards (GVWR, VIN, Sticker/Shop) */
      .truck-card .meta-item:nth-child(n+4) {
        background: var(--spec-strip-bg);
        padding: 8px 11px;
      }

      /* Modal overview meta-grid keeps clean 2-col layout */
      #unit-details .meta-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 420px) {
        .meta-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .meta-item span {
        display: block;
        font-size: 0.67rem;
        font-weight: 650;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.045em;
        margin-bottom: 2px;
      }

      .meta-item strong {
        font-weight: 650;
        color: var(--text);
        word-break: break-word;
        font-size: 0.85rem;
      }

      .meta-item:first-child strong {
        font-size: 0.92rem;
        color: var(--accent);
      }

      /* Monospace styling for VIN & License Plate */
      .meta-item:nth-child(3) strong,
      .meta-item:nth-child(5) strong {
        font-family: var(--font-mono);
        font-size: 0.79rem;
      }

      .truck-notes {
        font-size: 0.82rem;
        color: var(--text-secondary);
        background: var(--notes-bg);
        padding: 9px 12px;
        border-radius: 9px;
        border-left: 3px solid var(--accent);
      }

      .truck-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
      }

      .truck-actions .btn {
        flex: 1 1 110px;
      }

      /* COMPACT TABLE VIEW */
      .fleet-table-wrap {
        display: none;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--bg-card);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .fleet-table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
        font-size: 0.88rem;
        font-variant-numeric: tabular-nums;
      }

      .fleet-table caption {
        padding: 14px 16px;
        text-align: left;
        font-weight: 700;
        font-size: 0.92rem;
        border-bottom: 1px solid var(--border);
        background: var(--meta-bg);
      }

      .fleet-table th, .fleet-table td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid var(--border);
        vertical-align: middle;
        overflow-wrap: anywhere;
      }

      .fleet-table thead {
        background: var(--meta-bg);
        color: var(--text-muted);
        font-size: 0.73rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .fleet-table tr:last-child td {
        border-bottom: 0;
      }

      .fleet-table th:nth-child(1) { width: 23%; }
      .fleet-table th:nth-child(2) { width: 25%; }
      .fleet-table th:nth-child(3) { width: 17%; }
      .fleet-table th:nth-child(4) { width: 35%; }

      .fleet-table .safety-badge {
        display: inline-block;
        text-align: left;
        white-space: normal;
      }

      .fleet-table .list-sub {
        display: block;
        color: var(--text-muted);
        font-size: 0.78rem;
        margin-top: 3px;
      }

      .list-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .fleet-table tbody tr {
        transition: background-color 0.14s ease;
      }

      .fleet-table tbody tr:hover {
        background: var(--meta-bg);
      }

      /* TOOLS DROPDOWN */
      .tools-menu {
        position: relative;
      }

      .tools-menu > summary {
        list-style: none;
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }

      .tools-menu > summary::-webkit-details-marker {
        display: none;
      }

      .tools-menu[open] > summary {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent-glow);
      }

      .tools-panel {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        width: 240px;
        padding: 8px;
        display: grid;
        gap: 6px;
        z-index: 40;
        background: var(--bg-card-solid);
        border: 1px solid var(--border-strong);
        border-radius: 14px;
        box-shadow: var(--shadow-lg);
      }

      .tools-menu:not([open]) .tools-panel {
        display: none;
      }

      .tools-panel .btn {
        justify-content: flex-start;
        width: 100%;
      }

      .gate-theme {
        position: absolute;
        top: 18px;
        right: 18px;
      }

      /* EMPTY STATE */
      .empty-box {
        text-align: center;
        padding: 64px 24px;
        background: var(--bg-elev);
        border: 1px dashed var(--border-strong);
        border-radius: var(--radius-lg);
        color: var(--text-muted);
      }

      .empty-box h3 {
        color: var(--text);
        font-size: 1.18rem;
        margin-bottom: 8px;
      }

      /* MODALS */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 60;
        background: rgba(3, 6, 14, 0.72);
        backdrop-filter: blur(10px) saturate(140%);
        -webkit-backdrop-filter: blur(10px) saturate(140%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        overflow-y: auto;
      }

      .modal-panel {
        width: 100%;
        max-width: 640px;
        max-height: 92vh;
        overflow-y: auto;
        background: var(--bg-card-solid);
        border: 1px solid var(--border-strong);
        border-radius: 20px;
        padding: 24px;
        box-shadow: var(--shadow-lg);
      }

      .modal-panel.modal-lg {
        max-width: 880px;
      }

      .modal-header {
        position: sticky;
        top: -24px;
        z-index: 2;
        background: var(--bg-card-solid);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
        padding-top: 8px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--border);
      }

      .modal-title {
        font-size: 1.18rem;
        font-weight: 750;
        overflow-wrap: anywhere;
      }

      .close-btn {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-muted);
        font-size: 1.45rem;
        line-height: 1;
        cursor: pointer;
        min-height: 44px;
        min-width: 44px;
        padding: 4px 10px;
        border-radius: 10px;
        transition: background-color 0.14s ease, color 0.14s ease;
      }

      .close-btn:hover {
        background: var(--bg-hover);
        color: var(--text);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 13px;
      }

      @media (max-width: 560px) {
        .form-grid {
          grid-template-columns: 1fr;
        }
      }

      .col-span-2 {
        grid-column: span 2;
      }

      @media (max-width: 560px) {
        .col-span-2 {
          grid-column: span 1;
        }
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
      }

      /* HISTORY & FILES LIST */
      .history-item {
        background: var(--meta-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 12px;
      }

      .history-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 6px;
      }

      .file-chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }

      .file-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--input-bg);
        border: 1px solid var(--border);
        padding: 6px 10px;
        border-radius: 9px;
        font-size: 0.8rem;
        max-width: 100%;
        flex-wrap: wrap;
        overflow-wrap: anywhere;
      }

      .viewer-frame {
        width: 100%;
        height: 70vh;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #050811;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
      }

      .viewer-frame img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .viewer-frame iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      /* TOAST */
      .toast-container {
        position: fixed;
        bottom: 22px;
        right: 22px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-width: calc(100vw - 32px);
      }

      .toast {
        background: var(--bg-card-solid);
        border: 1px solid var(--accent);
        color: var(--text);
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: var(--shadow-lg);
        font-size: 0.88rem;
        font-weight: 550;
      }

      .toast.error {
        border-color: var(--red);
        color: var(--red-text);
      }
    }

    @layer motion {
      /* CSS @starting-style entry animations for modals, dropdowns, and toasts */
      @starting-style {
        .modal-backdrop:not(.hidden) {
          opacity: 0;
        }
        .modal-backdrop:not(.hidden) .modal-panel {
          opacity: 0;
          transform: translateY(10px) scale(0.97);
        }
        .tools-menu[open] .tools-panel {
          opacity: 0;
          transform: translateY(-6px) scale(0.97);
        }
        .toast {
          opacity: 0;
          transform: translateY(8px) scale(0.96);
        }
      }

      .modal-backdrop {
        transition: opacity 0.2s var(--ease-snappy);
      }

      .modal-panel {
        transition: transform 0.26s var(--ease-spring), opacity 0.2s var(--ease-snappy);
      }

      .tools-panel {
        transition: transform 0.18s var(--ease-spring), opacity 0.15s var(--ease-snappy);
        transform-origin: top right;
      }

      .toast {
        transition: transform 0.22s var(--ease-spring), opacity 0.18s var(--ease-snappy);
      }
    }

    @media (min-width: 960px) {
      .view-switch { display: flex; }
      #fleet-container[data-view="list"] #fleet-grid { display: none; }
      #fleet-container[data-view="list"] .fleet-table-wrap:not(.hidden) { display: block; }
    }

    @media (max-width: 700px) {
      .app-header { position: static; padding: 12px; }
      .header-actions { width: 100%; gap: 8px; position: relative; }
      .tools-menu { position: static; }
      .tools-panel { right: 0; top: calc(100% + 8px); width: min(280px, 100%); }
      .header-actions > .btn { flex: 1 1 auto; padding: 10px; }
      .container { padding: 16px 12px 36px; }
      .site-footer { flex-wrap: wrap; padding: 0 12px 24px; }
      .toolbar { padding: 12px; }
      .toolbar-left { min-width: 0; width: 100%; }
      .search-input { width: 100%; min-width: 0; flex-basis: 100%; }
      .toolbar-left > .select-filter, .filter-field { width: 100%; }
      .toolbar-right { width: 100%; }
      .kpi-card { padding: 14px 12px; }
      .kpi-label { font-size: 0.72rem; }
      .modal-panel { padding: 18px; max-height: 94dvh; }
      .modal-header { top: -18px; }
      .modal-footer { flex-wrap: wrap; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
      .kpi-card:hover, .truck-card:hover { transform: none; }
    }
  </style>
</head>
<body>
  <!-- PASSCODE GATE VIEW -->
  <div id="gate-view" class="gate-wrap">
    <button type="button" class="btn btn-secondary gate-theme" data-theme-toggle aria-label="Switch to light mode">☀ Light mode</button>
    <div class="gate-card">
      <img src="${basePath}/icon.svg" alt="Truck Safety Logo" class="gate-logo" />
      <h1 class="gate-title">Truck Safety Tracker</h1>
      <p class="gate-sub">Enter the fleet passcode to unlock inspection status & R2 certificates.</p>
      <form id="gate-form">
        <div class="input-group">
          <label for="gate-passcode">Passcode</label>
          <input
            id="gate-passcode"
            type="password"
            class="input-control"
            placeholder="Enter passcode..."
            autocomplete="current-password"
            required
          />
        </div>
        <p id="gate-error" class="hidden" style="color: var(--red-text); font-size: 0.84rem; margin-bottom: 12px;"></p>
        <button type="submit" id="gate-submit" class="btn btn-primary btn-full">
          🔒 Unlock Fleet Dashboard
        </button>
        <p id="pending-unit-message" class="hidden" style="margin-top:12px;">Unit selected. Enter the passcode to open its record.</p>
        <button type="button" id="gate-scan-unit" class="btn btn-secondary btn-full" style="margin-top:12px;">Scan / Paste UUID (optional)</button>
      </form>
    </div>
  </div>

  <!-- MAIN APPLICATION VIEW -->
  <div id="app-view" class="hidden">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <img src="${basePath}/icon.svg" alt="Icon" />
          <div>
            <div class="brand-title">Truck Safety Tracker</div>
            <div class="brand-sub">Fleet safety · Inspection records & certificates</div>
          </div>
        </div>
        <div class="header-actions">
          <button type="button" id="btn-scan-unit" class="btn btn-secondary btn-sm">Scan / Paste UUID</button>
          <button type="button" id="btn-add-truck" class="btn btn-primary">
            + Add Truck / Trailer
          </button>
          <button type="button" class="btn btn-secondary btn-sm" data-theme-toggle aria-label="Switch to light mode">☀ Light mode</button>
          <details id="header-tools" class="tools-menu">
            <summary class="btn btn-secondary btn-sm">Tools ▾</summary>
            <div class="tools-panel">
          <button type="button" id="btn-export-ics" class="btn btn-secondary btn-sm" title="Download Calendar (.ics) reminders">
            📅 .ICS Calendar
          </button>
          <button type="button" id="btn-browser-notify" class="btn btn-secondary btn-sm" title="Enable Browser Alerts">
            🔔 Alerts
          </button>
          <button type="button" id="btn-settings" class="btn btn-secondary btn-sm">
            ⚙️ Settings
          </button>
            </div>
          </details>
          <button type="button" id="btn-lock" class="btn btn-secondary btn-sm" title="Lock App">
            🔒 Lock
          </button>
        </div>
      </div>
    </header>

    <main class="container">
      <!-- KPI STATUS CARDS -->
      <section class="kpi-grid">
        <div role="button" tabindex="0" class="kpi-card kpi-overdue" data-kpi="overdue">
          <div>
            <div class="kpi-label">🔴 Overdue</div>
            <div class="kpi-val" id="kpi-overdue-count">0</div>
            <div class="kpi-sub">Safety expired</div>
          </div>
        </div>
        <div role="button" tabindex="0" class="kpi-card kpi-due-soon" data-kpi="due_soon">
          <div>
            <div class="kpi-label">🟡 Due Soon</div>
            <div class="kpi-val" id="kpi-duesoon-count">0</div>
            <div class="kpi-sub" id="kpi-duesoon-label">Within 30 days</div>
          </div>
        </div>
        <div role="button" tabindex="0" class="kpi-card kpi-good" data-kpi="good">
          <div>
            <div class="kpi-label">🟢 Up to date</div>
            <div class="kpi-val" id="kpi-good-count">0</div>
            <div class="kpi-sub">Safety active</div>
          </div>
        </div>
        <div role="button" tabindex="0" class="kpi-card kpi-all active-filter" data-kpi="all">
          <div>
            <div class="kpi-label">🚛 Total Fleet</div>
            <div class="kpi-val" id="kpi-total-count">0</div>
            <div class="kpi-sub">Click any card to filter</div>
          </div>
        </div>
      </section>

      <!-- SEARCH & FILTER TOOLBAR -->
      <section class="toolbar">
        <div class="toolbar-left">
          <input
            type="search"
            id="search-input"
            class="search-input"
            placeholder="Search Unit #, Plate, VIN, Make/Model, Sticker #..."
          />
          <select id="filter-vehicle-type" class="select-filter" aria-label="Vehicle type">
            <option value="all">All Vehicle Types</option>
            <option value="Tractor">Tractor</option>
            <option value="Straight Truck">Straight Truck</option>
            <option value="Trailer">Trailer</option>
            <option value="Pickup / Service Truck">Pickup / Service Truck</option>
            <option value="Other">Other</option>
          </select>
          <label class="filter-field" for="filter-status">Due date
            <select id="filter-status" class="select-filter" aria-label="Due date">
              <option value="all">All due dates</option>
              <option value="overdue">🔴 Past due / overdue</option>
              <option value="today">Due today</option>
              <option value="due_soon">🟡 Close / due soon</option>
              <option value="within_7">Due within 7 days</option>
              <option value="within_14">Due within 14 days</option>
              <option value="within_30">Due within 30 days</option>
              <option value="within_60">Due within 60 days</option>
              <option value="within_90">Due within 90 days</option>
              <option value="good">🟢 Not close / up to date</option>
              <option value="no_date">⚪ No date set</option>
              <option value="range">Choose date range…</option>
            </select>
          </label>
          <label class="filter-field hidden" id="filter-from-field" for="filter-from">Due on or after
            <input type="date" id="filter-from" class="select-filter" />
          </label>
          <label class="filter-field hidden" id="filter-to-field" for="filter-to">Due on or before
            <input type="date" id="filter-to" class="select-filter" />
          </label>
          <label class="filter-field" for="sort-due">Sort by
            <select id="sort-due" class="select-filter" aria-label="Sort by">
              <option value="earliest">Due date: earliest first</option>
              <option value="latest">Due date: latest first</option>
              <option value="unit">Unit number</option>
            </select>
          </label>
          <p id="filter-help" class="filter-help">“Within” includes today, but not overdue units. “Close” uses the warning days in Settings.</p>
        </div>
        <div class="toolbar-right">
          <div class="view-switch" role="group" aria-label="Desktop fleet view">
            <button type="button" id="view-cards" class="btn btn-secondary btn-sm" aria-pressed="true">Cards</button>
            <button type="button" id="view-list" class="btn btn-secondary btn-sm" aria-pressed="false">Compact list</button>
          </div>
          <button type="button" id="btn-clear-filters" class="btn btn-secondary btn-sm">Clear filters</button>
          <button type="button" id="btn-refresh" class="btn btn-secondary btn-sm">
            ↻ Refresh
          </button>
        </div>
      </section>

      <!-- FLEET LIST -->
      <section id="fleet-container">
        <p id="filter-results" class="filter-results" role="status" aria-live="polite"></p>
        <div id="fleet-grid" class="fleet-grid"></div>
        <div id="fleet-table-wrap" class="fleet-table-wrap hidden">
          <table class="fleet-table">
            <caption>Fleet safety list</caption>
            <thead><tr><th scope="col">Unit / vehicle</th><th scope="col">Safety / due date</th><th scope="col">Last inspection</th><th scope="col">Actions</th></tr></thead>
            <tbody id="fleet-table-body"></tbody>
          </table>
        </div>
        <div id="fleet-empty" class="empty-box hidden">
          <h3 id="fleet-empty-title">No trucks or trailers found</h3>
          <p id="fleet-empty-description" style="margin-bottom: 16px;">Add your first truck or trailer to start tracking safety expiration dates and R2 inspection certificates.</p>
          <button type="button" id="btn-empty-add" class="btn btn-primary">+ Add First Unit</button>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <span>Open source under the MIT License</span>
      <span class="site-footer-separator" aria-hidden="true">·</span>
      <a href="https://github.com/CanadianCowboy/truck-safety-tracker" target="_blank" rel="noopener noreferrer" aria-label="View Truck Safety Tracker on GitHub (opens in a new tab)">View on GitHub <span aria-hidden="true">↗</span></a>
    </footer>
  </div>

  <!-- MODAL: ADD / EDIT TRUCK -->
  <div id="modal-truck" class="modal-backdrop hidden">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-truck-title">Add Truck / Trailer</h2>
        <button type="button" class="close-btn" data-close="modal-truck">&times;</button>
      </div>
      <form id="form-truck">
        <input type="hidden" id="truck-id" />
        <div class="form-grid">
          <div class="input-group">
            <label for="truck-unit">Unit / Truck # *</label>
            <input id="truck-unit" class="input-control" placeholder="e.g. 104 or TR-22" required />
          </div>
          <div class="input-group">
            <label for="truck-type">Vehicle Type *</label>
            <select id="truck-type" class="input-control" required>
              <option value="Tractor">Tractor</option>
              <option value="Straight Truck">Straight Truck</option>
              <option value="Trailer">Trailer</option>
              <option value="Pickup / Service Truck">Pickup / Service Truck</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="input-group">
            <label for="truck-plate">License Plate</label>
            <input id="truck-plate" class="input-control" placeholder="e.g. AB-12345" />
          </div>
          <div class="input-group">
            <label for="truck-gvwr">GVWR / Weight Class</label>
            <input id="truck-gvwr" class="input-control" placeholder="e.g. 80,000 lbs / 36,287 kg" />
          </div>
          <div class="input-group col-span-2">
            <label for="truck-vin">VIN (Vehicle Identification Number)</label>
            <input id="truck-vin" class="input-control" placeholder="17-character VIN" />
          </div>
          <div class="input-group">
            <label for="truck-year">Year</label>
            <input id="truck-year" type="number" min="1950" max="2035" class="input-control" placeholder="e.g. 2022" />
          </div>
          <div class="input-group">
            <label for="truck-make">Make</label>
            <input id="truck-make" class="input-control" placeholder="e.g. Kenworth, Peterbilt, Wabash" />
          </div>
          <div class="input-group">
            <label for="truck-model">Model</label>
            <input id="truck-model" class="input-control" placeholder="e.g. T680, 389, Dry Van 53'" />
          </div>
          <div class="input-group">
            <label for="truck-equipment-type">Equipment / Body Type</label>
            <input id="truck-equipment-type" class="input-control" placeholder="e.g. Flatbed, Skid Steer, Reefer, Generator" />
          </div>
          <div class="input-group">
            <label for="truck-op-status">Operational Status</label>
            <select id="truck-op-status" class="input-control">
              <option value="Active">Active</option>
              <option value="In Shop">In Shop</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div class="input-group">
            <label for="truck-interval">Inspection Interval</label>
            <select id="truck-interval" class="input-control">
              <option value="12">Annual (12 Months)</option>
              <option value="6">Semi-Annual (6 Months)</option>
              <option value="3">Quarterly (3 Months)</option>
              <option value="24">Biennial (24 Months)</option>
            </select>
          </div>
          <div class="input-group col-span-2" style="margin-bottom: 4px;">
            <label for="truck-no-date" style="display: inline-flex; align-items: center; gap: 10px; cursor: pointer; text-transform: none; color: var(--text); font-size: 0.9rem;">
              <input id="truck-no-date" type="checkbox" style="width: 18px; height: 18px;" />
              <span>No inspection / due date yet (save unit info without dates)</span>
            </label>
          </div>
          <div class="input-group" id="truck-last-date-group">
            <label for="truck-last-date">Last Inspection Date</label>
            <input id="truck-last-date" type="date" class="input-control" />
          </div>
          <div class="input-group" id="truck-due-date-group">
            <label for="truck-due-date" id="truck-due-date-label">Next Safety Due Date</label>
            <input id="truck-due-date" type="date" class="input-control" />
            <small>Defaults to month-end, or leave blank if no date yet.</small>
          </div>
          <div class="input-group">
            <label for="truck-sticker">Safety Sticker / Cert #</label>
            <input id="truck-sticker" class="input-control" placeholder="e.g. S-908412" />
          </div>
          <div class="input-group col-span-2">
            <label for="truck-shop">Inspection Shop / Mechanic</label>
            <input id="truck-shop" class="input-control" placeholder="e.g. Highway Heavy Duty Service" />
          </div>
          <div class="input-group col-span-2">
            <label for="truck-notes">Notes / Defects / Reminders</label>
            <textarea id="truck-notes" rows="2" class="input-control" placeholder="Any notes on tires, brakes, upcoming work..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close="modal-truck">Cancel</button>
          <button type="submit" id="truck-save-btn" class="btn btn-primary">Save Unit</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: LOG NEW SAFETY INSPECTION (+ R2 UPLOAD) -->
  <div id="modal-inspect" class="modal-backdrop hidden">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-inspect-title">Log Safety Inspection</h2>
        <button type="button" class="close-btn" data-close="modal-inspect">&times;</button>
      </div>
      <form id="form-inspect">
        <input type="hidden" id="inspect-truck-id" />
        <input type="hidden" id="inspect-interval" value="12" />
        <div class="form-grid">
          <div class="input-group">
            <label for="inspect-date">Inspection Date *</label>
            <input id="inspect-date" type="date" class="input-control" required />
          </div>
          <div class="input-group">
            <label for="inspect-exp-date">New Expiration / Due Date *</label>
            <input id="inspect-exp-date" type="date" class="input-control" required />
          </div>
          <div class="input-group">
            <label for="inspect-sticker">New Sticker / Certificate #</label>
            <input id="inspect-sticker" class="input-control" placeholder="Certificate or sticker number" />
          </div>
          <div class="input-group">
            <label for="inspect-shop">Shop / Certified Mechanic</label>
            <input id="inspect-shop" class="input-control" placeholder="Shop name or inspector" />
          </div>
          <div class="input-group col-span-2">
            <label for="inspect-file">Upload Safety Certificate / Sheet (PDF, JPEG, PNG, WebP · max 10 MB)</label>
            <input id="inspect-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" class="input-control" />
          </div>
          <div class="input-group col-span-2">
            <label for="inspect-notes">Inspection Notes</label>
            <textarea id="inspect-notes" rows="2" class="input-control" placeholder="Passed annual CVIP/DOT safety, replaced front pads..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close="modal-inspect">Cancel</button>
          <button type="submit" id="inspect-save-btn" class="btn btn-success">✓ Complete Inspection</button>
        </div>
      </form>
    </div>
  </div>

  <div id="modal-unit" class="modal-backdrop hidden">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 id="unit-title" class="modal-title">Unit overview</h2>
        <button type="button" class="close-btn" data-close="modal-unit" aria-label="Close unit overview">&times;</button>
      </div>
      <div id="unit-details"></div>
      <div id="unit-actions" class="truck-actions" style="margin-top:16px;"></div>
      <a id="unit-print-label" class="btn btn-secondary" style="margin-top:12px;" target="_blank" rel="noopener">Print QR label</a>
      <p style="margin-top:10px;color:var(--text-muted);font-size:0.8rem;">Optional QR label: UUID only · 1.5 × 1.5 inches. Manual unit access still works without a QR.</p>
    </div>
  </div>

  <div id="modal-scan" class="modal-backdrop hidden">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title">Scan / Paste UUID</h2>
        <button type="button" class="close-btn" data-close="modal-scan" aria-label="Close scanner">&times;</button>
      </div>
      <p style="margin-bottom:14px;">Scan a unit QR or paste its UUID. This selects a record, never unlocks the app.</p>
      <form id="form-unit-lookup">
        <div class="input-group"><label for="scan-uuid">Unit UUID</label><input id="scan-uuid" class="input-control" maxlength="36" autocomplete="off" spellcheck="false" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></div>
        <button type="submit" class="btn btn-primary">Open unit</button>
      </form>
      <div style="display:flex;gap:8px;margin:14px 0;flex-wrap:wrap;">
        <button type="button" id="btn-start-camera" class="btn btn-secondary">Start camera</button>
        <button type="button" id="btn-stop-camera" class="btn btn-secondary hidden">Stop camera</button>
      </div>
      <video id="qr-camera" class="hidden" muted playsinline style="width:100%;max-height:300px;background:#000;"></video>
      <p id="scan-status" role="status" aria-live="polite" style="margin-top:12px;"></p>
    </div>
  </div>

  <!-- MODAL: TRUCK HISTORY & R2 CERTIFICATES -->
  <div id="modal-history" class="modal-backdrop hidden">
    <div class="modal-panel modal-lg">
      <div class="modal-header">
        <div>
          <h2 class="modal-title" id="history-modal-title">Inspection History & Certificates</h2>
          <p id="history-modal-sub" style="font-size: 0.83rem; color: var(--text-muted);"></p>
        </div>
        <button type="button" class="close-btn" data-close="modal-history">&times;</button>
      </div>

      <!-- Direct Quick File Upload to Truck -->
      <div style="background: var(--input-bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="font-size: 0.85rem;">
          <strong>Upload Certificate / Sheet to R2</strong>
          <div style="color: var(--text-muted); font-size: 0.78rem;">Attach a PDF or photo of an inspection sheet for this unit</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <input type="file" id="quick-upload-input" accept="application/pdf,image/jpeg,image/png,image/webp" style="font-size: 0.82rem; max-width: 240px;" />
          <button type="button" id="btn-quick-upload" class="btn btn-primary btn-sm">Upload to R2</button>
        </div>
      </div>

      <div id="history-list"></div>
    </div>
  </div>

  <!-- MODAL: IN-APP PHOTO / PDF VIEWER -->
  <div id="modal-viewer" class="modal-backdrop hidden">
    <div class="modal-panel modal-lg">
      <div class="modal-header">
        <h2 class="modal-title" id="viewer-title">Certificate Preview</h2>
        <div style="display: flex; align-items: center; gap: 8px;">
          <a id="viewer-download" href="#" download class="btn btn-primary btn-sm">⬇ Download</a>
          <button type="button" class="close-btn" data-close="modal-viewer">&times;</button>
        </div>
      </div>
      <div id="viewer-container" class="viewer-frame"></div>
    </div>
  </div>

  <!-- MODAL: SETTINGS (PASSCODE, THRESHOLDS, WEBHOOK ALERTS) -->
  <div id="modal-settings" class="modal-backdrop hidden">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title">Settings & Automated Alerts</h2>
        <button type="button" class="close-btn" data-close="modal-settings">&times;</button>
      </div>
      <form id="form-settings">
        <div class="form-grid">
          <div class="input-group">
            <label for="set-warning-days">Yellow "Due Soon" Threshold (Days)</label>
            <input id="set-warning-days" type="number" min="1" max="180" class="input-control" required />
          </div>
          <div class="input-group">
            <label for="set-webhook-type">Webhook Provider</label>
            <select id="set-webhook-type" class="input-control">
              <option value="auto">Auto-detect (NTFY / Discord / Slack / JSON)</option>
              <option value="ntfy">NTFY.sh Push Topic</option>
              <option value="discord">Discord Webhook</option>
              <option value="slack">Slack Webhook</option>
              <option value="generic">Generic JSON Webhook</option>
            </select>
          </div>
          <div class="input-group col-span-2">
            <label for="set-webhook-url">Webhook URL (Daily Cron Alert for Due/Overdue Trucks)</label>
            <input id="set-webhook-url" type="url" class="input-control" placeholder="https://ntfy.sh/your-topic or Discord/Slack webhook URL" />
          </div>
          <div class="input-group col-span-2">
            <label for="set-new-passcode">Change Main Gate Passcode (leave blank to keep current)</label>
            <input id="set-new-passcode" type="password" class="input-control" placeholder="Enter new passcode to change..." autocomplete="new-password" />
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border);">
          <button type="button" id="btn-test-webhook" class="btn btn-secondary btn-sm">
            🚀 Send Test Webhook Now
          </button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary" data-close="modal-settings">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Settings</button>
          </div>
        </div>
      </form>
    </div>
  </div>

  ${renderPushControls(basePath)}
  <div id="toast-container" class="toast-container"></div>

  <script>
    const BASE_PATH = ${JSON.stringify(basePath)};
    const API_BASE = BASE_PATH + '/api';
    // The server owns the HttpOnly session cookie; never persist tokens in URLs or localStorage.
    localStorage.removeItem('truck_safety_token');
    let fleetData = [];
    let appSettings = { warning_days: 30, webhook_url: '', webhook_type: 'auto' };
    let activeHistoryTruckId = null;

    function readPreference(key, fallback) {
      try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
    }
    function savePreference(key, value) {
      try { localStorage.setItem(key, value); } catch { /* Device preferences are optional. */ }
    }
    function updateThemeControls() {
      const light = document.documentElement.dataset.theme === 'light';
      document.querySelectorAll('[data-theme-toggle]').forEach(button => {
        button.textContent = light ? '☾ Dark mode' : '☀ Light mode';
        button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
      });
      document.querySelector('meta[name="theme-color"]').content = light ? '#f1f5f9' : '#0b0f19';
    }
    document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
      const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
      savePreference('truck_safety_theme', theme);
      updateThemeControls();
    }));
    updateThemeControls();

    function setFleetView(view) {
      const selected = view === 'list' ? 'list' : 'cards';
      savePreference('truck_safety_view', selected);
      const apply = () => {
        document.getElementById('fleet-container').dataset.view = selected;
        document.getElementById('view-cards').setAttribute('aria-pressed', String(selected === 'cards'));
        document.getElementById('view-list').setAttribute('aria-pressed', String(selected === 'list'));
      };
      if (document.getElementById('fleet-container').dataset.view && typeof document.startViewTransition === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        apply();
        try { document.startViewTransition(() => {}); } catch {}
      } else {
        apply();
      }
    }
    setFleetView(readPreference('truck_safety_view', 'cards'));
    document.getElementById('view-cards').addEventListener('click', () => setFleetView('cards'));
    document.getElementById('view-list').addEventListener('click', () => setFleetView('list'));
    const tools = document.getElementById('header-tools');
    tools.addEventListener('click', event => {
      if (event.target.closest('button')) tools.open = false;
    });
    document.addEventListener('click', event => {
      if (!tools.contains(event.target)) tools.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && tools.open) {
        tools.open = false;
        tools.querySelector('summary').focus();
      }
    });

    function showToast(msg, isError = false) {
      const container = document.getElementById('toast-container');
      const el = document.createElement('div');
      el.className = 'toast' + (isError ? ' error' : '');
      el.textContent = msg;
      container.appendChild(el);
      setTimeout(() => el.remove(), 3600);
    }

    async function apiFetch(path, options = {}) {
      const headers = new Headers(options.headers || {});
      if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(API_BASE + path, { ...options, headers });
      if (res.status === 401) {
        lockApp('Session expired or passcode changed. Please unlock again.');
        throw new Error('Unauthorized');
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request failed (HTTP ' + res.status + ')');
      }
      return res;
    }

    function lockApp(reason = '') {
      fleetData = [];
      appSettings = { warning_days: 30, webhook_url: '', webhook_type: 'auto' };
      activeHistoryTruckId = null;
      overviewRequest++;
      stopUnitCamera();
      document.getElementById('unit-details').innerHTML = '';
      document.getElementById('unit-actions').innerHTML = '';
      document.getElementById('unit-title').textContent = 'Unit overview';
      document.getElementById('unit-print-label').removeAttribute('href');
      document.querySelectorAll('.modal-backdrop').forEach(el => el.classList.add('hidden'));
      document.getElementById('fleet-grid').innerHTML = '';
      document.getElementById('fleet-table-body').innerHTML = '';
      document.getElementById('fleet-table-wrap').classList.add('hidden');
      document.getElementById('header-tools').open = false;
      document.getElementById('history-list').innerHTML = '';
      document.getElementById('viewer-container').innerHTML = '';
      document.getElementById('form-settings').reset();
      document.getElementById('app-view').classList.add('hidden');
      document.getElementById('gate-view').classList.remove('hidden');
      const errEl = document.getElementById('gate-error');
      if (reason) {
        errEl.textContent = reason;
        errEl.classList.remove('hidden');
      } else {
        errEl.classList.add('hidden');
      }
    }

    function unlockApp() {
      document.getElementById('gate-view').classList.add('hidden');
      document.getElementById('app-view').classList.remove('hidden');
      loadDashboard();
      if (${JSON.stringify(pushTestPage)}) openPushPanel();
    }

    // Gate Login
    document.getElementById('gate-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const passcode = document.getElementById('gate-passcode').value;
      const errEl = document.getElementById('gate-error');
      const btn = document.getElementById('gate-submit');
      errEl.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Checking...';
      try {
        const res = await fetch(API_BASE + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          errEl.textContent = data.error || 'Invalid passcode';
          errEl.classList.remove('hidden');
        } else {
          document.getElementById('gate-passcode').value = '';
          unlockApp();
        }
      } catch (err) {
        errEl.textContent = 'Connection error. Please try again.';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = '🔒 Unlock Fleet Dashboard';
      }
    });

    document.getElementById('btn-lock').addEventListener('click', async () => {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
        lockApp();
      } catch (err) { showToast('Unable to end the session. Check your connection and retry.', true); }
    });

    // Load Dashboard
    async function loadDashboard() {
      try {
        const res = await apiFetch('/trucks');
        const data = await res.json();
        fleetData = data.trucks || [];
        if (data.settings) {
          appSettings = data.settings;
          document.getElementById('kpi-duesoon-label').textContent = 'Within ' + appSettings.warning_days + ' days';
          document.querySelector('#filter-status option[value="due_soon"]').textContent = '🟡 Close / due within ' + appSettings.warning_days + ' days';
        }
        updateKpis();
        renderFleet();
        await openPendingUnit();

      } catch (err) {
        if (err.message !== 'Unauthorized') {
          showToast('Failed to load fleet data', true);
        }
      }
    }

    function updateKpis() {
      const overdue = fleetData.filter((t) => t.safety_status === 'overdue').length;
      const dueSoon = fleetData.filter((t) => t.safety_status === 'due_soon').length;
      const good = fleetData.filter((t) => t.safety_status === 'good').length;
      document.getElementById('kpi-overdue-count').textContent = overdue;
      document.getElementById('kpi-duesoon-count').textContent = dueSoon;
      document.getElementById('kpi-good-count').textContent = good;
      document.getElementById('kpi-total-count').textContent = fleetData.length;
    }

    function formatDaysBadge(truck) {
      if (!truck.next_due_date || truck.days_remaining === null || truck.safety_status === 'no_date') {
        return 'NO DATE SET';
      }
      const d = truck.days_remaining;
      if (d < 0) {
        return 'OVERDUE by ' + Math.abs(d) + (Math.abs(d) === 1 ? ' day' : ' days');
      }
      if (d === 0) {
        return 'DUE TODAY';
      }
      if (truck.safety_status === 'due_soon') {
        return 'DUE IN ' + d + (d === 1 ? ' day' : ' days');
      }
      return d + ' days left';
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderFleet() {
      const q = document.getElementById('search-input').value.trim().toLowerCase();
      const vType = document.getElementById('filter-vehicle-type').value;
      const sFilter = document.getElementById('filter-status').value;
      const from = document.getElementById('filter-from').value;
      const to = document.getElementById('filter-to').value;
      const rangeActive = sFilter === 'range';
      const invalidRange = rangeActive && from && to && from > to;
      document.getElementById('filter-from-field').classList.toggle('hidden', !rangeActive);
      document.getElementById('filter-to-field').classList.toggle('hidden', !rangeActive);
      document.getElementById('filter-to').min = from;
      document.getElementById('filter-to').setCustomValidity(invalidRange ? 'End date must be on or after the start date.' : '');
      document.querySelectorAll('.kpi-card').forEach(c => {
        c.classList.toggle('active-filter', c.getAttribute('data-kpi') === sFilter);
      });

      const filtered = fleetData.filter((t) => {
        if (invalidRange) return false;
        if (vType !== 'all' && t.vehicle_type !== vType) return false;
        if (['overdue', 'due_soon', 'good', 'no_date'].includes(sFilter) && t.safety_status !== sFilter) return false;
        if (sFilter === 'today' && t.days_remaining !== 0) return false;
        if (sFilter.startsWith('within_') && (t.days_remaining === null || t.days_remaining < 0 || t.days_remaining > Number(sFilter.slice(7)))) return false;
        if (rangeActive && (!t.next_due_date || (from && t.next_due_date < from) || (to && t.next_due_date > to))) return false;
        if (q) {
          const hay = [
            t.unit_number,
            t.vehicle_type,
            t.equipment_type,
            t.gvwr,
            t.license_plate,
            t.vin,
            t.year,
            t.make,
            t.model,
            t.shop_name,
            t.sticker_number,
            t.notes,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      const sort = document.getElementById('sort-due').value;
      filtered.sort((a, b) => {
        const unitOrder = String(a.unit_number).localeCompare(String(b.unit_number), undefined, { numeric: true });
        if (sort === 'unit') return unitOrder;
        const aMissing = !a.next_due_date;
        const bMissing = !b.next_due_date;
        if (aMissing !== bMissing) return aMissing ? 1 : -1;
        if (aMissing && bMissing) return unitOrder;
        const dateOrder = a.next_due_date.localeCompare(b.next_due_date);
        return (sort === 'latest' ? -dateOrder : dateOrder) || unitOrder;
      });
      document.getElementById('filter-results').textContent = invalidRange
        ? 'End date must be on or after the start date.'
        : 'Showing ' + filtered.length + ' of ' + fleetData.length + ' units · ' + document.getElementById('filter-status').selectedOptions[0].textContent;
      const grid = document.getElementById('fleet-grid');
      const empty = document.getElementById('fleet-empty');
      const tableBody = document.getElementById('fleet-table-body');
      const tableWrap = document.getElementById('fleet-table-wrap');
      tableWrap.classList.toggle('hidden', filtered.length === 0);
      tableBody.innerHTML = filtered.map(t => {
        const id = escapeHtml(t.id);
        const dueLabel = t.next_due_date ? 'Due ' + escapeHtml(t.next_due_date) : 'Inspection date pending';
        const vehicleLine = [t.year, t.make, t.model, t.equipment_type].filter(Boolean).join(' ');
        return '<tr>' +
          '<td><strong>Unit #' + escapeHtml(t.unit_number) + '</strong><span class="list-sub">' + escapeHtml(t.vehicle_type) + (t.status !== 'Active' ? ' · ' + escapeHtml(t.status) : '') + '</span><span class="list-sub">' + escapeHtml(vehicleLine) + '</span></td>' +
          '<td><span class="safety-badge ' + escapeHtml(t.safety_status) + '">' + escapeHtml(formatDaysBadge(t)) + '<small>' + dueLabel + '</small></span></td>' +
          '<td>' + escapeHtml(t.last_inspection_date || '—') + '<span class="list-sub">' + escapeHtml(t.license_plate || '') + '</span></td>' +
          '<td><div class="list-actions"><button type="button" class="btn btn-secondary btn-sm" data-details="' + id + '">Details / QR</button><button type="button" class="btn btn-success btn-sm" data-inspect="' + id + '">Log Safety</button><button type="button" class="btn btn-secondary btn-sm" data-history="' + id + '">Files (' + (t.attachment_count || 0) + ')</button><button type="button" class="btn btn-secondary btn-sm" data-edit="' + id + '">Edit</button><button type="button" class="btn btn-danger btn-sm" data-delete="' + id + '" aria-label="Delete Unit #' + escapeHtml(t.unit_number) + '">Delete</button></div></td></tr>';
      }).join('');
      const hasFleet = fleetData.length > 0;
      document.getElementById('fleet-empty-title').textContent = hasFleet ? 'No units match these filters' : 'No trucks or trailers found';
      document.getElementById('fleet-empty-description').textContent = hasFleet
        ? 'Try another due-date window, adjust the date range, or clear the filters.'
        : 'Add your first truck or trailer to start tracking safety expiration dates and R2 inspection certificates.';
      document.getElementById('btn-empty-add').classList.toggle('hidden', hasFleet);

      if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
      }

      empty.classList.add('hidden');
      grid.innerHTML = filtered
        .map((t) => {
          const ymm = [t.year, t.make, t.model, t.equipment_type].filter(Boolean).join(' ') || 'Vehicle details not set';
          const latestFileBtn = t.latest_attachment
            ? \`<button type="button" class="btn btn-secondary btn-sm" data-view-file="\${escapeHtml(t.latest_attachment.id)}" data-file-name="\${escapeHtml(t.latest_attachment.file_name)}" data-file-type="\${escapeHtml(t.latest_attachment.content_type)}">📄 View Cert</button>\`
            : '';
          const dueSmall = t.next_due_date ? 'Due ' + escapeHtml(t.next_due_date) : 'Inspection date pending';
          const dueValue = t.next_due_date ? \`\${escapeHtml(t.next_due_date)} (\${t.interval_months || 12}m)\` : \`No date set (\${t.interval_months || 12}m)\`;

          return \`
            <article class="truck-card status-\${escapeHtml(t.safety_status)}">
              <div>
                <div class="truck-top">
                  <div>
                    <div class="unit-title">
                      <span>Unit #\${escapeHtml(t.unit_number)}</span>
                      <span class="type-pill">\${escapeHtml(t.vehicle_type || 'Tractor')}</span>
                      \${t.equipment_type ? \`<span class="op-pill">\${escapeHtml(t.equipment_type)}</span>\` : ''}
                      \${t.status && t.status !== 'Active' ? \`<span class="op-pill">\${escapeHtml(t.status)}</span>\` : ''}
                    </div>
                    <div class="truck-sub">\${escapeHtml(ymm)}</div>
                  </div>
                  <div class="safety-badge \${escapeHtml(t.safety_status)}">
                    <span>\${escapeHtml(formatDaysBadge(t))}</span>
                    <small>\${dueSmall}</small>
                  </div>
                </div>

                <div class="meta-grid" style="margin-top: 12px;">
                  <div class="meta-item">
                    <span>Next Safety Due</span>
                    <strong>\${dueValue}</strong>
                  </div>
                  <div class="meta-item">
                    <span>Last Inspection</span>
                    <strong>\${escapeHtml(t.last_inspection_date || '—')}</strong>
                  </div>
                  <div class="meta-item">
                    <span>License Plate</span>
                    <strong>\${escapeHtml(t.license_plate || '—')}</strong>
                  </div>
                  <div class="meta-item">
                    <span>GVWR / Weight</span>
                    <strong>\${escapeHtml(t.gvwr || '—')}</strong>
                  </div>
                  <div class="meta-item">
                    <span>VIN</span>
                    <strong>\${escapeHtml(t.vin || '—')}</strong>
                  </div>
                  <div class="meta-item">
                    <span>Sticker / Shop</span>
                    <strong>\${escapeHtml([t.sticker_number, t.shop_name].filter(Boolean).join(' • ') || '—')}</strong>
                  </div>
                </div>

                \${t.notes ? \`<div class="truck-notes" style="margin-top: 10px;">\${escapeHtml(t.notes)}</div>\` : ''}
              </div>

              <div class="truck-actions">
                <button type="button" class="btn btn-secondary btn-sm" data-details="\${escapeHtml(t.id)}">Details / QR</button>
                <button type="button" class="btn btn-success btn-sm" data-inspect="\${escapeHtml(t.id)}">✓ Log Safety</button>
                \${latestFileBtn}
                <button type="button" class="btn btn-secondary btn-sm" data-history="\${escapeHtml(t.id)}">📂 Files (\${t.attachment_count || 0})</button>
                <button type="button" class="btn btn-secondary btn-sm" data-edit="\${escapeHtml(t.id)}">✎ Edit</button>
                <button type="button" class="btn btn-danger btn-sm" style="flex:0;" data-delete="\${escapeHtml(t.id)}" title="Delete Unit" aria-label="Delete Unit #\${escapeHtml(t.unit_number)}">🗑</button>
              </div>
            </article>
          \`;
        })
        .join('');
    }

    // KPI Card filter clicks
    document.querySelectorAll('.kpi-card').forEach((card) => {
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
      });
      card.addEventListener('click', () => {
        const kpi = card.getAttribute('data-kpi');
        document.querySelectorAll('.kpi-card').forEach((c) => c.classList.remove('active-filter'));
        card.classList.add('active-filter');
        document.getElementById('filter-status').value = kpi;
        renderFleet();
      });
    });

    document.getElementById('search-input').addEventListener('input', renderFleet);
    document.getElementById('filter-vehicle-type').addEventListener('change', renderFleet);
    document.getElementById('filter-status').addEventListener('change', renderFleet);
    document.getElementById('sort-due').addEventListener('change', renderFleet);
    document.getElementById('filter-from').addEventListener('input', renderFleet);
    document.getElementById('filter-to').addEventListener('input', renderFleet);
    document.getElementById('btn-clear-filters').addEventListener('click', () => {
      document.getElementById('search-input').value = '';
      document.getElementById('filter-vehicle-type').value = 'all';
      document.getElementById('filter-status').value = 'all';
      document.getElementById('filter-from').value = '';
      document.getElementById('filter-to').value = '';
      document.getElementById('sort-due').value = 'earliest';
      renderFleet();
    });
    document.getElementById('btn-refresh').addEventListener('click', loadDashboard);

    // Auto-calculate due date when last inspection date or interval changes in Add/Edit modal
    function addCalendarMonths(date, months) {
      const [y, m, d] = date.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1 + months, 1));
      const last = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
      dt.setUTCDate(last);
      return dt.toISOString().slice(0, 10);
    }

    function setTruckNoDateMode(noDate, fillDefaultsIfEnablingDates = false) {
      const toggle = document.getElementById('truck-no-date');
      const lastInput = document.getElementById('truck-last-date');
      const dueInput = document.getElementById('truck-due-date');
      toggle.checked = Boolean(noDate);
      lastInput.disabled = Boolean(noDate);
      dueInput.disabled = Boolean(noDate);
      if (noDate) {
        lastInput.value = '';
        dueInput.value = '';
      } else if (fillDefaultsIfEnablingDates && !dueInput.value) {
        const today = new Date().toISOString().slice(0, 10);
        const months = parseInt(document.getElementById('truck-interval').value || '12', 10);
        if (!lastInput.value) lastInput.value = today;
        dueInput.value = addCalendarMonths(lastInput.value, months);
      }
    }

    function autoCalcTruckDueDate() {
      if (document.getElementById('truck-no-date').checked) return;
      const lastDate = document.getElementById('truck-last-date').value;
      const months = parseInt(document.getElementById('truck-interval').value || '12', 10);
      if (lastDate) {
        document.getElementById('truck-due-date').value = addCalendarMonths(lastDate, months);
      }
    }
    document.getElementById('truck-no-date').addEventListener('change', (e) => {
      setTruckNoDateMode(e.target.checked, true);
    });
    document.getElementById('truck-last-date').addEventListener('change', autoCalcTruckDueDate);
    document.getElementById('truck-interval').addEventListener('change', autoCalcTruckDueDate);

    function openAddTruckModal() {
      document.getElementById('modal-truck-title').textContent = 'Add Truck / Trailer';
      document.getElementById('form-truck').reset();
      document.getElementById('truck-id').value = '';
      setTruckNoDateMode(false, false);
      const today = new Date().toISOString().slice(0, 10);
      const nextYear = addCalendarMonths(today, 12);
      document.getElementById('truck-last-date').value = today;
      document.getElementById('truck-due-date').value = nextYear;
      document.getElementById('modal-truck').classList.remove('hidden');
    }

    document.getElementById('btn-add-truck').addEventListener('click', openAddTruckModal);
    document.getElementById('btn-empty-add').addEventListener('click', openAddTruckModal);

    // Save Truck (Create or Update)
    document.getElementById('form-truck').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('truck-id').value;
      const noDate = document.getElementById('truck-no-date').checked;
      const payload = {
        unit_number: document.getElementById('truck-unit').value.trim(),
        vehicle_type: document.getElementById('truck-type').value,
        license_plate: document.getElementById('truck-plate').value.trim(),
        gvwr: document.getElementById('truck-gvwr').value.trim(),
        vin: document.getElementById('truck-vin').value.trim(),
        year: document.getElementById('truck-year').value ? Number(document.getElementById('truck-year').value) : null,
        make: document.getElementById('truck-make').value.trim(),
        model: document.getElementById('truck-model').value.trim(),
        equipment_type: document.getElementById('truck-equipment-type').value.trim(),
        status: document.getElementById('truck-op-status').value,
        interval_months: Number(document.getElementById('truck-interval').value || 12),
        last_inspection_date: noDate ? '' : document.getElementById('truck-last-date').value,
        next_due_date: noDate ? '' : document.getElementById('truck-due-date').value,
        sticker_number: document.getElementById('truck-sticker').value.trim(),
        shop_name: document.getElementById('truck-shop').value.trim(),
        notes: document.getElementById('truck-notes').value.trim(),
      };

      const btn = document.getElementById('truck-save-btn');
      btn.disabled = true;
      try {
        const res = await apiFetch(id ? '/trucks/' + id : '/trucks', {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save unit');
        }
        document.getElementById('modal-truck').classList.add('hidden');
        showToast(id ? 'Unit updated' : 'Unit added to fleet');
        await loadDashboard();
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });

    // Delegate actions on truck cards
    ['fleet-grid', 'fleet-table-body', 'unit-actions'].forEach(containerId => document.getElementById(containerId).addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const detailsId = btn.getAttribute('data-details');
      if (detailsId) { await openUnitOverview(detailsId); return; }
      if (containerId === 'unit-actions') document.getElementById('modal-unit').classList.add('hidden');
      const editId = btn.getAttribute('data-edit');
      const inspectId = btn.getAttribute('data-inspect');
      const historyId = btn.getAttribute('data-history');
      const deleteId = btn.getAttribute('data-delete');
      const viewFileId = btn.getAttribute('data-view-file');

      if (editId) {
        const t = fleetData.find((x) => x.id === editId);
        if (!t) return;
        document.getElementById('modal-truck-title').textContent = 'Edit Unit #' + t.unit_number;
        document.getElementById('truck-id').value = t.id;
        document.getElementById('truck-unit').value = t.unit_number;
        document.getElementById('truck-type').value = t.vehicle_type || 'Tractor';
        document.getElementById('truck-plate').value = t.license_plate || '';
        document.getElementById('truck-gvwr').value = t.gvwr || '';
        document.getElementById('truck-vin').value = t.vin || '';
        document.getElementById('truck-year').value = t.year || '';
        document.getElementById('truck-make').value = t.make || '';
        document.getElementById('truck-model').value = t.model || '';
        document.getElementById('truck-equipment-type').value = t.equipment_type || '';
        document.getElementById('truck-op-status').value = t.status || 'Active';
        document.getElementById('truck-interval').value = String(t.interval_months || 12);
        const hasNoDate = !t.next_due_date && !t.last_inspection_date;
        setTruckNoDateMode(hasNoDate, false);
        document.getElementById('truck-last-date').value = t.last_inspection_date || '';
        document.getElementById('truck-due-date').value = t.next_due_date || '';
        document.getElementById('truck-sticker').value = t.sticker_number || '';
        document.getElementById('truck-shop').value = t.shop_name || '';
        document.getElementById('truck-notes').value = t.notes || '';
        document.getElementById('modal-truck').classList.remove('hidden');
      } else if (inspectId) {
        const t = fleetData.find((x) => x.id === inspectId);
        if (!t) return;
        document.getElementById('modal-inspect-title').textContent = 'Log Safety — Unit #' + t.unit_number;
        document.getElementById('form-inspect').reset();
        document.getElementById('inspect-truck-id').value = t.id;
        const months = t.interval_months || 12;
        document.getElementById('inspect-interval').value = String(months);
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('inspect-date').value = today;
        const exp = addCalendarMonths(today, months);
        document.getElementById('inspect-exp-date').value = exp;
        document.getElementById('inspect-shop').value = t.shop_name || '';
        document.getElementById('modal-inspect').classList.remove('hidden');
      } else if (historyId) {
        openHistoryModal(historyId);
      } else if (viewFileId) {
        openFileViewer(
          viewFileId,
          btn.getAttribute('data-file-name') || 'Certificate',
          btn.getAttribute('data-file-type') || 'application/octet-stream'
        );
      } else if (deleteId) {
        const t = fleetData.find((x) => x.id === deleteId);
        if (!t) return;
        if (!confirm('Delete Unit #' + t.unit_number + ' and all its inspection logs/files?')) return;
        try {
          const res = await apiFetch('/trucks/' + deleteId, { method: 'DELETE' });
          if (res.ok) {
            showToast('Deleted Unit #' + t.unit_number);
            await loadDashboard();
          }
        } catch (err) {
          showToast('Failed to delete unit', true);
        }
      }
    }));

    // Update expiration when inspection date changes
    document.getElementById('inspect-date').addEventListener('change', (e) => {
      const val = e.target.value;
      const months = parseInt(document.getElementById('inspect-interval').value || '12', 10);
      if (val) {
        document.getElementById('inspect-exp-date').value = addCalendarMonths(val, months);
      }
    });

    // Submit New Inspection (+ optional R2 file upload)
    document.getElementById('form-inspect').addEventListener('submit', async (e) => {
      e.preventDefault();
      const truckId = document.getElementById('inspect-truck-id').value;
      const btn = document.getElementById('inspect-save-btn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const fileInput = document.getElementById('inspect-file');
        const hasFile = fileInput.files && fileInput.files.length > 0;

        if (hasFile) {
          const fd = new FormData();
          fd.append('inspection_date', document.getElementById('inspect-date').value);
          fd.append('expiration_date', document.getElementById('inspect-exp-date').value);
          fd.append('sticker_number', document.getElementById('inspect-sticker').value.trim());
          fd.append('shop_name', document.getElementById('inspect-shop').value.trim());
          fd.append('notes', document.getElementById('inspect-notes').value.trim());
          fd.append('file', fileInput.files[0]);

          const res = await apiFetch('/trucks/' + truckId + '/inspections', {
            method: 'POST',
            body: fd,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to log inspection');
          }
        } else {
          const res = await apiFetch('/trucks/' + truckId + '/inspections', {
            method: 'POST',
            body: JSON.stringify({
              inspection_date: document.getElementById('inspect-date').value,
              expiration_date: document.getElementById('inspect-exp-date').value,
              sticker_number: document.getElementById('inspect-sticker').value.trim(),
              shop_name: document.getElementById('inspect-shop').value.trim(),
              notes: document.getElementById('inspect-notes').value.trim(),
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to log inspection');
          }
        }

        document.getElementById('modal-inspect').classList.add('hidden');
        showToast('Safety inspection logged & due date updated!');
        await loadDashboard();
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = '✓ Complete Inspection';
      }
    });

    // History & R2 Attachments Modal
    async function openHistoryModal(truckId) {
      activeHistoryTruckId = truckId;
      const t = fleetData.find((x) => x.id === truckId);
      document.getElementById('history-modal-title').textContent =
        'Unit #' + (t ? t.unit_number : '') + ' — Inspections & R2 Certificates';
      document.getElementById('history-modal-sub').textContent = t
        ? [t.vehicle_type, t.year, t.make, t.model, t.equipment_type, t.vin ? 'VIN: ' + t.vin : ''].filter(Boolean).join(' • ')
        : '';
      document.getElementById('history-list').innerHTML = '<p style="color:var(--text-muted);">Loading records...</p>';
      document.getElementById('modal-history').classList.remove('hidden');

      try {
        const res = await apiFetch('/trucks/' + truckId + '/inspections');
        const data = await res.json();
        const inspections = data.inspections || [];
        const looseFiles = data.unlinked_attachments || [];

        let html = '';

        if (looseFiles.length > 0) {
          html += \`
            <div class="history-item">
              <div class="history-top">
                <strong>📎 General Unit Certificates & Sheets</strong>
              </div>
              <div class="file-chip-list">
                \${looseFiles.map((f) => renderFileChip(f)).join('')}
              </div>
            </div>
          \`;
        }

        if (inspections.length === 0 && looseFiles.length === 0) {
          html = '<p style="color: var(--text-muted); text-align:center; padding: 24px;">No inspection logs or R2 certificates uploaded yet for this unit.</p>';
        } else {
          html += inspections
            .map(
              (ins) => \`
              <div class="history-item">
                <div class="history-top">
                  <div>
                    <strong>Inspected: \${escapeHtml(ins.inspection_date)}</strong>
                    <span style="color: var(--text-muted); margin-left: 8px;">→ Expires: \${escapeHtml(ins.expiration_date)}</span>
                  </div>
                  <span class="op-pill">\${escapeHtml([ins.sticker_number ? 'Cert #' + ins.sticker_number : '', ins.shop_name].filter(Boolean).join(' • ') || 'Logged')}</span>
                </div>
                \${ins.notes ? \`<div style="font-size: 0.84rem; color: var(--text); margin-top: 4px;">\${escapeHtml(ins.notes)}</div>\` : ''}
                \${
                  ins.attachments && ins.attachments.length > 0
                    ? \`<div class="file-chip-list">\${ins.attachments.map((f) => renderFileChip(f)).join('')}</div>\`
                    : ''
                }
              </div>
            \`
            )
            .join('');
        }

        document.getElementById('history-list').innerHTML = html;
      } catch (err) {
        document.getElementById('history-list').innerHTML = '<p style="color:var(--red-text);">Failed to load history.</p>';
      }
    }

    function renderFileChip(f) {
      const kb = Math.max(1, Math.round((f.size_bytes || 0) / 1024));
      return \`
        <div class="file-chip">
          <span>📄 \${escapeHtml(f.file_name)} <small style="color:var(--text-muted);">(\${kb} KB)</small></span>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 8px;" data-preview-id="\${escapeHtml(f.id)}" data-preview-name="\${escapeHtml(f.file_name)}" data-preview-type="\${escapeHtml(f.content_type)}">View</button>
          <button type="button" class="btn btn-danger btn-sm" style="padding:3px 7px;" data-del-file="\${escapeHtml(f.id)}">&times;</button>
        </div>
      \`;
    }

    // Quick upload inside History Modal
    document.getElementById('btn-quick-upload').addEventListener('click', async () => {
      if (!activeHistoryTruckId) return;
      const input = document.getElementById('quick-upload-input');
      if (!input.files || input.files.length === 0) {
        showToast('Select a PDF or image file first', true);
        return;
      }
      const btn = document.getElementById('btn-quick-upload');
      btn.disabled = true;
      btn.textContent = 'Uploading...';
      try {
        const fd = new FormData();
        fd.append('file', input.files[0]);
        const res = await apiFetch('/trucks/' + activeHistoryTruckId + '/attachments', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Upload failed');
        }
        input.value = '';
        showToast('Uploaded to Cloudflare R2!');
        await openHistoryModal(activeHistoryTruckId);
        await loadDashboard();
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Upload to R2';
      }
    });

    // Click handler inside History List for previewing or deleting files
    document.getElementById('history-list').addEventListener('click', async (e) => {
      const previewBtn = e.target.closest('[data-preview-id]');
      if (previewBtn) {
        openFileViewer(
          previewBtn.getAttribute('data-preview-id'),
          previewBtn.getAttribute('data-preview-name'),
          previewBtn.getAttribute('data-preview-type')
        );
        return;
      }
      const delBtn = e.target.closest('[data-del-file]');
      if (delBtn) {
        const attId = delBtn.getAttribute('data-del-file');
        if (!confirm('Delete this file from R2 storage?')) return;
        try {
          const res = await apiFetch('/attachments/' + attId, { method: 'DELETE' });
          if (res.ok) {
            showToast('File deleted from R2');
            await openHistoryModal(activeHistoryTruckId);
            await loadDashboard();
          }
        } catch (err) {
          showToast('Failed to delete file', true);
        }
      }
    });

    // In-App Photo / PDF Viewer
    function openFileViewer(attachmentId, fileName, contentType) {
      const fileUrl = API_BASE + '/attachments/' + encodeURIComponent(attachmentId);
      const downloadUrl = fileUrl + '?download=1';
      document.getElementById('viewer-title').textContent = fileName;
      const dl = document.getElementById('viewer-download');
      dl.href = downloadUrl;
      dl.setAttribute('download', fileName);

      const container = document.getElementById('viewer-container');
      if ((contentType || '').startsWith('image/')) {
        container.innerHTML = \`<img src="\${escapeHtml(fileUrl)}" alt="\${escapeHtml(fileName)}" />\`;
      } else if ((contentType || '').includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
        container.innerHTML = \`<iframe src="\${escapeHtml(fileUrl)}" title="\${escapeHtml(fileName)}"></iframe>\`;
      } else {
        container.innerHTML = \`
          <div style="text-align:center; padding: 30px;">
            <p style="margin-bottom:14px;">Preview not available for this file type (\${escapeHtml(contentType)}).</p>
            <a href="\${escapeHtml(downloadUrl)}" class="btn btn-primary" download>⬇ Download \${escapeHtml(fileName)}</a>
          </div>
        \`;
      }
      document.getElementById('modal-viewer').classList.remove('hidden');
    }

    // Calendar (.ics) export
    document.getElementById('btn-export-ics').addEventListener('click', () => {
      window.location.href = API_BASE + '/calendar.ics';
    });

    ${renderPushScript()}

    // Settings Modal
    document.getElementById('btn-settings').addEventListener('click', async () => {
      try {
        const res = await apiFetch('/settings');
        const data = await res.json();
        appSettings = data.settings || appSettings;
        document.getElementById('set-warning-days').value = appSettings.warning_days || 30;
        document.getElementById('set-webhook-type').value = appSettings.webhook_type || 'auto';
        document.getElementById('set-webhook-url').value = appSettings.webhook_url || '';
        document.getElementById('set-new-passcode').value = '';
        document.getElementById('modal-settings').classList.remove('hidden');
      } catch (err) {
        showToast('Failed to load settings', true);
      }
    });

    document.getElementById('form-settings').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        warning_days: Number(document.getElementById('set-warning-days').value || 30),
        webhook_type: document.getElementById('set-webhook-type').value,
        webhook_url: document.getElementById('set-webhook-url').value.trim(),
        new_passcode: document.getElementById('set-new-passcode').value,
      };
      try {
        const res = await apiFetch('/settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save settings');
        document.getElementById('modal-settings').classList.add('hidden');
        showToast('Settings saved!');
        await loadDashboard();
      } catch (err) {
        showToast(err.message, true);
      }
    });

    document.getElementById('btn-test-webhook').addEventListener('click', async () => {
      const webhook_url = document.getElementById('set-webhook-url').value.trim();
      const webhook_type = document.getElementById('set-webhook-type').value;
      if (!webhook_url) {
        showToast('Enter a Webhook URL first', true);
        return;
      }
      try {
        const res = await apiFetch('/notifications/test', {
          method: 'POST',
          body: JSON.stringify({ webhook_url, webhook_type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Webhook test failed');
        showToast('Test alert sent! (' + data.message + ')');
      } catch (err) {
        showToast(err.message, true);
      }
    });

    // Close modal buttons
    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-close');
        document.getElementById(target).classList.add('hidden');
        if (target === 'modal-scan') stopUnitCamera();
        if (target === 'modal-unit') clearPendingUnit();
        if (target === 'modal-viewer') document.getElementById('viewer-container').innerHTML = '';
      });
    });

    // Register PWA Service Worker
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register(BASE_PATH + '/sw.js').catch(err => console.error('Service worker registration failed:', err));
    }

    ${renderQrScript()}

    // Initial session check
    fetch(API_BASE + '/auth/verify').then(res => {
      if (res.ok) unlockApp();
    }).catch(() => showToast('Offline. Reconnect to unlock your fleet.', true));
    setInterval(() => {
      if (!document.getElementById('app-view').classList.contains('hidden') && document.visibilityState === 'visible') loadDashboard();
    }, 5 * 60 * 1000);
  </script>
</body>
</html>`;
}
