#!/usr/bin/env node
/**
 * Create (or reset the password of) an /admin user. Prints the SQL to run on D1 —
 * the password itself is never stored anywhere but in your terminal output.
 *
 *   node scripts/admin-user.mjs monika "Monika"            # random password
 *   node scripts/admin-user.mjs milos "Miloš" 'my-long-pass'
 *
 * Then:  npx wrangler d1 execute algreen-cms --remote --command "<printed SQL>"
 */
import { webcrypto } from 'node:crypto';
import { hashPassword } from '../functions/_lib/auth.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const [username, displayName, given] = process.argv.slice(2);
if (!username || !/^[a-z0-9._-]{2,40}$/.test(username)) {
  console.error('usage: node scripts/admin-user.mjs <username> [display name] [password]');
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

console.log(`\nuser:     ${username}\npassword: ${password}\n\nSQL:\n${sql}\n`);
