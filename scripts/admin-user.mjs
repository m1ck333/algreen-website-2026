#!/usr/bin/env node
/**
 * Create (or reset the password of) an /admin user. Only a PBKDF2 hash is stored —
 * the password itself appears nowhere but in your terminal output.
 *
 *   npm run admin:user -- monika "Monika"                 # random password, prints SQL only
 *   npm run admin:user -- milos "Miloš" 'my-long-pass'
 *   npm run admin:user -- monika "Monika" --local         # write it into the dev DB (.cms-dev/)
 *   npm run admin:user -- monika "Monika" --remote        # write it into PRODUCTION D1 (algreen-cms)
 *
 * --remote runs `wrangler d1 execute algreen-cms --remote` and needs CLOUDFLARE_API_TOKEN +
 * CLOUDFLARE_ACCOUNT_ID with D1 access. Running it again for the same user = password reset.
 */
import { webcrypto } from 'node:crypto';
import { hashPassword } from '../functions/_lib/auth.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const args = process.argv.slice(2);
const local = args.includes('--local');
const remote = args.includes('--remote');
const [username, displayName, given] = args.filter((a) => !a.startsWith('--'));
if (!username || !/^[a-z0-9._-]{2,40}$/.test(username)) {
  console.error('usage: node scripts/admin-user.mjs <username> [display name] [password] [--local | --remote]');
  process.exit(1);
}
const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const password =
  given || [...crypto.getRandomValues(new Uint8Array(14))].map((b) => alphabet[b % alphabet.length]).join('');
if (password.length < 10) {
  console.error('password must be at least 10 characters');
  process.exit(1);
}

const { hash, salt, iter } = await hashPassword(password);
const now = Date.now();
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql =
  `INSERT INTO users (username, display_name, pw_hash, pw_salt, pw_iter, pw_changed_at, created_at) ` +
  `VALUES (${q(username)}, ${q(displayName || username)}, ${q(hash)}, ${q(salt)}, ${iter}, ${now}, ${now}) ` +
  `ON CONFLICT(username) DO UPDATE SET pw_hash = excluded.pw_hash, pw_salt = excluded.pw_salt, ` +
  `pw_iter = excluded.pw_iter, pw_changed_at = excluded.pw_changed_at, display_name = excluded.display_name;`;

if (local) {
  const path = await import('node:path');
  const fs = await import('node:fs');
  const { FakeD1 } = await import('../tests/harness.mjs');
  const dir = path.resolve(import.meta.dirname, '../.cms-dev');
  fs.mkdirSync(dir, { recursive: true });
  new FakeD1(path.join(dir, 'db.sqlite')).db.exec(sql);
  console.log('\n✓ saved to the local dev DB (.cms-dev/db.sqlite)');
} else if (remote) {
  const { execFileSync } = await import('node:child_process');
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'algreen-cms', '--remote', '--command', sql], { stdio: 'inherit' });
  console.log('\n✓ saved to production D1 (algreen-cms)');
} else {
  console.log(`\nSQL (run with: npx wrangler d1 execute algreen-cms --remote --command "<SQL>"):\n${sql}`);
}
console.log(`\nuser:     ${username}\npassword: ${password}\n`);
