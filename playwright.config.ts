import { defineConfig, devices } from '@playwright/test';

// Getestet wird der Produktionsbuild unter dem Pages-Pfad, wie auf GitHub Pages.
const PORT = 4173;
export const APP_URL = `http://localhost:${PORT}/mimi_mots/`;

const ipad = devices['iPad Pro 11 landscape'];
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
  projects: viewports.map(({ name, width, height }) => ({
    name,
    use: { ...ipad, browserName: 'webkit', viewport: { width, height } },
  })),
  webServer: {
    command: 'npm run build && npx vite preview',
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
