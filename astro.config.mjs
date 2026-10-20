import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Production domain (apex, canonical). Hosted on Cloudflare Pages; www is a
// proxied CNAME to the same project and serves identical content.
const SITE = 'https://algreen.rs';

// `astro dev` only: serve the admin API (/api/admin/*) locally so /admin works
// without Cloudflare. Never loaded for builds. See scripts/dev-cms.mjs.
const devCms = {
  name: 'algreen-dev-cms',
  hooks: {
    'astro:config:setup': ({ command, updateConfig, logger }) => {
      if (command !== 'dev') return;
      updateConfig({
        vite: {
          plugins: [
            {
              name: 'algreen-dev-cms',
              async configureServer(server) {
                const { createDevCms, DEV_LOGIN } = await import('./scripts/dev-cms.mjs');
                server.middlewares.use(await createDevCms({ log: (...a) => logger.info(a.join(' ')) }));
                logger.info(`/admin → local CMS (.cms-dev/), login ${DEV_LOGIN.username} / ${DEV_LOGIN.password}`);
              },
            },
          ],
        },
      });
    },
  },
};

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
  integrations: [tailwind({ applyBaseStyles: false }), devCms],
});
