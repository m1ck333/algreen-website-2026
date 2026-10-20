import type { Lang } from '../i18n/config';
import { cms, mediaImg, pick, type GalleryItem } from './cms';
import { defaultSrcset } from './slots';

/** Built-in /radovi/ photos (legacy webp set, each with a -600.webp thumbnail). */
const DEFAULT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 23, 25, 27, 28, 29, 30, 31];
export const DEFAULT_GALLERY: GalleryItem[] = DEFAULT_IDS.map((n) => ({ src: `/img/${n}.webp` }));

export interface GalleryPhoto {
  /** Grid thumbnail src + srcset. */
  src: string;
  srcset?: string;
  /** Large image opened in the lightbox. */
  full: string;
  /** Client caption ('' when none). */
  caption: string;
}

/** The published gallery (or the built-in one), resolved for rendering. */
export function galleryPhotos(lang: Lang): GalleryPhoto[] {
  const items = cms.gallery ?? DEFAULT_GALLERY;
  const out: GalleryPhoto[] = [];
  for (const it of items) {
    const caption = pick(it.caption, lang);
    if (it.media) {
      const m = mediaImg(it.media);
      if (m) out.push({ src: m.src, srcset: m.srcset, full: m.src, caption });
    } else if (it.src) {
      out.push({ src: it.src, srcset: defaultSrcset(it.src, 'gallery'), full: it.src, caption });
    }
  }
  return out;
}
