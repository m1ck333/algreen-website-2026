import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Production domain — the site is served directly from Loopia web hosting at
// the apex (www is a Loopia alias to the apex, so both work; apex is canonical).
const SITE = 'https://algreen.rs';

export default defineConfig({
  site: SITE,
  server: { port: 3824, host: true },
  i18n: {
    defaultLocale: 'sr',
    locales: ['sr', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [tailwind({ applyBaseStyles: false })],
});
