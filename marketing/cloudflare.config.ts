import { existsSync, readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { bindings, defineConfig, triggers } from 'cf/config';

interface DeployTarget {
  accountId?: string;
  databaseId?: string;
  hostname?: string;
  contactEmail?: string;
}

export default defineConfig(({ mode }) => {
  const path = new URL('../.cloudflare/coming-soon-target.json', import.meta.url);
  const target: DeployTarget = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const production = mode === 'production';
  if (production && (!target.accountId || !target.databaseId || !target.hostname || !target.contactEmail)) {
    throw new Error('Coming-soon deployment requires the separate ignored deployment target.');
  }
  return {
    ...(target.accountId ? { accountId: target.accountId } : {}),
    worker: {
      name: 'truck-safety-coming-soon',
      entrypoint: './src/index.ts',
      compatibilityDate: '2026-10-25',
      workersDev: false,
      previewUrls: false,
      ...(production ? { domains: [target.hostname!] } : {}),
      observability: {
        enabled: true,
        redactQueryString: true,
        logs: { enabled: true, invocationLogs: false },
        traces: { enabled: true },
      },
      env: {
        SIGNUPS: bindings.d1({ name: 'truck-safety-launch-signups', ...(target.databaseId ? { id: target.databaseId } : {}) }),
        CONTACT_EMAIL: bindings.text(target.contactEmail || ''),
        SIGNUP_LIMITER: bindings.rateLimit({ namespace: '725304', simple: { limit: 5, period: 60 } }),
      },
      triggers: [triggers.scheduled({ schedule: '17 6 * * *' })],
    },
  };
});
