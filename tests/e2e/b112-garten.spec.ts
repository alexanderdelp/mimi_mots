// B-112: Garten des Kindes – Samenwahl nach einer abgeschlossenen Lernreise, Wachstum alle 3–6
// abgeschlossenen Runden, Garten-Button neben dem Buch.
import { expect, isPhone, test, type Page } from './fixtures';
import { btn, hold, prepare, roundView, stored, storeOnce } from './views';

type Flower = 'sunflower' | 'peony' | 'clematis';
interface Garden {
  plants: { flower: Flower; stage: number }[];
  rounds: number;
  need: number;
}

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);

/** Stand mit Garten (und optional nur einigen Samen freigegeben). */
async function prepareGarden(
  page: Page,
  garden?: Garden,
  extra: { enabledFlowers?: Flower[]; sleeping?: string[] } = {},
) {
  await prepare(page);
  await storeOnce(page, {
    name: 'Lina',
    settings: { companion: 'mimi', language: 'fr', mode: 'speak' },
    progress: { en: {}, fr: {}, ja: {}, it: {} },
    enabledLanguages: ['en', 'fr', 'ja', 'it'],
    rest: { sleeping: extra.sleeping ?? [], since: '2026-10-30' },
    ...(extra.enabledFlowers ? { enabledFlowers: extra.enabledFlowers } : {}),
    ...(garden ? { garden } : {}),
  });
}

/** Lernreise bis zum Zeitablauf, dann die letzte Bewertung → Abschluss (abgeschlossen). */
async function completeRound(page: Page) {
  await roundView(page);
  await page.clock.fastForward(5 * 60_000 + 1000);
  await page.clock.runFor(300);
  await btn(page, 'Auf Französisch anhören').click();
  await btn(page, 'Wusste ich').click();
  await expect(view(page, 'end')).toBeVisible();
}

/** Lernreise per [×] abbrechen → Abschluss. */
async function abortRound(page: Page) {
  await roundView(page);
  await hold(page, '.close-button');
  await expect(view(page, 'end')).toBeVisible();
}

const plant = (flower: Flower, stage: number) => ({ flower, stage });

/** Nichts ragt über den Bildschirm hinaus, die Seite scrollt nicht. */
async function fitsScreen(page: Page, selector: string) {
  const vp = page.viewportSize()!;
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const boxes = await page
    .locator(selector)
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  expect(boxes.length).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(b.top).toBeGreaterThanOrEqual(-0.5);
    expect(b.left).toBeGreaterThanOrEqual(-0.5);
    expect(b.bottom).toBeLessThanOrEqual(vp.height + 0.5);
    expect(b.right).toBeLessThanOrEqual(vp.width + 0.5);
  }
}

