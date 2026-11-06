import type { AddressInfo } from 'node:net';
import { createServer, type ViteDevServer } from 'vite';
import { expect, test } from './fixtures';
import { hold } from './views';

// Alle übrigen E2E-Tests laufen gegen den Produktionsbuild; dort verschwinden `node:*`-Importe
// beim Bündeln. Dieser Test startet deshalb selbst einen Dev-Server, auf einem freien Port, damit
// er einem laufenden `npm run dev` nicht in die Quere kommt.
test.describe('B-105 App im Dev-Server', () => {
  test.describe.configure({ mode: 'serial' });

  let server: ViteDevServer;
  let url: string;

  test.beforeAll(async () => {
    server = await createServer({
      logLevel: 'silent',
      server: { port: 0, host: 'localhost', strictPort: true },
    });
    await server.listen();
    url = `http://localhost:${(server.httpServer!.address() as AddressInfo).port}/mimi_mots/`;
  });

  test.afterAll(async () => {
    await server?.close();
  });

  test('AT-105.1: App startet ohne Konsolenfehler', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto(url);
    await expect(page.locator('.app-header__icon')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('AT-105.2: Elternbereich zeigt die Versionszeile', async ({ page }) => {
    await page.goto(url);
    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    await expect(page.locator('.admin__version-text')).toHaveText(
      /^\d+\.\d+\.\d+ · ([0-9a-f]{7}|unbekannt) · \d{2}\.\d{2}\.\d{4}$/,
    );
  });
});
