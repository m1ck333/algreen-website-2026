import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Update this to the final production domain before deploy.
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