test.describe('B-112 Garten', () => {
  test('AT-112.1: ohne Samen nach abgeschlossener Runde Samen wählen und einpflanzen', async ({
    page,
  }) => {
    await prepareGarden(page, undefined, { enabledFlowers: ['sunflower', 'clematis'] });
    await completeRound(page);
    await expect(view(page, 'end').locator('.end__plant')).toHaveCount(0);
    await btn(page, 'Zurück').click();

    const seed = view(page, 'seed');
    await expect(seed).toBeVisible();
    await expect(seed).toHaveAttribute('data-planted', 'false');
    await expect(btn(page, 'Zurück')).toHaveCount(0); // erst einpflanzen
    const tiles = seed.locator('.seed__tile');
    await expect(tiles).toHaveCount(2); // Pfingstrose ist ausgeschaltet
    await expect(btn(page, 'Pfingstrose')).toHaveCount(0);
    const sizes = await tiles.evaluateAll((els) =>
      els.map((e) => ({
        w: e.getBoundingClientRect().width,
        h: e.getBoundingClientRect().height,
        text: e.textContent,
      })),
    );
    for (const s of sizes) {
      expect(s.w).toBeCloseTo(sizes[0].w, 0);
      expect(s.h).toBeCloseTo(sizes[0].h, 0);
      expect(Math.min(s.w, s.h)).toBeGreaterThanOrEqual(88);
      expect(s.text).toBe('');
    }

    await btn(page, 'Stern-Clematis').click();
    await expect(seed).toHaveAttribute('data-planted', 'true');
    const planted = seed.locator('.seed__planted');
    await expect(planted).toHaveAttribute('src', /clematis_planted\.webp$/);
    await expect
      .poll(() => planted.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    expect((await stored(page)).garden.plants).toEqual([plant('clematis', 1)]);

    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mein Garten')).toBeVisible();
  });

  test('AT-112.2: Abbruch per [×] – keine Samenwahl, kein Wachstum', async ({ page }) => {
    await prepareGarden(page);
    await abortRound(page);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mein Garten')).toHaveCount(0);
    expect((await stored(page)).garden.plants).toEqual([]);
  });

  test('AT-112.2: Abbruch zählt nicht fürs Wachstum', async ({ page }) => {
    await prepareGarden(page, { plants: [plant('peony', 1)], rounds: 2, need: 3 });
    await abortRound(page);
    await expect(view(page, 'end').locator('.end__plant')).toHaveCount(0);
    expect((await stored(page)).garden).toEqual({
      plants: [plant('peony', 1)],
      rounds: 2,
      need: 3,
    });
  });

  test('AT-112.3: Garten-Button rechts neben dem Buch, Garten zeigt die Pflanzen', async ({
    page,
  }) => {
    await prepareGarden(page, {
      plants: [plant('sunflower', 5), plant('peony', 3)],
      rounds: 0,
      need: 4,
    });
    await page.goto('./');
    await expect(view(page, 'start')).toBeVisible();
    const book = (await btn(page, 'Meine Wörter').boundingBox())!;
    const flower = (await btn(page, 'Mein Garten').boundingBox())!;
    expect(flower.x).toBeGreaterThan(book.x + book.width);
    expect(Math.abs(flower.y - book.y)).toBeLessThan(1);
    expect(flower.width).toBeCloseTo(book.width, 0);
    await expect(btn(page, 'Mein Garten').locator('svg')).toHaveAttribute('data-icon', 'flower');

    await btn(page, 'Mein Garten').click();
    const garden = view(page, 'garden');
    await expect(garden).toBeVisible();
    const plants = garden.locator('.garden__plant');
    await expect(plants).toHaveCount(2);
    await expect(plants.nth(0)).toHaveAttribute('src', /sunflower_bloom\.webp$/);
    await expect(plants.nth(1)).toHaveAttribute('src', /peony_plant\.webp$/);
    // keine Texte und Zahlen außer Titel und Name in der Kopfleiste
    expect((await garden.locator('.garden__body').innerText()).trim()).toBe('');

    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
  });

  test('AT-112.3: auch auf der Schlafseite', async ({ page }) => {
    await prepareGarden(
      page,
      { plants: [plant('clematis', 2)], rounds: 0, need: 4 },
      { sleeping: ['mimi', 'mots'] },
    );
    await page.goto('./');
    await expect(view(page, 'sleep')).toBeVisible();
    await btn(page, 'Mein Garten').click();
    await expect(view(page, 'garden')).toBeVisible();
    await btn(page, 'Zurück').click();
    await expect(view(page, 'sleep')).toBeVisible();
  });

  test('AT-112.4: nach `need` abgeschlossenen Runden wächst die Pflanze, der Abschluss zeigt sie', async ({
    page,
  }) => {
    await prepareGarden(page, { plants: [plant('peony', 1)], rounds: 2, need: 3 });
    await completeRound(page);
    const grown = view(page, 'end').locator('.end__plant');
    await expect(grown).toHaveAttribute('src', /peony_sprout\.webp$/);
    const garden = (await stored(page)).garden;
    expect(garden.plants).toEqual([plant('peony', 2)]);
    expect(garden.rounds).toBe(0);
    expect(garden.need).toBeGreaterThanOrEqual(3);
    expect(garden.need).toBeLessThanOrEqual(6);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
  });

  test('AT-112.4: ohne Wachstum keine Blume auf dem Abschluss', async ({ page }) => {
    await prepareGarden(page, { plants: [plant('peony', 1)], rounds: 0, need: 3 });
    await completeRound(page);
    await expect(view(page, 'end').locator('.end__plant')).toHaveCount(0);
    expect((await stored(page)).garden.rounds).toBe(1);
  });

  test('AT-112.5: blüht die letzte Blume, kommt nach der nächsten Runde ein neuer Samen', async ({
    page,
  }) => {
    await prepareGarden(page, { plants: [plant('sunflower', 5)], rounds: 0, need: 4 });
    await completeRound(page);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'seed')).toBeVisible();
    await btn(page, 'Pfingstrose').click();
    await btn(page, 'Zurück').click();
    await btn(page, 'Mein Garten').click();
    const plants = view(page, 'garden').locator('.garden__plant');
    await expect(plants).toHaveCount(2);
    await expect(plants.nth(0)).toHaveAttribute('src', /sunflower_bloom\.webp$/);
    await expect(plants.nth(1)).toHaveAttribute('src', /peony_planted\.webp$/);
  });

  test('AT-112.6: Samenwahl passt auf den Bildschirm', { tag: '@layout' }, async ({ page }) => {
    await prepareGarden(page);
    await completeRound(page);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'seed')).toBeVisible();
    await fitsScreen(
      page,
      '[data-view="seed"] .seed__tile, [data-view="seed"] .avatar, .seed__text',
    );
    const min = isPhone() ? 44 : 88;
    const tile = (await page.locator('.seed__tile').first().boundingBox())!;
    expect(Math.min(tile.width, tile.height)).toBeGreaterThanOrEqual(min);
    await btn(page, 'Sonnenblume').click();
    await fitsScreen(
      page,
      '.seed__planted, [data-view="seed"] .home-button, [data-view="seed"] .avatar',
    );
  });

  test('AT-112.6: Abschluss mit Blume passt', { tag: '@layout' }, async ({ page }) => {
    await prepareGarden(page, { plants: [plant('clematis', 4)], rounds: 3, need: 4 });
    await completeRound(page);
    await expect(page.locator('.end__plant')).toBeVisible();
    await fitsScreen(
      page,
      '.end__plant, [data-view="end"] .avatar, .end__text, [data-view="end"] .home-button',
    );
  });

  test('AT-112.6: Garten mit vielen Pflanzen passt', { tag: '@layout' }, async ({ page }) => {
    const flowers: Flower[] = ['sunflower', 'peony', 'clematis'];
    const plants = Array.from({ length: 24 }, (_, i) => plant(flowers[i % 3], 1 + (i % 5)));
    await prepareGarden(page, { plants, rounds: 0, need: 3 });
    await page.goto('./');
    await btn(page, 'Mein Garten').click();
    await expect(view(page, 'garden').locator('.garden__plant')).toHaveCount(24);
    await page.waitForTimeout(100);
    await fitsScreen(page, '.garden__plant, [data-view="garden"] .home-button');
    const bed = page.locator('.garden__bed');
    const over = await bed.evaluate((b) => [
      b.scrollHeight - b.clientHeight,
      b.scrollWidth - b.clientWidth,
    ]);
    expect(over[0]).toBeLessThanOrEqual(1);
    expect(over[1]).toBeLessThanOrEqual(1);
  });
});
