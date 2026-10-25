import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [cloudflare()],
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
});
