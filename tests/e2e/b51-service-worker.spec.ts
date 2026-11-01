import { expect, test, type Page } from './fixtures';
import { readdirSync } from 'node:fs';
import words from '../../src/data/words.json' with { type: 'json' };
import { fakeMedia, mediaCalls } from './helpers';
import { btn } from './views';

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);

/** Lädt die App und wartet, bis der Service Worker aktiv ist und die Seite kontrolliert. */
async function installAndControl(page: Page) {
  await page.goto('./');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return reg.active?.state;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

/** Alle URLs (Pfad) im Workbox-Precache. */
async function precachedPaths(page: Page) {
  return page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) paths.push(new URL(req.url).pathname);
    }
    return paths;
  });
}

test.describe('B-51 Service Worker', () => {
  test.beforeEach(async ({ page }) => {
    await fakeMedia(page);
  });

  test('AT-51.1: Service Worker aktiv und kontrolliert die Seite', async ({ page }) => {
    await installAndControl(page);
    const scope = await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistration())?.scope,
    );
    expect(new URL(scope!).pathname).toBe('/mimi_mots/');
  });

  test('AT-51.2: Precache enthält alle Dateien der App', async ({ page }) => {
    await installAndControl(page);
    const paths = await precachedPaths(page);
    const expected = [
      '/mimi_mots/index.html',
      '/mimi_mots/manifest.webmanifest',
      '/mimi_mots/icons/icon.svg',
      '/mimi_mots/icons/icon-180.png',
      '/mimi_mots/flags/flag_fr.svg',
      '/mimi_mots/flags/flag_gb.svg',
      ...['cat', 'pony'].flatMap((a) =>
        ['sitting', 'pointing', 'idle', 'waving'].map((p) => `/mimi_mots/avatars/${a}_${p}.png`),
      ),
      ...words.map((w) => `/mimi_mots/audio/fr/${w.id}.mp3`),
    ];
    for (const path of expected) expect(paths, path).toContain(path);
    // AT-61.5: jedes Bild und jede Audiodatei aus public/ (alle Sprachen, Schlafbilder, Flaggen)
    const media = readdirSync('public', { recursive: true, encoding: 'utf8' })
      .filter((f) => /\.(png|svg|mp3)$/.test(f))
      .map((f) => `/mimi_mots/${f.replaceAll('\\', '/')}`);
    expect(media.length).toBeGreaterThan(3 * words.length);
    for (const path of media) expect(paths, path).toContain(path);
    expect(paths.some((p) => /\/assets\/index-.*\.js$/.test(p))).toBe(true);
    expect(paths.some((p) => /\/assets\/index-.*\.css$/.test(p))).toBe(true);
    expect(paths.some((p) => /nunito.*\.woff2$/.test(p))).toBe(true);
    expect(paths.some((p) => p.includes('/tools/'))).toBe(false);
  });

  test('AT-51.3: offline vollständig nutzbar', { tag: '@layout' }, async ({ page, context }) => {
    await installAndControl(page);
    const failed: string[] = [];
    page.on('requestfailed', (r) => failed.push(r.url()));
    await context.setOffline(true);
    await page.reload();
    await expect(view(page, 'start')).toBeVisible();
    await btn(page, 'Mimi').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Los geht’s').click();
    await expect(view(page, 'round')).toBeVisible();
    const id = await page.locator('.word-card').getAttribute('data-word-id');
    await page.waitForLoadState('networkidle');
    await btn(page, 'Auf Französisch anhören').click();
    const calls = await mediaCalls(page);
    expect(calls.filter((c) => c.op === 'play')).toEqual([
      { op: 'play', src: `/mimi_mots/audio/fr/${id}.mp3`, time: 0 },
    ]);
    expect(calls.filter((c) => c.op === 'speak')).toEqual([]);
    await btn(page, 'Wusste ich').click();
    const box = (await btn(page, 'Beenden').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    await expect(view(page, 'end')).toBeVisible();
    await expect(view(page, 'end').locator('.avatar img')).toHaveJSProperty('complete', true);
    expect(failed).toEqual([]);
  });

  test('AT-51.4: stilles Update ohne sofortige Übernahme', async ({ page, request }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await installAndControl(page);
    const sw = await (await request.get('sw.js')).text();
    expect(sw).not.toContain('clientsClaim');
    // skipWaiting nur auf ausdrückliche Nachricht, die die App nie sendet
    expect(sw.match(/skipWaiting/g)).toHaveLength(1);
    expect(sw).toMatch(/"SKIP_WAITING"===\w+\.data\.type&&self\.skipWaiting\(\)/);
    expect(dialogs).toEqual([]);
  });

  test('AT-51.5: Precache kleiner als 5 MB', async ({ page }) => {
    await installAndControl(page);
    const total = await page.evaluate(async () => {
      let bytes = 0;
      for (const name of await caches.keys()) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          bytes += (await (await cache.match(req))!.arrayBuffer()).byteLength;
        }
      }
      return bytes;
    });
    expect(total).toBeGreaterThan(500 * 1024);
    expect(total).toBeLessThan(5 * 1024 * 1024);
  });
});
