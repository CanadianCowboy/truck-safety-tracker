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
  <style>
    @font-face {
      font-family: "Mona Sans Footer";
      src: url("${basePath}/fonts/MonaSansVF-opsz-wght.woff2") format("woff2");
      font-style: normal;
      font-weight: 200 900;
      font-display: swap;
    }
  </style>
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

        /* Industrial Graphite & Neutral Operations Dark Palette */
        --bg: #0b0e14;
        --bg-nav: #0f131c;
        --bg-elev: #141923;
        --bg-card: #141923;
        --bg-card-solid: #141923;
        --bg-hover: #1c2433;
        --input-bg: #0b0f19;
        --header-bg: #0f131c;
        --gate-glow: rgba(56, 189, 248, 0.12);
        --meta-bg: #10151f;
        --spec-strip-bg: rgba(255, 255, 255, 0.025);
        --notes-bg: rgba(30, 41, 59, 0.45);

        --border: rgba(255, 255, 255, 0.09);
        --border-strong: rgba(255, 255, 255, 0.18);
        --specular-top: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);

        --text: #f8fafc;
        --text-secondary: #cbd5e1;
        --text-muted: #94a3b8;

        --accent: #38bdf8;
        --accent-hover: #0ea5e9;
        --accent-glow: rgba(56, 189, 248, 0.22);
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

        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.35);
        --shadow: 0 4px 14px -2px rgba(0, 0, 0, 0.45);
        --shadow-lg: 0 16px 38px -8px rgba(0, 0, 0, 0.65);

        --radius-sm: 6px;
        --radius: 10px;
        --radius-lg: 12px;
        --radius-pill: 9999px;

        --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
        --ease-snappy: cubic-bezier(0.16, 1, 0.3, 1);
      }

      :root[data-theme="light"] {
        color-scheme: light;
        /* Keep exact rgb(241, 245, 249) body & rgb(248, 250, 252) input-bg for test verification & crisp Alabaster look */
        --bg: #f1f5f9;
        --bg-nav: #1e2430;
        --bg-elev: #ffffff;
        --bg-card: #ffffff;
        --bg-card-solid: #ffffff;
        --bg-hover: #e2e8f0;
        --input-bg: #f8fafc;
        --header-bg: #ffffff;
        --gate-glow: rgba(14, 165, 233, 0.10);
        --meta-bg: #f8fafc;
        --spec-strip-bg: #f1f5f9;
        --notes-bg: #f1f5f9;

        --border: rgba(15, 23, 42, 0.12);
        --border-strong: rgba(15, 23, 42, 0.24);
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

        --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
        --shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.07);
        --shadow-lg: 0 16px 36px -8px rgba(15, 23, 42, 0.16);
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

      /* Lock page scroll automatically when any modal dialog is open using modern :has() */
      body:has(.modal-backdrop:not(.workspace-detail):not(.hidden)) {
        overflow: hidden;
      }
      @media (max-width: 1199px) {
        body:has(#modal-unit.workspace-detail:not(.hidden)) {
          overflow: hidden;
        }
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
        border-bottom: 1px solid var(--border);
        padding: 10px 20px;
      }

      .header-inner {
        max-width: 100%;
        margin: 0 auto;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }

      .brand img {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        border: 1px solid var(--border-strong);
      }

      .brand-title {
        font-size: 1.02rem;
        font-weight: 750;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .brand-sub {
        font-size: 0.73rem;
        color: var(--text-muted);
        overflow-wrap: anywhere;
      }

      .header-search-wrap {
        flex: 1 1 280px;
        max-width: 480px;
        min-width: 180px;
        display: flex;
        align-items: center;
      }

      .header-search-wrap .search-input {
        width: 100%;
        min-width: 0;
        min-height: 44px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      /* WORKSPACE THREE-REGION SHELL */
      .workspace-shell {
        display: grid;
        grid-template-columns: 224px minmax(0, 1fr) 420px;
        align-items: start;
        min-height: calc(100vh - 65px);
        width: 100%;
      }

      /* LEFT REGION: GRAPHITE NAVIGATION & QUICK FLEET VIEWS */
      .workspace-nav {
        background: var(--bg-nav);
        color: #f8fafc;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        padding: 16px 12px;
        position: sticky;
        top: 65px;
        min-height: calc(100vh - 65px);
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .nav-section-title {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
        padding: 0 10px;
        margin-bottom: 6px;
      }

      .nav-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        list-style: none;
      }

      .nav-view-btn, .nav-tool-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 9px 11px;
        min-height: 44px;
        border-radius: var(--radius-sm);
        background: transparent;
        border: 1px solid transparent;
        color: #cbd5e1;
        font-size: 0.85rem;
        font-weight: 600;
        text-align: left;
        cursor: pointer;
        transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease;
      }

      .nav-view-btn:hover, .nav-tool-btn:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #ffffff;
      }

      .nav-view-btn[aria-current="true"], .nav-view-btn.active-nav {
        background: rgba(56, 189, 248, 0.15);
        border-color: rgba(56, 189, 248, 0.4);
        color: #ffffff;
      }

      .nav-view-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .nav-count {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: var(--radius-pill);
        background: rgba(255, 255, 255, 0.09);
        color: #e2e8f0;
        font-variant-numeric: tabular-nums;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        flex-shrink: 0;
      }
      .status-dot.overdue { background: #f43f5e; }
      .status-dot.due_soon { background: #f59e0b; }
      .status-dot.good { background: #10b981; }
      .status-dot.no_date { background: #94a3b8; }
      .status-dot.all { background: #38bdf8; }

      /* CENTER REGION: MAIN FLEET WORKSPACE */
      .container, .workspace-main {
        min-width: 0;
        width: 100%;
        padding: 18px 20px 64px;
      }

      .site-footer {
        font-family: "Mona Sans Footer", var(--font-sans);
        font-optical-sizing: auto;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        width: 100%;
        margin: 0 auto;
        padding: 18px 24px 28px;
        border-top: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 0.8rem;
        text-align: center;
      }

      .site-footer a {
        font-family: "Mona Sans Footer", var(--font-sans);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-secondary);
        text-decoration: none;
        text-underline-offset: 3px;
        transition: color 0.16s var(--ease-snappy);
      }

      .site-footer-logo {
        display: none;
        width: auto;
        height: 20px;
      }

      .site-footer-logo-dark {
        display: block;
      }

      :root[data-theme="light"] .site-footer-logo-dark {
        display: none;
      }

      :root[data-theme="light"] .site-footer-logo-light {
        display: block;
      }

      .site-footer a:hover {
        color: var(--accent);
        text-decoration: underline;
      }

      .site-footer-separator {
        color: var(--text-muted);
        user-select: none;
      }

      /* COMPACT SUMMARY STRIP */
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 14px;
      }

      @media (max-width: 900px) {
        .kpi-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .kpi-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      /* FILTER BAR */
      .toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: flex-end;
        justify-content: space-between;
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 12px 14px;
        margin-bottom: 14px;
        box-shadow: var(--shadow-sm);
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
        grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
        gap: 14px;
      }

      @container fleet (max-width: 480px) {
        .fleet-grid {
          grid-template-columns: 1fr;
        }
      }

      /* RIGHT REGION: PERSISTENT VEHICLE-DETAIL WORKSPACE PANEL */
      .workspace-detail-col {
        border-left: 1px solid var(--border);
        background: var(--bg-elev);
        position: sticky;
        top: 65px;
        height: calc(100vh - 65px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      /* Override .modal-backdrop when #modal-unit is docked inside .workspace-detail-col on wide desktop */
      @media (min-width: 1200px) {
        .workspace-detail-col:has(#modal-unit:not(.hidden)) #detail-empty-state {
          display: none;
        }
        #modal-unit.workspace-detail:not(.hidden) {
          position: static !important;
          inset: auto !important;
          z-index: 10 !important;
          background: transparent !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          padding: 0 !important;
          display: flex !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
          flex: 1;
        }
        #modal-unit.workspace-detail .detail-panel-inner {
          max-width: none;
          max-height: none;
          height: auto;
          border: none;
          border-radius: 0;
          box-shadow: none;
          padding: 18px;
          background: transparent;
        }
      }

      /* Intermediate widths (tablet / compact laptop): collapse left nav, present details as slide-over drawer */
      @media (max-width: 1199px) {
        .workspace-shell {
          grid-template-columns: minmax(0, 1fr);
        }
        .workspace-detail-col {
          border-left: none;
          position: static;
          height: auto;
          overflow: visible;
          background: transparent;
        }
        #detail-empty-state {
          display: none !important;
        }
        .workspace-nav {
          position: static;
          min-height: auto;
          padding: 10px 16px;
          border-right: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .workspace-nav .nav-section-title,
        .workspace-nav .nav-tools-group {
          display: none;
        }
        .workspace-nav .nav-list {
          flex-direction: row;
          flex-wrap: wrap;
          gap: 6px;
          width: 100%;
        }
        .workspace-nav .nav-view-btn {
          width: auto;
          flex: 1 1 auto;
          padding: 7px 10px;
          min-height: 40px;
          font-size: 0.8rem;
        }
        #modal-unit.workspace-detail:not(.hidden) {
          position: fixed;
          inset: 0;
          z-index: 60;
          height: auto;
          background: rgba(3, 6, 14, 0.68);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          justify-content: flex-end;
          align-items: stretch;
          padding: 0;
        }
        #modal-unit.workspace-detail .detail-panel-inner {
          width: min(520px, 100vw);
          max-width: 100vw;
          height: 100%;
          max-height: 100dvh;
          border-radius: 0;
          border-top: none;
          border-bottom: none;
          border-right: none;
          padding: 18px;
          overflow-y: auto;
        }
      }

      /* MOBILE APPLICATION SHELL, BOTTOM NAV, FILTER SHEET & FULL-SCREEN VIEWS */
      .mobile-fleet-bar,
      .mobile-bottom-nav,
      .mobile-back-btn,
      .mobile-tools-extras,
      .mobile-filter-sheet-btn,
      .mobile-sheet-header,
      .mobile-sheet-footer {
        display: none;
      }

      .form-error-banner {
        background: var(--red-bg);
        border: 1px solid var(--red-border);
        color: var(--red-text);
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 0.84rem;
        font-weight: 600;
        margin-bottom: 14px;
      }

      .detail-disclosure {
        border: 1px solid var(--border);
        border-radius: 11px;
        background: var(--bg-card-solid);
        margin-top: 12px;
        overflow: hidden;
      }

      .detail-disclosure > summary {
        list-style: none;
        padding: 11px 14px;
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.055em;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        background: var(--meta-bg);
        min-height: 44px;
        user-select: none;
      }

      .detail-disclosure > summary::-webkit-details-marker {
        display: none;
      }

      .detail-disclosure > summary::after {
        content: '▾';
        font-size: 0.9rem;
        color: var(--text-muted);
        transition: transform 0.16s ease;
      }

      .detail-disclosure:not([open]) > summary::after {
        transform: rotate(-90deg);
      }

      .detail-disclosure-body {
        padding: 12px;
        border-top: 1px solid var(--border);
      }

      .danger-zone-box {
        margin-top: 16px;
        padding: 12px 14px;
        border-radius: 11px;
        border: 1px dashed var(--red-border);
        background: rgba(244, 63, 94, 0.05);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
      }

      @media (max-width: 700px) {
        #modal-unit.workspace-detail .detail-panel-inner {
          width: 100vw;
          height: 100dvh;
          max-height: 100dvh;
          padding: calc(12px + env(safe-area-inset-top, 0px)) 14px calc(36px + env(safe-area-inset-bottom, 0px));
        }

        .mobile-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 44px;
          min-width: 44px;
          padding: 6px 12px;
          font-size: 0.84rem;
          font-weight: 700;
        }

        .brand {
          flex: 1 1 auto;
          gap: 8px;
          min-width: 0;
        }

        .brand img {
          width: 28px;
          height: 28px;
          flex-shrink: 0;
        }

        .brand-title {
          font-size: 0.94rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .brand-sub {
          display: none;
        }

        .header-inner {
          gap: 6px;
        }

        .header-search-wrap {
          order: 3;
          flex: 1 1 100%;
          max-width: 100%;
          min-width: 0;
        }

        .header-actions {
          order: 2;
          width: auto !important;
          flex-wrap: wrap;
          max-width: 100%;
          gap: 5px;
          flex-shrink: 0;
        }

        /* Keep phone header compact: Scan QR + Tools overflow menu. Add Unit is placed in the fleet workspace bar below. */
        .header-actions > [data-theme-toggle] {
          display: none;
        }

        #btn-scan-unit {
          font-size: 0;
          padding: 8px 10px;
          gap: 0;
        }
        #btn-scan-unit::before {
          content: "⌗ Scan QR";
          font-size: 0.78rem;
          font-weight: 650;
        }

        #header-tools > summary {
          padding: 8px 10px;
          font-size: 0.78rem;
        }

        #btn-lock {
          font-size: 0;
          padding: 8px 10px;
          gap: 0;
        }
        #btn-lock::before {
          content: "🔒";
          font-size: 0.88rem;
        }

        .mobile-tools-extras {
          display: contents;
        }

        /* Keep Left Nav out of the way on mobile since compact status pills + Bottom Nav handle navigation */
        .workspace-nav {
          display: none !important;
        }

        /* Compact status filter pills on mobile (All, Overdue, Due Soon, No Date Set) */
        .kpi-grid {
          display: flex !important;
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 6px;
          margin-bottom: 10px;
          padding-bottom: 2px;
          scrollbar-width: none;
        }
        .kpi-grid::-webkit-scrollbar {
          display: none;
        }
        .kpi-card {
          flex: 0 0 auto;
          padding: 7px 11px !important;
          border-radius: 999px;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          min-height: 40px;
        }
        .kpi-card::before {
          display: none;
        }
        .kpi-card > div {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .kpi-label {
          margin-bottom: 0;
          font-size: 0.74rem !important;
          white-space: nowrap;
        }
        .kpi-val {
          font-size: 0.8rem;
          padding: 1px 7px;
          border-radius: 999px;
          background: var(--meta-bg);
          border: 1px solid var(--border);
        }
        .kpi-sub {
          display: none;
        }
        /* Put Total Fleet ("All") first on mobile status pill bar, and hide Up to Date pill so the 4 primary filters fit cleanly */
        .kpi-card.kpi-all { order: -1; }
        .kpi-card.kpi-good { display: none; }

        /* Mobile Filter Sheet Trigger & Action Bar */
        .toolbar:not(.mobile-sheet-open) {
          position: relative;
          padding: 6px 8px !important;
          margin-bottom: 10px;
          border-radius: 12px;
        }

        .toolbar:not(.mobile-sheet-open) .toolbar-right {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 6px;
        }

        .toolbar:not(.mobile-sheet-open) #btn-clear-filters,
        .toolbar:not(.mobile-sheet-open) #btn-refresh {
          display: none;
        }

        .mobile-filter-sheet-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 44px;
          padding: 8px 12px;
          font-size: 0.8rem;
          flex-shrink: 0;
        }

        .filter-badge-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: var(--accent);
          color: #041019;
          font-size: 0.72rem;
          font-weight: 800;
        }

        /* Visually collapse full toolbar on mobile unless Filter Sheet is toggled open, while keeping controls ≥ 44×44px and accessible to assistive tech / tests */
        .toolbar:not(.mobile-sheet-open) .toolbar-left {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 44px;
          overflow: hidden;
          opacity: 0;
          pointer-events: none;
          z-index: -1;
        }

        .toolbar {
          position: relative;
          padding: 8px 10px !important;
          margin-bottom: 10px;
        }

        .toolbar.mobile-sheet-open {
          position: fixed;
          inset: 0;
          z-index: 65;
          margin: 0;
          border-radius: 0;
          background: var(--bg-card-solid);
          padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(28px + env(safe-area-inset-bottom, 0px)) !important;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          overflow-y: auto;
        }

        .toolbar.mobile-sheet-open .toolbar-left {
          position: static;
          width: 100%;
          height: auto;
          overflow: visible;
          opacity: 1;
          pointer-events: auto;
          z-index: auto;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }

        .mobile-sheet-header,
        .mobile-sheet-footer {
          display: none;
        }

        .toolbar.mobile-sheet-open .mobile-sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          margin-bottom: 6px;
          border-bottom: 1px solid var(--border);
        }

        .toolbar.mobile-sheet-open .mobile-sheet-footer {
          display: flex;
          gap: 10px;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid var(--border);
        }

        .toolbar.mobile-sheet-open .mobile-sheet-footer .btn {
          flex: 1;
        }

        /* Full-screen focused forms on mobile (#modal-truck, #modal-inspect, #modal-scan, #modal-history, #modal-settings) */
        #modal-truck.modal-backdrop,
        #modal-inspect.modal-backdrop,
        #modal-vin.modal-backdrop,
        #modal-scan.modal-backdrop,
        #modal-history.modal-backdrop,
        #modal-settings.modal-backdrop {
          padding: 0;
          align-items: stretch;
        }

        #modal-truck .modal-panel,
        #modal-inspect .modal-panel,
        #modal-vin .modal-panel,
        #modal-scan .modal-panel,
        #modal-history .modal-panel,
        #modal-settings .modal-panel {
          max-width: 100vw;
          width: 100vw;
          min-height: 100dvh;
          max-height: 100dvh;
          border-radius: 0;
          border: none;
          padding: calc(14px + env(safe-area-inset-top, 0px)) 16px calc(24px + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
        }

        #modal-truck .modal-footer,
        #modal-inspect .modal-footer,
        #modal-settings .modal-footer {
          position: sticky;
          bottom: calc(-24px - env(safe-area-inset-bottom, 0px));
          background: var(--bg-card-solid);
          padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
          z-index: 5;
        }

        /* Safe-area Bottom Navigation Bar */
        .mobile-bottom-nav {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 45;
          background: var(--bg-nav);
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding: 4px 8px calc(4px + env(safe-area-inset-bottom, 0px));
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.35);
        }

        .mobile-nav-item {
          background: transparent;
          border: none;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          min-height: 48px;
          padding: 4px 6px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 650;
          cursor: pointer;
          touch-action: manipulation;
        }

        .mobile-nav-item .mobile-nav-icon {
          font-size: 1.05rem;
          line-height: 1;
        }

        .mobile-nav-item[aria-current="page"],
        .mobile-nav-item.active {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
        }

        /* Hide bottom nav during focused full-screen workflows so it never competes with Save/Camera/Detail actions */
        body:has(.modal-backdrop:not(.hidden)) .mobile-bottom-nav,
        body:has(.toolbar.mobile-sheet-open) .mobile-bottom-nav {
          display: none !important;
        }

        /* Ensure bottom nav never obscures the last fleet item or footer */
        .container, .workspace-main {
          padding: 12px 12px calc(84px + env(safe-area-inset-bottom, 0px)) !important;
        }

        .site-footer {
          padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important;
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

      /* COMPACT SUMMARY STRIP CARDS */
      .kpi-card {
        position: relative;
        overflow: hidden;
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 10px 14px;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: border-color 0.16s var(--ease-snappy), box-shadow 0.16s var(--ease-snappy), background-color 0.16s var(--ease-snappy);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .kpi-card::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        border-radius: 3px 0 0 3px;
      }

      .kpi-card:hover {
        background: var(--bg-hover);
        border-color: var(--border-strong);
      }

      .kpi-card.active-filter {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent), var(--shadow-sm);
      }

      .kpi-card.kpi-overdue::before { background: var(--red); }
      .kpi-card.kpi-due-soon::before { background: var(--yellow); }
      .kpi-card.kpi-good::before { background: var(--green); }
      .kpi-card.kpi-nodate::before { background: #64748b; }
      .kpi-card.kpi-all::before { background: var(--accent); }

      .kpi-label {
        font-size: 0.72rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.055em;
        color: var(--text-muted);
        margin-bottom: 2px;
      }

      .kpi-val {
        font-size: 1.45rem;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.025em;
        font-variant-numeric: tabular-nums;
      }

      .kpi-sub {
        font-size: 0.72rem;
        color: var(--text-muted);
        margin-top: 2px;
      }

      /* TOOLBAR ITEMS */
      .search-input {
        flex: 1 1 240px;
        min-width: 180px;
      }

      .active-filter-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        margin-bottom: 12px;
        background: rgba(56, 189, 248, 0.08);
        border: 1px solid rgba(56, 189, 248, 0.28);
        border-radius: var(--radius-sm);
        font-size: 0.82rem;
      }

      .active-filter-chips {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }

      .active-filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: var(--radius-pill);
        background: var(--bg-elev);
        border: 1px solid var(--border);
        font-size: 0.76rem;
        font-weight: 600;
        color: var(--text);
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

      /* PHONE LAYOUT CHOOSER (shown only on compact screens) */
      .mobile-layout-switch {
        display: none;
        gap: 3px;
        align-items: center;
        background: var(--input-bg);
        padding: 3px;
        border-radius: 11px;
        border: 1px solid var(--border);
      }

      .mobile-layout-switch .btn {
        border: none;
        background: transparent;
        box-shadow: none;
        min-height: 44px;
        padding: 6px 10px;
        border-radius: 8px;
        color: var(--text-muted);
        flex: 1 1 0;
        font-size: 0.76rem;
      }

      .mobile-layout-switch .btn[aria-pressed="true"] {
        background: var(--accent);
        color: var(--on-accent);
        box-shadow: 0 2px 8px var(--accent-glow);
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

      .vin-connectivity {
        margin-bottom: 14px;
        padding: 12px;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius);
        background: var(--meta-bg);
        color: var(--text-secondary);
        overflow-wrap: anywhere;
      }

      .vin-connectivity strong { display: block; margin-bottom: 4px; }
      .vin-connectivity p { font-size: 0.85rem; }
      .vin-connectivity[data-state="connected"] {
        color: var(--green-text); background: var(--green-bg); border-color: var(--green-border);
      }
      .vin-connectivity[data-state="checking"] {
        color: var(--yellow-text); background: var(--yellow-bg); border-color: var(--yellow-border);
      }
      .vin-connectivity[data-state="unavailable"], .vin-connectivity[data-state="app-unreachable"] {
        color: var(--red-text); background: var(--red-bg); border-color: var(--red-border);
      }

      .vin-field-option {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        min-height: 44px;
        cursor: pointer;
      }

      .vin-field-option input {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        margin-top: 2px;
        accent-color: var(--accent);
      }

      .vin-field-option > div { min-width: 0; flex: 1; }

      #vin-details .vin-comparison-row { grid-column: 1 / -1; }

      .vin-field-values {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 8px;
      }

      .vin-field-values > div { min-width: 0; overflow-wrap: anywhere; }

      .vin-field-option:focus-within { outline: 2px solid var(--accent); outline-offset: -2px; }

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

      .truck-card.is-selected {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent), var(--shadow);
      }

      /* COMPACT TABLE VIEW */
      .fleet-table-wrap {
        display: none;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-card);
        box-shadow: var(--shadow-sm);
        overflow: visible;
      }

      .fleet-table {
        border-collapse: collapse;
        width: 100%;
        table-layout: fixed;
        font-size: 0.86rem;
        font-variant-numeric: tabular-nums;
      }

      .fleet-table caption {
        padding: 11px 14px;
        text-align: left;
        font-weight: 700;
        font-size: 0.88rem;
        border-bottom: 1px solid var(--border);
        background: var(--meta-bg);
      }

      .fleet-table th, .fleet-table td {
        padding: 10px 14px;
        text-align: left;
        border-bottom: 1px solid var(--border);
        vertical-align: middle;
        overflow-wrap: anywhere;
      }

      .fleet-table thead th {
        position: sticky;
        top: 63px;
        z-index: 8;
        background: var(--meta-bg);
        color: var(--text-muted);
        font-size: 0.71rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.055em;
        box-shadow: inset 0 -1px 0 var(--border);
      }

      .fleet-table tr:last-child td {
        border-bottom: 0;
      }

      .fleet-table th:nth-child(1) { width: 24%; }
      .fleet-table th:nth-child(2) { width: 25%; }
      .fleet-table th:nth-child(3) { width: 17%; }
      .fleet-table th:nth-child(4) { width: 34%; }

      .fleet-table .safety-badge {
        display: inline-block;
        text-align: left;
        white-space: normal;
      }

      .fleet-table .list-sub {
        display: block;
        color: var(--text-muted);
        font-size: 0.76rem;
        margin-top: 2px;
      }

      .unit-row-link {
        background: none;
        border: none;
        padding: 0;
        color: var(--text);
        font-weight: 800;
        font-size: 0.95rem;
        cursor: pointer;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-variant-numeric: tabular-nums;
      }

      .unit-row-link:hover {
        color: var(--accent);
        text-decoration: underline;
      }

      .list-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .fleet-table tbody tr {
        transition: background-color 0.12s ease;
        cursor: pointer;
      }

      .fleet-table tbody tr:hover {
        background: var(--bg-hover);
      }

      .fleet-table tbody tr.is-selected {
        background: rgba(56, 189, 248, 0.11);
        box-shadow: inset 3px 0 0 var(--accent);
      }

      :root[data-theme="light"] .fleet-table tbody tr.is-selected {
        background: rgba(2, 132, 199, 0.09);
      }

      /* VEHICLE-DETAIL WORKSPACE PANEL SECTIONS */
      .detail-empty-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 56px 24px;
        height: 100%;
        min-height: 360px;
        color: var(--text-muted);
      }

      .detail-empty-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: var(--meta-bg);
        border: 1px solid var(--border);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.35rem;
        margin-bottom: 14px;
        color: var(--accent);
      }

      .detail-empty-box h3 {
        color: var(--text);
        font-size: 1.02rem;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .detail-empty-box p {
        font-size: 0.84rem;
        max-width: 280px;
        line-height: 1.5;
      }

      .detail-section-label {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 8px;
      }

      .detail-block {
        margin-top: 16px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }

      .detail-upload-bar {
        background: var(--input-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 10px 12px;
        margin-bottom: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .muted-note {
        color: var(--text-muted);
        font-size: 0.82rem;
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

    @media (max-width: 959px) {
      .mobile-layout-switch { display: flex; width: 100%; }

      #fleet-container[data-mobile-layout="rows"] #fleet-grid { display: none; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table-wrap:not(.hidden) { display: block; }

      #fleet-container[data-mobile-layout="dense"] .fleet-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      @media (max-width: 700px) {
        /* Single-column readable unit cards on phone screens */
        #fleet-container[data-mobile-layout="dense"] .fleet-grid,
        #fleet-container[data-mobile-layout="full"] .fleet-grid {
          grid-template-columns: 1fr;
          gap: 10px;
        }

        #fleet-container[data-mobile-layout="dense"] .truck-card {
          padding: 14px;
          gap: 10px;
          cursor: pointer;
        }

        #fleet-container[data-mobile-layout="dense"] .truck-top {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        #fleet-container[data-mobile-layout="dense"] .truck-top > div:first-child {
          margin-bottom: 0;
          min-width: 0;
          flex: 1 1 160px;
        }

        #fleet-container[data-mobile-layout="dense"] .unit-title {
          font-size: 1.06rem;
          gap: 6px;
        }

        #fleet-container[data-mobile-layout="dense"] .truck-sub {
          display: block;
          font-size: 0.78rem;
          margin-top: 2px;
        }

        #fleet-container[data-mobile-layout="dense"] .truck-card .safety-badge {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 11px;
          font-size: 0.84rem;
        }

        #fleet-container[data-mobile-layout="dense"] .truck-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
          padding-top: 8px;
        }

        #fleet-container[data-mobile-layout="dense"] .truck-actions .btn {
          width: 100%;
          min-height: 44px;
          padding: 6px 8px;
          font-size: 0.76rem;
        }

        /* Hide secondary Edit/Cert buttons on compact phone cards so primary Details / Log Safety / Files buttons are clean and tappable */
        #fleet-container[data-mobile-layout="dense"] .truck-actions [data-edit],
        #fleet-container[data-mobile-layout="dense"] .truck-actions [data-view-file] {
          display: none;
        }

        .mobile-layout-switch {
          width: auto;
          flex: 1 1 auto;
        }
      }

      #fleet-container[data-mobile-layout="dense"] .truck-card {
        padding: 12px;
        gap: 8px;
      }

      #fleet-container[data-mobile-layout="dense"] .truck-top { display: block; }
      #fleet-container[data-mobile-layout="dense"] .truck-top > div:first-child { margin-bottom: 7px; }
      #fleet-container[data-mobile-layout="dense"] .unit-title { font-size: 0.98rem; gap: 5px; }
      #fleet-container[data-mobile-layout="dense"] .type-pill,
      #fleet-container[data-mobile-layout="dense"] .op-pill { font-size: 0.61rem; padding: 2px 6px; }
      #fleet-container[data-mobile-layout="dense"] .truck-sub,
      #fleet-container[data-mobile-layout="dense"] .meta-grid,
      #fleet-container[data-mobile-layout="dense"] .truck-notes { display: none; }
      #fleet-container[data-mobile-layout="dense"] .truck-card .safety-badge {
        width: 100%;
        margin: 0;
        padding: 7px 8px;
        font-size: 0.82rem;
        gap: 3px;
      }
      #fleet-container[data-mobile-layout="dense"] .safety-badge small { font-size: 0.7rem; }
      #fleet-container[data-mobile-layout="dense"] .truck-actions {
        gap: 4px;
        padding-top: 7px;
      }
      #fleet-container[data-mobile-layout="dense"] .truck-actions .btn {
        flex: 1 1 calc(50% - 4px);
        min-width: 0;
        min-height: 44px;
        padding: 5px 6px;
        font-size: 0.68rem;
        white-space: normal;
      }

      #fleet-container[data-mobile-layout="rows"] .fleet-table-wrap {
        border-radius: 12px;
      }
      #fleet-container[data-mobile-layout="rows"] .fleet-table {
        display: block;
        font-size: 0.78rem;
      }
      #fleet-container[data-mobile-layout="rows"] .fleet-table caption {
        padding: 10px 12px;
        font-size: 0.82rem;
      }
      #fleet-container[data-mobile-layout="rows"] .fleet-table thead { display: none; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table tbody { display: block; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table tbody tr {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 4px 8px;
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
      }
      #fleet-container[data-mobile-layout="rows"] .fleet-table tbody tr:last-child { border-bottom: 0; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table td {
        width: auto;
        padding: 0;
        border: 0;
      }
      #fleet-container[data-mobile-layout="rows"] .fleet-table td:nth-child(1) { grid-column: 1; grid-row: 1; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table td:nth-child(2) { grid-column: 2; grid-row: 1; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table td:nth-child(3) { display: none; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table td:nth-child(4) { grid-column: 1 / -1; grid-row: 2; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table .list-sub { font-size: 0.7rem; }
      #fleet-container[data-mobile-layout="rows"] .fleet-table .safety-badge {
        display: block;
        padding: 5px 7px;
        font-size: 0.69rem;
        white-space: nowrap;
      }
      #fleet-container[data-mobile-layout="rows"] .fleet-table .safety-badge small { font-size: 0.65rem; }
      #fleet-container[data-mobile-layout="rows"] .list-actions { gap: 4px; }
      #fleet-container[data-mobile-layout="rows"] .list-actions .btn {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 44px;
        padding: 4px 7px;
        font-size: 0.68rem;
      }
    }

    @media (max-width: 379px) {
      #fleet-container[data-mobile-layout="dense"] .fleet-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 700px) {
      .app-header { position: sticky; top: 0; z-index: 30; padding: 8px 12px; }
      .tools-menu { position: static; }
      .tools-panel { right: 8px; top: calc(100% + 4px); width: min(260px, calc(100vw - 16px)); }
      #btn-add-truck {
        padding: 8px 11px;
        font-size: 0;
        gap: 0;
      }
      #btn-add-truck::before {
        content: "+ Add";
        font-size: 0.8rem;
        font-weight: 700;
      }
      .site-footer { flex-wrap: wrap; padding: 0 12px calc(84px + env(safe-area-inset-bottom, 0px)); }
      .toolbar-left { min-width: 0; width: 100%; }
      .search-input { width: 100%; min-width: 0; flex-basis: 100%; min-height: 44px; font-size: 0.9rem; padding: 8px 12px; }
      .toolbar-left > .select-filter, .filter-field { width: 100%; }
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
            <div class="brand-sub">Fleet operations workspace · Inspections & certificates</div>
          </div>
        </div>
        <div class="header-search-wrap">
          <input
            type="search"
            id="search-input"
            class="search-input"
            aria-label="Search fleet units"
            placeholder="Search Unit #, Plate, VIN, Make/Model, Sticker #..."
          />
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
              <div class="mobile-tools-extras">
                <button type="button" class="btn btn-secondary btn-sm" data-theme-toggle aria-label="Switch to light mode">☀ Light mode</button>
              </div>
              <button type="button" id="btn-vin-decoder" class="btn btn-secondary btn-sm">VIN decoder</button>
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

    <div class="workspace-shell">
      <!-- LEFT REGION: GRAPHITE NAVIGATION & QUICK FLEET VIEWS -->
      <nav class="workspace-nav" aria-label="Fleet views and navigation">
        <div>
          <div class="nav-section-title">Quick Fleet Views</div>
          <ul class="nav-list">
            <li>
              <button type="button" class="nav-view-btn active-nav" data-nav-view="all" aria-current="true">
                <span class="nav-view-label"><span class="status-dot all" aria-hidden="true"></span>All units</span>
                <span class="nav-count" id="nav-count-all">0</span>
              </button>
            </li>
            <li>
              <button type="button" class="nav-view-btn" data-nav-view="overdue" aria-current="false">
                <span class="nav-view-label"><span class="status-dot overdue" aria-hidden="true"></span>Overdue</span>
                <span class="nav-count" id="nav-count-overdue">0</span>
              </button>
            </li>
            <li>
              <button type="button" class="nav-view-btn" data-nav-view="due_soon" aria-current="false">
                <span class="nav-view-label"><span class="status-dot due_soon" aria-hidden="true"></span>Due soon</span>
                <span class="nav-count" id="nav-count-duesoon">0</span>
              </button>
            </li>
            <li>
              <button type="button" class="nav-view-btn" data-nav-view="no_date" aria-current="false">
                <span class="nav-view-label"><span class="status-dot no_date" aria-hidden="true"></span>No date set</span>
                <span class="nav-count" id="nav-count-nodate">0</span>
              </button>
            </li>
            <li>
              <button type="button" class="nav-view-btn" data-nav-view="good" aria-current="false">
                <span class="nav-view-label"><span class="status-dot good" aria-hidden="true"></span>Up to date</span>
                <span class="nav-count" id="nav-count-good">0</span>
              </button>
            </li>
          </ul>
        </div>
        <div class="nav-tools-group">
          <div class="nav-section-title">Operations & Tools</div>
          <ul class="nav-list">
            <li><button type="button" class="nav-tool-btn" data-nav-action="scan">⌗ Scan / Paste UUID</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="add">+ Add Unit</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="ics">📅 Export .ICS Schedule</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="alerts">🔔 Browser Alerts</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="settings">⚙️ Fleet Settings</button></li>
          </ul>
        </div>
      </nav>

      <!-- CENTER REGION: FLEET SUMMARY, TOOLBAR & PRIMARY FLEET LIST -->
      <main class="container workspace-main">
        <!-- COMPACT SUMMARY STRIP -->
        <section class="kpi-grid" aria-label="Fleet status summary">
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
          <div role="button" tabindex="0" class="kpi-card kpi-nodate" data-kpi="no_date">
            <div>
              <div class="kpi-label">⚪ No Date Set</div>
              <div class="kpi-val" id="kpi-nodate-count">0</div>
              <div class="kpi-sub">Pending date</div>
            </div>
          </div>
          <div role="button" tabindex="0" class="kpi-card kpi-all active-filter" data-kpi="all">
            <div>
              <div class="kpi-label">🚛 Total Fleet</div>
              <div class="kpi-val" id="kpi-total-count">0</div>
              <div class="kpi-sub">All units</div>
            </div>
          </div>
        </section>

        <!-- FILTER & VIEW TOOLBAR (Collapses advanced filters into a Filter Sheet on mobile) -->
        <section id="fleet-toolbar" class="toolbar" aria-label="Fleet filters and view controls">
          <div class="mobile-sheet-header">
            <h2 class="modal-title" style="font-size:1.08rem;">Filter & Sort Fleet</h2>
            <button type="button" id="btn-close-filter-sheet" class="close-btn" aria-label="Close filter sheet">&times;</button>
          </div>
          <div class="toolbar-left">
            <label class="filter-field" for="filter-vehicle-type">Vehicle type
              <select id="filter-vehicle-type" class="select-filter" aria-label="Vehicle type">
                <option value="all">All Vehicle Types</option>
                <option value="Tractor">Tractor</option>
                <option value="Straight Truck">Straight Truck</option>
                <option value="Trailer">Trailer</option>
                <option value="Pickup / Service Truck">Pickup / Service Truck</option>
                <option value="Other">Other</option>
              </select>
            </label>
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
            <button type="button" id="btn-mobile-filter-sheet" class="btn btn-secondary btn-sm mobile-filter-sheet-btn" aria-expanded="false" aria-controls="fleet-toolbar">
              <span>⚙ Filter & Sort</span>
              <span id="mobile-filter-badge" class="filter-badge-count hidden">0</span>
            </button>
            <div class="mobile-layout-switch" role="group" aria-label="Phone unit layout">
              <button type="button" id="mobile-layout-rows" class="btn btn-secondary btn-sm" aria-pressed="false" title="Compact rows show the most units at once">Rows</button>
              <button type="button" id="mobile-layout-dense" class="btn btn-secondary btn-sm" aria-pressed="true" title="Dense cards show more units with key status information">Dense</button>
              <button type="button" id="mobile-layout-full" class="btn btn-secondary btn-sm" aria-pressed="false" title="Full cards show every unit detail">Full</button>
            </div>
            <div class="view-switch" role="group" aria-label="Desktop fleet view">
              <button type="button" id="view-list" class="btn btn-secondary btn-sm" aria-pressed="true">Compact list</button>
              <button type="button" id="view-cards" class="btn btn-secondary btn-sm" aria-pressed="false">Cards</button>
            </div>
            <button type="button" id="btn-clear-filters" class="btn btn-secondary btn-sm">Clear filters</button>
            <button type="button" id="btn-refresh" class="btn btn-secondary btn-sm">
              ↻ Refresh
            </button>
          </div>
          <div class="mobile-sheet-footer">
            <button type="button" id="btn-filter-sheet-reset" class="btn btn-secondary">Reset</button>
            <button type="button" id="btn-filter-sheet-apply" class="btn btn-primary">Apply Filters</button>
          </div>
        </section>

        <!-- ACTIVE FILTERS BANNER -->
        <div id="active-filter-bar" class="active-filter-bar hidden" role="region" aria-label="Active filters">
          <div id="active-filter-chips" class="active-filter-chips"></div>
          <button type="button" id="btn-reset-active-filters" class="btn btn-secondary btn-sm" style="min-height:34px; padding:4px 10px; font-size:0.78rem;">Reset filters</button>
        </div>

        <!-- FLEET LIST -->
        <section id="fleet-container">
          <p id="filter-results" class="filter-results" role="status" aria-live="polite"></p>
          <div id="fleet-loading" class="empty-box hidden" role="status" aria-live="polite">
            <h3>Loading fleet records…</h3>
            <p>Fetching units, safety expiration dates, and certificate counts.</p>
          </div>
          <div id="fleet-error" class="empty-box hidden" role="alert">
            <h3 id="fleet-error-title">Unable to load fleet data</h3>
            <p id="fleet-error-description" style="margin-bottom: 16px;">Check your connection and try refreshing the workspace.</p>
            <button type="button" id="btn-error-retry" class="btn btn-primary">↻ Retry loading</button>
          </div>
          <div id="fleet-table-wrap" class="fleet-table-wrap hidden">
            <table class="fleet-table">
              <caption>Fleet safety list</caption>
              <thead><tr><th scope="col">Unit / vehicle</th><th scope="col">Safety / due date</th><th scope="col">Last inspection</th><th scope="col">Actions</th></tr></thead>
              <tbody id="fleet-table-body"></tbody>
            </table>
          </div>
          <div id="fleet-grid" class="fleet-grid"></div>
          <div id="fleet-empty" class="empty-box hidden">
            <h3 id="fleet-empty-title">No trucks or trailers found</h3>
            <p id="fleet-empty-description" style="margin-bottom: 16px;">Add your first truck or trailer to start tracking safety expiration dates and R2 inspection certificates.</p>
            <button type="button" id="btn-empty-add" class="btn btn-primary">+ Add First Unit</button>
          </div>
        </section>
      </main>

      <!-- RIGHT REGION: PERSISTENT VEHICLE-DETAIL WORKSPACE PANEL -->
      <aside class="workspace-detail-col" aria-label="Selected vehicle details">
        <div id="detail-empty-state" class="detail-empty-box">
          <div class="detail-empty-icon" aria-hidden="true">🚛</div>
          <h3>No unit selected</h3>
          <p>Select any unit from the fleet list or scan a QR label to inspect its compliance status, log a safety inspection, or manage R2 certificates here.</p>
        </div>
        <div id="modal-unit" class="modal-backdrop workspace-detail hidden">
          <div class="modal-panel detail-panel-inner">
            <div id="detail-selected-content">
              <div class="modal-header" style="top: -18px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  <button type="button" class="btn btn-secondary btn-sm mobile-back-btn" data-close="modal-unit" aria-label="Back to fleet">← Back</button>
                  <div style="min-width:0;">
                    <h2 id="unit-title" class="modal-title">Unit overview</h2>
                    <p id="unit-subtitle-host" class="muted-note" style="margin-top:2px;"></p>
                  </div>
                </div>
                <button type="button" class="close-btn" data-close="modal-unit" aria-label="Close unit overview">&times;</button>
              </div>
              <div id="unit-status-badge-host" style="margin-bottom: 12px;"></div>
              <div class="detail-section-label">Primary Actions</div>
              <div id="unit-actions" class="truck-actions" style="padding-top:0; border-top:none; margin-bottom:14px;"></div>
              <div id="unit-details"></div>

              <!-- INLINE CHRONOLOGICAL INSPECTION HISTORY & R2 CERTIFICATES -->
              <details id="detail-history-section" class="detail-disclosure" open>
                <summary>Inspection History & Certificates</summary>
                <div class="detail-disclosure-body">
                  <div id="detail-upload-section" class="detail-upload-bar hidden">
                    <label for="detail-quick-upload-input" style="font-size:0.78rem; font-weight:650; color:var(--text);">Attach Certificate / Sheet to R2 (PDF, JPEG, PNG, WebP)</label>
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <input type="file" id="detail-quick-upload-input" accept="application/pdf,image/jpeg,image/png,image/webp" style="font-size:0.78rem; flex:1 1 160px; min-width:0;" />
                      <button type="button" id="btn-detail-quick-upload" class="btn btn-primary btn-sm">Upload to R2</button>
                    </div>
                    <p id="detail-upload-feedback" class="hidden" role="status" aria-live="polite" style="font-size:0.78rem; margin:0;"></p>
                  </div>
                  <div id="detail-history-list"></div>
                </div>
              </details>

              <!-- QR LABEL & SECONDARY UNIT ACTIONS -->
              <details class="detail-disclosure" open>
                <summary>QR Label & Unit Actions</summary>
                <div class="detail-disclosure-body">
                  <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                    <a id="unit-print-label" class="btn btn-secondary btn-sm hidden" target="_blank" rel="noopener">🖨 Print QR label</a>
                  </div>
                  <p style="margin-top:8px;color:var(--text-muted);font-size:0.78rem;">Optional QR label: UUID only · 1.5 × 1.5 inches. Manual unit access still works without a QR.</p>
                  <div id="unit-secondary-actions"></div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- MOBILE BOTTOM NAVIGATION BAR (Fleet / Scan / Tools) -->
    <nav class="mobile-bottom-nav" aria-label="Mobile primary navigation">
      <button type="button" id="mobile-nav-fleet" class="mobile-nav-item active" aria-current="page">
        <span class="mobile-nav-icon" aria-hidden="true">🚛</span>
        <span>Fleet</span>
      </button>
      <button type="button" id="mobile-nav-scan" class="mobile-nav-item">
        <span class="mobile-nav-icon" aria-hidden="true">⌗</span>
        <span>Scan</span>
      </button>
      <button type="button" id="mobile-nav-tools" class="mobile-nav-item" aria-expanded="false">
        <span class="mobile-nav-icon" aria-hidden="true">⚙️</span>
        <span>Tools</span>
      </button>
    </nav>
    <footer class="site-footer">
      <span>Open source under the MIT License</span>
      <span class="site-footer-separator" aria-hidden="true">·</span>
      <span>View on</span>
      <a href="https://github.com/CanadianCowboy/truck-safety-tracker" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><img class="site-footer-logo site-footer-logo-dark" src="${basePath}/github-lockup-white.svg" alt="GitHub" /><img class="site-footer-logo site-footer-logo-light" src="${basePath}/github-lockup-black.svg" alt="GitHub" /></a>
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
        <div id="truck-form-error" class="form-error-banner hidden" role="alert" aria-live="assertive"></div>
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
            <button type="button" id="btn-truck-decode-vin" class="btn btn-secondary">Decode VIN…</button>
            <small>Preview NHTSA details before applying them. Nothing is saved automatically.</small>
          </div>
          <div class="input-group">
            <label for="truck-year">Year</label>
            <input id="truck-year" type="number" min="1900" max="2100" class="input-control" placeholder="e.g. 2022" />
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

  <!-- Shared standalone / unit-form VIN preview. Only explicit lookups contact NHTSA. -->
  <div id="modal-vin" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="vin-title">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title" id="vin-title">VIN decoder</h2>
        <button type="button" class="close-btn" data-close="modal-vin" aria-label="Close VIN decoder">&times;</button>
      </div>
      <p class="muted-note" style="margin-bottom:14px;">An explicit lookup sends only the VIN and optional model year to NHTSA vPIC. For 1981+ vehicles; not a title, history or inspection check. Verify results against the vehicle label, especially GVWR ranges.</p>
      <div id="vin-connectivity" class="vin-connectivity" data-state="not-checked" role="status" aria-live="polite" aria-atomic="true">
        <strong id="vin-connectivity-title">NHTSA connection not checked</strong>
        <p id="vin-connectivity-detail">Connection is checked only when you decode a VIN. No background requests are sent.</p>
      </div>
      <form id="form-vin">
        <div class="form-grid">
          <div class="input-group col-span-2">
            <label for="vin-input">VIN to decode</label>
            <input id="vin-input" class="input-control" maxlength="17" autocomplete="off" autocapitalize="characters" spellcheck="false" required aria-describedby="vin-status" placeholder="Full 17-character VIN" />
          </div>
          <div class="input-group">
            <label for="vin-year">Model year (optional)</label>
            <input id="vin-year" class="input-control" type="number" min="1981" max="2100" step="1" placeholder="Helps resolve older VINs" />
          </div>
        </div>
        <button type="submit" id="btn-vin-lookup" class="btn btn-primary">Decode VIN</button>
      </form>
      <p id="vin-status" role="status" aria-live="polite" style="margin-top:14px;overflow-wrap:anywhere;"></p>
      <div id="vin-preview" class="hidden" style="margin-top:14px;">
        <div id="vin-warnings" role="status" style="margin-bottom:12px;overflow-wrap:anywhere;"></div>
        <p id="vin-duplicate-warning" class="truck-notes hidden" role="status" style="margin-bottom:12px;overflow-wrap:anywhere;"></p>
        <p id="vin-comparison-note" class="muted-note hidden" style="margin-bottom:12px;">Current form values include unsaved edits. Compare them with the decoded values before applying.</p>
        <p id="vin-selection-help" class="muted-note" style="margin-bottom:12px;">Check the fields you want to apply. Available fields start selected; uncheck any you want to keep unchanged. Other specifications are read-only.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <button type="button" id="btn-vin-select-all" class="btn btn-secondary btn-sm">Select all</button>
          <button type="button" id="btn-vin-clear-selection" class="btn btn-secondary btn-sm">Clear selection</button>
        </div>
        <div id="vin-details" class="meta-grid" role="group" aria-label="Decoded VIN details and fields to apply" aria-describedby="vin-selection-help"></div>
        <p class="muted-note" style="margin-top:14px;">Only checked vehicle details will be applied. Inspection dates, plate, notes and operational status are never changed.</p>
        <div class="modal-footer">
          <button type="button" id="btn-vin-apply" class="btn btn-primary" disabled>Use for new unit</button>
        </div>
      </div>
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
        <div id="inspect-form-error" class="form-error-banner hidden" role="alert" aria-live="assertive"></div>
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
    let fleetLoading = false;
    let fleetLoadError = '';
    let appSettings = { warning_days: 30, webhook_url: '', webhook_type: 'auto' };
    let activeHistoryTruckId = null;
    let mobileLayout = readPreference('truck_safety_mobile_layout', 'dense');

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
    setFleetView(readPreference('truck_safety_view', 'list'));
    document.getElementById('view-cards').addEventListener('click', () => { setFleetView('cards'); renderFleet(); });
    document.getElementById('view-list').addEventListener('click', () => { setFleetView('list'); renderFleet(); });
    window.matchMedia('(min-width: 960px)').addEventListener('change', () => {
      if (fleetData.length > 0) renderFleet();
    });

    function setMobileLayout(layout, persist = true) {
      mobileLayout = ['rows', 'dense', 'full'].includes(layout) ? layout : 'dense';
      const fleet = document.getElementById('fleet-container');
      fleet.dataset.mobileLayout = mobileLayout;
      ['rows', 'dense', 'full'].forEach(option => {
        document.getElementById('mobile-layout-' + option).setAttribute('aria-pressed', String(option === mobileLayout));
      });
      if (persist) {
        savePreference('truck_safety_mobile_layout', mobileLayout);
        renderFleet();
      }
    }
    setMobileLayout(mobileLayout, false);
    ['rows', 'dense', 'full'].forEach(layout => {
      document.getElementById('mobile-layout-' + layout).addEventListener('click', () => setMobileLayout(layout));
    });
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
        throw Object.assign(new Error(data.error || 'Request failed (HTTP ' + res.status + ')'), { status: res.status });
      }
      return res;
    }

    function lockApp(reason = '') {
      fleetData = [];
      fleetLoading = false;
      fleetLoadError = '';
      appSettings = { warning_days: 30, webhook_url: '', webhook_type: 'auto' };
      activeHistoryTruckId = null;
      overviewRequest++;
      stopUnitCamera();
      resetVinDecoder();
      document.getElementById('form-vin').reset();
      if (typeof clearPendingUnit === 'function') {
        clearPendingUnit();
      } else {
        document.getElementById('unit-details').innerHTML = '';
        document.getElementById('unit-actions').innerHTML = '';
        document.getElementById('unit-title').textContent = 'Unit overview';
        document.getElementById('unit-print-label').removeAttribute('href');
      }
      document.querySelectorAll('.modal-backdrop').forEach(el => el.classList.add('hidden'));
      document.getElementById('fleet-grid').innerHTML = '';
      document.getElementById('fleet-table-body').innerHTML = '';
      document.getElementById('fleet-table-wrap').classList.add('hidden');
      document.getElementById('header-tools').open = false;
      document.getElementById('history-list').innerHTML = '';
      const detailHistory = document.getElementById('detail-history-list');
      if (detailHistory) detailHistory.innerHTML = '';
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
      const loadingEl = document.getElementById('fleet-loading');
      const errorEl = document.getElementById('fleet-error');
      fleetLoadError = '';
      if (errorEl) errorEl.classList.add('hidden');
      if (fleetData.length === 0 && loadingEl) {
        fleetLoading = true;
        loadingEl.classList.remove('hidden');
        document.getElementById('fleet-empty').classList.add('hidden');
      }
      try {
        const res = await apiFetch('/trucks');
        const data = await res.json();
        fleetData = data.trucks || [];
        fleetLoading = false;
        if (loadingEl) loadingEl.classList.add('hidden');
        if (data.settings) {
          appSettings = data.settings;
          document.getElementById('kpi-duesoon-label').textContent = 'Within ' + appSettings.warning_days + ' days';
          document.querySelector('#filter-status option[value="due_soon"]').textContent = '🟡 Close / due within ' + appSettings.warning_days + ' days';
        }
        updateKpis();
        renderFleet();
        if (typeof pendingUnitId !== 'undefined' && pendingUnitId) {
          await openPendingUnit();
        } else if (typeof selectedUnitId !== 'undefined' && selectedUnitId) {
          const stillExists = fleetData.some(t => t.id === selectedUnitId);
          if (stillExists) {
            await openUnitOverview(selectedUnitId);
          } else {
            clearPendingUnit();
          }
        }
      } catch (err) {
        fleetLoading = false;
        if (loadingEl) loadingEl.classList.add('hidden');
        if (err.message !== 'Unauthorized') {
          fleetLoadError = err.message || 'Failed to load fleet data';
          showToast('Failed to load fleet data', true);
          renderFleet();
        }
      }
    }

    function updateKpis() {
      const overdue = fleetData.filter((t) => t.safety_status === 'overdue').length;
      const dueSoon = fleetData.filter((t) => t.safety_status === 'due_soon').length;
      const good = fleetData.filter((t) => t.safety_status === 'good').length;
      const noDate = fleetData.filter((t) => t.safety_status === 'no_date').length;
      const total = fleetData.length;
      document.getElementById('kpi-overdue-count').textContent = overdue;
      document.getElementById('kpi-duesoon-count').textContent = dueSoon;
      document.getElementById('kpi-good-count').textContent = good;
      const kpiNoDate = document.getElementById('kpi-nodate-count');
      if (kpiNoDate) kpiNoDate.textContent = noDate;
      document.getElementById('kpi-total-count').textContent = total;
      const navAll = document.getElementById('nav-count-all');
      const navOverdue = document.getElementById('nav-count-overdue');
      const navDueSoon = document.getElementById('nav-count-duesoon');
      const navNoDate = document.getElementById('nav-count-nodate');
      const navGood = document.getElementById('nav-count-good');
      if (navAll) navAll.textContent = total;
      if (navOverdue) navOverdue.textContent = overdue;
      if (navDueSoon) navDueSoon.textContent = dueSoon;
      if (navNoDate) navNoDate.textContent = noDate;
      if (navGood) navGood.textContent = good;
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

    function statusIcon(status) {
      if (status === 'overdue') return '▲';
      if (status === 'due_soon') return '◆';
      if (status === 'good') return '●';
      return '○';
    }

    function formatStatusWithIcon(truck) {
      return statusIcon(truck.safety_status) + ' ' + formatDaysBadge(truck);
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
      const sort = document.getElementById('sort-due').value;
      const rangeActive = sFilter === 'range';
      const invalidRange = rangeActive && from && to && from > to;
      document.getElementById('filter-from-field').classList.toggle('hidden', !rangeActive);
      document.getElementById('filter-to-field').classList.toggle('hidden', !rangeActive);
      document.getElementById('filter-to').min = from;
      document.getElementById('filter-to').setCustomValidity(invalidRange ? 'End date must be on or after the start date.' : '');
      document.querySelectorAll('.kpi-card').forEach(c => {
        c.classList.toggle('active-filter', c.getAttribute('data-kpi') === sFilter);
      });
      document.querySelectorAll('[data-nav-view]').forEach(btn => {
        const active = btn.getAttribute('data-nav-view') === sFilter;
        btn.classList.toggle('active-nav', active);
        btn.setAttribute('aria-current', String(active));
      });

      // Update active filter bar & mobile filter badge
      const activeBar = document.getElementById('active-filter-bar');
      const activeChips = document.getElementById('active-filter-chips');
      const mobileBadge = document.getElementById('mobile-filter-badge');
      let advancedFilterCount = 0;
      if (vType !== 'all') advancedFilterCount++;
      if (sFilter !== 'all') advancedFilterCount++;
      if (rangeActive && (from || to)) advancedFilterCount++;
      if (sort !== 'earliest') advancedFilterCount++;
      if (mobileBadge) {
        mobileBadge.textContent = String(advancedFilterCount);
        mobileBadge.classList.toggle('hidden', advancedFilterCount === 0);
      }
      if (activeBar && activeChips) {
        const chips = [];
        if (q) chips.push('Search: “' + escapeHtml(document.getElementById('search-input').value.trim()) + '”');
        if (vType !== 'all') chips.push('Type: ' + escapeHtml(vType));
        if (sFilter !== 'all') {
          const statusLabel = document.getElementById('filter-status').selectedOptions[0]?.textContent || sFilter;
          chips.push('Due: ' + escapeHtml(statusLabel));
        }
        if (rangeActive && (from || to)) {
          chips.push('Range: ' + escapeHtml(from || '…') + ' → ' + escapeHtml(to || '…'));
        }
        if (sort !== 'earliest') {
          const sortLabel = document.getElementById('sort-due').selectedOptions[0]?.textContent || sort;
          chips.push(escapeHtml(sortLabel));
        }
        if (chips.length > 0) {
          activeChips.innerHTML = '<span style="color:var(--text-muted); font-weight:600; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.04em;">Active filters:</span>' +
            chips.map(c => '<span class="active-filter-chip">' + c + '</span>').join('');
          activeBar.classList.remove('hidden');
        } else {
          activeChips.innerHTML = '';
          activeBar.classList.add('hidden');
        }
      }

      const loadingEl = document.getElementById('fleet-loading');
      const errorEl = document.getElementById('fleet-error');
      const grid = document.getElementById('fleet-grid');
      const empty = document.getElementById('fleet-empty');
      const tableBody = document.getElementById('fleet-table-body');
      const tableWrap = document.getElementById('fleet-table-wrap');

      if (fleetLoading && fleetData.length === 0) {
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (errorEl) errorEl.classList.add('hidden');
        empty.classList.add('hidden');
        tableWrap.classList.add('hidden');
        grid.innerHTML = '';
        tableBody.innerHTML = '';
        document.getElementById('filter-results').textContent = 'Loading fleet data…';
        return;
      }
      if (loadingEl) loadingEl.classList.add('hidden');

      if (fleetLoadError) {
        if (errorEl) {
          document.getElementById('fleet-error-description').textContent = fleetLoadError + (fleetData.length ? ' Showing previously loaded records.' : '');
          errorEl.classList.remove('hidden');
        }
        if (fleetData.length === 0) {
          empty.classList.add('hidden');
          tableWrap.classList.add('hidden');
          grid.innerHTML = '';
          tableBody.innerHTML = '';
          document.getElementById('filter-results').textContent = 'Failed to load fleet data.';
          return;
        }
      } else if (errorEl) errorEl.classList.add('hidden');

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

      const desktopList = window.matchMedia('(min-width: 960px)').matches && document.getElementById('fleet-container').dataset.view === 'list';
      const phoneRows = window.matchMedia('(max-width: 959px)').matches && mobileLayout === 'rows';
      tableWrap.classList.toggle('hidden', filtered.length === 0 || !(desktopList || phoneRows));
      const curSelected = typeof selectedUnitId !== 'undefined' ? selectedUnitId : null;
      tableBody.innerHTML = filtered.map(t => {
        const id = escapeHtml(t.id);
        const isSel = curSelected && curSelected === t.id;
        const dueLabel = t.next_due_date ? 'Due ' + escapeHtml(t.next_due_date) : 'Inspection date pending';
        const vehicleLine = [t.year, t.make, t.model, t.equipment_type].filter(Boolean).join(' ');
        const latestFileBtn = t.latest_attachment
          ? '<button type="button" class="btn btn-secondary btn-sm" data-view-file="' + escapeHtml(t.latest_attachment.id) + '" data-file-name="' + escapeHtml(t.latest_attachment.file_name) + '" data-file-type="' + escapeHtml(t.latest_attachment.content_type) + '">📄 View Cert</button>'
          : '';
        return '<tr data-unit-row="' + id + '" class="' + (isSel ? 'is-selected' : '') + '" aria-selected="' + String(Boolean(isSel)) + '">' +
          '<td><button type="button" class="unit-row-link" data-select-unit="' + id + '"><strong>Unit #' + escapeHtml(t.unit_number) + '</strong></button><span class="list-sub">' + escapeHtml(t.vehicle_type) + (t.status !== 'Active' ? ' · ' + escapeHtml(t.status) : '') + '</span><span class="list-sub">' + escapeHtml(vehicleLine) + '</span></td>' +
          '<td><span class="safety-badge ' + escapeHtml(t.safety_status) + '">' + escapeHtml(formatStatusWithIcon(t)) + '<small>' + dueLabel + '</small></span></td>' +
          '<td>' + escapeHtml(t.last_inspection_date || '—') + '<span class="list-sub">' + escapeHtml(t.license_plate || '') + '</span></td>' +
          '<td><div class="list-actions"><button type="button" class="btn btn-secondary btn-sm" data-details="' + id + '">Details</button><button type="button" class="btn btn-success btn-sm" data-inspect="' + id + '">Log Safety</button>' + latestFileBtn + '<button type="button" class="btn btn-secondary btn-sm" data-history="' + id + '">Files (' + (t.attachment_count || 0) + ')</button><button type="button" class="btn btn-secondary btn-sm" data-edit="' + id + '">Edit</button></div></td></tr>';
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
          const isSel = curSelected && curSelected === t.id;
          const ymm = [t.year, t.make, t.model, t.equipment_type].filter(Boolean).join(' ') || 'Vehicle details not set';
          const latestFileBtn = t.latest_attachment
            ? \`<button type="button" class="btn btn-secondary btn-sm" data-view-file="\${escapeHtml(t.latest_attachment.id)}" data-file-name="\${escapeHtml(t.latest_attachment.file_name)}" data-file-type="\${escapeHtml(t.latest_attachment.content_type)}">📄 View Cert</button>\`
            : '';
          const dueSmall = t.next_due_date ? 'Due ' + escapeHtml(t.next_due_date) : 'Inspection date pending';
          const dueValue = t.next_due_date ? \`\${escapeHtml(t.next_due_date)} (\${t.interval_months || 12}m)\` : \`No date set (\${t.interval_months || 12}m)\`;

          return \`
            <article class="truck-card status-\${escapeHtml(t.safety_status)}\${isSel ? ' is-selected' : ''}" data-unit-row="\${escapeHtml(t.id)}" aria-selected="\${String(Boolean(isSel))}">
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
                    <span>\${escapeHtml(formatStatusWithIcon(t))}</span>
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
                <button type="button" class="btn btn-secondary btn-sm" data-details="\${escapeHtml(t.id)}">Details</button>
                <button type="button" class="btn btn-success btn-sm" data-inspect="\${escapeHtml(t.id)}">✓ Log Safety</button>
                \${latestFileBtn}
                <button type="button" class="btn btn-secondary btn-sm" data-history="\${escapeHtml(t.id)}">📂 Files (\${t.attachment_count || 0})</button>
                <button type="button" class="btn btn-secondary btn-sm" data-edit="\${escapeHtml(t.id)}">✎ Edit</button>
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

    // Left Navigation Quick Fleet Views & Tool shortcuts
    document.querySelectorAll('[data-nav-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-nav-view');
        document.getElementById('filter-status').value = view;
        renderFleet();
      });
    });

    document.querySelectorAll('[data-nav-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-nav-action');
        if (action === 'scan') document.getElementById('btn-scan-unit').click();
        else if (action === 'add') document.getElementById('btn-add-truck').click();
        else if (action === 'ics') document.getElementById('btn-export-ics').click();
        else if (action === 'alerts') document.getElementById('btn-browser-notify').click();
        else if (action === 'settings') document.getElementById('btn-settings').click();
      });
    });

    function clearAllFilters() {
      document.getElementById('search-input').value = '';
      document.getElementById('filter-vehicle-type').value = 'all';
      document.getElementById('filter-status').value = 'all';
      document.getElementById('filter-from').value = '';
      document.getElementById('filter-to').value = '';
      document.getElementById('sort-due').value = 'earliest';
      renderFleet();
    }

    document.getElementById('search-input').addEventListener('input', renderFleet);
    document.getElementById('filter-vehicle-type').addEventListener('change', renderFleet);
    document.getElementById('filter-status').addEventListener('change', renderFleet);
    document.getElementById('sort-due').addEventListener('change', renderFleet);
    document.getElementById('filter-from').addEventListener('input', renderFleet);
    document.getElementById('filter-to').addEventListener('input', renderFleet);
    document.getElementById('btn-clear-filters').addEventListener('click', clearAllFilters);
    const resetActiveBtn = document.getElementById('btn-reset-active-filters');
    if (resetActiveBtn) resetActiveBtn.addEventListener('click', clearAllFilters);
    document.getElementById('btn-refresh').addEventListener('click', loadDashboard);
    const retryBtn = document.getElementById('btn-error-retry');
    if (retryBtn) retryBtn.addEventListener('click', loadDashboard);

    // Mobile Filter Sheet controls
    const fleetToolbar = document.getElementById('fleet-toolbar');
    const mobileFilterSheetBtn = document.getElementById('btn-mobile-filter-sheet');
    function setMobileFilterSheetOpen(open) {
      if (!fleetToolbar || !mobileFilterSheetBtn) return;
      fleetToolbar.classList.toggle('mobile-sheet-open', open);
      mobileFilterSheetBtn.setAttribute('aria-expanded', String(open));
    }
    if (mobileFilterSheetBtn) {
      mobileFilterSheetBtn.addEventListener('click', () => {
        setMobileFilterSheetOpen(!fleetToolbar.classList.contains('mobile-sheet-open'));
      });
    }
    const closeFilterSheetBtn = document.getElementById('btn-close-filter-sheet');
    if (closeFilterSheetBtn) closeFilterSheetBtn.addEventListener('click', () => setMobileFilterSheetOpen(false));
    const applyFilterSheetBtn = document.getElementById('btn-filter-sheet-apply');
    if (applyFilterSheetBtn) applyFilterSheetBtn.addEventListener('click', () => {
      renderFleet();
      setMobileFilterSheetOpen(false);
    });
    const resetFilterSheetBtn = document.getElementById('btn-filter-sheet-reset');
    if (resetFilterSheetBtn) resetFilterSheetBtn.addEventListener('click', () => {
      clearAllFilters();
    });

    // Mobile Bottom Navigation bar (Fleet / Scan / Tools)
    const navFleetBtn = document.getElementById('mobile-nav-fleet');
    const navScanBtn = document.getElementById('mobile-nav-scan');
    const navToolsBtn = document.getElementById('mobile-nav-tools');
    if (navFleetBtn) {
      navFleetBtn.addEventListener('click', () => {
        setMobileFilterSheetOpen(false);
        const tools = document.getElementById('header-tools');
        if (tools) tools.open = false;
        if (typeof selectedUnitId !== 'undefined' && selectedUnitId && typeof clearPendingUnit === 'function') {
          clearPendingUnit();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    if (navScanBtn) {
      navScanBtn.addEventListener('click', () => {
        setMobileFilterSheetOpen(false);
        const tools = document.getElementById('header-tools');
        if (tools) tools.open = false;
        document.getElementById('btn-scan-unit').click();
      });
    }
    if (navToolsBtn) {
      navToolsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setMobileFilterSheetOpen(false);
        const tools = document.getElementById('header-tools');
        if (tools) {
          tools.open = !tools.open;
          navToolsBtn.setAttribute('aria-expanded', String(tools.open));
          if (tools.open) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    }

    // Track dirty state for Add/Edit Truck and Log Inspection forms to avoid silently discarding unsaved edits
    let truckFormDirty = false;
    let inspectFormDirty = false;
    document.getElementById('form-truck').addEventListener('input', () => { truckFormDirty = true; });
    document.getElementById('form-inspect').addEventListener('input', () => { inspectFormDirty = true; });

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
      truckFormDirty = false;
      const errBanner = document.getElementById('truck-form-error');
      if (errBanner) { errBanner.textContent = ''; errBanner.classList.add('hidden'); }
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

    // Shared VIN lookup preview. Cancel / input changes invalidate any in-flight result.
    let vinRequest = null;
    let vinDecoded = null;
    let vinFromTruck = false;
    let vinTruckId = '';
    let vinReturnFocus = null;
    let vinConnectivity = 'not-checked';

    function setVinConnectivity(state, detail) {
      vinConnectivity = state;
      const titles = {
        'not-checked': 'NHTSA connection not checked',
        checking: 'Checking NHTSA connection…',
        connected: 'NHTSA connected — last lookup',
        unavailable: 'NHTSA temporarily unavailable',
        'app-unreachable': 'App connection failed — NHTSA status unknown',
      };
      document.getElementById('vin-connectivity').dataset.state = state;
      document.getElementById('vin-connectivity-title').textContent = titles[state];
      document.getElementById('vin-connectivity-detail').textContent = detail;
    }

    function vinLookupButtonLabel() {
      return vinConnectivity === 'unavailable' || vinConnectivity === 'app-unreachable' ? 'Retry VIN lookup' : 'Decode VIN';
    }

    function vinApplyFields(d) {
      return [
        ['truck-vin', d.vin, 'VIN'], ['truck-year', d.year, 'Year'], ['truck-make', d.make, 'Make'],
        ['truck-model', d.model, 'Model'], ['truck-type', d.vehicle_type, 'Fleet type suggestion'],
        ['truck-equipment-type', d.equipment_type, 'Body / equipment type'], ['truck-gvwr', d.gvwr, 'GVWR / weight class (range)'],
      ];
    }

    function selectedVinFields() {
      if (!vinDecoded) return [];
      const selected = new Set(Array.from(document.querySelectorAll('#vin-details [data-vin-field]:checked'), input => input.getAttribute('data-vin-field')));
      return vinApplyFields(vinDecoded).filter(([id, value]) => value != null && value !== '' && selected.has(id));
    }

    function updateVinSelectionControls() {
      const options = document.querySelectorAll('#vin-details [data-vin-field]');
      const selected = selectedVinFields().length;
      document.getElementById('btn-vin-apply').disabled = selected === 0;
      document.getElementById('btn-vin-select-all').disabled = options.length === selected;
      document.getElementById('btn-vin-clear-selection').disabled = selected === 0;
    }

    document.getElementById('vin-details').addEventListener('change', updateVinSelectionControls);
    ['btn-vin-select-all', 'btn-vin-clear-selection'].forEach(id => {
      document.getElementById(id).addEventListener('click', () => {
        document.querySelectorAll('#vin-details [data-vin-field]').forEach(input => { input.checked = id === 'btn-vin-select-all'; });
        updateVinSelectionControls();
      });
    });

    function updateVinDuplicateWarning() {
      const warning = document.getElementById('vin-duplicate-warning');
      const normalizedVin = vinDecoded.vin.trim().toUpperCase();
      const matches = fleetData.filter(unit =>
        (!vinFromTruck || unit.id !== vinTruckId) && String(unit.vin || '').trim().toUpperCase() === normalizedVin
      );
      warning.textContent = matches.length
        ? 'This VIN already belongs to ' + matches.map(unit => 'Unit #' + unit.unit_number).join(', ') + ' in the loaded fleet. Verify before applying or saving. This warning does not block saving.'
        : '';
      warning.classList.toggle('hidden', matches.length === 0);
    }

    function resetVinDecoder() {
      if (vinRequest) vinRequest.abort();
      vinRequest = null;
      if (vinConnectivity === 'checking') setVinConnectivity('not-checked', 'Lookup cancelled. Decode a VIN to check the connection again.');
      vinDecoded = null;
      document.getElementById('btn-vin-apply').disabled = true;
      document.getElementById('vin-preview').classList.add('hidden');
      document.getElementById('vin-details').innerHTML = '';
      document.getElementById('vin-warnings').textContent = '';
      document.getElementById('vin-duplicate-warning').textContent = '';
      document.getElementById('vin-duplicate-warning').classList.add('hidden');
      updateVinSelectionControls();
      document.getElementById('vin-status').textContent = '';
      const button = document.getElementById('btn-vin-lookup');
      button.disabled = false;
      button.textContent = vinLookupButtonLabel();
    }

    function openVinDecoder(fromTruck) {
      setVinConnectivity('not-checked', 'Connection is checked only when you decode a VIN. No background requests are sent.');
      resetVinDecoder();
      vinFromTruck = fromTruck;
      vinTruckId = document.getElementById('truck-id').value;
      vinReturnFocus = document.activeElement;
      document.getElementById('form-vin').reset();
      if (fromTruck) {
        document.getElementById('vin-input').value = document.getElementById('truck-vin').value.trim();
        document.getElementById('vin-year').value = document.getElementById('truck-year').value;
      }
      document.getElementById('vin-comparison-note').classList.toggle('hidden', !fromTruck);
      document.getElementById('btn-vin-apply').textContent = fromTruck ? 'Apply to unit form' : 'Use for new unit';
      document.getElementById('modal-vin').classList.remove('hidden');
      document.getElementById('vin-input').focus();
    }

    function closeVinDecoder() {
      resetVinDecoder();
      document.getElementById('modal-vin').classList.add('hidden');
      if (vinReturnFocus) vinReturnFocus.focus();
    }

    document.getElementById('btn-vin-decoder').addEventListener('click', () => openVinDecoder(false));
    document.getElementById('btn-truck-decode-vin').addEventListener('click', () => openVinDecoder(true));
    document.getElementById('form-vin').addEventListener('input', resetVinDecoder);
    document.getElementById('form-vin').addEventListener('submit', async (event) => {
      event.preventDefault();
      resetVinDecoder();
      const status = document.getElementById('vin-status');
      const vin = document.getElementById('vin-input').value.trim().toUpperCase();
      document.getElementById('vin-input').value = vin;
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        status.textContent = 'Enter a full 17-character VIN using letters and numbers (no I, O or Q).';
        return;
      }
      const controller = new AbortController();
      vinRequest = controller;
      const button = document.getElementById('btn-vin-lookup');
      button.disabled = true;
      button.textContent = 'Decoding…';
      setVinConnectivity('checking', 'Contacting the real NHTSA vPIC service. The provider lookup times out after 15 seconds.');
      status.textContent = 'Looking up VIN with NHTSA…';
      let timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 20000);
      try {
        const response = await apiFetch('/vin/decode', {
          method: 'POST', signal: controller.signal,
          body: JSON.stringify({ vin, year: document.getElementById('vin-year').value }),
        });
        const data = await response.json();
        if (vinRequest !== controller || controller.signal.aborted) return;
        setVinConnectivity('connected', 'The last lookup reached NHTSA. Review the returned details and any warnings.');
        vinDecoded = data.decoded;
        const d = vinDecoded;
        const fields = [
          ...vinApplyFields(d),
          ['', d.decoded_vehicle_type, 'Vehicle type (NHTSA)'], ['', d.manufacturer, 'Manufacturer'],
          ['', d.engine, 'Engine'], ['', d.fuel_type, 'Fuel'], ['', d.plant_country, 'Plant country'],
        ];
        document.getElementById('vin-details').innerHTML = fields.map(([id, value, label]) => {
          const compare = vinFromTruck && id;
          const decodedValue = escapeHtml(value || 'Not available');
          const detail = '<div><span>' + escapeHtml(label) + '</span>' + (compare
            ? '<div class="vin-field-values"><div><span>Current form</span><strong data-vin-current>' + escapeHtml(document.getElementById(id).value || 'Not set') + '</strong></div>' +
              '<div><span>Decoded VIN</span><strong data-vin-decoded>' + decodedValue + '</strong></div></div>'
            : '<strong>' + decodedValue + '</strong>') + '</div>';
          const attributes = id ? ' data-vin-detail="' + id + '"' : '';
          const comparisonClass = compare ? ' vin-comparison-row' : '';
          return id && value != null && value !== ''
            ? '<label class="meta-item vin-field-option' + comparisonClass + '"' + attributes + '><input type="checkbox" data-vin-field="' + id + '" aria-label="Apply ' + escapeHtml(label) + '" checked />' + detail + '</label>'
            : '<div class="meta-item' + comparisonClass + '"' + attributes + '>' + detail + '</div>';
        }).join('');
        updateVinSelectionControls();
        updateVinDuplicateWarning();
        document.getElementById('vin-warnings').textContent = d.warnings.join(' ');
        status.textContent = d.warnings.length ? 'Partial decode — review warnings before applying.' : 'Decoded by NHTSA. Review before applying.';
        document.getElementById('vin-preview').classList.remove('hidden');
      } catch (error) {
        if (vinRequest === controller && (!controller.signal.aborted || timedOut)) {
          status.textContent = timedOut ? 'The app did not respond within 20 seconds. Please retry.' : error.message;
          if (error.status === 502 || error.status === 504) {
            setVinConnectivity('unavailable', error.message + ' Retry the lookup later, or close this decoder and enter details manually. Your form entries have not changed.');
          } else if (error.status === 422) {
            setVinConnectivity('connected', 'NHTSA responded but found no vehicle details. Check the VIN or enter details manually.');
          } else {
            setVinConnectivity(error.status ? 'not-checked' : 'app-unreachable', error.status
              ? 'The app could not complete the lookup. NHTSA connectivity was not confirmed. ' + error.message
              : 'Unable to confirm NHTSA connectivity through the app. Check your connection and retry, or enter details manually. Your form entries have not changed.');
          }
        }
      } finally {
        clearTimeout(timeout);
        if (vinRequest === controller) {
          vinRequest = null;
          button.disabled = false;
          button.textContent = vinLookupButtonLabel();
        }
      }
    });

    document.getElementById('btn-vin-apply').addEventListener('click', () => {
      if (!vinDecoded) return;
      const fields = selectedVinFields();
      if (fields.length === 0) return;
      if (vinFromTruck && (document.getElementById('modal-truck').classList.contains('hidden') || document.getElementById('truck-id').value !== vinTruckId)) {
        closeVinDecoder();
        return;
      }
      if (vinFromTruck) {
        const replacements = fields.filter(([id, value]) => {
          const current = document.getElementById(id).value.trim();
          return current && current !== String(value);
        }).map(([, , label]) => label);
        if (replacements.length && !confirm('Replace existing form values for: ' + replacements.join(', ') + '? Nothing is saved until Save Unit.')) return;
      } else {
        openAddTruckModal();
        // A VIN lookup supplies no evidence that an inspection has occurred.
        setTruckNoDateMode(true);
      }
      fields.forEach(([id, value]) => { document.getElementById(id).value = String(value); });
      truckFormDirty = true;
      closeVinDecoder();
      document.getElementById('truck-unit').focus();
      showToast('VIN details applied to form. Review, then Save Unit.');
    });

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
      const errBanner = document.getElementById('truck-form-error');
      if (errBanner) { errBanner.textContent = ''; errBanner.classList.add('hidden'); }
      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = 'Saving...';
      try {
        const res = await apiFetch(id ? '/trucks/' + id : '/trucks', {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save unit');
        }
        truckFormDirty = false;
        document.getElementById('modal-truck').classList.add('hidden');
        showToast(id ? 'Unit updated' : 'Unit added to fleet');
        await loadDashboard();
      } catch (err) {
        if (errBanner) {
          errBanner.textContent = err.message;
          errBanner.classList.remove('hidden');
        }
        showToast(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });

    // Delegate actions on truck cards, table rows, and detail panel
    ['fleet-grid', 'fleet-table-body', 'unit-actions', 'unit-secondary-actions'].forEach(containerId => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) {
          // Clicking a table row or unit card outside action buttons selects the unit in the workspace detail panel / full-screen mobile view
          if (containerId === 'fleet-table-body' || containerId === 'fleet-grid') {
            const row = e.target.closest('[data-unit-row]');
            if (row) {
              const rowUnitId = row.getAttribute('data-unit-row');
              if (rowUnitId) await openUnitOverview(rowUnitId);
            }
          }
          return;
        }

        const detailsId = btn.getAttribute('data-details') || btn.getAttribute('data-select-unit');
        if (detailsId) { await openUnitOverview(detailsId); return; }
        // On tablet/mobile (< 1200px), #modal-unit is a fixed overlay drawer; hide it when launching a modal dialog so it doesn't cover the header
        if (containerId === 'unit-actions' && !window.matchMedia('(min-width: 1200px)').matches) {
          document.getElementById('modal-unit').classList.add('hidden');
        }
        const editId = btn.getAttribute('data-edit');
        const inspectId = btn.getAttribute('data-inspect');
        const historyId = btn.getAttribute('data-history');
        const deleteId = btn.getAttribute('data-delete');
        const viewFileId = btn.getAttribute('data-view-file');

        if (editId) {
          const t = fleetData.find((x) => x.id === editId);
          if (!t) return;
          truckFormDirty = false;
          const errBanner = document.getElementById('truck-form-error');
          if (errBanner) { errBanner.textContent = ''; errBanner.classList.add('hidden'); }
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
          inspectFormDirty = false;
          const errBanner = document.getElementById('inspect-form-error');
          if (errBanner) { errBanner.textContent = ''; errBanner.classList.add('hidden'); }
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
              if (typeof selectedUnitId !== 'undefined' && selectedUnitId === deleteId) {
                clearPendingUnit();
              }
              showToast('Deleted Unit #' + t.unit_number);
              await loadDashboard();
            }
          } catch (err) {
            showToast('Failed to delete unit', true);
          }
        }
      });
    });

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
      const errBanner = document.getElementById('inspect-form-error');
      if (errBanner) { errBanner.textContent = ''; errBanner.classList.add('hidden'); }
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

        inspectFormDirty = false;
        document.getElementById('modal-inspect').classList.add('hidden');
        showToast('Safety inspection logged & due date updated!');
        await loadDashboard();
      } catch (err) {
        if (errBanner) {
          errBanner.textContent = err.message;
          errBanner.classList.remove('hidden');
        }
        showToast(err.message, true);
      } finally {
        btn.disabled = false;
        btn.textContent = '✓ Complete Inspection';
      }
    });

    function renderHistoryMarkup(inspections, looseFiles) {
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
        html = '<p style="color: var(--text-muted); text-align:center; padding: 20px;">No inspection logs or R2 certificates uploaded yet for this unit.</p>';
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
      return html;
    }

    async function loadDetailHistory(truckId, generation) {
      const detailList = document.getElementById('detail-history-list');
      if (!detailList) return;
      try {
        const res = await apiFetch('/trucks/' + encodeURIComponent(truckId) + '/inspections');
        const data = await res.json();
        if (typeof overviewRequest !== 'undefined' && generation !== undefined && generation !== overviewRequest) return;
        detailList.innerHTML = renderHistoryMarkup(data.inspections || [], data.unlinked_attachments || []);
      } catch (err) {
        if (typeof overviewRequest !== 'undefined' && generation !== undefined && generation !== overviewRequest) return;
        detailList.innerHTML = '<p style="color:var(--red-text); font-size:0.84rem;">Failed to load inspection history.</p>';
      }
    }

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
        const html = renderHistoryMarkup(data.inspections || [], data.unlinked_attachments || []);
        document.getElementById('history-list').innerHTML = html;
        if (typeof selectedUnitId !== 'undefined' && selectedUnitId === truckId) {
          const detailList = document.getElementById('detail-history-list');
          if (detailList) detailList.innerHTML = html;
        }
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
          <button type="button" class="btn btn-danger btn-sm" style="padding:3px 7px;" data-del-file="\${escapeHtml(f.id)}" aria-label="Delete \${escapeHtml(f.file_name)}">&times;</button>
        </div>
      \`;
    }

    async function handleQuickCertificateUpload(inputEl, btnEl) {
      const targetTruckId = activeHistoryTruckId || (typeof selectedUnitId !== 'undefined' ? selectedUnitId : null);
      const feedbackEl = document.getElementById('detail-upload-feedback');
      if (!targetTruckId) return;
      if (!inputEl.files || inputEl.files.length === 0) {
        if (feedbackEl) {
          feedbackEl.textContent = 'Select a PDF or image file first.';
          feedbackEl.style.color = 'var(--red-text)';
          feedbackEl.classList.remove('hidden');
        }
        showToast('Select a PDF or image file first', true);
        return;
      }
      btnEl.disabled = true;
      btnEl.textContent = 'Uploading...';
      if (feedbackEl) {
        feedbackEl.textContent = 'Uploading certificate to R2…';
        feedbackEl.style.color = 'var(--text-muted)';
        feedbackEl.classList.remove('hidden');
      }
      try {
        const fd = new FormData();
        fd.append('file', inputEl.files[0]);
        const res = await apiFetch('/trucks/' + targetTruckId + '/attachments', {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Upload failed');
        }
        inputEl.value = '';
        if (feedbackEl) {
          feedbackEl.textContent = '✓ Certificate uploaded to Cloudflare R2.';
          feedbackEl.style.color = 'var(--green-text)';
          feedbackEl.classList.remove('hidden');
        }
        showToast('Uploaded to Cloudflare R2!');
        if (!document.getElementById('modal-history').classList.contains('hidden')) {
          await openHistoryModal(targetTruckId);
        }
        await loadDashboard();
      } catch (err) {
        if (feedbackEl) {
          feedbackEl.textContent = 'Upload failed: ' + err.message;
          feedbackEl.style.color = 'var(--red-text)';
          feedbackEl.classList.remove('hidden');
        }
        showToast(err.message, true);
      } finally {
        btnEl.disabled = false;
        btnEl.textContent = 'Upload to R2';
      }
    }

    // Quick upload inside History Modal and Detail Workspace Panel
    document.getElementById('btn-quick-upload').addEventListener('click', () => {
      handleQuickCertificateUpload(document.getElementById('quick-upload-input'), document.getElementById('btn-quick-upload'));
    });
    const detailUploadBtn = document.getElementById('btn-detail-quick-upload');
    if (detailUploadBtn) {
      detailUploadBtn.addEventListener('click', () => {
        handleQuickCertificateUpload(document.getElementById('detail-quick-upload-input'), detailUploadBtn);
      });
    }

    // Click handler inside History List & Detail Panel History List for previewing or deleting files
    ['history-list', 'detail-history-list'].forEach(listId => {
      const listEl = document.getElementById(listId);
      if (!listEl) return;
      listEl.addEventListener('click', async (e) => {
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
              const targetTruckId = activeHistoryTruckId || (typeof selectedUnitId !== 'undefined' ? selectedUnitId : null);
              if (targetTruckId && !document.getElementById('modal-history').classList.contains('hidden')) {
                await openHistoryModal(targetTruckId);
              }
              await loadDashboard();
            }
          } catch (err) {
            showToast('Failed to delete file', true);
          }
        }
      });
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
        if (target === 'modal-truck' && truckFormDirty) {
          if (!confirm('Discard unsaved unit changes?')) return;
          truckFormDirty = false;
        }
        if (target === 'modal-inspect' && inspectFormDirty) {
          if (!confirm('Discard unsaved inspection changes?')) return;
          inspectFormDirty = false;
        }
        document.getElementById(target).classList.add('hidden');
        if (target === 'modal-scan') stopUnitCamera();
        if (target === 'modal-vin') closeVinDecoder();
        if (target === 'modal-unit') clearPendingUnit();
        if (target === 'modal-viewer') document.getElementById('viewer-container').innerHTML = '';
        // If closing a sub-modal while a unit is still selected on tablet/mobile, restore the unit detail view
        if ((target === 'modal-truck' || target === 'modal-inspect') && typeof selectedUnitId !== 'undefined' && selectedUnitId && !window.matchMedia('(min-width: 1200px)').matches) {
          document.getElementById('modal-unit').classList.remove('hidden');
        }
      });
    });

    // Escape-to-close for dialogs and detail drawer without discarding unsaved form edits
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const toolsMenu = document.getElementById('header-tools');
      if (toolsMenu && toolsMenu.open) return;
      if (fleetToolbar && fleetToolbar.classList.contains('mobile-sheet-open')) {
        setMobileFilterSheetOpen(false);
        return;
      }

      const vinModal = document.getElementById('modal-vin');
      if (!vinModal.classList.contains('hidden')) {
        closeVinDecoder();
        return;
      }
      // Check top-level overlays in priority order (excluding form modals if dirty)
      const viewer = document.getElementById('modal-viewer');
      if (viewer && !viewer.classList.contains('hidden')) {
        viewer.classList.add('hidden');
        document.getElementById('viewer-container').innerHTML = '';
        return;
      }
      const historyModal = document.getElementById('modal-history');
      if (historyModal && !historyModal.classList.contains('hidden')) {
        historyModal.classList.add('hidden');
        return;
      }
      const scanModal = document.getElementById('modal-scan');
      if (scanModal && !scanModal.classList.contains('hidden')) {
        scanModal.classList.add('hidden');
        stopUnitCamera();
        return;
      }
      const pushModal = document.getElementById('modal-push');
      if (pushModal && !pushModal.classList.contains('hidden')) {
        pushModal.classList.add('hidden');
        return;
      }
      const inspectModal = document.getElementById('modal-inspect');
      if (inspectModal && !inspectModal.classList.contains('hidden')) {
        const hasEdits = document.getElementById('inspect-sticker').value.trim() ||
          document.getElementById('inspect-notes').value.trim() ||
          (document.getElementById('inspect-file').files && document.getElementById('inspect-file').files.length > 0);
        if (!hasEdits) inspectModal.classList.add('hidden');
        return;
      }
      const truckModal = document.getElementById('modal-truck');
      if (truckModal && !truckModal.classList.contains('hidden')) {
        const hasEdits = document.getElementById('truck-unit').value.trim() ||
          document.getElementById('truck-plate').value.trim() ||
          document.getElementById('truck-vin').value.trim() ||
          document.getElementById('truck-notes').value.trim();
        if (!hasEdits) truckModal.classList.add('hidden');
        return;
      }
      const settingsModal = document.getElementById('modal-settings');
      if (settingsModal && !settingsModal.classList.contains('hidden')) {
        if (!document.getElementById('set-new-passcode').value) {
          settingsModal.classList.add('hidden');
        }
        return;
      }
      const unitPanel = document.getElementById('modal-unit');
      if (unitPanel && !unitPanel.classList.contains('hidden')) {
        clearPendingUnit();
      }
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
