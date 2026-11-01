import { defineConfig, type Plugin } from 'vite';
import { choose, defaultFiles, readState } from './tools/stimmwahl-store';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages liefert die App unter https://<user>.github.io/<repo>/ aus.
export const BASE = '/mimi_mots/';

/**
 * Stimmwahl (B-78), nur im Dev-Server: GET liefert die gespeicherte Auswahl, POST übernimmt einen
 * Kandidaten in die App (MP3 kopieren, audio-choices.json, audio-check.md abhaken) oder „keins“.
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
            choose(files, lang, id, voice === null ? null : { voice, variant }); // null: „keins“
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
  // eigene Ports statt der Vite-Standards, damit sich Projekte auf dem Rechner nicht in die Quere
  // kommen; belegt → Fehler statt stillem Ausweichen. B-92: je Worktree per DEV_PORT bzw.
  // PREVIEW_PORT änderbar, damit parallel arbeitende Agenten sich nicht stören.
  server: { port: Number(process.env.DEV_PORT ?? 5181), strictPort: true },
  preview: { port: Number(process.env.PREVIEW_PORT ?? 4181), strictPort: true },
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
    environment: 'node', // B-91: DOM-Tests wählen jsdom selbst (@vitest-environment jsdom)
    include: ['tests/**/*.test.ts'],
  },
});
