// In-process test harness for the Pages Functions: a D1 look-alike on node:sqlite,
// an in-memory R2, and a tiny router that mimics Pages' file-based routing +
// _middleware. No servers, no Cloudflare account.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';

import * as adminMw from '../functions/api/admin/_middleware.js';
import * as login from '../functions/api/admin/login.js';
import * as logout from '../functions/api/admin/logout.js';
import * as password from '../functions/api/admin/password.js';
import * as state from '../functions/api/admin/state.js';
import * as section from '../functions/api/admin/section/[name].js';
import * as mediaUpload from '../functions/api/admin/media/index.js';
import * as publish from '../functions/api/admin/publish.js';
import * as content from '../functions/api/content.js';
import * as media from '../functions/api/media/[id].js';

class Stmt {
  constructor(db, sql, args = []) {
    this.db = db;
    this.sql = sql;
    this.args = args;
  }
  bind(...args) {
    // D1 accepts numbered params (?1, ?2 reused); node:sqlite's positional binding
    // doesn't, so expand them into plain `?` with the args repeated in order.
    if (/\?\d/.test(this.sql)) {
      const order = [];
      const sql = this.sql.replace(/\?(\d+)/g, (_, n) => (order.push(args[Number(n) - 1]), '?'));
      return new Stmt(this.db, sql, order);
    }
    return new Stmt(this.db, this.sql, args);
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.args) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.args) };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.args);
    return { meta: { changes: r.changes } };
  }
}

export class FakeD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.db.exec(fs.readFileSync(new URL('../migrations/0001_cms.sql', import.meta.url), 'utf8'));
  }
  prepare(sql) {
    return new Stmt(this.db, sql);
  }
}

export class FakeR2 {
  constructor() {
    this.objects = new Map();
  }
  async put(key, bytes, opts = {}) {
    this.objects.set(key, { bytes: new Uint8Array(bytes), ...opts });
  }
  async get(key) {
    const o = this.objects.get(key);
    if (!o) return null;
    return {
      body: o.bytes,
      httpEtag: '"etag"',
      writeHttpMetadata(h) {
        if (o.httpMetadata?.contentType) h.set('content-type', o.httpMetadata.contentType);
      },
    };
  }
  async delete(key) {
    this.objects.delete(key);
  }
}

const ROUTES = [
  [/^\/api\/admin\/login$/, login],
  [/^\/api\/admin\/logout$/, logout],
  [/^\/api\/admin\/password$/, password],
  [/^\/api\/admin\/state$/, state],
  [/^\/api\/admin\/section\/(?<name>[^/]+)$/, section],
  [/^\/api\/admin\/media$/, mediaUpload],
  [/^\/api\/admin\/publish$/, publish],
  [/^\/api\/content$/, content],
  [/^\/api\/media\/(?<id>[^/]+)$/, media],
];

const method = (m) => `onRequest${m[0]}${m.slice(1).toLowerCase()}`;

/** Dispatch a Request like Cloudflare Pages would. */
export async function dispatch(request, env) {
  const url = new URL(request.url);
  for (const [re, mod] of ROUTES) {
    const m = url.pathname.match(re);
    if (!m) continue;
    const handler = mod[method(request.method)] || mod.onRequest;
    if (!handler) return new Response('method not allowed', { status: 405 });
    const ctx = { request, env, params: m.groups || {}, data: {}, waitUntil: undefined };
    const run = () => handler(ctx);
    if (url.pathname.startsWith('/api/admin/')) {
      ctx.next = run;
      return adminMw.onRequest(ctx);
    }
    return run();
  }
  return new Response('<!doctype html>not found', { status: 404, headers: { 'content-type': 'text/html' } });
}

/** A tiny cookie-keeping client for the admin API. */
export function client(env, { origin = 'https://algreen.rs' } = {}) {
  let cookie = '';
  const call = async (m, path, body, extra = {}) => {
    const headers = new Headers({ 'x-admin': '1', origin, ...extra.headers });
    if (extra.noAdminHeader) headers.delete('x-admin');
    if (cookie) headers.set('cookie', cookie);
    let reqBody;
    if (body instanceof FormData) reqBody = body;
    else if (body !== undefined) {
      reqBody = JSON.stringify(body);
      headers.set('content-type', 'application/json');
    }
    const res = await dispatch(new Request(`https://algreen.rs${path}`, { method: m, headers, body: reqBody }), env);
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let data = null;
    try {
      data = await res.clone().json();
    } catch {
      /* binary */
    }
    return { status: res.status, data, res };
  };
  return {
    call,
    get cookie() {
      return cookie;
    },
    set cookie(v) {
      cookie = v;
    },
  };
}
