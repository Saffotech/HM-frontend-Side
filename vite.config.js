import { defineConfig, loadEnv } from 'vite';

import react from '@vitejs/plugin-react'; // eslint-disable-line import/default

import path from 'path';



export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '');

  const apiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000';



  return {

    plugins: [react()],

    resolve: {

      alias: {

        '@': path.resolve(__dirname, './src'),

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

            if (id.includes('node_modules/framer-motion')) {

              return 'vendor-motion';

            }

          },

        },

      },

    },

  };

});

