import { existsSync, readdirSync } from 'node:fs';
import { expect, isPhone, minSize, test, type Page } from './fixtures';
import { btn, hold, overflow, prepare, stored, storeOnce } from './views';

// B-118: Italienisch ist vollständig entfernt (Entscheidung des Menschen 2026-11-14).
const entry = { box: 2, seen: 3, lastSeenAt: '2026-10-29T10:00:00.000Z' };
const languageGroup = (page: Page) => page.getByRole('group', { name: 'In welcher Sprache?' });

/** Alter Stand mit Italienisch überall, wo eine Sprache vorkommt. */
async function seedItalian(page: Page, enabledLanguages: string[]) {
  await prepare(page);
  await storeOnce(page, {
    settings: { companion: 'mimi', language: 'it', mode: 'speak' },
    progress: { en: {}, fr: { hund: entry }, ja: {}, it: { katze: entry } },
    listenProgress: { en: {}, fr: {}, ja: {}, it: { hund: entry } },
    enabledLanguages,
    disabledWords: { en: [], fr: [], ja: [], it: ['maus'] },
    tutorialDone: true,
    listenTutorialDone: true,
    rest: { sleeping: [], since: '2026-10-30' },
  });
}

async function noItalian(page: Page) {
  await expect(btn(page, 'Italienisch')).toHaveCount(0);
  await expect(page.locator('img[src*="flag_it"]')).toHaveCount(0);
}

test.describe('B-118 ohne Italienisch', () => {
  test(
    'AT-118.1: Startseite mit genau drei gleich großen Sprachkacheln in einer Reihe',
    { tag: '@layout' },
    async ({ page }) => {
      await seedItalian(page, ['en', 'fr', 'ja', 'it']);
      await page.goto('./');
      await expect(page.locator('[data-view="start"]')).toBeVisible();
      const tiles = languageGroup(page).getByRole('button');
      await expect(tiles).toHaveCount(3);
      const names = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
      expect(names).toEqual(['Englisch', 'Französisch', 'Japanisch']);
      await noItalian(page);
      const boxes = await Promise.all(
        ['Englisch', 'Französisch', 'Japanisch'].map(
          async (n) => (await btn(page, n).boundingBox())!,
        ),
      );
      for (const b of boxes) {
        expect(b.width).toBeCloseTo(boxes[0].width, 0);
        expect(b.height).toBeCloseTo(boxes[0].height, 0);
        expect(b.y).toBeCloseTo(boxes[0].y, 0); // eine Reihe
        expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(minSize(88) - 0.5);
      }
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width - 1);
      expect(boxes[2].x).toBeGreaterThan(boxes[1].x + boxes[1].width - 1);
      // passt ohne Scrollen, nichts überlappt die Modus-Kacheln
      expect(await overflow(page)).toEqual([]);
      const mode = (await btn(page, 'Sprechen').boundingBox())!;
      expect(boxes[2].x + boxes[2].width).toBeLessThan(mode.x);
      const companion = (await btn(page, 'Mots').boundingBox())!;
      expect(companion.x + companion.width).toBeLessThan(boxes[0].x);
      if (!isPhone()) {
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
          await page.evaluate(() => innerWidth),
        );
      }
    },
  );

  test('AT-118.2: im Elternbereich (Reiter Sprachen) gibt es kein Italienisch', async ({
    page,
  }) => {
    await seedItalian(page, ['en', 'fr', 'ja', 'it']);
    await page.goto('./');
    await hold(page, '.app-header__icon');
    await expect(page.locator('[data-view="admin"]')).toBeVisible();
    const languages = page.locator('.admin__languages').getByRole('button');
    const names = await languages.evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label')),
    );
    expect(names).toEqual(['Englisch', 'Französisch', 'Japanisch']);
    await noItalian(page);
  });

  test('AT-118.3: alte Daten mit Italienisch laden ohne Fehler, Auswahl fällt zurück', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await seedItalian(page, ['it', 'fr']);
    await page.goto('./');
    await expect(page.locator('[data-view="start"]')).toBeVisible();
    await noItalian(page);
    // nur Französisch bleibt an → vorausgewählt, Play geht
    await expect(languageGroup(page).getByRole('button')).toHaveCount(1);
    await expect(btn(page, 'Französisch')).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, 'Los geht’s')).toBeEnabled();
    // gespeichert wird erst bei einer Änderung – dann bereinigt
    await btn(page, 'Mots').click();
    await expect.poll(async () => (await stored(page)).settings.companion).toBe('mots');
    await btn(page, 'Los geht’s').click();
    await expect(page.locator('[data-view="round"]')).toBeVisible();
    const data = await stored(page);
    expect(data.settings.language).toBe('fr');
    expect(data.enabledLanguages).toEqual(['fr']);
    for (const field of [data.progress, data.listenProgress, data.disabledWords]) {
      expect(Object.keys(field).sort()).toEqual(['en', 'fr', 'ja']);
    }
    expect(data.progress.fr.hund).toBeDefined(); // übriger Lernstand bleibt
    expect(errors).toEqual([]);
  });

  test('AT-118.3: gewählt war Italienisch, mehrere Sprachen an → keine Wahl, Play aus', async ({
    page,
  }) => {
    await seedItalian(page, ['en', 'fr', 'it']);
    await page.goto('./');
    await expect(languageGroup(page).getByRole('button')).toHaveCount(2);
    for (const name of ['Englisch', 'Französisch']) {
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(btn(page, 'Los geht’s')).toBeDisabled();
    await noItalian(page);
  });

  test('AT-118.4: „Meine Wörter“ zeigt kein Italienisch', async ({ page }) => {
    await seedItalian(page, ['en', 'fr', 'ja', 'it']);
    await page.goto('./');
    await btn(page, 'Meine Wörter').click();
    await expect(page.locator('[data-view="words"]')).toBeVisible();
    const names = await page
      .locator('.words__languages .choice-tile')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    expect(names).toEqual(['Englisch', 'Französisch', 'Japanisch']);
    await noItalian(page);
  });

  test('AT-118.5: Build und Precache ohne audio/it und flag_it.svg', async ({ request }) => {
    expect(existsSync('dist/audio/it')).toBe(false);
    expect(existsSync('dist/flags/flag_it.svg')).toBe(false);
    expect(readdirSync('dist/audio').sort()).toEqual(['en', 'fr', 'ja']);
    const sw = await (await request.get('sw.js')).text();
    expect(sw).toContain('audio/fr/'); // Precache-Liste steht im Service Worker
    expect(sw).not.toContain('audio/it/');
    expect(sw).not.toContain('flag_it');
    const flag = await request.get('flags/flag_it.svg');
    expect(flag.ok() && flag.headers()['content-type']?.includes('svg')).toBe(false);
  });
});
