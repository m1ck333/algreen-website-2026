import { ui } from '../i18n/ui';
import { slotOverride, docOverride, type Img } from './cms';

/**
 * Registry of every replaceable image ("slot") and document on the site.
 * Single source of truth for the defaults: components call `img(key)` / `doc(key)`,
 * and the /admin page lists the same entries (labels are what the client sees).
 *
 * `variants` describes the responsive files that ship with each DEFAULT image, so
 * the default markup is exactly what it was before the CMS existed:
 *   design  → `-500.webp` + base (1000w)      (homepage design set)
 *   hero    → `-800.webp` + base (1400w)      (PageHero, webp only)
 *   gallery → `-600.webp` + base (1400w)      (/radovi/ photos)
 */
type Variants = 'design' | 'hero' | 'gallery';

export interface SlotDef {
  key: string;
  group: string;
  label: string;
  src: string;
  variants?: Variants;
}

export interface DocDef {
  key: string;
  group: string;
  label: string;
  href: string;
}

export function defaultSrcset(src: string, variants?: Variants): string | undefined {
  if (!src.endsWith('.webp')) return undefined;
  if (variants === 'design') return `${src.replace(/\.webp$/, '-500.webp')} 500w, ${src} 1000w`;
  if (variants === 'hero') return `${src.replace(/\.webp$/, '-800.webp')} 800w, ${src} 1400w`;
  if (variants === 'gallery') return `${src.replace(/\.webp$/, '-600.webp')} 600w, ${src} 1400w`;
  return undefined;
}

const sr = ui.sr;
const n = (i: number) => String(i + 1);

export const SLOTS: SlotDef[] = [
  // Početna
  ...[
    '/img/design/hero-house.webp',
    '/img/design/hero-door.webp',
    '/img/design/hero-pivot.webp',
    '/img/design/access-control.webp',
  ].map((src, i) => ({ key: `home.hero.${n(i)}`, group: 'Početna — naslovni kolaž', label: `Slika ${n(i)}`, src, variants: 'design' as const })),
  { key: 'home.configurator', group: 'Početna — konfigurator', label: 'Slika konfiguratora', src: '/img/design/configurator.webp', variants: 'design' },
  ...sr.home.showcase.tiles.map((t, i) => ({ key: `home.tile.${n(i)}`, group: 'Početna — ekskluzivna ulazna vrata', label: t.label, src: t.img, variants: 'design' as const })),
  ...sr.home.showcase.products.map((p, i) => ({ key: `home.product.${n(i)}`, group: 'Početna — naša ponuda', label: p.label, src: p.img, variants: 'design' as const })),
  ...[
    '/img/design/work-1.webp',
    '/img/design/hero-door.webp',
    '/img/design/work-2.webp',
    '/img/design/work-3.webp',
    '/img/design/work-4.webp',
    '/img/design/work-5.webp',
  ].map((src, i) => ({ key: `home.work.${n(i)}`, group: 'Početna — naši radovi (6 slika)', label: `Rad ${n(i)}`, src, variants: 'design' as const })),

  // Naslovne slike unutrašnjih stranica
  { key: 'hero.about', group: 'Naslovne slike stranica', label: 'O nama', src: '/img/onama.webp', variants: 'hero' },
  { key: 'hero.works', group: 'Naslovne slike stranica', label: 'Naši radovi', src: '/img/19.webp', variants: 'hero' },
  { key: 'hero.equipment', group: 'Naslovne slike stranica', label: 'Oprema', src: '/img/header.webp', variants: 'hero' },
  { key: 'hero.technical', group: 'Naslovne slike stranica', label: 'Tehnički detalji', src: '/img/header.webp', variants: 'hero' },
  { key: 'hero.contact', group: 'Naslovne slike stranica', label: 'Kontakt', src: '/img/kontakt.webp', variants: 'hero' },
  { key: 'cta.bg', group: 'Naslovne slike stranica', label: 'Pozadina trake „Spremni za vrata po Vašoj meri?”', src: '/img/hero-door-new-2.jpg' },

  // O nama
  ...['/img/about1.png', '/img/about2.png', '/img/about3.png', '/img/about4.png'].map((src, i) => ({
    key: `about.step.${n(i)}`, group: 'O nama — koraci', label: sr.about.steps[i], src,
  })),
  ...['/img/tim1.png', '/img/tim2.png', '/img/tim3.png', '/img/tim4.png', '/img/tim5.png', '/img/tim6.png'].map((src, i) => ({
    key: `about.team.${n(i)}`, group: 'O nama — tim', label: sr.about.team[i].title, src,
  })),

  // Oprema
  ...sr.equipment.categories.map((c, i) => ({ key: `equipment.category.${n(i)}`, group: 'Oprema — kategorije', label: c.title, src: c.img })),
  ...['/img/rukohvat1.png', '/img/rukohvat2.png', '/img/rukohvat3.png', '/img/kvaka1.png', '/img/kvaka2.png', '/img/kvaka3.png'].map((src, i) => ({
    key: `equipment.handle.${n(i)}`, group: 'Oprema — traka „Estetika”', label: `Slika ${n(i)}`, src,
  })),
  ...['/img/brava5.png', '/img/brava6.png', '/img/brava7.png', '/img/cilindar1.png', '/img/sarke1.png', '/img/rozeta1.png'].map((src, i) => ({
    key: `equipment.lock.${n(i)}`, group: 'Oprema — traka „Bezbednost”', label: `Slika ${n(i)}`, src,
  })),
  { key: 'equipment.fingerprint', group: 'Oprema — ostalo', label: 'Pametna kontrola pristupa', src: '/img/fingerprint2.png' },
  { key: 'equipment.mailbox', group: 'Oprema — ostalo', label: 'Poštansko sanduče', src: '/img/sanduce.jpg' },

  // Tehnički detalji
  ...sr.technical.systems.map((s, i) => ({ key: `technical.system.${n(i)}`, group: 'Tehnički detalji — preseci', label: s.name, src: s.img })),
];

export const DOCS: DocDef[] = [
  { key: 'catalog', group: 'Katalozi', label: 'Katalog ulaznih vrata (pločica „Katalog” na početnoj)', href: '/files/Katalog ulaznih vrata 2024.pdf' },
  ...sr.technical.systems.map((s, i) => ({ key: `technical.pdf.${n(i)}`, group: 'Tehnički detalji — PDF', label: s.name, href: s.pdf })),
];

const slotIndex = new Map(SLOTS.map((s) => [s.key, s]));
const docIndex = new Map(DOCS.map((d) => [d.key, d]));

/** Image for a slot: the published replacement, else the built-in default. */
export function img(key: string): Img {
  const def = slotIndex.get(key);
  if (!def) throw new Error(`Unknown image slot: ${key}`);
  return slotOverride(key) ?? { src: def.src, srcset: defaultSrcset(def.src, def.variants) };
}

/** Href for a document slot: the published replacement, else the built-in default. */
export function doc(key: string): string {
  const def = docIndex.get(key);
  if (!def) throw new Error(`Unknown document slot: ${key}`);
  return docOverride(key) ?? def.href;
}
