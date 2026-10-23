import { bindings, defineConfig, triggers } from "cf/config";

interface LocalDeployTarget {
  accountId?: string;
  d1DatabaseId?: string;
  routePattern?: string;
  routeZone?: string;
}

export default defineConfig(async () => {
  const fsSpecifier = "node:fs";
  const fs = (await import(fsSpecifier)) as {
    existsSync(path: URL): boolean;
    readFileSync(path: URL, encoding: string): string;
  };
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const env = proc?.env ?? {};

  const localTargetPath = new URL("./.cloudflare/deploy-target.json", (import.meta as { url: string }).url);
  const localTarget: LocalDeployTarget = fs.existsSync(localTargetPath)
    ? (JSON.parse(fs.readFileSync(localTargetPath, "utf8")) as LocalDeployTarget)
    : {};

  const accountId = env.CLOUDFLARE_ACCOUNT_ID || localTarget.accountId;
  const d1DatabaseId = env.CF_D1_DATABASE_ID || localTarget.d1DatabaseId;
  const routePattern = env.CF_ROUTE_PATTERN || localTarget.routePattern;
  const routeZone = env.CF_ROUTE_ZONE || localTarget.routeZone;

  const workerTriggers = [
    ...(routePattern && routeZone
      ? [
          triggers.fetch({
            pattern: routePattern,
            zone: routeZone,
          }),
        ]
      : []),
    triggers.scheduled({
      // 07:00 America/Winnipeg is 12:00 UTC (CDT) or 13:00 UTC (CST).
      // The handler checks local time and D1 atomically deduplicates each device/day.
      schedule: "0 12,13 * * *",
    }),
  ];

  return {
    ...(accountId ? { accountId } : {}),
    complianceRegion: "public",
    worker: {
      name: "truck-safety-tracker",
      entrypoint: "./src/index.ts",
      compatibilityDate: "2026-10-19",
      workersDev: !routePattern,
      observability: {
        enabled: true,
        redactQueryString: true,
        logs: {
          enabled: true,
          invocationLogs: true,
        },
        traces: {
          enabled: true,
        },
      },
      env: {
        DB: bindings.d1({
          ...(d1DatabaseId ? { id: d1DatabaseId } : {}),
          name: "truck-safety-db",
        }),
        FILES: bindings.r2({
          name: "truck-safety-files",
        }),
        BASE_PATH: bindings.text("/truck-safety"),
        INITIAL_PASSCODE: bindings.secret(),
        SESSION_SECRET: bindings.secret(),
        VAPID_PUBLIC_KEY: bindings.secret(),
        VAPID_PRIVATE_KEY: bindings.secret(),
        VAPID_SUBJECT: bindings.secret(),
        PUSH_SEND_TOKEN: bindings.secret(),
        PUSH_LIMITER: bindings.rateLimit({ namespace: "725303", simple: { limit: 5, period: 60 } }),
        LOGIN_LIMITER: bindings.rateLimit({ namespace: "725301", simple: { limit: 10, period: 60 } }),
        WRITE_LIMITER: bindings.rateLimit({ namespace: "725302", simple: { limit: 60, period: 60 } }),
      },
      triggers: workerTriggers,
    },
  };
});
