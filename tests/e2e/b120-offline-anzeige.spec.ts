import { expect, test, type Page } from './fixtures';
import { hold, lowContrast, overflow, prepare, settle } from './views';

/** Elternbereich öffnen, Reiter „Sonstiges“. */
async function openOther(page: Page) {
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name: 'Sonstiges' }).click();
  await settle(page);
}

/** Anzahl der Einträge im Precache, wie die Seite sie sieht. */
const precached = (page: Page) =>
  page.evaluate(async () => {
    let n = 0;
    for (const name of await caches.keys()) n += (await (await caches.open(name)).keys()).length;
    return n;
  });

const label = (page: Page) => page.locator('.admin__offline-text');

test.describe('B-120 Offline-Anzeige im Elternbereich', () => {
  test('AT-120.1: nach der Installation „Bereit · N Dateien“, im Reiter „Sprachen“ nicht', async ({
    page,
  }) => {
    await page.goto('./');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await openOther(page);
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    const n = await precached(page);
    expect(n).toBeGreaterThan(100);
    await expect(label(page)).toHaveText(new RegExp(`^Bereit · ${n} Dateien`));

    await page.getByRole('tab', { name: 'Sprachen' }).click();
    await expect(label(page)).toBeHidden();
  });

  test('AT-120.2: beim ersten Laden ohne Kontrolle „Nicht aktiv“ bzw. „Lädt …“, danach „Bereit“', async ({
    page,
  }) => {
    await page.goto('./');
    await openOther(page);
    // erstes Laden: kein clientsClaim (B-51) → diese Seite wird noch nicht bedient
    await expect(label(page)).toHaveText(/^(Lädt … · \d+ Dateien|Nicht aktiv · \d+ Dateien)$/);
    await expect(label(page)).toHaveText(/^Nicht aktiv · \d+ Dateien$/, { timeout: 20_000 });
  });

  test('AT-120.3: offline gestartet bleibt die Zeile „Bereit“', async ({ page, context }) => {
    test.slow();
    await page.goto('./');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await openOther(page);
    await expect(label(page)).toHaveText(/^Bereit · \d+ Dateien/);
  });

  test.describe('ohne Service Worker', () => {
    test.use({ serviceWorkers: 'block' });
    test('AT-120.5: Browser ohne Service Worker zeigt „Kein Service Worker“', async ({ page }) => {
      await page.goto('./');
      await openOther(page);
      await expect(label(page)).toHaveText(/^(Kein Service Worker|Nicht möglich \(Browser\))$/);
    });
  });

  test(
    'AT-120.6: Reiter „Sonstiges“ mit Zeile „Offline“ passt, Kontrast ok',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await page.goto('./');
      await openOther(page);
      await expect(label(page)).toBeVisible();
      expect(await overflow(page)).toEqual([]);
      expect(await lowContrast(page)).toEqual([]);
      const row = (await page.locator('.admin__setting--offline').boundingBox())!;
      const viewport = page.viewportSize()!;
      expect(row.y + row.height).toBeLessThanOrEqual(viewport.height);
    },
  );
});
