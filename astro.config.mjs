import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Production domain (apex, canonical). Hosted on Cloudflare Pages; www is a
// proxied CNAME to the same project and serves identical content.
const SITE = 'https://algreen.rs';

export default defineConfig({
  site: SITE,
  server: { port: 3824, host: true },
  // Inline the (small, ~36KB) CSS into each page so there's no render-blocking
  // stylesheet request — improves FCP/LCP.
  build: { inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'sr',
    locales: ['sr', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [tailwind({ applyBaseStyles: false })],
});
