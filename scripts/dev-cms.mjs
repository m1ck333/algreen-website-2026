// Local admin backend for `npm run dev` ONLY (wired in astro.config.mjs; never part
// of a build). `astro dev` doesn't run Cloudflare Pages Functions, so without this
// /admin shows "Greška (404)". It serves /api/* from the SAME function code as
// production, backed by local stand-ins:
//   D1 → .cms-dev/db.sqlite (node:sqlite)      R2 → .cms-dev/media/<key>
// "Objavi na sajt" doesn't touch GitHub: it runs scripts/fetch-content.mjs against
// this local API, so the dev site shows the published content after a reload.
// Login: monika / algreen-dev (created on first run).
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { FakeD1, dispatch } from '../tests/harness.mjs';
import { hashPassword } from '../functions/_lib/auth.js';
import { run as fetchContent } from './fetch-content.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(ROOT, '.cms-dev');
const DEV_USER = 'monika';
const DEV_PASS = 'algreen-dev';

// Production uses a `__Host-…; Secure` cookie, which browsers reject over plain http
// (e.g. testing from a phone via the LAN IP). Rename it on the way out/in.
const PROD_COOKIE = '__Host-algreen_admin';
const DEV_COOKIE = 'algreen_admin_dev';

class FileR2 {
  constructor(dir) {
    this.dir = dir;
  }
  file(key) {
    return path.join(this.dir, key.replace(/[^a-zA-Z0-9/_-]/g, '_'));
  }
  async put(key, bytes, opts = {}) {
    const f = this.file(key);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, new Uint8Array(bytes instanceof ArrayBuffer ? bytes : await new Response(bytes).arrayBuffer()));
    fs.writeFileSync(`${f}.json`, JSON.stringify(opts.httpMetadata || {}));
  }
  async get(key) {
    const f = this.file(key);
    if (!fs.existsSync(f)) return null;
    const meta = JSON.parse(fs.readFileSync(`${f}.json`, 'utf8'));
    return {
      body: fs.readFileSync(f),
      httpEtag: '"dev"',
      writeHttpMetadata(h) {
        if (meta.contentType) h.set('content-type', meta.contentType);
      },
    };
  }
  async delete(key) {
    const f = this.file(key);
    fs.rmSync(f, { force: true });
    fs.rmSync(`${f}.json`, { force: true });
  }
}

export async function createDevCms({ log = console.log } = {}) {
  fs.mkdirSync(DIR, { recursive: true });
  const db = new FakeD1(path.join(DIR, 'db.sqlite'));
  if (!db.db.prepare('SELECT 1 FROM users LIMIT 1').get()) {
    const { hash, salt, iter } = await hashPassword(DEV_PASS);
    const now = Date.now();
    db.db
      .prepare('INSERT INTO users (username, display_name, pw_hash, pw_salt, pw_iter, pw_changed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(DEV_USER, 'Monika (lokalno)', hash, salt, iter, now, now);
  }

  // Fake GitHub: a "deploy" = regenerate the content files locally.
  let run = null; // { status, conclusion, createdAt, updatedAt }
  const env = {
    DB: db,
    MEDIA: new FileR2(path.join(DIR, 'r2')),
    SESSION_SECRET: 'local-dev-only-secret-not-used-in-production',
    GITHUB_TOKEN: 'dev',
    async GITHUB_FETCH(url, init = {}) {
      if (init.method === 'POST') {
        const at = new Date().toISOString();
        run = { status: 'in_progress', conclusion: null, event: 'workflow_dispatch', createdAt: at, updatedAt: at };
        const local = (u) => dispatch(new Request(u), env);
        fetchContent({ base: 'http://dev.local', fetch: local })
          .then(() => {
            run = { ...run, status: 'completed', conclusion: 'success', updatedAt: new Date().toISOString() };
            log('[dev-cms] objavljeno → src/data/cms.generated.json (osvežite stranicu)');
          })
          .catch((e) => {
            run = { ...run, status: 'completed', conclusion: 'failure', updatedAt: new Date().toISOString() };
            log('[dev-cms] objava nije uspela:', e.message);
          });
        return new Response(null, { status: 204 });
      }
      return Response.json({ workflow_runs: run ? [{ ...run, created_at: run.createdAt, updated_at: run.updatedAt }] : [] });
    },
  };

  /** Connect middleware: handles /api/admin/*, /api/content, /api/media/*; passes the rest on. */
  return async function devCms(req, res, next) {
    const pathname = (req.url || '').split('?')[0];
    if (!/^\/api\/(admin\/|content$|media\/)/.test(pathname)) return next();
    try {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined || k.startsWith(':')) continue;
        headers.set(k, Array.isArray(v) ? v.join(', ') : v);
      }
      const cookie = headers.get('cookie');
      if (cookie) headers.set('cookie', cookie.replaceAll(`${DEV_COOKIE}=`, `${PROD_COOKIE}=`));
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
        method: req.method,
        headers,
        body: hasBody ? Readable.toWeb(req) : undefined,
        duplex: hasBody ? 'half' : undefined,
      });
      const out = await dispatch(request, env);
      res.statusCode = out.status;
      out.headers.forEach((v, k) => {
        if (k === 'set-cookie') v = v.replace(PROD_COOKIE, DEV_COOKIE).replace('; Secure', '');
        res.setHeader(k, v);
      });
      res.end(Buffer.from(await out.arrayBuffer()));
    } catch (e) {
      log('[dev-cms] error:', e);
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
  };
}

export const DEV_LOGIN = { username: DEV_USER, password: DEV_PASS };
