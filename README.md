# Algreen — sajt 2026

Moderni, responzivni, dvojezični (SR/EN) marketinški sajt za **Algreen** — ekskluzivna
aluminijumska ulazna vrata. Zamena za stari statički sajt, fokusiran na brzinu i SEO.

## Tehnologija

- **Astro 4** — statički HTML izlaz, minimalan JS
- **Tailwind CSS** — dizajn sistem (brend boje + zlatni akcenat)
- **i18n** — `sr` podrazumevani (na `/`), `en` na `/en/`, sa `hreflang` oznakama
- Ručno generisan `sitemap.xml` (endpoint) + `robots.txt`
- `HomeAndConstructionBusiness` JSON-LD strukturni podaci za lokalni SEO

## Pokretanje

```bash
npm install
npm run dev      # http://localhost:3824
npm run build    # statički izlaz u dist/
npm run preview  # pregled produkcijskog builda
```

Lokalni dev server radi na portu **3824** (podešeno u `astro.config.mjs`).

## Struktura

```
src/
  i18n/         config.ts (firma, kontakti), routes.ts (lokalizovane putanje), ui.ts (svi tekstovi SR/EN)
  layouts/      BaseLayout.astro (SEO <head>, hreflang, JSON-LD)
  components/   Header, Footer, PageHero, CtaBand + pages/*Content.astro
  pages/        SR rute + en/ (EN rute) + sitemap.xml.ts + 404.astro
public/
  img/          optimizovane slike (sharp)
  files/        PDF katalozi
scripts/
  optimize-images.mjs   jednokratni optimizator slika (resize + recompress)
```

## Stranice

| SR                    | EN                          | Sadržaj                          |
| --------------------- | --------------------------- | -------------------------------- |
| `/`                   | `/en/`                      | Početna (hero, sistemi, katalozi)|
| `/o-nama/`            | `/en/about/`                | O nama, tim, vrednosti           |
| `/radovi/`           | `/en/works/`                | Galerija radova (lightbox)       |
| `/oprema/`           | `/en/equipment/`            | Oprema i kontrola pristupa       |
| `/tehnicki-detalji/` | `/en/technical-details/`    | Sistemi AG 70/77/85, Ud vrednosti|
| `/kontakt/`          | `/en/contact/`              | Kontakt, forma, mapa             |

Konfigurator je eksterni: `https://konfigurator.algreen.rs`.

## Pre deploya

- U `astro.config.mjs` i `src/pages/sitemap.xml.ts` proveri `SITE` domen.
- Kontakt forma trenutno koristi `mailto:` — za pravu obradu povezati backend/servis
  (npr. Formspree, Web3Forms) ili poslovni e-mail endpoint.
- Po želji dodati Google Analytics / GTM (postojao na starom sajtu).
