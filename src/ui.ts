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

export function renderAppHtml(basePath: string, pushTestPage = false, demoMode = false): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Truck Safety Tracker — Fleet Inspection & R2 Certificate Vault</title>
  <meta name="theme-color" content="#0b0f19" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  ${demoMode ? '<meta name="robots" content="noindex,nofollow" />' : `<link rel="manifest" href="${basePath}/manifest.json" />`}
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

        /* Keep phone header compact: Tools overflow menu. Add Unit is placed in the fleet workspace bar below. */
        .header-actions > [data-theme-toggle] {
          display: none;
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

        /* Full-screen focused forms on mobile (#modal-truck, #modal-inspect, #modal-scan, #modal-history, #modal-backup, #modal-settings) */
        #modal-truck.modal-backdrop,
        #modal-inspect.modal-backdrop,
        #modal-vin.modal-backdrop,
        #modal-scan.modal-backdrop,
        #modal-history.modal-backdrop,
        #modal-backup.modal-backdrop,
        #modal-settings.modal-backdrop {
          padding: 0;
          align-items: stretch;
        }

        #modal-truck .modal-panel,
        #modal-inspect .modal-panel,
        #modal-vin .modal-panel,
        #modal-scan .modal-panel,
        #modal-history .modal-panel,
        #modal-backup .modal-panel,
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
          grid-template-columns: repeat(2, 1fr);
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

    @layer components {
      .gate-mode-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        background: var(--input-bg);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 4px;
        margin-bottom: 14px;
      }
      .gate-mode-tab {
        min-height: 38px;
        padding: 6px 10px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 150ms ease, color 150ms ease;
      }
      .gate-mode-tab[aria-selected="true"] {
        background: var(--card-bg);
        color: var(--text);
        box-shadow: 0 1px 3px rgba(0,0,0,0.18);
      }
      .staff-summary-strip {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 8px;
        margin: 12px 0;
      }
      .staff-stat-card {
        background: var(--input-bg);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 9px 11px;
        cursor: pointer;
        text-align: left;
        transition: border-color 150ms ease, background 150ms ease;
      }
      .staff-stat-card[aria-pressed="true"] {
        border-color: var(--accent);
        background: var(--accent-soft, rgba(59, 130, 246, 0.12));
      }
      .staff-stat-card small {
        display: block;
        color: var(--text-muted);
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .staff-stat-card strong {
        display: block;
        font-size: 1.15rem;
        color: var(--text);
        margin-top: 2px;
      }
      .staff-card {
        background: var(--input-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 13px 14px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
      }
      .staff-card.suspended {
        opacity: 0.72;
        border-style: dashed;
      }
      .staff-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.88rem;
        color: #ffffff;
        flex: 0 0 40px;
        letter-spacing: 0.03em;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22);
      }
      .staff-role-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.71rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        border: 1px solid var(--border);
      }
      .staff-role-pill.owner { background: rgba(245, 158, 11, 0.15); color: var(--amber-text, #f59e0b); border-color: rgba(245, 158, 11, 0.35); }
      .staff-role-pill.manager { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border-color: rgba(139, 92, 246, 0.35); }
      .staff-role-pill.technician { background: rgba(16, 185, 129, 0.15); color: var(--green-text); border-color: rgba(16, 185, 129, 0.35); }
      .staff-role-pill.viewer { background: rgba(148, 163, 184, 0.15); color: var(--text-muted); border-color: var(--border); }
      .staff-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
      }
      .staff-status-pill.active { background: rgba(16, 185, 129, 0.14); color: var(--green-text); }
      .staff-status-pill.suspended { background: rgba(239, 68, 68, 0.14); color: var(--red-text); }
      .color-swatch-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .color-swatch-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .color-swatch-btn[aria-pressed="true"] {
        border-color: var(--text);
        transform: scale(1.12);
        box-shadow: 0 0 0 2px var(--card-bg);
      }
      .pw-strength-bar {
        height: 6px;
        border-radius: 999px;
        background: var(--border);
        overflow: hidden;
        margin-top: 6px;
      }
      .pw-strength-fill {
        height: 100%;
        width: 0%;
        transition: width 160ms ease, background-color 160ms ease;
      }
      .actor-attribution-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.72rem;
        background: var(--input-bg);
        border: 1px solid var(--border);
        color: var(--text-muted);
      }
      .actor-attribution-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
      .kpi-card:hover, .truck-card:hover { transform: none; }
    }
  </style>
