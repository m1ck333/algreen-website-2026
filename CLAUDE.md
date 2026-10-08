# CLAUDE.md — Algreen sajt 2026

Context for any future Claude Code session opened from this directory. Read this first.

## What this is

A modern, responsive, bilingual (SR default / EN) **marketing site for Algreen** — a
company making exclusive aluminium entrance doors, with branches in **Niš** and **Belgrade**.

This project is a **ground-up rebuild** that replaces the old static HTML site (now live at
algreen.rs). The old site still lives at `../algreen-site-old/algreen.rs` and is the source of
all original copy, images and catalog PDFs (already carried over here — no need to copy again).

The look is the **2026 redesign**: a dark, all-sans, red-accent photo-mosaic (built from a
client PDF; imagery in `public/img/design/`) — not the old green/gold/serif theme.

The door **configurator** is a separate external app: `https://konfigurator.algreen.rs`
(not part of this repo — we only link to it).

## Stack

- **Astro 4** (static output, minimal JS) + **Tailwind CSS** (via `@astrojs/tailwind`)
- TypeScript (strict)
- No UI framework (React/Vue) — plain `.astro` components + small inline `<script>` islands
- Images optimized with **sharp** via `scripts/optimize-images.mjs`

## Commands

> ⚠️ **Rule: never start a local server (`npm run dev`/`preview`, `astro dev`, etc.).** The user
> runs their own dev servers and ours conflict with theirs. To verify, use `npm run build` and
> inspect `dist/`. If a server is genuinely needed, **ask the user to start it** (they run
> `! npm run dev`). Backstop deny rules are in `.claude/settings.local.json`.

```bash
npm install
npm run build    # static output → dist/   (use this to verify — no server)
node scripts/optimize-images.mjs   # downsize+recompress large images in public/img

# The user runs these themselves — do NOT run them:
#   npm run dev      # dev server on http://localhost:3824 (port set in astro.config.mjs)
#   npm run preview  # preview the production build
```

## Deployment

**Live in production at https://algreen.rs** — hosted on **Cloudflare Pages** (project
`algreen-site-2026`, also reachable at https://algreen-site-2026.pages.dev).

**`git push` to `main` auto-deploys** via GitHub Actions (`.github/workflows/deploy.yml`:
Node 22 → `npm ci` → `npm run build` → `wrangler pages deploy`). Manual fallback:

```bash
npm run build
CLOUDFLARE_API_TOKEN="$(cat ~/.jamogu-cf-token)" \
  npx wrangler pages deploy dist --project-name algreen-site-2026 --branch main --commit-dirty=true
```

- **Contact form** = a Cloudflare **Pages Function** (`functions/api/contact.js`, `worker-mailer`
  over Loopia SMTP, from `upit@` → `info@algreen.rs`). `wrangler.toml` holds the non-secret SMTP
  vars + `[observability]`; `SMTP_PASS` is a Pages secret. (`public/.htaccess` + `api/contact.php`
  are a dormant Loopia/Apache fallback.)
- Vercel was fully removed (2026-07). Don't use the old `vercel … --archive=tgz` command.

## Domain / DNS / email  ⚠️ careful here

algreen.rs **DNS is on Cloudflare** (nameservers moved from Loopia 2026-09; registration stays at
Loopia). apex + `www` are **proxied** CNAMEs → the Pages project (apex works via CF **CNAME
flattening**). **Everything else is replicated in CF as DNS-only (grey) and must stay that way:**
- **Email** — MX (`mailcluster`/`mail2.loopia.se`), SPF, DMARC (`_dmarc` = `v=DMARC1; p=none`).
  **NEVER touch MX / proxy mail records.** Mailboxes live on Loopia.
- Subdomains — `internal` (⚠️ **business-critical app, must not go down**), `konfigurator`
  (CF Pages, proxied), `konfigurator-api`, `store`, `tracker-*`, `autoconfig`.
- Editing DNS needs a **Zone:DNS-scoped** token — `~/.jamogu-cf-token` is Workers/Pages-only and
  **cannot** touch DNS. CF account: `m1ck33kc1m@gmail.com` (`2fb3d178d5f36a51bbee103ec69d3ef7`).

## Analytics

Two systems: **Cloudflare Web Analytics** (cookieless, primary — queryable via GraphQL for
proactive monitoring) and **GTM `GTM-N9D9PRC`** (in `config.ts`, for GA4/Ads). GTM loads via
**Google Consent Mode** (default denied; `ConsentBanner.astro` flips to granted on accept) and
is **deferred to first user interaction** (in `BaseLayout`) to keep it off the critical path.

## Architecture & conventions

### i18n (the heart of the site)
- **All copy lives in `src/i18n/ui.ts`** — one big typed object, `sr` then `en`. `sr` is the
  source of truth. To change wording, edit here, not the components.
