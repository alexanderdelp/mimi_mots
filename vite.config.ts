import { defineConfig, type Plugin } from 'vite';
import { choose, defaultFiles, readState } from './tools/stimmwahl-store';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages liefert die App unter https://<user>.github.io/<repo>/ aus.
export const BASE = '/mimi_mots/';

/**
 * Stimmwahl (B-78), nur im Dev-Server: GET liefert die gespeicherte Auswahl, POST übernimmt einen
 * Kandidaten in die App (MP3 kopieren, audio-choices.json, audio-check.md abhaken).
 */
function stimmwahl(): Plugin {
  const files = defaultFiles(process.cwd());
  return {
    name: 'stimmwahl',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__stimmwahl', (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method === 'GET') return send(200, readState(files));
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const { lang, id, voice, variant } = JSON.parse(body);
            choose(files, lang, id, { voice, variant });
            send(200, readState(files));
          } catch (error) {
            send(400, { error: String(error) });
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: BASE,
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
  plugins: [
    stimmwahl(),
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
