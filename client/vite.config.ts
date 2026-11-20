import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Makes outFITless a full PWA: a service worker keeps the app's files on the device, so it
    // opens straight away, even with no signal, and browsers offer to install it.
    VitePWA({
      // A new version waits until the person taps Update (components/UpdatePrompt.tsx), so the
      // page never reloads by itself, like in the middle of a workout
      registerType: 'prompt',
      // Registered by UpdatePrompt, not by a script the plugin adds
      injectRegister: false,
      // The manifest is our own public/site.webmanifest, already linked from index.html
      manifest: false,
      workbox: {
        // Everything the app needs to open and look right offline. Left out: the share preview
        // image, the large icons only the system uses when installing, and files for crawlers.
        globPatterns: ['**/*.{js,css,html,svg,webp,png,ico}'],
        globIgnores: ['og-image.png', 'icon-512.png', 'icon-maskable-*.png', 'robots.txt', 'sitemap.xml'],
        // Every page address opens the app, which shows the right page, like the server does.
        // Not the API, and not files crawlers ask for by name.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/(robots\.txt|sitemap\.xml)$/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // The fonts come from Google: its stylesheet is kept and refreshed in the background,
          // and the font files themselves, which never change, are kept for a year
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
