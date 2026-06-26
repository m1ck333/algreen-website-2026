import type { APIRoute } from 'astro';
import { routes, type RouteKey } from '../i18n/routes';

const SITE = 'https://algreen.rs';

export const GET: APIRoute = () => {
  const keys = Object.keys(routes) as RouteKey[];
  const langs = ['sr', 'en'] as const;

  const urls = keys.flatMap((key) =>
    langs.map((lang) => {
      const loc = SITE + routes[key][lang];
      const alternates = langs
        .map(
          (l) =>
            `    <xhtml:link rel="alternate" hreflang="${l === 'sr' ? 'sr-RS' : 'en'}" href="${SITE + routes[key][l]}"/>`,
        )
        .join('\n');
      const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE + routes[key].sr}"/>`;
      return `  <url>
    <loc>${loc}</loc>
${alternates}
${xDefault}
    <changefreq>monthly</changefreq>
    <priority>${key === 'home' ? '1.0' : '0.8'}</priority>
  </url>`;
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
