import { defineConfig, devices } from '@playwright/test';

// Getestet wird der Produktionsbuild unter dem Pages-Pfad, wie auf GitHub Pages.
// Eigener Vorschau-Port des Projekts (wie `preview.port` in vite.config.ts) – auf 4173 lief
// schon ein anderes Projekt, und reuseExistingServer hätte es mitgetestet.
const PORT = 4181;
export const APP_URL = `http://localhost:${PORT}/mimi_mots/`;

const ipad = devices['iPad Pro 11 landscape'];
/** Projektname des iPhones – Tests mit iPad-Maßen fragen danach (B-76). */
export const IPHONE = 'iphone-852x393';
/** B-91: Referenz-Viewport – hier laufen alle Tests. Auf den übrigen laufen nur die mit
 *  `@layout` markierten (Größe, Lage, Überlauf, Screenshots); Verhalten hängt nicht vom
 *  Viewport ab und wird nur einmal geprüft. */
export const REFERENCE = 'ipad-1180x820';
const LAYOUT_ONLY = { grep: /@layout/ };
const viewports = [
  { name: 'ipad-1024x768', width: 1024, height: 768 },
  { name: 'ipad-1180x820', width: 1180, height: 820 },
  { name: 'ipad-1366x1024', width: 1366, height: 1024 },
];

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: APP_URL, trace: 'on-first-retry' },
  projects: [
    ...viewports.map(({ name, width, height }) => ({
      name,
      ...(name === REFERENCE ? {} : LAYOUT_ONLY),
      use: { ...ipad, browserName: 'webkit' as const, viewport: { width, height } },
    })),
    // B-76: iPhone 15/16 quer als Home-Bildschirm-App (volle Fläche ohne Safari-Leisten)
    {
      name: IPHONE,
      ...LAYOUT_ONLY,
      use: {
        ...devices['iPhone 15'],
        browserName: 'webkit' as const,
        viewport: { width: 852, height: 393 },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview',
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
