import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Clinic ABA & Atria',
          short_name: 'ClinicABA',
          description: 'Prontuário e Co-Piloto de IA para Terapia ABA e Neurodesenvolvimento',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: '/assets/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/assets/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // Bypass all network requests destined for the Supabase API to avoid caching DB / Auth operations
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
              handler: 'NetworkOnly'
            },
            {
              urlPattern: /\.(?:js|css|html|ico|png|jpg|jpeg|svg|gif|woff2?)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
                }
              }
            }
          ],
          navigateFallback: '/index.html',
          // Do not redirect Supabase requests or local Express API requests to index.html fallback
          navigateFallbackDenylist: [
            /^\/api/,
            /\.supabase\.co/
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
