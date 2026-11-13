import { ui } from '../i18n/ui';
import type { Lang } from '../i18n/config';
import { cms, mediaImg, mediaDoc, pick, type Img } from './cms';

/**
 * Catalogs on /katalozi/ — the client's published list from /admin ("Katalozi"),
 * else the built-in defaults in ui.ts (`catalogs.items`).
 */
export interface Catalog {
  title: string;
  text: string;
  href: string;
  cover: Img;
}

const FALLBACK_COVER: Img = { src: '/img/design/catalog.webp', srcset: '/img/design/catalog-500.webp 500w, /img/design/catalog.webp 1000w' };

export function catalogs(lang: Lang): Catalog[] {
  const published = cms.catalogs;
  if (!published) {
    return ui[lang].catalogs.items.map((c) => ({ title: c.title, text: c.text, href: c.file, cover: { src: c.img } }));
  }
  return published
    .map((c) => ({
      title: pick(c.title, lang),
      text: pick(c.text, lang),
      href: (c.pdf ? mediaDoc(c.pdf) : c.href) || '',
      cover: (c.cover ? mediaImg(c.cover) : c.src ? { src: c.src } : null) ?? FALLBACK_COVER,
    }))
    .filter((c) => c.title && c.href);
}
