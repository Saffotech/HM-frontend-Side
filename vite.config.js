import { defineConfig, loadEnv } from 'vite';

import react from '@vitejs/plugin-react';

import path from 'path';

// Platform Admin: scopes every CSS selector in src/features/Platform Admin under `.platform-root`
import prefixSelector from 'postcss-prefix-selector';

const PLATFORM_ROOT = '.platform-root';
const PLATFORM_CSS_FILES = /[\\/]src[\\/]features[\\/]Platform Admin[\\/]/;

function scopePlatformSelector(prefix, selector, prefixedSelector) {
  if (selector.startsWith(prefix)) return selector;
  if (/^(:root|html|body|#root)$/.test(selector)) return prefix;
  return prefixedSelector;
}



function spaAssetPolicy() {
  const setHtmlNoStore = (req, res, next) => {
    const pathOnly = (req.url || '').split('?')[0];
    if (pathOnly === '/' || pathOnly === '/index.html' || pathOnly.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  };

  return {
    name: 'saffo-spa-asset-policy',
    configureServer(server) {
      server.middlewares.use(setHtmlNoStore);
    },
    configurePreviewServer(server) {
      server.middlewares.use(setHtmlNoStore);
    },
  };
}

export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '');

  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000';



  return {

    plugins: [react(), spaAssetPolicy()],

    // Platform Admin: keeps platform styles from leaking into the hospital app
    css: {
      postcss: {
        plugins: [
          prefixSelector({
            prefix: PLATFORM_ROOT,
            includeFiles: [PLATFORM_CSS_FILES],
            transform: scopePlatformSelector,
          }),
        ],
      },
    },

    resolve: {

      alias: {

        '@': path.resolve(import.meta.dirname, './src'),

      },

    },



    server: {

      port: 5173,

      strictPort: true,

      // Dev-only: /api/* → backend (strips /api). Avoids clashing with SPA routes like /nurse/dashboard.

      proxy: {

        '/api': {

          target: apiTarget,

          changeOrigin: true,

          secure: false,

          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),

        },

      },

    },



    build: {

      rollupOptions: {

        output: {

          manualChunks(id) {

            if (

              id.includes('node_modules/react-dom') ||

              id.includes('node_modules/react-router-dom') ||

              /node_modules\/react\//.test(id)

            ) {

              return 'vendor-react';

            }

            if (id.includes('node_modules/@tanstack/react-query')) {

              return 'vendor-query';

            }

          },

        },

      },

    },

  };

});

