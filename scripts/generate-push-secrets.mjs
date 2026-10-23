import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.argv[2] || '.cloudflare/push-secrets.json');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const publicKey = Buffer.from(await crypto.subtle.exportKey('raw', pair.publicKey)).toString('base64url');
const values = {
  VAPID_PUBLIC_KEY: publicKey,
  VAPID_PRIVATE_KEY: jwk.d,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  PUSH_SEND_TOKEN: Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),
};
await mkdir(resolve(output, '..'), { recursive: true, mode: 0o700 });
await writeFile(output, JSON.stringify(values, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log('Generated VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_SEND_TOKEN in ' + output + ' (private; values not printed).');
