import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages liefert die App unter https://<user>.github.io/<repo>/ aus.
export const BASE = '/mimi_mots/';

export default defineConfig({
  base: BASE,
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
  plugins: [
    // Service Worker (B-51): alle Dateien vorab speichern, damit die App offline läuft.
    // Neue Versionen werden still beim nächsten Start aktiv (kein Hinweis für das Kind).
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt', // kein skipWaiting/clientsClaim → Update erst beim nächsten Start
      injectRegister: 'script-defer',
      manifest: false, // eigenes public/manifest.webmanifest (B-50)
      workbox: {
        globPatterns: ['**/*.{html,js,css,woff2,svg,png,mp3,webmanifest}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
