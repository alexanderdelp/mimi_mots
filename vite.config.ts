import { defineConfig } from 'vite';

// GitHub Pages liefert die App unter https://<user>.github.io/<repo>/ aus.
export const BASE = '/mimi_mots/';

export default defineConfig({
  base: BASE,
  server: { port: 5173 },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
