import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";

const remoteBackend = process.env.REMOTE_BACKEND === "1";

const localTargetPath = new URL("./.cloudflare/deploy-target.json", import.meta.url);
const localTarget: { remoteTarget?: string } = existsSync(localTargetPath)
  ? JSON.parse(readFileSync(localTargetPath, "utf8"))
  : {};

const remoteTarget = (
  process.env.REMOTE_BACKEND_URL ||
  localTarget.remoteTarget ||
  "http://127.0.0.1:8787"
).replace(/\/+$/, "");

export default defineConfig({
  plugins: [cloudflare()],
  server: remoteBackend
    ? {
        proxy: {
          "/truck-safety/api": {
            target: remoteTarget,
            changeOrigin: true,
            secure: remoteTarget.startsWith("https:"),
            headers: {
              Origin: remoteTarget,
              Referer: `${remoteTarget}/truck-safety/`,
            },
            cookieDomainRewrite: "",
            configure(proxy) {
              proxy.on("proxyRes", (proxyRes) => {
                const setCookie = proxyRes.headers["set-cookie"];
                if (Array.isArray(setCookie)) {
                  proxyRes.headers["set-cookie"] = setCookie.map((c) =>
                    c.replace(/;\s*Secure/gi, "")
                  );
                }
              });
            },
          },
        },
      }
    : undefined,
});
