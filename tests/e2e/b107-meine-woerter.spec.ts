import { expect, isPhone, minSize, test, type Page } from './fixtures';
import { vocabularyIds } from './helpers';
import { btn, hold, lowContrast, overflow, prepare, stored, storeOnce } from './views';

// B-107: „Meine Wörter“ – Lernstand fürs Kind, nur ansehen.
const entry = (box: number) => ({ box, seen: 2, lastSeenAt: '2026-10-29T10:00:00.000Z' });
const FR = vocabularyIds('fr');
const row = (page: Page, box: number) => page.locator(`.words__row[data-box="${box}"]`);
const ids = (page: Page, box: number) =>
  row(page, box)
    .locator('.words__word')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.wordId));

interface Options {
  sleeping?: string[];
  progress?: object;
  listenProgress?: object;
  disabled?: string[];
}

/** Französisch, Sprechen; Englisch und Französisch an. */
async function seed(page: Page, options: Options = {}) {
  await prepare(page);
  await storeOnce(page, {
    settings: { companion: 'mimi', language: 'fr', mode: 'speak' },
    progress: options.progress ?? {
      en: { hund: entry(1) },
      fr: { hund: entry(0), katze: entry(4), maus: entry(4) },
    },
    listenProgress: options.listenProgress ?? { en: {}, fr: { hund: entry(2) } },
    enabledLanguages: ['en', 'fr'],
    disabledWords: { fr: options.disabled ?? ['maus'] },
    tutorialDone: true,
    listenTutorialDone: true,
    rest: { sleeping: options.sleeping ?? [], since: '2026-10-30' },
  });
}

async function open(page: Page, from: 'start' | 'sleep' = 'start') {
  await page.goto('./');
  await expect(page.locator(`[data-view="${from}"]`)).toBeVisible();
  await btn(page, 'Meine Wörter').click();
  await expect(page.locator('[data-view="words"]')).toBeVisible();
}

test.describe('B-107 Meine Wörter', () => {
  test('AT-107.1: Button auf Start- und Schlafseite, Haus führt zurück', async ({ page }) => {
    await seed(page);
    await open(page);
    await btn(page, 'Zurück').click();
    await expect(page.locator('[data-view="start"]')).toBeVisible();
  });

  test('AT-107.1: von der Schlafseite und zurück dorthin', async ({ page }) => {
    await seed(page, { sleeping: ['mimi', 'mots'] });
    await open(page, 'sleep');
    await btn(page, 'Zurück').click();
    await expect(page.locator('[data-view="sleep"]')).toBeVisible();
  });

  test(
    'AT-107.1: Buttons groß genug, alles passt ohne Scrollen',
    { tag: '@layout' },
    async ({ page }) => {
      await seed(page);
      await page.goto('./');
      for (const name of ['Meine Wörter']) {
        const box = (await btn(page, name).boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(minSize(88) - 0.5);
        expect(box.height).toBeGreaterThanOrEqual(minSize(88) - 0.5);
      }
      await btn(page, 'Meine Wörter').click();
      const home = (await btn(page, 'Zurück').boundingBox())!;
      expect(home.width).toBeGreaterThanOrEqual(minSize(88) - 0.5);
      expect(await overflow(page)).toEqual([]);
      expect(await lowContrast(page)).toEqual([]);
    },
  );

  test('AT-107.2: nur eingeschaltete Sprachen, beide Modi, Wahl ändert nichts', async ({
    page,
  }) => {
    await seed(page);
    await open(page);
    const flags = page.locator('.words__languages .choice-tile');
    await expect(flags).toHaveCount(2);
    await expect(btn(page, 'Englisch')).toHaveAttribute('aria-pressed', 'false');
    await expect(btn(page, 'Französisch')).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, 'Italienisch')).toHaveCount(0);
    await expect(btn(page, 'Sprechen')).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, 'Hören')).toHaveAttribute('aria-pressed', 'false');
    const before = await stored(page);

    await btn(page, 'Englisch').click();
    expect(await ids(page, 1)).toEqual(['hund']);
    await btn(page, 'Französisch').click();
    await btn(page, 'Hören').click();
    expect(await ids(page, 2)).toEqual(['hund']);
    expect(await ids(page, 0)).toEqual([]);

    expect(await stored(page)).toEqual(before);
    await btn(page, 'Zurück').click();
    await expect(btn(page, 'Sprechen')).toHaveAttribute('aria-pressed', 'true');
  });

  test('AT-107.3: genau die eingeschalteten Wörter mit Lernstand, Stufe 0 oben', async ({
    page,
  }) => {
    await seed(page);
    await open(page);
    await expect(page.locator('.words__row')).toHaveCount(5);
    const order = await page
      .locator('.words__row')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.box));
    expect(order).toEqual(['0', '1', '2', '3', '4']);
    expect(await ids(page, 0)).toEqual(['hund']);
    expect(await ids(page, 4)).toEqual(['katze']); // Maus ist ausgeschaltet
    await expect(page.locator('.words__word')).toHaveCount(2);
    await expect(page.locator('.words__word[data-word-id="hund"]')).toHaveAccessibleName('Hund');
  });

  test('AT-107.4: nichts einstellbar', async ({ page }) => {
    await seed(page);
    await open(page);
    await expect(page.locator('.words__shelf button')).toHaveCount(0);
    const before = await stored(page);
    await page.locator('.words__word[data-word-id="hund"]').click();
    await hold(page, '.app-header__icon');
    await expect(page.locator('[data-view="words"]')).toBeVisible();
    expect(await stored(page)).toEqual(before);
  });

  test('AT-107.5: keine Stufen-Texte, keine Zahlen, nur lila Punkte', async ({ page }) => {
    await seed(page);
    await open(page);
    const text = await page.locator('.words__body').innerText();
    expect(text).not.toMatch(/[\p{L}\p{N}%]/u); // nur Emoji, keine Buchstaben oder Ziffern
    const dots = await page
      .locator('.words__row')
      .evaluateAll((rows) => rows.map((r) => r.querySelectorAll('.words__dot').length));
    expect(dots).toEqual([1, 2, 3, 4, 5]);
    const colors = await page
      .locator('.words__dot')
      .evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e).backgroundColor))]);
    expect(colors).toEqual(['rgb(154, 124, 196)']); // --lila-500
  });

  test(
    'AT-107.6: alle Wörter in einer Zeile passen ohne Scrollen',
    { tag: '@layout' },
    async ({ page }) => {
      await seed(page, {
        progress: { en: {}, fr: Object.fromEntries(FR.map((id) => [id, entry(2)])) },
        disabled: [],
      });
      await open(page);
      await expect(page.locator('.words__word')).toHaveCount(FR.length);
      expect(await overflow(page)).toEqual([]);
      const shelf = await page
        .locator('.words__shelf')
        .evaluate((e) => ({ scroll: e.scrollHeight, client: e.clientHeight }));
      expect(shelf.scroll).toBeLessThanOrEqual(shelf.client + 1);
      const size = await page
        .locator('.words__word')
        .first()
        .evaluate((e) => e.getBoundingClientRect().width);
      expect(size).toBeGreaterThanOrEqual(isPhone() ? 20 : 28);
    },
  );
});
