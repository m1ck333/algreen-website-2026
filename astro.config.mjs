import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Final production domain. apex algreen.rs 301-redirects to www at Loopia,
// so www is the canonical host that actually serves the site.
const SITE = 'https://www.algreen.rs';

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