- **Company/contact data lives in `src/i18n/config.ts`** (branches, phones, emails, socials,
  configurator URL, stats). Single source of truth — Header, Footer, Contact all read from it.
- **Localized URLs live in `src/i18n/routes.ts`** — logical keys (`home`, `about`, …) → `{ sr, en }`
  paths. Use `path(key, lang)` to link between pages; never hardcode URLs.
- Routing: `prefixDefaultLocale: false` → Serbian at `/`, English under `/en/`.

### Pages = thin wrappers
- `src/pages/*.astro` (SR) and `src/pages/en/*.astro` (EN) are **thin**: they just set
  `lang`, pull meta strings, and render a shared `*Content.astro` component with `lang` prop.
- The real markup is in `src/components/pages/<Page>Content.astro`. **Edit content components,
  not the route files**, so both languages stay in sync.

### Shared pieces
- `src/layouts/BaseLayout.astro` — the SEO `<head>`: title, description, canonical,
  **hreflang** (sr-RS / en / x-default), Open Graph, Twitter, **JSON-LD** (`HomeAndConstructionBusiness`),
  fonts, favicons, scroll-reveal observer. Every page goes through this.
- `Header.astro` — fixed nav, transparent-over-hero → solid-on-scroll (swaps logo + link colors),
  mobile hamburger, language switcher.
- `Footer.astro`, `PageHero.astro` (inner-page header), `CtaBand.astro` (reused CTA).
- `src/pages/sitemap.xml.ts` — generates `/sitemap.xml` from `routes` with hreflang alternates.

### Styling (2026 dark redesign)
- Design tokens in `tailwind.config.mjs`: `ink` (near-black) + **`accent` (red `#e01f26`)**.
  **All-sans** — `font-display` now maps to **Inter** (the old serif), and the old `brand`/green
  and `gold` tokens were **removed**. Body is `bg-ink-900 text-white/80` (dark theme sitewide).
- Reusable classes in `src/styles/global.css`: `.btn-primary/.btn-ghost/.btn-dark/.btn-outline`,
  `.section`, `.container-px`, `.eyebrow`, `.reveal`, and `.mosaic-tile`/`.mosaic-label` (the
  full-bleed photo tiles). `ProcessSection`/`FaqSection` note: FAQ is used again on the homepage.
- **Mobile-first** (≈60% of real traffic is mobile). Homepage images + `/radovi/` gallery use
  responsive `srcset` (design images have a `-500.webp`; gallery photos a `-600.webp`).

### Assets
- Images in `public/img/`, PDFs in `public/files/`. Referenced by absolute path (`/img/...`).
- Only **referenced** assets were kept — old site's unused subfolders, videos (~290 MB) and
  duplicate PDFs were pruned. `public/` is ~40 MB. If you add a large image, run the optimizer.
- The Works gallery uses `public/img/{1..31}.webp` (numbered door photos), built dynamically
  in `WorksContent.astro`.

## To add a new page
1. Add a route key + paths to `src/i18n/routes.ts`.
2. Add its strings under each language in `src/i18n/ui.ts`.
3. Create `src/components/pages/NewContent.astro` (takes `lang`).
4. Create `src/pages/<sr-path>.astro` and `src/pages/en/<en-path>.astro` (thin wrappers).
5. Add it to `navItems` in `Header.astro` (and Footer if desired).

## Status (what's already done)
- **In production** on algreen.rs (Cloudflare). SITE = `https://algreen.rs` in both
  `astro.config.mjs` and `src/pages/sitemap.xml.ts`.
- **Contact form works** (CF Pages Function → `info@algreen.rs`) — the old `mailto:` TODO is done.
- **SEO**: canonical/hreflang/sitemap, homepage **FAQ with FAQPage JSON-LD**, verified in Google
  Search Console + sitemap submitted. Lighthouse mobile ≈ **76 / A11y 100 / BP 100 / SEO 100**.
  Already optimized: responsive images, non-blocking fonts, deferred GTM, security headers
  (`public/_headers`).
- **GTM** is wired (deferred — see Analytics). `site.webmanifest` exists.
- Standing OK to proactively monitor/optimize (analytics, perf, SEO) — see project memory
  (`Monitoring mandate`). Deploy improvements straight via `git push`.

## Gotchas
- `@astrojs/sitemap` was removed — its i18n mode crashed with this Astro version. We generate
  the sitemap ourselves (`sitemap.xml.ts`). Don't re-add the integration without testing.
- Astro allows **only one** frontmatter (`---`) block per file, at the top. Define helpers there.
- `npm run dev`/`build` print "New version of Astro available (7.x)" — we are intentionally on 4.x.
