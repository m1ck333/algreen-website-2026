import type { Lang } from './config';

/** Logical page keys mapped to localized, SEO-friendly paths per language. */
export const routes = {
  home: { sr: '/', en: '/en/' },
  about: { sr: '/o-nama/', en: '/en/about/' },
  works: { sr: '/radovi/', en: '/en/works/' },
  equipment: { sr: '/oprema/', en: '/en/equipment/' },
  technical: { sr: '/tehnicki-detalji/', en: '/en/technical-details/' },
  contact: { sr: '/kontakt/', en: '/en/contact/' },
} as const;

export type RouteKey = keyof typeof routes;

export function path(key: RouteKey, lang: Lang): string {
  return routes[key][lang];
}

/** Given the current page key, return the URL of the same page in the other language. */
export function altLangPath(key: RouteKey, lang: Lang): string {
  return lang === 'sr' ? routes[key].en : routes[key].sr;
}