</head>
<body>
  <!-- PASSCODE & STAFF ACCOUNT GATE VIEW -->
  <div id="gate-view" class="gate-wrap"${demoMode ? ' hidden' : ''}>
    <button type="button" class="btn btn-secondary gate-theme" data-theme-toggle aria-label="Switch to light mode">☀ Light mode</button>
    <div class="gate-card">
      <img src="${basePath}/icon.svg" alt="Truck Safety Logo" class="gate-logo" />
      <h1 class="gate-title">Truck Safety Tracker</h1>
      <p class="gate-sub" id="gate-sub-text">Unlock with the shared shop passcode or sign in with your personal staff account.</p>
      <div class="gate-mode-tabs" role="tablist" aria-label="Sign-in method">
        <button type="button" id="gate-tab-passcode" class="gate-mode-tab" role="tab" aria-selected="true" data-gate-mode="passcode">🔑 Shared Passcode</button>
        <button type="button" id="gate-tab-account" class="gate-mode-tab" role="tab" aria-selected="false" data-gate-mode="account">👤 Staff Account</button>
      </div>
      <form id="gate-form">
        <input type="hidden" id="gate-login-mode" value="passcode" />
        <div id="gate-passcode-fields">
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
        </div>
        <div id="gate-account-fields" class="hidden">
          <div class="input-group">
            <label for="gate-username">Staff Username</label>
            <input
              id="gate-username"
              type="text"
              class="input-control"
              placeholder="e.g. alex.tech"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
            />
          </div>
          <div class="input-group">
            <label for="gate-account-password">Password</label>
            <input
              id="gate-account-password"
              type="password"
              class="input-control"
              placeholder="Enter your staff password..."
              autocomplete="current-password"
            />
          </div>
        </div>
        <p id="gate-error" class="hidden" style="color: var(--red-text); font-size: 0.84rem; margin-bottom: 12px;"></p>
        <button type="submit" id="gate-submit" class="btn btn-primary btn-full">
          🔒 Unlock Fleet Dashboard
        </button>
        <p id="pending-unit-message" class="hidden" style="margin-top:12px;">Unit selected. Enter the passcode to open its record.</p>
        <button type="button" id="gate-scan-unit" class="btn btn-secondary btn-full hidden" style="margin-top:12px;">Scan / Paste UUID (optional)</button>
      </form>
    </div>
  </div>

  <!-- MAIN APPLICATION VIEW -->
  <div id="app-view" class="${demoMode ? '' : 'hidden'}">
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
          <button type="button" id="btn-scan-unit" class="btn btn-secondary btn-sm hidden">Scan / Paste UUID</button>
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
              <div id="tools-active-actor" style="padding:8px 10px;border-bottom:1px solid var(--border);margin-bottom:4px;font-size:0.78rem;display:flex;align-items:center;gap:8px;">
                <span id="header-actor-avatar" class="staff-avatar" style="width:28px;height:28px;flex:0 0 28px;font-size:0.72rem;background:#3b82f6;">🔑</span>
                <div style="min-width:0;line-height:1.25;">
                  <strong id="header-actor-name" style="display:block;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Shared Shop Passcode</strong>
                  <span id="header-actor-role" style="color:var(--text-muted);font-size:0.72rem;">Owner · Full Access</span>
                </div>
              </div>
              <button type="button" id="btn-tools-shop-accounts" class="btn btn-secondary btn-sm">👥 Staff & Shop Accounts</button>
              <button type="button" id="btn-vin-decoder" class="btn btn-secondary btn-sm">VIN decoder</button>
              <button type="button" id="btn-export-ics" class="btn btn-secondary btn-sm" title="Download Calendar (.ics) reminders">
                📅 .ICS Calendar
              </button>
              <button type="button" id="btn-browser-notify" class="btn btn-secondary btn-sm" title="Enable Browser Alerts">
                🔔 Alerts
              </button>
              <button type="button" id="btn-fleet-backup" class="btn btn-secondary btn-sm" title="Download or restore a fleet backup">Fleet backup</button>
              <button type="button" id="btn-settings" class="btn btn-secondary btn-sm">
                ⚙️ Settings
              </button>
            </div>
          </details>
          <button type="button" id="btn-lock" class="btn btn-secondary btn-sm${demoMode ? ' hidden' : ''}" title="Lock App">
            🔒 Lock
          </button>
        </div>
      </div>
    </header>

    ${demoMode ? '<div role="note" style="margin:12px auto;max-width:1200px;padding:12px 18px;border:1px solid var(--border);border-radius:10px;color:var(--text-muted)"><strong>Demo:</strong> Unit records, inspection dates and inspection history are stored only in this browser tab. VIN decoding, certificates, QR labels, alerts, settings, backups and calendar exports are not available in the demo. <button type="button" id="demo-reset" class="btn btn-secondary btn-sm" style="margin-left:12px">Reset demo</button></div>' : ''}
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
            <li class="hidden"><button type="button" class="nav-tool-btn hidden" data-nav-action="scan">⌗ Scan / Paste UUID</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="add">+ Add Unit</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="vin">🔍 VIN Decoder</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="backup">📦 Fleet Backup</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="ics">📅 Export .ICS Schedule</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="alerts">🔔 Browser Alerts</button></li>
            <li><button type="button" class="nav-tool-btn" data-nav-action="accounts">👥 Staff & Accounts</button></li>
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
          <p>Select any unit from the fleet list to inspect its compliance status, log a safety inspection, or manage R2 certificates here.</p>
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
              <details id="detail-documents-section" class="detail-disclosure" open>
                <summary>Unit Documents</summary>
                <div class="detail-disclosure-body">
                  <p class="muted-note">Keep registration, insurance, permits, maintenance records, and other unit documents together. Expiry dates are optional.</p>
                  <form id="form-shop-document" class="form-grid" style="margin-bottom:16px;">
                    <input type="hidden" id="shop-document-truck-id" />
                    <div class="input-group"><label for="shop-document-type">Document type</label><select id="shop-document-type" class="input-control"><option value="registration">Registration</option><option value="insurance">Insurance</option><option value="permit">Permit</option><option value="maintenance">Maintenance</option><option value="general">General</option></select></div>
                    <div class="input-group"><label for="shop-document-label">Description (optional)</label><input id="shop-document-label" class="input-control" maxlength="255" /></div>
                    <div class="input-group"><label for="shop-document-expiry">Expiry date (optional)</label><input id="shop-document-expiry" type="date" class="input-control" /></div>
                    <div class="input-group"><label for="shop-document-file">Document file</label><input id="shop-document-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" class="input-control" required /><small>PDF, JPEG, PNG, or WebP; up to 10 MB.</small></div>
                    <button type="submit" id="btn-shop-document-upload" class="btn btn-primary col-span-2">Upload unit document</button>
                  </form>
                  <div id="shop-document-status" class="muted-note" role="status" aria-live="polite"></div>
                  <div id="shop-document-list" aria-live="polite"></div>
                </div>
              </details>

              <!-- QR LABEL & SECONDARY UNIT ACTIONS (retained but not exposed until ready) -->
              <details id="unit-qr-controls" class="detail-disclosure hidden" aria-hidden="true" inert>
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

    <!-- MOBILE BOTTOM NAVIGATION BAR (Fleet / Tools) -->
    <nav class="mobile-bottom-nav" aria-label="Mobile primary navigation">
      <button type="button" id="mobile-nav-fleet" class="mobile-nav-item active" aria-current="page">
        <span class="mobile-nav-icon" aria-hidden="true">🚛</span>
        <span>Fleet</span>
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
        <input type="hidden" id="truck-vin-data" value="" />
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
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-plate">License Plate</label>
            <input id="truck-plate" class="input-control" placeholder="e.g. AB-12345" />
          </div>
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-gvwr">GVWR / Weight Class</label>
            <input id="truck-gvwr" class="input-control" placeholder="e.g. 80,000 lbs / 36,287 kg" />
          </div>
          <div class="input-group col-span-2${demoMode ? ' hidden' : ''}">
            <label for="truck-vin">VIN (Vehicle Identification Number)</label>
            <input id="truck-vin" class="input-control" placeholder="17-character VIN" />
            <button type="button" id="btn-truck-decode-vin" class="btn btn-secondary">Decode VIN…</button>
            <small>Preview NHTSA details before applying them. Nothing is saved automatically.</small>
          </div>
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-year">Year</label>
            <input id="truck-year" type="number" min="1900" max="2100" class="input-control" placeholder="e.g. 2022" />
          </div>
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-make">Make</label>
            <input id="truck-make" class="input-control" placeholder="e.g. Kenworth, Peterbilt, Wabash" />
          </div>
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-model">Model</label>
            <input id="truck-model" class="input-control" placeholder="e.g. T680, 389, Dry Van 53'" />
          </div>
          <div class="input-group${demoMode ? ' hidden' : ''}">
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
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-reminder-days">Reminder schedule</label>
            <select id="truck-reminder-days" class="input-control">
              <option value="">Use fleet default</option>
              <option value="30,14,7,1,0,overdue">Every reminder (including overdue)</option>
              <option value="14,7,1,0,overdue">14, 7, 1 days, due date and overdue</option>
              <option value="7,1,0,overdue">7, 1 days, due date and overdue</option>
              <option value="1,0,overdue">1 day, due date and overdue</option>
              <option value="7,1,0">7, 1 days and due date only</option>
              <option value="none">No reminders</option>
            </select>
            <small>Overrides fleet-wide reminder days for this unit.</small>
          </div>
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-interval">Inspection Interval</label>
            <select id="truck-interval" class="input-control">
              <option value="12">Annual (12 Months)</option>
              <option value="6">Semi-Annual (6 Months)</option>
              <option value="3">Quarterly (3 Months)</option>
              <option value="24">Biennial (24 Months)</option>
            </select>
          </div>
          <div class="input-group col-span-2${demoMode ? ' hidden' : ''}" style="margin-bottom: 4px;">
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
          <div class="input-group${demoMode ? ' hidden' : ''}">
            <label for="truck-sticker">Safety Sticker / Cert #</label>
            <input id="truck-sticker" class="input-control" placeholder="e.g. S-908412" />
          </div>
          <div class="input-group col-span-2${demoMode ? ' hidden' : ''}">
            <label for="truck-shop">Inspection Shop / Mechanic</label>
            <input id="truck-shop" class="input-control" placeholder="e.g. Highway Heavy Duty Service" />
          </div>
          <div class="input-group col-span-2${demoMode ? ' hidden' : ''}">
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
  <div id="modal-vin" class="modal-backdrop hidden${demoMode ? ' demo-disabled' : ''}" role="dialog" aria-modal="true" aria-labelledby="vin-title">
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
        <p id="vin-selection-help" class="muted-note" style="margin-bottom:12px;">Check the vehicle fields you want to change. The complete set of values returned by NHTSA is saved with the unit for future reference.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          <button type="button" id="btn-vin-select-all" class="btn btn-secondary btn-sm">Select all</button>
          <button type="button" id="btn-vin-clear-selection" class="btn btn-secondary btn-sm">Clear selection</button>
        </div>
        <div id="vin-details" class="meta-grid" role="group" aria-label="Decoded VIN details and fields to apply" aria-describedby="vin-selection-help"></div>
        <details id="vin-all-data-section" class="detail-disclosure" style="margin-top:12px;">
          <summary id="vin-all-data-summary">All NHTSA decode data</summary>
          <div class="detail-disclosure-body">
            <div class="input-group" style="margin-bottom:8px;">
              <label for="vin-all-data-filter">Filter NHTSA fields</label>
              <input id="vin-all-data-filter" type="search" class="input-control" placeholder="Search NHTSA fields (e.g. EngineHP, PlantCity, ABS)…" style="min-height:38px; padding:6px 10px; font-size:0.8rem;" />
            </div>
            <div id="vin-all-data" class="meta-grid" aria-label="All values returned by NHTSA"></div>
          </div>
        </details>
        <p class="muted-note" style="margin-top:14px;">Selected vehicle details will be applied. Every returned NHTSA field is retained on the unit. Inspection dates, plate, notes and operational status are never changed.</p>
        <div class="modal-footer">
          <button type="button" id="btn-vin-apply" class="btn btn-primary" disabled>Use for new unit</button>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL: LOG NEW SAFETY INSPECTION (+ R2 UPLOAD) -->
  <div id="modal-inspect" class="modal-backdrop hidden${demoMode ? ' demo-inspection' : ''}">
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
            <div style="display:flex;gap:6px;">
              <input id="inspect-shop" class="input-control" placeholder="Shop name or inspector" />
              <button type="button" id="btn-inspect-fill-me" class="btn btn-secondary btn-sm hidden" title="Fill with your signed-in staff profile" style="white-space:nowrap;">Use me</button>
            </div>
          </div>
          <div class="input-group col-span-2${demoMode ? ' hidden' : ''}">
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

  <div id="modal-scan" class="modal-backdrop hidden${demoMode ? ' demo-disabled' : ''}">
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

  <!-- MODAL: FLEET BACKUP & MERGE RESTORE -->
  <div id="modal-backup" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="backup-title">
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title" id="backup-title">Fleet backup & restore</h2>
        <button type="button" class="close-btn" data-close="modal-backup" aria-label="Close fleet backup">&times;</button>
      </div>
      <p class="muted-note">Export a versioned copy of units, inspection history, and certificate metadata. Choose explicitly whether to include private certificate files. Restore merges by permanent unit ID, adds missing records, updates matching records after confirmation, and never deletes records.</p>
      <div class="form-grid" style="margin-top:14px;">
        <label class="input-group col-span-2" style="display:flex;align-items:center;gap:10px;text-transform:none;color:var(--text);"><input id="backup-include-files" type="checkbox" /> Include private certificate files (20 MB total limit)</label>
        <button type="button" id="btn-backup-export" class="btn btn-secondary">Download backup</button>
        <div class="input-group col-span-2"><label for="backup-restore-file">Restore a versioned JSON backup (max 30 MB)</label><input id="backup-restore-file" type="file" accept="application/json,.json" class="input-control" /><small>Conflicting unit numbers are rejected. Data-only backups preserve certificate metadata as unavailable.</small></div>
        <div id="backup-preview-box" class="truck-notes col-span-2 hidden" role="status" aria-live="polite" style="margin:0;"></div>
        <button type="button" id="btn-backup-restore" class="btn btn-primary col-span-2">Validate & merge restore</button>
        <p id="backup-status" class="muted-note col-span-2" role="status" aria-live="polite"></p>
      </div>
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
          <div class="input-group col-span-2">
            <label>Default reminder days (Winnipeg local time, 7:00 AM)</label>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <label><input type="checkbox" class="fleet-reminder-day" value="30" /> 30 days</label>
              <label><input type="checkbox" class="fleet-reminder-day" value="14" /> 14 days</label>
              <label><input type="checkbox" class="fleet-reminder-day" value="7" /> 7 days</label>
              <label><input type="checkbox" class="fleet-reminder-day" value="1" /> 1 day</label>
              <label><input type="checkbox" class="fleet-reminder-day" value="0" /> Due date</label>
              <label><input type="checkbox" class="fleet-reminder-day" value="overdue" /> Overdue</label>
            </div>
            <small>Per-unit schedules override this fleet default.</small>
          </div>
          <div class="input-group col-span-2">
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
          <button type="button" id="btn-open-shop-accounts" class="btn btn-secondary btn-sm">👥 Shop accounts</button>
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

  <div id="modal-shop-accounts" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="shop-accounts-title">
    <div class="modal-panel modal-lg">
      <div class="modal-header">
        <div>
          <h2 id="shop-accounts-title" class="modal-title">Staff Directory & Shop Accounts</h2>
          <p class="muted-note" style="margin:2px 0 0;">Both the shared shop passcode and active personal accounts can unlock the dashboard. Personal accounts attribute inspections & documents automatically.</p>
        </div>
        <button type="button" class="close-btn" data-close="modal-shop-accounts" aria-label="Close shop accounts">&times;</button>
      </div>

      <div id="shop-account-actor-banner" style="background:var(--input-bg);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="shop-modal-actor-avatar" class="staff-avatar" style="width:34px;height:34px;flex:0 0 34px;font-size:0.8rem;background:#3b82f6;">🔑</span>
          <div>
            <strong id="shop-modal-actor-title" style="display:block;font-size:0.88rem;">Signed in with Shared Shop Passcode</strong>
            <span id="shop-modal-actor-sub" style="font-size:0.76rem;color:var(--text-muted);">Owner permissions · Full access to staff accounts, fleet records & settings</span>
          </div>
        </div>
        <span id="shop-modal-actor-role-badge" class="staff-role-pill owner">Owner</span>
      </div>

      <div class="staff-summary-strip" role="group" aria-label="Filter staff accounts by role or status">
        <button type="button" class="staff-stat-card" data-staff-filter="all" aria-pressed="true">
          <small>Total Staff</small>
          <strong id="staff-count-all">0</strong>
        </button>
        <button type="button" class="staff-stat-card" data-staff-filter="active" aria-pressed="false">
          <small>🟢 Active</small>
          <strong id="staff-count-active">0</strong>
        </button>
        <button type="button" class="staff-stat-card" data-staff-filter="technician" aria-pressed="false">
          <small>🔧 Technicians</small>
          <strong id="staff-count-tech">0</strong>
        </button>
        <button type="button" class="staff-stat-card" data-staff-filter="manager" aria-pressed="false">
          <small>🛡️ Owners & Mgrs</small>
          <strong id="staff-count-admin">0</strong>
        </button>
        <button type="button" class="staff-stat-card" data-staff-filter="suspended" aria-pressed="false">
          <small>⏸️ Suspended</small>
          <strong id="staff-count-suspended">0</strong>
        </button>
      </div>

      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
        <input type="search" id="shop-account-search" class="input-control" placeholder="Search staff by name, @username, badge/cert #, job title, or phone…" aria-label="Search staff directory" style="flex:1 1 240px;min-height:40px;" />
        <button type="button" id="btn-shop-account-new" class="btn btn-primary btn-sm">+ New Staff Account</button>
      </div>

      <div id="shop-account-list" class="form-grid" aria-live="polite"></div>

      <form id="form-shop-account" style="margin-top:18px;background:var(--input-bg);border:1px solid var(--border);border-radius:12px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <h3 id="shop-account-form-title" style="margin:0;font-size:1rem;">Create a shop account</h3>
          <button type="button" id="btn-shop-account-cancel-edit" class="btn btn-secondary btn-sm hidden">Cancel edit</button>
        </div>
        <input type="hidden" id="shop-account-edit-id" value="" />
        <input type="hidden" id="shop-account-color" value="#3b82f6" />
        <div class="form-grid">
          <div class="input-group">
            <label for="shop-account-name">Display name *</label>
            <input id="shop-account-name" class="input-control" maxlength="100" autocomplete="name" placeholder="e.g. Jordan Friesen" required />
          </div>
          <div class="input-group">
            <label for="shop-account-username">Username *</label>
            <input id="shop-account-username" class="input-control" minlength="3" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,31}" autocomplete="username" placeholder="e.g. jordan.tech" required />
          </div>
          <div class="input-group">
            <label for="shop-account-role">Shop Role & Permissions</label>
            <select id="shop-account-role" class="input-control">
              <option value="technician">🔧 Technician (Log inspections, edit units & docs)</option>
              <option value="manager">🛡️ Shop Manager (Manage staff, units, settings & backups)</option>
              <option value="owner">Owner access (Full shop & gate passcode control)</option>
              <option value="viewer">👁️ Viewer (Read-only fleet & certificate access)</option>
            </select>
          </div>
          <div class="input-group">
            <label for="shop-account-status-select">Account Status</label>
            <select id="shop-account-status-select" class="input-control">
              <option value="active">🟢 Active (Can sign in)</option>
              <option value="suspended">⏸️ Suspended (Sign-in blocked)</option>
            </select>
          </div>
          <div class="input-group">
            <label for="shop-account-title">Job Title / Specialty</label>
            <input id="shop-account-title" class="input-control" maxlength="80" placeholder="e.g. Lead Heavy-Duty Mechanic, Service Writer" />
          </div>
          <div class="input-group">
            <label for="shop-account-badge">Inspector / Cert / Badge #</label>
            <input id="shop-account-badge" class="input-control" maxlength="64" placeholder="e.g. Red Seal #4419 / CVIP #882" />
          </div>
          <div class="input-group">
            <label for="shop-account-phone">Phone / Shift Contact</label>
            <input id="shop-account-phone" class="input-control" maxlength="40" placeholder="e.g. (204) 555-0148 · Day Shift" />
          </div>
          <div class="input-group">
            <label>Avatar Badge Color</label>
            <div class="color-swatch-row" id="shop-account-swatches" role="radiogroup" aria-label="Avatar badge color">
              <button type="button" class="color-swatch-btn" data-avatar-color="#3b82f6" style="background:#3b82f6;" aria-label="Blue" aria-pressed="true"></button>
              <button type="button" class="color-swatch-btn" data-avatar-color="#10b981" style="background:#10b981;" aria-label="Emerald" aria-pressed="false"></button>
              <button type="button" class="color-swatch-btn" data-avatar-color="#f59e0b" style="background:#f59e0b;" aria-label="Amber" aria-pressed="false"></button>
              <button type="button" class="color-swatch-btn" data-avatar-color="#8b5cf6" style="background:#8b5cf6;" aria-label="Violet" aria-pressed="false"></button>
              <button type="button" class="color-swatch-btn" data-avatar-color="#ec4899" style="background:#ec4899;" aria-label="Pink" aria-pressed="false"></button>
              <button type="button" class="color-swatch-btn" data-avatar-color="#06b6d4" style="background:#06b6d4;" aria-label="Cyan" aria-pressed="false"></button>
              <button type="button" class="color-swatch-btn" data-avatar-color="#f97316" style="background:#f97316;" aria-label="Orange" aria-pressed="false"></button>
              <button type="button" class="color-swatch-btn" data-avatar-color="#6366f1" style="background:#6366f1;" aria-label="Indigo" aria-pressed="false"></button>
            </div>
          </div>
          <div class="input-group col-span-2">
            <label for="shop-account-notes">Staff Notes / Shift & Bay Assignment</label>
            <input id="shop-account-notes" class="input-control" maxlength="500" placeholder="Optional notes: Bay 2 lead, trailer brake specialist, on-call weekends…" />
          </div>
          <div class="input-group col-span-2">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <label for="shop-account-password" id="shop-account-password-label">Password (8–128 characters) *</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" id="btn-shop-pw-generate" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:0.74rem;">🎲 Generate strong password</button>
                <button type="button" id="btn-shop-pw-toggle" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:0.74rem;">👁️ Show</button>
                <button type="button" id="btn-shop-pw-copy" class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:0.74rem;">📋 Copy credentials</button>
              </div>
            </div>
            <input id="shop-account-password" type="password" class="input-control" minlength="8" maxlength="128" autocomplete="new-password" required placeholder="8–128 characters" />
            <div class="pw-strength-bar" aria-hidden="true"><div id="shop-pw-strength-fill" class="pw-strength-fill"></div></div>
            <small id="shop-pw-strength-text">8–128 characters. Only a salted 600,000-iteration PBKDF2-SHA256 hash is stored.</small>
          </div>
        </div>
        <p class="muted-note" style="margin-top:12px;">Anyone who knows the shared shop passcode has full owner-level access, regardless of their personal account role.</p>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
          <button type="submit" id="btn-shop-account-submit" class="btn btn-primary">Create account</button>
        </div>
      </form>
      <p id="shop-account-status" class="muted-note" role="status" aria-live="polite" style="margin-top:10px;"></p>

      <details class="detail-disclosure" style="margin-top:14px;" open>
        <summary>Recent Shop Account & Inspection Activity</summary>
        <div class="detail-disclosure-body">
          <div id="shop-account-activity-list" style="display:flex;flex-direction:column;gap:8px;"></div>
        </div>
      </details>
    </div>
  </div>

  ${renderPushControls(basePath)}
  <div id="toast-container" class="toast-container"></div>

  <script>
    const BASE_PATH = ${JSON.stringify(basePath)};
    const API_BASE = BASE_PATH + '/api';
    const DEMO_MODE = ${JSON.stringify(demoMode)};
    const DEMO_STORE_URL = BASE_PATH + '/demo-store.js';
    // Demo data is scoped to this browser tab; no fleet token or server session is used.
    if (!DEMO_MODE) localStorage.removeItem('truck_safety_token');
    let fleetData = [];
    let fleetLoading = false;
    let fleetLoadError = '';
    let appSettings = { warning_days: 30, webhook_url: '', webhook_type: 'auto' };
    let activeHistoryTruckId = null;
    let currentShopActor = {
      mode: 'passcode',
      account_id: null,
      display_name: 'Shared Shop Passcode',
      username: 'shop-passcode',
      role: 'owner',
      badge_number: '',
      job_title: 'Full Fleet Access',
      avatar_color: '#3b82f6',
    };
    let shopAccountsData = [];
    let shopActivityData = [];
    let activeStaffFilter = 'all';
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
        let data = {};
        try { data = await res.json(); } catch { /* Keep a useful HTTP error for non-JSON responses. */ }
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
      shopAccountsData = [];
      shopActivityData = [];
      document.getElementById('shop-account-list').innerHTML = '';
      document.getElementById('shop-account-activity-list').innerHTML = '';
      resetShopAccountForm();
      currentShopActor = {
        mode: 'passcode',
        account_id: null,
        display_name: 'Shared Shop Passcode',
        username: 'shop-passcode',
        role: 'owner',
        badge_number: '',
        job_title: 'Full Fleet Access',
        avatar_color: '#3b82f6',
      };
      updateActiveActorUI(currentShopActor);
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

    function getStaffInitials(name, username) {
      const cleaned = String(name || username || '?').trim();
      const parts = cleaned.split(/\\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return cleaned.slice(0, 2).toUpperCase() || '👤';
    }

    function formatRoleLabel(role) {
      const map = { owner: '👑 Owner', manager: '🛡️ Manager', technician: '🔧 Technician', viewer: '👁️ Viewer' };
      return map[role] || '🔧 Technician';
    }

    function updateActiveActorUI(actor) {
      if (!actor || typeof actor !== 'object') return;
      currentShopActor = actor;
      const isAccount = actor.mode === 'account';
      const initials = isAccount ? getStaffInitials(actor.display_name, actor.username) : '🔑';
      const color = actor.avatar_color || '#3b82f6';
      const headerAvatar = document.getElementById('header-actor-avatar');
      const headerName = document.getElementById('header-actor-name');
      const headerRole = document.getElementById('header-actor-role');
      if (headerAvatar) {
        headerAvatar.textContent = initials;
        headerAvatar.style.background = color;
      }
      if (headerName) {
        headerName.textContent = isAccount ? actor.display_name + ' (@' + actor.username + ')' : 'Shared Shop Passcode';
      }
      if (headerRole) {
        const parts = [formatRoleLabel(actor.role || 'owner')];
        if (actor.job_title) parts.push(actor.job_title);
        if (actor.badge_number) parts.push(actor.badge_number);
        headerRole.textContent = parts.join(' · ');
      }

      const modalAvatar = document.getElementById('shop-modal-actor-avatar');
      const modalTitle = document.getElementById('shop-modal-actor-title');
      const modalSub = document.getElementById('shop-modal-actor-sub');
      const modalBadge = document.getElementById('shop-modal-actor-role-badge');
      if (modalAvatar) {
        modalAvatar.textContent = initials;
        modalAvatar.style.background = color;
      }
      if (modalTitle) {
        modalTitle.textContent = isAccount
          ? 'Signed in as ' + actor.display_name + ' (@' + actor.username + ')'
          : 'Signed in with Shared Shop Passcode';
      }
      if (modalSub) {
        if (isAccount) {
          const extras = [actor.job_title, actor.badge_number ? 'Badge/Cert: ' + actor.badge_number : ''].filter(Boolean);
          const permDesc = actor.role === 'viewer'
            ? 'Read-only access · Can view fleet & certificates'
            : actor.role === 'technician'
            ? 'Technician access · Inspections & documents auto-tagged with your profile'
            : 'Admin access · Can manage staff accounts, fleet & settings';
          modalSub.textContent = (extras.length ? extras.join(' · ') + ' — ' : '') + permDesc;
        } else {
          modalSub.textContent = 'Owner permissions · Full access to staff accounts, fleet records & settings';
        }
      }
      if (modalBadge) {
        const r = actor.role || 'owner';
        modalBadge.className = 'staff-role-pill ' + r;
        modalBadge.textContent = r;
      }

      const fillMeBtn = document.getElementById('btn-inspect-fill-me');
      if (fillMeBtn) {
        fillMeBtn.classList.toggle('hidden', !isAccount);
      }
    }

    function setGateLoginMode(mode) {
      const isAccount = mode === 'account';
      document.getElementById('gate-login-mode').value = isAccount ? 'account' : 'passcode';
      const tabPasscode = document.getElementById('gate-tab-passcode');
      const tabAccount = document.getElementById('gate-tab-account');
      const passcodeFields = document.getElementById('gate-passcode-fields');
      const accountFields = document.getElementById('gate-account-fields');
      const passcodeInput = document.getElementById('gate-passcode');
      const usernameInput = document.getElementById('gate-username');
      const passwordInput = document.getElementById('gate-account-password');
      const submitBtn = document.getElementById('gate-submit');
      const errEl = document.getElementById('gate-error');
      if (errEl) errEl.classList.add('hidden');
      tabPasscode.setAttribute('aria-selected', String(!isAccount));
      tabAccount.setAttribute('aria-selected', String(isAccount));
      passcodeFields.classList.toggle('hidden', isAccount);
      accountFields.classList.toggle('hidden', !isAccount);
      passcodeInput.required = !isAccount;
      usernameInput.required = isAccount;
      passwordInput.required = isAccount;
      submitBtn.textContent = isAccount ? '👤 Sign In with Staff Account' : '🔒 Unlock Fleet Dashboard';
    }

    document.querySelectorAll('[data-gate-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-gate-mode');
        setGateLoginMode(mode);
        if (mode === 'account') document.getElementById('gate-username').focus();
        else document.getElementById('gate-passcode').focus();
      });
    });

    function unlockApp(actor) {
      if (actor) updateActiveActorUI(actor);
      document.getElementById('gate-view').classList.add('hidden');
      document.getElementById('app-view').classList.remove('hidden');
      loadDashboard();
      if (${JSON.stringify(pushTestPage)}) openPushPanel();
    }

    // Gate Login (supports both Shared Passcode and Personal Staff Account)
    document.getElementById('gate-form').addEventListener('submit', async (e) => {
      if (DEMO_MODE) { e.preventDefault(); return; }
      e.preventDefault();
      const mode = document.getElementById('gate-login-mode').value;
      const isAccount = mode === 'account';
      const passcode = document.getElementById('gate-passcode').value;
      const username = document.getElementById('gate-username').value.trim();
      const password = document.getElementById('gate-account-password').value;
      const errEl = document.getElementById('gate-error');
      const btn = document.getElementById('gate-submit');
      errEl.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Checking...';
      try {
        const payload = isAccount ? { username, password } : { passcode };
        const res = await fetch(API_BASE + '/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          errEl.textContent = data.error || (isAccount ? 'Invalid username or password' : 'Invalid passcode');
          errEl.classList.remove('hidden');
        } else {
          document.getElementById('gate-passcode').value = '';
          document.getElementById('gate-account-password').value = '';
          unlockApp(data.actor);
        }
      } catch (err) {
        errEl.textContent = 'Connection error. Please try again.';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.textContent = isAccount ? '👤 Sign In with Staff Account' : '🔒 Unlock Fleet Dashboard';
      }
    });

    document.getElementById('btn-lock').addEventListener('click', async () => {
      if (DEMO_MODE) { showToast('Locking is not available in demo.'); return; }
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
        if (data.actor) {
          updateActiveActorUI(data.actor);
        }
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

    function formatReminderTag(reminderDays) {
      if (reminderDays === 'none') return '🔕 No reminders';
      if (!reminderDays) return '';
      return '🔔 Custom alerts';
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
            ...Object.values(parseVinData(t.vin_data)),
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
        const latestFileBtn = (t.latest_attachment && t.latest_attachment.file_available !== false)
          ? '<button type="button" class="btn btn-secondary btn-sm" data-view-file="' + escapeHtml(t.latest_attachment.id) + '" data-file-name="' + escapeHtml(t.latest_attachment.file_name) + '" data-file-type="' + escapeHtml(t.latest_attachment.content_type) + '">📄 View Cert</button>'
          : '';
        const remTag = formatReminderTag(t.reminder_days);
        return '<tr data-unit-row="' + id + '" class="' + (isSel ? 'is-selected' : '') + '" aria-selected="' + String(Boolean(isSel)) + '">' +
          '<td><button type="button" class="unit-row-link" data-select-unit="' + id + '"><strong>Unit #' + escapeHtml(t.unit_number) + '</strong></button><span class="list-sub">' + escapeHtml(t.vehicle_type) + (t.status !== 'Active' ? ' · ' + escapeHtml(t.status) : '') + (remTag ? ' · ' + escapeHtml(remTag) : '') + '</span><span class="list-sub">' + escapeHtml(vehicleLine) + '</span></td>' +
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
          const latestFileBtn = (t.latest_attachment && t.latest_attachment.file_available !== false)
            ? \`<button type="button" class="btn btn-secondary btn-sm" data-view-file="\${escapeHtml(t.latest_attachment.id)}" data-file-name="\${escapeHtml(t.latest_attachment.file_name)}" data-file-type="\${escapeHtml(t.latest_attachment.content_type)}">📄 View Cert</button>\`
            : '';
          const remTag = formatReminderTag(t.reminder_days);
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
                      \${remTag ? \`<span class="op-pill">\${escapeHtml(remTag)}</span>\` : ''}
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
        else if (action === 'vin') document.getElementById('btn-vin-decoder').click();
        else if (action === 'backup') document.getElementById('btn-fleet-backup').click();
        else if (action === 'ics') document.getElementById('btn-export-ics').click();
        else if (action === 'alerts') document.getElementById('btn-browser-notify').click();
        else if (action === 'accounts') document.getElementById('btn-open-shop-accounts').click();
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
    document.getElementById('form-truck').addEventListener('input', (event) => {
      truckFormDirty = true;
      if (event.target.id === 'truck-vin') {
        try {
          const sourceVin = JSON.parse(document.getElementById('truck-vin-data').value).VIN;
          if (typeof sourceVin !== 'string' || sourceVin.trim().toUpperCase() !== event.target.value.trim().toUpperCase()) {
            document.getElementById('truck-vin-data').value = '';
          }
        } catch { document.getElementById('truck-vin-data').value = ''; }
      }
    });
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
      document.getElementById('truck-vin-data').value = '';
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

    function renderVinRawData() {
      const container = document.getElementById('vin-all-data');
      const section = document.getElementById('vin-all-data-section');
      if (!container || !section) return;
      if (!section.open || !vinDecoded || !vinDecoded.raw_data) {
        container.innerHTML = '';
        return;
      }
      const q = (document.getElementById('vin-all-data-filter')?.value || '').trim().toLowerCase();
      const rawEntries = Object.entries(vinDecoded.raw_data);
      container.innerHTML = rawEntries
        .filter(([key, value]) => !q || (key + ' ' + (value || 'Not provided by NHTSA')).toLowerCase().includes(q))
        .map(([key, value]) =>
          '<div class="meta-item"><span>' + escapeHtml(key) + '</span><strong>' + escapeHtml(value || 'Not provided by NHTSA') + '</strong></div>'
        ).join('');
    }

    function resetVinDecoder() {
      if (vinRequest) vinRequest.abort();
      vinRequest = null;
      if (vinConnectivity === 'checking') setVinConnectivity('not-checked', 'Lookup cancelled. Decode a VIN to check the connection again.');
      vinDecoded = null;
      document.getElementById('btn-vin-apply').disabled = true;
      document.getElementById('vin-preview').classList.add('hidden');
      document.getElementById('vin-details').innerHTML = '';
      document.getElementById('vin-all-data').innerHTML = '';
      const vinFilterEl = document.getElementById('vin-all-data-filter');
      if (vinFilterEl) vinFilterEl.value = '';
      document.getElementById('vin-all-data-summary').textContent = 'All NHTSA decode data';
      document.getElementById('vin-all-data-section').open = false;
      document.getElementById('vin-all-data-section').classList.add('hidden');
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

    document.getElementById('btn-vin-decoder').addEventListener('click', () => { if (DEMO_MODE) showToast('VIN decoding is not available in the demo.'); else openVinDecoder(false); });
    if (DEMO_MODE) document.getElementById('btn-truck-decode-vin').classList.add('hidden');
    document.getElementById('btn-truck-decode-vin').addEventListener('click', () => openVinDecoder(true));
    document.getElementById('form-vin').addEventListener('input', resetVinDecoder);
    document.getElementById('vin-all-data-section').addEventListener('toggle', renderVinRawData);
    document.getElementById('vin-all-data-filter').addEventListener('input', renderVinRawData);
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
          if (id === 'truck-vin-data') return '';
          const compare = vinFromTruck && id;
          const decodedText = value || 'Not available';
          const currentText = id ? (document.getElementById(id).value || 'Not set') : '';
          const decodedValue = escapeHtml(decodedText);
          const detail = '<div><span>' + escapeHtml(label) + '</span>' + (compare
            ? '<div class="vin-field-values"><div><span>Current form</span><strong data-vin-current>' + escapeHtml(currentText) + '</strong></div>' +
              '<div><span>Decoded VIN</span><strong data-vin-decoded>' + decodedValue + '</strong></div></div>'
            : '<strong>' + decodedValue + '</strong>') + '</div>';
          const attributes = id ? ' data-vin-detail="' + id + '"' : '';
          const comparisonClass = compare ? ' vin-comparison-row' : '';
          return id && value != null && value !== ''
            ? '<label class="meta-item vin-field-option' + comparisonClass + '"' + attributes + '><input type="checkbox" data-vin-field="' + id + '" aria-label="Apply ' + escapeHtml(label) + '" checked />' + detail + '</label>'
            : '<div class="meta-item' + (id === 'truck-vin-data' ? ' hidden' : '') + comparisonClass + '"' + attributes + '>' + detail + '</div>';
        }).join('');
        updateVinSelectionControls();
        updateVinDuplicateWarning();
        const rawEntries = Object.entries(d.raw_data);
        document.getElementById('vin-all-data-summary').textContent = 'All NHTSA decode data (' + rawEntries.length + ' fields)';
        document.getElementById('vin-all-data-section').open = false;
        document.getElementById('vin-all-data').innerHTML = '';
        document.getElementById('vin-all-data-section').classList.toggle('hidden', rawEntries.length === 0);
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
      document.getElementById('truck-vin-data').value = JSON.stringify(vinDecoded.raw_data);
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
        vin_data: (() => {
          const value = document.getElementById('truck-vin-data').value;
          try {
            const sourceVin = JSON.parse(value).VIN;
            return typeof sourceVin === 'string' && sourceVin.trim().toUpperCase() === document.getElementById('truck-vin').value.trim().toUpperCase() ? value : '';
          } catch { return ''; }
        })(),
        year: document.getElementById('truck-year').value ? Number(document.getElementById('truck-year').value) : null,
        make: document.getElementById('truck-make').value.trim(),
        model: document.getElementById('truck-model').value.trim(),
        equipment_type: document.getElementById('truck-equipment-type').value.trim(),
        status: document.getElementById('truck-op-status').value,
        interval_months: Number(document.getElementById('truck-interval').value || 12),
        reminder_days: document.getElementById('truck-reminder-days').value,
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
          document.getElementById('truck-vin-data').value = t.vin_data || '';
          document.getElementById('truck-year').value = t.year || '';
          document.getElementById('truck-make').value = t.make || '';
          document.getElementById('truck-model').value = t.model || '';
          document.getElementById('truck-equipment-type').value = t.equipment_type || '';
          document.getElementById('truck-op-status').value = t.status || 'Active';
          document.getElementById('truck-reminder-days').value = t.reminder_days || '';
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
          const defaultInspector = currentShopActor && currentShopActor.mode === 'account'
            ? [currentShopActor.display_name, currentShopActor.badge_number ? '(' + currentShopActor.badge_number + ')' : ''].filter(Boolean).join(' ')
            : (t.shop_name || '');
          document.getElementById('inspect-shop').value = t.shop_name || defaultInspector;
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

    const inspectFillMeBtn = document.getElementById('btn-inspect-fill-me');
    if (inspectFillMeBtn) {
      inspectFillMeBtn.addEventListener('click', () => {
        if (!currentShopActor || currentShopActor.mode !== 'account') return;
        const stamp = [
          currentShopActor.display_name,
          currentShopActor.badge_number ? '(' + currentShopActor.badge_number + ')' : '',
        ].filter(Boolean).join(' ');
        document.getElementById('inspect-shop').value = stamp;
        inspectFormDirty = true;
      });
    }

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
        if (DEMO_MODE && hasFile) throw new Error('Certificates are not available in the demo.');

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
            (ins, idx) => \`
            <div class="history-item">
              <div class="history-top">
                <div>
                  <strong>Inspected: \${escapeHtml(ins.inspection_date)}</strong>
                  <span style="color: var(--text-muted); margin-left: 8px;">→ Expires: \${escapeHtml(ins.expiration_date)}</span>
                  \${idx === 0 ? '<span class="type-pill" style="margin-left:8px;">Latest</span>' : ''}
                  \${ins.logged_by_name ? \`<span class="actor-attribution-chip" style="margin-left:8px;"><span class="actor-attribution-dot" style="background:\${escapeHtml(ins.logged_by_color || '#3b82f6')};"></span>Logged by \${escapeHtml(ins.logged_by_name)}\${ins.logged_by_badge ? ' · ' + escapeHtml(ins.logged_by_badge) : ''}</span>\` : ''}
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
      if (f.file_available === false) return '<div class="file-chip"><span>📄 ' + escapeHtml(f.file_name) + ' <small style="color:var(--text-muted);">(certificate file unavailable — metadata only)</small></span></div>';
      return \`
        <div class="file-chip">
          <span>📄 \${escapeHtml(f.file_name)} <small style="color:var(--text-muted);">(\${kb} KB)</small></span>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:3px 8px;" data-preview-id="\${escapeHtml(f.id)}" data-preview-name="\${escapeHtml(f.file_name)}" data-preview-type="\${escapeHtml(f.content_type)}">View</button>
          <button type="button" class="btn btn-danger btn-sm" style="padding:3px 7px;" data-del-file="\${escapeHtml(f.id)}" aria-label="Delete \${escapeHtml(f.file_name)}">&times;</button>
        </div>
      \`;
    }

    async function handleQuickCertificateUpload(inputEl, btnEl) {
      if (DEMO_MODE) { showToast('Certificates are not available in the demo.'); return; }
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
    if (DEMO_MODE) {
      document.querySelectorAll('#btn-quick-upload, #btn-detail-quick-upload').forEach(button => button.addEventListener('click', () => showToast('Certificates are not available in the demo.')));
    }
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
      if (DEMO_MODE) { showToast('Certificates are not available in the demo.'); return; }
      const shopDocument = String(attachmentId).match(/^shop:([^:]+):([^:]+)$/);
      const fileUrl = shopDocument
        ? API_BASE + '/trucks/' + encodeURIComponent(shopDocument[1]) + '/documents/' + encodeURIComponent(shopDocument[2])
        : API_BASE + '/attachments/' + encodeURIComponent(attachmentId);
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
      if (DEMO_MODE) { showToast('Calendar export is not available in the demo.'); return; }
      window.location.href = API_BASE + '/calendar.ics';
    });
      if (DEMO_MODE) {
        document.getElementById('btn-export-ics').classList.add('hidden');
        document.getElementById('btn-fleet-backup').classList.add('hidden');
        document.getElementById('btn-browser-notify').classList.add('hidden');
        document.getElementById('btn-vin-decoder').classList.add('hidden');
        document.getElementById('btn-scan-unit').classList.add('hidden');
        const toolsAccountsBtn = document.getElementById('btn-tools-shop-accounts');
        if (toolsAccountsBtn) toolsAccountsBtn.classList.add('hidden');
        document.querySelectorAll('[data-nav-action="scan"], [data-nav-action="vin"], [data-nav-action="backup"], [data-nav-action="ics"], [data-nav-action="alerts"], [data-nav-action="accounts"], [data-nav-action="settings"]').forEach(el => el.classList.add('hidden'));
      }

    document.getElementById('btn-fleet-backup').addEventListener('click', () => {
      if (DEMO_MODE) { showToast('Backups are not available in the demo.'); return; }
      document.getElementById('backup-status').textContent = '';
      document.getElementById('backup-restore-file').value = '';
      const previewBox = document.getElementById('backup-preview-box');
      if (previewBox) { previewBox.textContent = ''; previewBox.classList.add('hidden'); }
      document.getElementById('modal-backup').classList.remove('hidden');
    });
    document.getElementById('backup-restore-file').addEventListener('change', async (e) => {
      const previewBox = document.getElementById('backup-preview-box');
      const status = document.getElementById('backup-status');
      status.textContent = '';
      if (!previewBox) return;
      const files = e.target.files;
      if (!files || !files.length) {
        previewBox.textContent = '';
        previewBox.classList.add('hidden');
        return;
      }
      const file = files[0];
      if (file.size > 30 * 1024 * 1024) {
        previewBox.textContent = 'Selected file exceeds the 30 MB restore limit.';
        previewBox.classList.remove('hidden');
        return;
      }
      try {
        const backup = JSON.parse(await file.text());
        if (backup.format !== 'truck-safety-tracker-backup' || backup.version !== 1 || !Array.isArray(backup.units) || !Array.isArray(backup.inspections) || !Array.isArray(backup.attachments)) {
          previewBox.textContent = 'Unsupported backup version or invalid structure.';
          previewBox.classList.remove('hidden');
          return;
        }
        const existingIds = new Set(fleetData.map(u => u.id));
        const newUnits = backup.units.filter(u => u && !existingIds.has(u.id)).length;
        const matchingUnits = backup.units.length - newUnits;
        const certNote = backup.includes_certificate_files ? 'Includes private certificate bytes' : 'Metadata-only (certificate bytes excluded)';
        previewBox.textContent = 'Backup summary: ' + backup.units.length + ' unit(s) (' + newUnits + ' new, ' + matchingUnits + ' matching existing IDs), ' + backup.inspections.length + ' inspection(s), ' + backup.attachments.length + ' certificate record(s) · ' + certNote + (backup.exported_at ? ' · Exported ' + backup.exported_at : '');
        previewBox.classList.remove('hidden');
      } catch {
        previewBox.textContent = 'Selected file is not valid JSON.';
        previewBox.classList.remove('hidden');
      }
    });
    document.getElementById('btn-backup-export').addEventListener('click', () => {
      const includeFiles = document.getElementById('backup-include-files').checked;
      if (includeFiles && !confirm('This download contains private certificates. Store it securely. Continue?')) return;
      window.location.href = API_BASE + '/backup' + (includeFiles ? '?include_files=1' : '');
    });
    document.getElementById('btn-backup-restore').addEventListener('click', async () => {
      const input = document.getElementById('backup-restore-file');
      const status = document.getElementById('backup-status');
      if (!input.files || !input.files.length) { status.textContent = 'Choose a JSON backup file first.'; return; }
      const file = input.files[0];
      if (file.size > 30 * 1024 * 1024) { status.textContent = 'Backup must be 30 MB or smaller.'; return; }
      let backup;
      try { backup = JSON.parse(await file.text()); } catch { status.textContent = 'The selected file is not valid JSON.'; return; }
      if (backup.format !== 'truck-safety-tracker-backup' || backup.version !== 1 || !Array.isArray(backup.units) || !Array.isArray(backup.inspections) || !Array.isArray(backup.attachments)) { status.textContent = 'Unsupported backup version or invalid structure.'; return; }
      const message = 'Merge ' + backup.units.length + ' unit(s), ' + backup.inspections.length + ' inspection(s), and ' + backup.attachments.length + ' certificate record(s)? Matching units will be updated; records are never deleted.' + (backup.includes_certificate_files ? '\\n\\nPrivate certificate bytes are included.' : '\\n\\nCertificate bytes are not included.');
      if (!confirm(message)) return;
      status.textContent = 'Validating and merging…';
      try {
        const response = await apiFetch('/backup/restore', { method: 'POST', body: JSON.stringify(backup) });
        const result = await response.json();
        status.textContent = 'Restore complete: ' + result.units_added + ' added, ' + result.units_updated + ' updated, ' + result.inspections_added + ' inspections; ' + result.certificate_files_restored + ' certificate files restored, ' + result.certificate_files_missing + ' unavailable.';
        await loadDashboard();
      } catch (error) { status.textContent = 'Restore failed: ' + error.message; }
    });

    ${demoMode ? `document.getElementById('btn-browser-notify').addEventListener('click', () => showToast('Alerts are not available in the demo.'));` : renderPushScript()}

    // Settings Modal
    document.getElementById('btn-settings').addEventListener('click', async () => {
      if (DEMO_MODE) { showToast('Settings are not available in the demo.'); return; }
      try {
        const res = await apiFetch('/settings');
        const data = await res.json();
        appSettings = data.settings || appSettings;
        document.getElementById('set-warning-days').value = appSettings.warning_days || 30;
        document.getElementById('set-webhook-type').value = appSettings.webhook_type || 'auto';
        document.getElementById('set-webhook-url').value = appSettings.webhook_url || '';
        document.querySelectorAll('.fleet-reminder-day').forEach(input => { input.checked = String(appSettings.notify_days || '30,14,7,1,0').split(',').includes(input.value); });
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
        notify_days: Array.from(document.querySelectorAll('.fleet-reminder-day:checked'), input => input.value).join(','),
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

    function selectAvatarColorSwatch(hex) {
      const normalized = String(hex || '#3b82f6').toLowerCase();
      document.getElementById('shop-account-color').value = normalized;
      document.querySelectorAll('#shop-account-swatches [data-avatar-color]').forEach(btn => {
        const match = btn.getAttribute('data-avatar-color').toLowerCase() === normalized;
        btn.setAttribute('aria-pressed', String(match));
      });
    }

    document.querySelectorAll('#shop-account-swatches [data-avatar-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectAvatarColorSwatch(btn.getAttribute('data-avatar-color'));
      });
    });

    function evaluatePasswordStrength(pw) {
      if (!pw) return { pct: 0, color: 'var(--border)', label: '8–128 characters. Only a salted 600,000-iteration PBKDF2-SHA256 hash is stored.' };
      if (pw.length < 8) return { pct: 20, color: 'var(--red-text)', label: 'Too short (' + pw.length + '/8 minimum characters).' };
      let score = 1;
      if (pw.length >= 12) score++;
      if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
      if (/\\d/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;
      if (score <= 2) return { pct: 45, color: '#f59e0b', label: 'Fair password (' + pw.length + ' chars) — meets 8-char minimum.' };
      if (score <= 3) return { pct: 75, color: '#3b82f6', label: 'Good shop password (' + pw.length + ' chars).' };
      return { pct: 100, color: 'var(--green-text)', label: 'Strong shop password (' + pw.length + ' chars).' };
    }

    function updateShopPasswordStrengthUI() {
      const pw = document.getElementById('shop-account-password').value;
      const editId = document.getElementById('shop-account-edit-id').value;
      const fill = document.getElementById('shop-pw-strength-fill');
      const text = document.getElementById('shop-pw-strength-text');
      if (editId && !pw) {
        fill.style.width = '0%';
        text.textContent = 'Leave blank to keep existing password unchanged, or enter 8–128 characters to reset it.';
        return;
      }
      const res = evaluatePasswordStrength(pw);
      fill.style.width = res.pct + '%';
      fill.style.background = res.color;
      text.textContent = res.label;
    }

    document.getElementById('shop-account-password').addEventListener('input', updateShopPasswordStrengthUI);

    document.getElementById('btn-shop-pw-toggle').addEventListener('click', () => {
      const input = document.getElementById('shop-account-password');
      const btn = document.getElementById('btn-shop-pw-toggle');
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.textContent = isHidden ? '🙈 Hide' : '👁️ Show';
    });

    document.getElementById('btn-shop-pw-generate').addEventListener('click', () => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      const bytes = crypto.getRandomValues(new Uint8Array(20));
      const generated = Array.from(bytes, byte => alphabet[byte & 63]).join('');
      const input = document.getElementById('shop-account-password');
      input.value = generated;
      input.type = 'text';
      document.getElementById('btn-shop-pw-toggle').textContent = '🙈 Hide';
      updateShopPasswordStrengthUI();
      showToast('Generated shop password — click Copy credentials to share.');
    });

    document.getElementById('btn-shop-pw-copy').addEventListener('click', async () => {
      const name = document.getElementById('shop-account-name').value.trim() || 'Staff Member';
      const username = document.getElementById('shop-account-username').value.trim();
      const pw = document.getElementById('shop-account-password').value;
      const role = document.getElementById('shop-account-role').value;
      if (!username) {
        showToast('Enter a username first to copy credentials.', true);
        return;
      }
      const summary = [
        'Truck Safety Tracker — Staff Sign-In',
        'Name: ' + name + ' (' + role + ')',
        'Username: ' + username,
        pw ? 'Password: ' + pw : '(Use your existing staff password)',
      ].join('\\n');
      try {
        await navigator.clipboard.writeText(summary);
        showToast('Credentials copied to clipboard!');
      } catch {
        showToast('Clipboard copy not available in this browser.', true);
      }
    });

    function resetShopAccountForm() {
      document.getElementById('form-shop-account').reset();
      document.getElementById('shop-account-edit-id').value = '';
      document.getElementById('shop-account-form-title').textContent = 'Create a shop account';
      document.getElementById('btn-shop-account-submit').textContent = 'Create account';
      document.getElementById('btn-shop-account-cancel-edit').classList.add('hidden');
      const pwInput = document.getElementById('shop-account-password');
      pwInput.required = true;
      pwInput.type = 'password';
      pwInput.placeholder = '8–128 characters';
      document.getElementById('shop-account-password-label').textContent = 'Password (8–128 characters) *';
      document.getElementById('btn-shop-pw-toggle').textContent = '👁️ Show';
      selectAvatarColorSwatch('#3b82f6');
      updateShopPasswordStrengthUI();
    }

    function populateShopAccountEditForm(account) {
      document.getElementById('shop-account-edit-id').value = account.id;
      document.getElementById('shop-account-form-title').textContent = 'Edit staff account · ' + account.display_name;
      document.getElementById('btn-shop-account-submit').textContent = 'Save account changes';
      document.getElementById('btn-shop-account-cancel-edit').classList.remove('hidden');
      document.getElementById('shop-account-name').value = account.display_name || '';
      document.getElementById('shop-account-username').value = account.username || '';
      document.getElementById('shop-account-role').value = account.role || 'technician';
      document.getElementById('shop-account-status-select').value = account.status || 'active';
      document.getElementById('shop-account-title').value = account.job_title || '';
      document.getElementById('shop-account-badge').value = account.badge_number || '';
      document.getElementById('shop-account-phone').value = account.phone || '';
      document.getElementById('shop-account-notes').value = account.notes || '';
      const pwInput = document.getElementById('shop-account-password');
      pwInput.value = '';
      pwInput.required = false;
      pwInput.type = 'password';
      pwInput.placeholder = 'Leave blank to keep current password';
      document.getElementById('shop-account-password-label').textContent = 'Reset Password (optional · 8–128 chars)';
      document.getElementById('btn-shop-pw-toggle').textContent = '👁️ Show';
      selectAvatarColorSwatch(account.avatar_color || '#3b82f6');
      updateShopPasswordStrengthUI();
      document.getElementById('form-shop-account').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('shop-account-name').focus();
    }

    document.getElementById('btn-shop-account-cancel-edit').addEventListener('click', () => {
      resetShopAccountForm();
      document.getElementById('shop-account-status').textContent = 'Edit cancelled.';
    });

    document.getElementById('btn-shop-account-new').addEventListener('click', () => {
      resetShopAccountForm();
      document.getElementById('form-shop-account').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      document.getElementById('shop-account-name').focus();
    });

    function renderShopAccountsDirectory() {
      const list = document.getElementById('shop-account-list');
      const q = (document.getElementById('shop-account-search')?.value || '').trim().toLowerCase();
      const canManage = !currentShopActor || currentShopActor.mode === 'passcode' || currentShopActor.role === 'owner' || currentShopActor.role === 'manager';
      const formEl = document.getElementById('form-shop-account');
      const newBtn = document.getElementById('btn-shop-account-new');
      if (formEl) formEl.classList.toggle('hidden', !canManage);
      if (newBtn) newBtn.classList.toggle('hidden', !canManage);

      const totalCount = shopAccountsData.length;
      const activeCount = shopAccountsData.filter(a => a.status !== 'suspended').length;
      const techCount = shopAccountsData.filter(a => (a.role || 'technician') === 'technician').length;
      const adminCount = shopAccountsData.filter(a => a.role === 'owner' || a.role === 'manager').length;
      const suspendedCount = shopAccountsData.filter(a => a.status === 'suspended').length;

      document.getElementById('staff-count-all').textContent = totalCount;
      document.getElementById('staff-count-active').textContent = activeCount;
      document.getElementById('staff-count-tech').textContent = techCount;
      document.getElementById('staff-count-admin').textContent = adminCount;
      document.getElementById('staff-count-suspended').textContent = suspendedCount;

      const filtered = shopAccountsData.filter(account => {
        const role = account.role || 'technician';
        const status = account.status || 'active';
        if (activeStaffFilter === 'active' && status !== 'active') return false;
        if (activeStaffFilter === 'suspended' && status !== 'suspended') return false;
        if (activeStaffFilter === 'technician' && role !== 'technician') return false;
        if (activeStaffFilter === 'manager' && role !== 'owner' && role !== 'manager') return false;
        if (!q) return true;
        const hay = [
          account.display_name,
          '@' + account.username,
          role,
          status,
          account.job_title,
          account.badge_number,
          account.phone,
          account.notes,
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });

      if (!filtered.length) {
        list.innerHTML = '<p class="muted-note col-span-2">' + (totalCount === 0
          ? 'No shop accounts created yet. Add your mechanics, managers, or viewers below.'
          : 'No staff accounts match the current filter or search.') + '</p>';
        return;
      }

      const roleLabels = {
        owner: '👑 Owner',
        manager: '🛡️ Manager',
        technician: '🔧 Technician',
        viewer: '👁️ Viewer',
      };

      list.innerHTML = filtered.map(account => {
        const role = account.role || 'technician';
        const status = account.status || 'active';
        const isSuspended = status === 'suspended';
        const initials = getStaffInitials(account.display_name, account.username);
        const color = account.avatar_color || '#3b82f6';
        const isCurrentUser = currentShopActor && currentShopActor.account_id === account.id;
        const metaChips = [];
        if (account.job_title) metaChips.push('<span>🏷️ ' + escapeHtml(account.job_title) + '</span>');
        if (account.badge_number) metaChips.push('<span>🪪 ' + escapeHtml(account.badge_number) + '</span>');
        if (account.phone) metaChips.push('<span>📞 ' + escapeHtml(account.phone) + '</span>');
        const loginNote = account.last_login_at
          ? 'Last sign-in ' + escapeHtml(account.last_login_at) + ' (' + Number(account.login_count || 1) + '×)'
          : 'Never signed in yet · Created ' + escapeHtml(account.created_at);

        const actionsHtml = canManage
          ? '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">' +
              '<button type="button" class="btn btn-secondary btn-sm" data-shop-account-fill-login="' + escapeHtml(account.username) + '" title="Switch lock screen to sign in as @' + escapeHtml(account.username) + '">Sign in as</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-shop-account-toggle-status="' + escapeHtml(account.id) + '">' + (isSuspended ? '▶ Activate' : '⏸ Suspend') + '</button>' +
              '<button type="button" class="btn btn-secondary btn-sm" data-shop-account-edit="' + escapeHtml(account.id) + '">✎ Edit</button>' +
              '<button type="button" class="btn btn-danger btn-sm" data-shop-account-delete="' + escapeHtml(account.id) + '">Remove</button>' +
            '</div>'
          : '';

        return '<div class="staff-card col-span-2' + (isSuspended ? ' suspended' : '') + '">' +
          '<div style="display:flex;gap:12px;align-items:flex-start;min-width:0;flex:1 1 260px;">' +
            '<span class="staff-avatar" style="background:' + escapeHtml(color) + ';">' + escapeHtml(initials) + '</span>' +
            '<div style="min-width:0;flex:1;">' +
              '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                '<strong style="font-size:0.95rem;">' + escapeHtml(account.display_name) + ' · @' + escapeHtml(account.username) + '</strong>' +
                (isCurrentUser ? '<span class="type-pill">You</span>' : '') +
                '<span class="staff-role-pill ' + escapeHtml(role) + '">' + escapeHtml(roleLabels[role] || role) + '</span>' +
                '<span class="staff-status-pill ' + escapeHtml(status) + '">' + (isSuspended ? '⏸ Suspended' : '🟢 Active') + '</span>' +
              '</div>' +
              (metaChips.length ? '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.79rem;color:var(--text);margin-top:5px;">' + metaChips.join('') + '</div>' : '') +
              (account.notes ? '<div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;">' + escapeHtml(account.notes) + '</div>' : '') +
              '<div style="font-size:0.73rem;color:var(--text-muted);margin-top:5px;">' + loginNote + '</div>' +
            '</div>' +
          '</div>' +
          actionsHtml +
        '</div>';
      }).join('');
    }

    function renderShopActivityFeed() {
      const feed = document.getElementById('shop-account-activity-list');
      if (!feed) return;
      if (!shopActivityData || !shopActivityData.length) {
        feed.innerHTML = '<p class="muted-note" style="margin:0;">No account or inspection activity recorded yet.</p>';
        return;
      }
      feed.innerHTML = shopActivityData.slice(0, 15).map(item => {
        const initials = item.actor_username === 'shop-passcode' ? '🔑' : getStaffInitials(item.actor_name, item.actor_username);
        const color = item.actor_color || '#3b82f6';
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 10px;border-radius:8px;background:var(--input-bg);border:1px solid var(--border);font-size:0.8rem;flex-wrap:wrap;">' +
          '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
            '<span class="staff-avatar" style="width:24px;height:24px;flex:0 0 24px;font-size:0.66rem;background:' + escapeHtml(color) + ';">' + escapeHtml(initials) + '</span>' +
            '<div>' +
              '<strong>' + escapeHtml(item.actor_name) + '</strong>' +
              (item.actor_badge ? ' <small style="color:var(--text-muted);">(' + escapeHtml(item.actor_badge) + ')</small>' : '') +
              ' — <span>' + escapeHtml(item.summary) + '</span>' +
            '</div>' +
          '</div>' +
          '<small style="color:var(--text-muted);white-space:nowrap;">' + escapeHtml(item.created_at) + '</small>' +
        '</div>';
      }).join('');
    }

    document.querySelectorAll('[data-staff-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeStaffFilter = btn.getAttribute('data-staff-filter') || 'all';
        document.querySelectorAll('[data-staff-filter]').forEach(other => {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        renderShopAccountsDirectory();
      });
    });

    document.getElementById('shop-account-search').addEventListener('input', renderShopAccountsDirectory);

    async function loadShopAccounts() {
      const list = document.getElementById('shop-account-list');
      const status = document.getElementById('shop-account-status');
      list.textContent = 'Loading accounts…';
      try {
        const response = await apiFetch('/shop-accounts');
        const data = await response.json();
        shopAccountsData = data.accounts || [];
        shopActivityData = data.recent_activity || [];
        if (data.actor) updateActiveActorUI(data.actor);
        renderShopAccountsDirectory();
        renderShopActivityFeed();
        status.textContent = 'Active staff accounts can sign in directly on the lock screen alongside the shared shop passcode.';
      } catch (error) {
        list.textContent = 'Could not load shop accounts.';
        status.textContent = error.message;
      }
    }

    document.getElementById('shop-account-list').addEventListener('click', async event => {
      const edit = event.target.closest('[data-shop-account-edit]');
      const remove = event.target.closest('[data-shop-account-delete]');
      const toggleStatus = event.target.closest('[data-shop-account-toggle-status]');
      const fillLogin = event.target.closest('[data-shop-account-fill-login]');
      if (fillLogin) {
        const uname = fillLogin.getAttribute('data-shop-account-fill-login');
        if (!confirm('Lock the current session and switch to the Staff Account sign-in screen for @' + uname + '?')) return;
        try {
          await apiFetch('/auth/logout', { method: 'POST' });
        } catch (error) {
          showToast('Unable to end the session. Check your connection and retry.', true);
          return;
        }
        lockApp();
        setGateLoginMode('account');
        document.getElementById('gate-username').value = uname;
        document.getElementById('gate-account-password').focus();
        return;
      }
      const accountId = edit?.getAttribute('data-shop-account-edit')
        || remove?.getAttribute('data-shop-account-delete')
        || toggleStatus?.getAttribute('data-shop-account-toggle-status');
      if (!accountId) return;
      const account = shopAccountsData.find(item => item.id === accountId);
      if (!account) return;
      if (edit) {
        populateShopAccountEditForm(account);
      } else if (toggleStatus) {
        const nextStatus = account.status === 'suspended' ? 'active' : 'suspended';
        try {
          const result = await apiFetch('/shop-accounts/' + encodeURIComponent(accountId), {
            method: 'PUT',
            body: JSON.stringify({
              display_name: account.display_name,
              username: account.username,
              role: account.role || 'technician',
              status: nextStatus,
              job_title: account.job_title || '',
              badge_number: account.badge_number || '',
              phone: account.phone || '',
              notes: account.notes || '',
              avatar_color: account.avatar_color || '#3b82f6',
            }),
          });
          const data = await result.json();
          if (!result.ok) throw new Error(data.error || 'Could not update account status.');
          showToast(nextStatus === 'suspended' ? 'Suspended @' + account.username : 'Activated @' + account.username);
          await loadShopAccounts();
        } catch (error) {
          document.getElementById('shop-account-status').textContent = error.message;
        }
      } else if (remove && confirm('Permanently remove the shop account for ' + account.display_name + ' (@' + account.username + ')?')) {
        try {
          const result = await apiFetch('/shop-accounts/' + encodeURIComponent(accountId), { method: 'DELETE' });
          const data = await result.json();
          if (!result.ok) throw new Error(data.error || 'Could not remove shop account.');
          if (document.getElementById('shop-account-edit-id').value === accountId) resetShopAccountForm();
          showToast('Removed @' + account.username);
          await loadShopAccounts();
        } catch (error) { document.getElementById('shop-account-status').textContent = error.message; }
      }
    });

    async function openShopAccountsModal() {
      if (DEMO_MODE) { showToast('Shop account management is not available in the demo.'); return; }
      document.getElementById('modal-shop-accounts').classList.remove('hidden');
      await loadShopAccounts();
    }

    document.getElementById('btn-open-shop-accounts').addEventListener('click', openShopAccountsModal);
    const btnToolsShopAccounts = document.getElementById('btn-tools-shop-accounts');
    if (btnToolsShopAccounts) btnToolsShopAccounts.addEventListener('click', openShopAccountsModal);

    document.getElementById('form-shop-account').addEventListener('submit', async event => {
      event.preventDefault();
      const status = document.getElementById('shop-account-status');
      const submit = document.getElementById('btn-shop-account-submit');
      const editId = document.getElementById('shop-account-edit-id').value;
      const password = document.getElementById('shop-account-password').value;
      submit.disabled = true;
      status.textContent = editId ? 'Saving account changes…' : 'Creating account…';
      try {
        const payload = {
          display_name: document.getElementById('shop-account-name').value,
          username: document.getElementById('shop-account-username').value,
          role: document.getElementById('shop-account-role').value,
          status: document.getElementById('shop-account-status-select').value,
          job_title: document.getElementById('shop-account-title').value,
          badge_number: document.getElementById('shop-account-badge').value,
          phone: document.getElementById('shop-account-phone').value,
          notes: document.getElementById('shop-account-notes').value,
          avatar_color: document.getElementById('shop-account-color').value,
          ...(password ? { password } : {}),
        };
        const response = await apiFetch(
          editId ? '/shop-accounts/' + encodeURIComponent(editId) : '/shop-accounts',
          { method: editId ? 'PUT' : 'POST', body: JSON.stringify(payload) }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not save account.');
        resetShopAccountForm();
        status.textContent = editId
          ? 'Staff account updated.'
          : 'Staff account created! They can now sign in with @' + data.account.username + ' on the lock screen.';
        showToast(editId ? 'Staff account updated!' : 'Created @' + data.account.username);
        await loadShopAccounts();
      } catch (error) {
        status.textContent = error.message;
      } finally { submit.disabled = false; }
    });

    async function loadShopDocuments(truckId) {
      const list = document.getElementById('shop-document-list');
      const status = document.getElementById('shop-document-status');
      list.textContent = 'Loading unit documents…';
      try {
        const response = await apiFetch('/trucks/' + encodeURIComponent(truckId) + '/documents');
        const data = await response.json();
        const labels = { registration: 'Registration', insurance: 'Insurance', permit: 'Permit', maintenance: 'Maintenance', general: 'General' };
        list.innerHTML = data.documents.length
          ? data.documents.map(document => '<div class="history-item" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;"><div><strong>' + escapeHtml(labels[document.document_type] || document.document_type) + (document.label ? ' · ' + escapeHtml(document.label) : '') + '</strong>' + (document.logged_by_name ? ' <span class="actor-attribution-chip"><span class="actor-attribution-dot" style="background:' + escapeHtml(document.logged_by_color || '#3b82f6') + ';"></span>' + escapeHtml(document.logged_by_name) + '</span>' : '') + '<div><small>' + escapeHtml(document.file_name) + ' · ' + Math.max(1, Math.round(document.size_bytes / 1024)) + ' KB' + (document.expiry_date ? ' · Expires ' + escapeHtml(document.expiry_date) : ' · No expiry date') + '</small></div></div><div style="display:flex;gap:6px;"><button type="button" class="btn btn-secondary btn-sm" data-shop-document-view="' + escapeHtml(document.id) + '" data-name="' + escapeHtml(document.file_name) + '" data-type="' + escapeHtml(document.content_type) + '">View</button><button type="button" class="btn btn-secondary btn-sm" data-shop-document-edit="' + escapeHtml(document.id) + '" data-label="' + escapeHtml(document.label) + '" data-expiry="' + escapeHtml(document.expiry_date) + '" data-document-type="' + escapeHtml(document.document_type) + '">Edit details</button><button type="button" class="btn btn-danger btn-sm" data-shop-document-delete="' + escapeHtml(document.id) + '">Delete</button></div></div>').join('')
          : '<p class="muted-note">No unit documents uploaded.</p>';
        status.textContent = '';
      } catch (error) { list.textContent = 'Could not load unit documents.'; status.textContent = error.message; }
      if (typeof fleetData !== 'undefined') {
        const unit = fleetData.find(item => item.id === truckId);
        if (unit) {
          const response = await apiFetch('/trucks/' + encodeURIComponent(truckId));
          const data = await response.json();
          unit.document_expiries = data.truck.document_expiries || [];
          if (typeof renderFleet === 'function') renderFleet();
        }
      }
    }

    document.getElementById('form-shop-document').addEventListener('submit', async event => {
      event.preventDefault();
      const truckId = document.getElementById('shop-document-truck-id').value;
      const file = document.getElementById('shop-document-file').files[0];
      const status = document.getElementById('shop-document-status');
      const button = document.getElementById('btn-shop-document-upload');
      if (!truckId || !file) { status.textContent = 'Select a unit and document file.'; return; }
      const form = new FormData();
      form.set('document_type', document.getElementById('shop-document-type').value);
      form.set('label', document.getElementById('shop-document-label').value);
      form.set('expiry_date', document.getElementById('shop-document-expiry').value);
      form.set('file', file);
      button.disabled = true;
      status.textContent = 'Uploading private document…';
      try {
        const response = await apiFetch('/trucks/' + encodeURIComponent(truckId) + '/documents', { method: 'POST', body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Document upload failed.');
        document.getElementById('form-shop-document').reset();
        document.getElementById('shop-document-truck-id').value = truckId;
        status.textContent = 'Document uploaded privately.';
        await loadShopDocuments(truckId);
      } catch (error) { status.textContent = error.message; }
      finally { button.disabled = false; }
    });

    document.getElementById('shop-document-list').addEventListener('click', async event => {
      const view = event.target.closest('[data-shop-document-view]');
      const edit = event.target.closest('[data-shop-document-edit]');
      const remove = event.target.closest('[data-shop-document-delete]');
      const button = view || edit || remove;
      if (!button) return;
      const id = button.getAttribute('data-shop-document-view') || button.getAttribute('data-shop-document-edit') || button.getAttribute('data-shop-document-delete');
      const truckId = document.getElementById('shop-document-truck-id').value;
      if (view) { openFileViewer('shop:' + truckId + ':' + id, view.getAttribute('data-name'), view.getAttribute('data-type')); return; }
      try {
        if (edit) {
          const label = prompt('Document description (blank to clear)', edit.getAttribute('data-label') || '');
          if (label === null) return;
          const expiryDate = prompt('Expiry date YYYY-MM-DD (blank for none)', edit.getAttribute('data-expiry') || '');
          if (expiryDate === null) return;
          const type = prompt('Type: registration, insurance, permit, maintenance, general', edit.getAttribute('data-document-type') || 'general');
          if (!type) return;
          const response = await apiFetch('/trucks/' + encodeURIComponent(truckId) + '/documents/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ label, expiry_date: expiryDate, document_type: type }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Document update failed.');
        } else if (remove && confirm('Permanently delete this unit document and its private file?')) {
          const response = await apiFetch('/trucks/' + encodeURIComponent(truckId) + '/documents/' + encodeURIComponent(id), { method: 'DELETE' });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Document delete failed.');
        } else return;
        await loadShopDocuments(truckId);
      } catch (error) { document.getElementById('shop-document-status').textContent = error.message; }
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
      const backupModal = document.getElementById('modal-backup');
      if (backupModal && !backupModal.classList.contains('hidden')) {
        backupModal.classList.add('hidden');
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
      const shopAccountsModal = document.getElementById('modal-shop-accounts');
      if (shopAccountsModal && !shopAccountsModal.classList.contains('hidden')) {
        shopAccountsModal.classList.add('hidden');
        return;
      }
      const unitPanel = document.getElementById('modal-unit');
      if (unitPanel && !unitPanel.classList.contains('hidden')) {
        clearPendingUnit();
      }
    });

    if (DEMO_MODE) document.getElementById('demo-reset').addEventListener('click', () => {
      sessionStorage.removeItem('truck_safety_demo_store');
      location.reload();
    });

    // Register PWA Service Worker
    if (!DEMO_MODE && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register(BASE_PATH + '/sw.js').catch(err => console.error('Service worker registration failed:', err));
    }

    ${demoMode ? '' : renderQrScript()}

    // Initial session check
    ${demoMode ? `const demoScript = document.createElement('script');
    demoScript.src = DEMO_STORE_URL;
    demoScript.onload = () => unlockApp();
    demoScript.onerror = () => showToast('Demo storage could not start. Reload to try again.', true);
    document.head.appendChild(demoScript);` : `fetch(API_BASE + '/auth/verify').then(async res => {
      if (res.ok) {
        let data = {};
        try { data = await res.json(); } catch {}
        unlockApp(data.actor);
      }
    }).catch(() => showToast('Offline. Reconnect to unlock your fleet.', true));`}
    setInterval(() => {
      if (!document.getElementById('app-view').classList.contains('hidden') && document.visibilityState === 'visible') loadDashboard();
    }, 5 * 60 * 1000);
  </script>
</body>
</html>`;
}
