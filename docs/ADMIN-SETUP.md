# Admin CMS (/admin) — how it works & go-live checklist

## How it works (SEO-safe by design)

```
Monika in /admin ──► Pages Functions /api/admin/*  ──► D1 (drafts, users) + R2 (uploads)
        │ "Objavi na sajt"
        ▼
  'published' snapshot in D1 ──► GitHub workflow_dispatch (deploy.yml)
        ▼
  CI: npm run build = scripts/fetch-content.mjs (GET /api/content + /api/media/*,
      sharp → public/m/*.webp, PDFs → public/m/<id>/<name>.pdf,
      src/data/cms.generated.json) → astro build → wrangler pages deploy
```

- The public site stays **100% static HTML**. Nothing is rendered client-side, so SEO is
  unchanged. Captions even improve it, since they become `alt` text.
- With no published content the output is **identical** to the hand-coded site. Every
  helper falls back to the defaults in code (`src/lib/slots.ts`, `src/lib/gallery.ts`,
  `ui.ts`, `config.ts`).
- If the content fetch fails (5xx or network), the build **fails** and the live site stays
  as it was. It never falls back to defaults over published content. `/api/content`
  returns 503 when the D1 binding is missing, for the same reason.
- Drafts vs. published: saving only writes drafts. `/api/content` serves the last
  **published** snapshot, so a code push to `main` never leaks half-finished edits.

| What Monika can edit | Where in code |
|---|---|
| Naši radovi: add/delete/hide/reorder photos, captions SR/EN | `src/lib/gallery.ts`, `WorksContent.astro` |
| Every other image ("slots": home mosaic, tiles, products, works teaser, page heroes, about, equipment, technical) | `src/lib/slots.ts` → `img(key)` |
| PDFs (catalog tile, 4 technical PDFs) | `src/lib/slots.ts` → `doc(key)` |
| Contact data (phones, emails, addresses, maps, socials, WhatsApp) | `src/i18n/config.ts` → `company` |
| FAQ (add/remove/reorder; FAQPage JSON-LD follows) | `ui.ts` `localize()` |
| Any visible text, SR + EN, incl. meta titles/descriptions | `ui.ts` `localize()` (text overrides) |
| Announcement bar (on/off, text, link) | `Header.astro` |

New image on the site → add it to `SLOTS` and render it with `img('key')`. It then shows up in
the admin automatically.

Security: PBKDF2 (100k) password hashes; HMAC-signed `__Host-` cookie (HttpOnly, Secure,
SameSite=Strict, 30 days; a password change logs out other sessions); D1-backed login rate
limit (8 fails / 15 min per IP and per user); CSRF via the `X-Admin: 1` header plus an Origin check;
uploads typed by magic bytes (JPG/PNG/WebP/PDF only); links limited to http(s)/mailto/tel/relative;
JSON-LD `<` escaped; `/admin` is noindex + robots-disallowed and not in the sitemap.

Local try-out: with `npm run dev`, open `http://localhost:3824/admin/` and log in as
`monika` / `algreen-dev`. A dev-only backend (`scripts/dev-cms.mjs`) runs the same function code
on SQLite + files in `.cms-dev/` (delete the folder to start over). "Objavi na sajt" regenerates
`src/data/cms.generated.json` + `public/m/` locally (reload to see it); nothing goes to GitHub or
Cloudflare. The next plain `npm run build` clears those files again.

Tests (no servers, no Cloudflare): `npm test` (API, fake D1 on `node:sqlite` + fake R2) and
`npm run test:build` (end-to-end edits → static HTML; rewrites `dist/`). CI runs `npm test`
before every deploy.

## Go-live checklist (needs explicit approval — this changes production)

Run from the repo root with a Cloudflare token that has D1 + R2 + Pages permissions
(`CLOUDFLARE_API_TOKEN=$(cat ~/.jamogu-cf-token) CLOUDFLARE_ACCOUNT_ID=2fb3d178d5f36a51bbee103ec69d3ef7`).

1. **D1:** `npx wrangler d1 create algreen-cms` → copy the `database_id`.
2. **R2:** `npx wrangler r2 bucket create algreen-media` (R2 must be enabled on the account).
3. **Bindings:** uncomment the `[[d1_databases]]` / `[[r2_buckets]]` blocks at the bottom of
   `wrangler.toml` and paste the id.
4. **Schema:** `npx wrangler d1 migrations apply algreen-cms --remote`
5. **Secrets** (Pages → algreen-site-2026; they apply from the next deployment):
   - `openssl rand -base64 48 | npx wrangler pages secret put SESSION_SECRET --project-name algreen-site-2026`
   - `GITHUB_TOKEN`: a fine-grained PAT on github.com (account `m1ck333`) → Settings → Developer
     settings → Fine-grained tokens. Repository access: only `m1ck333/algreen-website-2026`;
     permission **Actions: Read and write**. Choose the longest expiry and **put a reminder to
     renew it**. When it expires, "Objavi" shows an error.
     `npx wrangler pages secret put GITHUB_TOKEN --project-name algreen-site-2026`
6. **Users:** `npm run admin:user -- monika "Monika" --remote` (random password, printed once;
   writes the user straight into D1). Same for `milos`. Re-running it resets that user's password
   (e.g. if Monika forgets hers). Without `--remote` it only prints the SQL.
7. **Deploy:** merge `feature/admin-cms` → `main` and push (Actions deploys). The first build
   reads `/api/content` from the old deployment (404 HTML) and uses the defaults.
8. **Verify:** `https://algreen.rs/api/content` → `{"v":1,"empty":true}`. Then
   `https://algreen.rs/admin/`: log in, change a caption, publish, and watch Actions. The site should
   update in about 2 minutes. Spot-check that `/radovi/` is unchanged apart from that caption.
9. Send Monika `docs/UPUTSTVO-ZA-MONIKU.md` + her username/password.

Rollback: Cloudflare Pages → Deployments → "Rollback" to the previous deployment (static).
Content-level: every admin tab has "Vrati original" (reset to the built-in default).
