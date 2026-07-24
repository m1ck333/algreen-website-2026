# CLAUDE.md — Algreen sajt 2026

Context for any future Claude Code session opened from this directory. Read this first.

## What this is

A modern, responsive, bilingual (SR default / EN) **marketing site for Algreen** — a
company making exclusive aluminium entrance doors, with branches in **Niš** and **Belgrade**.

This project is a **ground-up rebuild** that replaces the old static HTML site. The old
site still lives at `../algreen.rs site/algreen.rs` and is the source of all original
copy, images and catalog PDFs (already carried over here — no need to copy again).

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

Live demo: **https://algreen-site-2026.vercel.app** (Vercel project
`milosmickemitrovics-projects/algreen-site-2026`).

GitHub auto-deploy is **not** connected — the Vercel account (`milos-micke-mitrovic`) and the
GitHub repo owner (`m1ck333`) differ, which makes the Vercel GitHub App awkward. So we deploy
**manually from the CLI**:

```bash
npx vercel@latest --prod --yes --archive=tgz
```

Notes:
- `--archive=tgz` is **required** on this network — the default multi-connection upload aborts;
  the single-archive upload works. Also needs a recent CLI (hence `vercel@latest`).
- It builds on Vercel's servers, so a local `npm run build` first isn't necessary.
- To wire up auto-deploy-on-push later, connect the repo in the Vercel project's Git settings
  (requires authorizing the Vercel GitHub App on the `m1ck333` account).

## Going live on algreen.rs (the real domain)

The site is built for the root domain `algreen.rs` (already set as `SITE`). To switch the live
domain from `*.vercel.app` to `algreen.rs` (this **replaces the old static site**):
1. Vercel → project → Settings → Domains → add `algreen.rs` and `www.algreen.rs`.
2. At **Loopia DNS**, point web records to Vercel (Vercel shows exact values), typically:
   - `A` `@` → `76.76.21.21`
   - `CNAME` `www` → `cname.vercel-dns.com`
3. **CRITICAL — do NOT touch the `MX` records** (and any mail `TXT`/SPF/DKIM). Email
   (`info@algreen.rs` on Loopia / `mailcluster.loopia.se`) must keep working. Only change the
   web A/CNAME. Also leave `konfigurator.algreen.rs` DNS intact.

## Analytics

GTM container **`GTM-N9D9PRC`** (in `src/i18n/config.ts`, carried from the old site) is loaded
with **Google Consent Mode** defaulting to *denied*; the cookie banner (`ConsentBanner.astro`)
flips it to *granted* on accept (stored in `localStorage` `algreen-consent`). Verify the GTM
container still exists in the client's Google account and that its GA4/Ads tags are configured.

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

### Styling
- Design tokens in `tailwind.config.mjs`: `ink` (charcoal), `brand` (green), `gold` (accent),
  `font-display` (Playfair) for headings, `font-sans` (Inter) for body.
- Reusable component classes in `src/styles/global.css`: `.btn-primary/.btn-ghost/.btn-dark/.btn-outline`,
  `.section`, `.container-px`, `.eyebrow`, `.reveal` (scroll-in animation).
- **Mobile-first**: always design for small screens, add `sm:`/`lg:` for larger.

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

## Known follow-ups / TODO before production
- **Contact form** uses a `mailto:` fallback — wire to a real service (Formspree, Web3Forms,
  or a backend endpoint) for actual submissions. See `ContactContent.astro`.
- Confirm the production domain `SITE` in **`astro.config.mjs`** and **`src/pages/sitemap.xml.ts`**
  (currently `https://algreen.rs`).
- The old site had **Google Tag Manager / Google Ads** (GTM-N9D9PRC, AW-790944121) — re-add to
  `BaseLayout.astro` if analytics are wanted.
- Consider a `site.webmanifest` (android-chrome icons already exist in `public/img/`).

## Gotchas
- `@astrojs/sitemap` was removed — its i18n mode crashed with this Astro version. We generate
  the sitemap ourselves (`sitemap.xml.ts`). Don't re-add the integration without testing.
- Astro allows **only one** frontmatter (`---`) block per file, at the top. Define helpers there.
- `npm run dev`/`build` print "New version of Astro available (7.x)" — we are intentionally on 4.x.
