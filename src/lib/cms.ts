import type { Lang } from '../i18n/config';

/**
 * Build-time CMS content (edited by the client in /admin, published snapshot).
 *
 * `scripts/fetch-content.mjs` (runs before `astro build`) downloads the published
 * snapshot from /api/content into `src/data/cms.generated.json` and renders the
 * referenced images into `public/m/`. Everything here is resolved at BUILD time,
 * so the public site stays 100% static HTML (no client-side content → SEO-safe).
 *
 * When the file is absent (local builds, first deploy) every helper falls back to
 * the hardcoded defaults in the code — i.e. the site is byte-identical to before.
 */

export type L10n = { sr: string; en: string };

export interface MediaImage {
  kind: 'image';
  w: number;
  h: number;
  /** Generated webp variants, ascending width, e.g. [{ w: 480, src: '/m/abc-480.webp' }]. */
  variants: { w: number; src: string }[];
}
export interface MediaDoc {
  kind: 'pdf';
  href: string;
  name: string;
}

export interface GalleryItem {
  /** Built-in photo shipped with the site (e.g. '/img/5.webp'), or… */
  src?: string;
  /** …an uploaded media id. */
  media?: string;
  caption?: L10n;
}

export interface Branch {
  id: string;
  city: L10n;
  street: L10n;
  postal: L10n;
  phones: string[];
  email: string;
  mapsUrl: string;
}

export interface Settings {
  email?: string;
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  branches?: Branch[];
}

export interface Announcement {
  enabled: boolean;
  text: L10n;
  link?: string;
  linkLabel?: L10n;
}

export interface FaqItem {
  q: L10n;
  a: L10n;
}

export interface CmsData {
  v?: number;
  publishedAt?: string;
  gallery?: GalleryItem[];
  slots?: Record<string, string>;
  docs?: Record<string, string>;
  faq?: FaqItem[] | null;
  texts?: Partial<Record<Lang, Record<string, string>>>;
  settings?: Settings | null;
  announcement?: Announcement | null;
  media?: Record<string, MediaImage | MediaDoc>;
}

// Optional file: the glob resolves to {} when it doesn't exist.
const files = import.meta.glob<CmsData>('../data/cms.generated.json', { eager: true, import: 'default' });
export const cms: CmsData = Object.values(files)[0] ?? {};

export interface Img {
  src: string;
  srcset?: string;
}

/** Resolve an uploaded image id to src + srcset (null if unknown / not an image). */
export function mediaImg(id: string | undefined): Img | null {
  const m = id ? cms.media?.[id] : undefined;
  if (!m || m.kind !== 'image' || !m.variants.length) return null;
  const largest = m.variants[m.variants.length - 1];
  return {
    src: largest.src,
    srcset: m.variants.length > 1 ? m.variants.map((v) => `${v.src} ${v.w}w`).join(', ') : undefined,
  };
}

/** Resolve an uploaded document id to its public href (null if unknown). */
export function mediaDoc(id: string | undefined): string | null {
  const m = id ? cms.media?.[id] : undefined;
  return m && m.kind === 'pdf' ? m.href : null;
}

/** Image slot: the client's replacement if any, otherwise the given default. */
export function slotOverride(key: string): Img | null {
  return mediaImg(cms.slots?.[key]);
}

/** Document slot: the client's replacement href if any, otherwise the given default. */
export function docOverride(key: string): string | null {
  return mediaDoc(cms.docs?.[key]);
}

/** Pick a language from an L10n, falling back to Serbian when English is empty. */
export const pick = (v: L10n | undefined, lang: Lang): string => (v ? v[lang] || v.sr || '' : '');

/** JSON for an inline <script type="application/ld+json"> — `<` escaped so edited text can't close the tag. */
export const jsonLd = (obj: unknown): string => JSON.stringify(obj).replace(/</g, '\\u003c');
