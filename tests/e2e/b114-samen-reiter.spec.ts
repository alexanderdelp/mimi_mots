// B-114: Reiter „Samen“ im Elternbereich – freigegebene Samen, wachsender Samen, Stufe und
// Fortschritt als Schieberegler; alle Samen aus = Garten aus.
import { expect, minSize, test, type Page } from './fixtures';
import { btn, hold, overflow, prepare, roundView, settle, stored, storeOnce } from './views';

type Flower = 'sunflower' | 'peony' | 'clematis';
interface Garden {
  plants: { flower: Flower; stage: number }[];
  rounds: number;
  need: number;
}

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const slider = (page: Page, name: string) => page.getByRole('slider', { name, exact: true });
const value = (page: Page, name: string) =>
  page
    .locator('.admin__setting', { has: slider(page, name) })
    .locator('.admin__slider > :last-child');
const plant = (flower: Flower, stage: number) => ({ flower, stage });

async function prepareGarden(page: Page, garden?: Garden, enabledFlowers?: Flower[]) {
  await prepare(page);
  await storeOnce(page, {
    name: 'Lina',
    settings: { companion: 'mimi', language: 'fr', mode: 'speak' },
    progress: { en: {}, fr: {}, ja: {}, it: {} },
    enabledLanguages: ['en', 'fr', 'ja', 'it'],
    rest: { sleeping: [], since: '2026-10-30' },
    ...(enabledFlowers ? { enabledFlowers } : {}),
    ...(garden ? { garden } : {}),
  });
}

async function openSeeds(page: Page) {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name: 'Samen' }).click();
  await settle(page);
}

/** Regler per Tipp auf die Griffposition von `to` stellen (WebKit: Griff läuft in der Spur). */
async function setSlider(page: Page, name: string, to: number) {
  const range = slider(page, name);
  const [min, max] = await range.evaluate((el: HTMLInputElement) => [+el.min, +el.max]);
  const b = (await range.boundingBox())!;
  const thumb = await page
    .locator('.admin__track', { has: range })
    .evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--thumb')));
  const x = b.x + thumb / 2 + ((to - min) / (max - min)) * (b.width - thumb);
  await page.mouse.click(x, b.y + b.height / 2);
  await expect(range).toHaveValue(String(to));
}

async function completeRound(page: Page) {
  await roundView(page);
  await page.clock.fastForward(5 * 60_000 + 1000);
  await page.clock.runFor(300);
  await btn(page, 'Auf Französisch anhören').click();
  await btn(page, 'Wusste ich').click();
  await expect(view(page, 'end')).toBeVisible();
}

test.describe('B-114 Reiter „Samen“', () => {
  test('AT-114.1: dritter Reiter mit Samen, Wächst gerade, Stufe, Fortschritt', async ({
    page,
  }) => {
    await prepareGarden(page);
    await page.goto('./');
    await hold(page, '.app-header__icon');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveText(['Sprachen', 'Sonstiges', 'Samen']);
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    await expect(page.locator('.admin__other:visible .admin__title')).not.toContainText(['Samen']);
    await expect(btn(page, 'Sonnenblume')).toBeHidden();
    await page.getByRole('tab', { name: 'Samen' }).click();
    await expect(page.getByRole('tab', { name: 'Samen' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.admin__garden .admin__title')).toHaveText([
      'Samen',
      'Aktueller Samen',
      'Stufe',
      'Fortschritt',
    ]);
    await expect(btn(page, 'Sonnenblume')).toBeVisible();
  });

  test('AT-114.2: ohne Pflanze „kein Samen“, einpflanzen, tauschen, entfernen', async ({
    page,
  }) => {
    await prepareGarden(page, { plants: [], rounds: 0, need: 3 });
    await openSeeds(page);
    await expect(slider(page, 'Aktueller Samen')).toHaveValue('0');
    await expect(slider(page, 'Aktueller Samen')).toHaveAttribute('aria-valuetext', 'kein Samen');
    await expect(slider(page, 'Stufe')).toBeDisabled();
    await expect(slider(page, 'Fortschritt')).toBeDisabled();

    await setSlider(page, 'Aktueller Samen', 2); // Pfingstrose
    await expect(value(page, 'Aktueller Samen').locator('img')).toHaveAttribute(
      'src',
      /peony_seed\.webp$/,
    );
    let garden = (await stored(page)).garden as Garden;
    expect(garden.plants).toEqual([plant('peony', 1)]);
    expect(garden.rounds).toBe(0);
    await expect(slider(page, 'Stufe')).toBeEnabled();
    await expect(slider(page, 'Stufe')).toHaveValue('1');

    await setSlider(page, 'Aktueller Samen', 3); // tauschen
    garden = (await stored(page)).garden as Garden;
    expect(garden.plants.at(-1)).toEqual(plant('clematis', 1));

    await setSlider(page, 'Aktueller Samen', 0); // entfernen
    garden = (await stored(page)).garden as Garden;
    expect(garden.plants).toEqual([]);
    await expect(slider(page, 'Stufe')).toBeDisabled();
  });

  test('AT-114.3: Stufe einstellen, Bild der Stufe; Blüte → nächste Runde Samenwahl', async ({
    page,
  }) => {
    await prepareGarden(page, { plants: [plant('peony', 1)], rounds: 1, need: 4 });
    await openSeeds(page);
    await expect(slider(page, 'Aktueller Samen')).toHaveValue('2');
    await setSlider(page, 'Stufe', 3);
    await expect(value(page, 'Stufe').locator('img')).toHaveAttribute('src', /peony_plant\.webp$/);
    await expect(slider(page, 'Stufe')).toHaveAttribute('aria-valuetext', 'Pflanze');
    expect(((await stored(page)).garden as Garden).plants).toEqual([plant('peony', 3)]);

    await setSlider(page, 'Stufe', 5);
    expect(((await stored(page)).garden as Garden).plants).toEqual([plant('peony', 5)]);
    await expect(value(page, 'Stufe').locator('img')).toHaveAttribute('src', /peony_bloom\.webp$/);
    await expect(slider(page, 'Fortschritt')).toBeDisabled(); // blüht = fertig
    await expect(value(page, 'Fortschritt')).toHaveText('–');
    await btn(page, 'Zurück').click();
    await completeRound(page);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'seed')).toBeVisible();
  });

  test('AT-114.4: Fortschritt „x von y“ einstellen; auf y − 1 wächst sie nach einer Runde', async ({
    page,
  }) => {
    await prepareGarden(page, { plants: [plant('clematis', 2)], rounds: 0, need: 4 });
    await openSeeds(page);
    await expect(value(page, 'Fortschritt')).toHaveText('0 von 4');
    await setSlider(page, 'Fortschritt', 3);
    await expect(value(page, 'Fortschritt')).toHaveText('3 von 4');
    expect(((await stored(page)).garden as Garden).rounds).toBe(3);
    await btn(page, 'Zurück').click();
    await completeRound(page);
    await expect(view(page, 'end').locator('.end__plant')).toHaveAttribute(
      'src',
      /clematis_plant\.webp$/,
    );
    const garden = (await stored(page)).garden as Garden;
    expect(garden.plants).toEqual([plant('clematis', 3)]);
    expect(garden.rounds).toBe(0);
  });

  test('AT-114.5: alle Samen aus – Garten taucht nirgends auf, Regler gesperrt', async ({
    page,
  }) => {
    await prepareGarden(page, { plants: [plant('peony', 2)], rounds: 2, need: 3 }, []);
    await page.goto('./');
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mein Garten')).toHaveCount(0);
    await completeRound(page);
    await expect(view(page, 'end').locator('.end__plant')).toHaveCount(0);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible(); // keine Samenwahl
    expect(((await stored(page)).garden as Garden).rounds).toBe(2); // kein Wachstum

    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Samen' }).click();
    for (const name of ['Aktueller Samen', 'Stufe', 'Fortschritt']) {
      await expect(slider(page, name)).toBeDisabled();
    }
    await btn(page, 'Sonnenblume').click();
    await expect(slider(page, 'Aktueller Samen')).toBeEnabled();
    await btn(page, 'Zurück').click();
    await expect(btn(page, 'Mein Garten')).toBeVisible();
  });

  test(
    'AT-114.6: Reiter passt, Regler ≥ 44 px, Kacheln groß genug, eine Spalte',
    {
      tag: '@layout',
    },
    async ({ page }) => {
      await prepareGarden(page, { plants: [plant('sunflower', 3)], rounds: 2, need: 5 });
      await openSeeds(page);
      const columns = new Set<string>();
      for (const name of ['Aktueller Samen', 'Stufe', 'Fortschritt']) {
        const b = (await slider(page, name).boundingBox())!;
        expect(b.height, name).toBeGreaterThanOrEqual(44);
        const s = (await page
          .locator('.admin__setting', { has: slider(page, name) })
          .locator('.admin__slider')
          .boundingBox())!;
        columns.add(`${Math.round(s.x)}-${Math.round(s.x + s.width)}`);
      }
      const tiles = (await page.locator('.admin__seeds').boundingBox())!;
      columns.add(`${Math.round(tiles.x)}-${Math.round(tiles.x + tiles.width)}`);
      expect([...columns]).toHaveLength(1);
      for (const name of ['Sonnenblume', 'Pfingstrose', 'Stern-Clematis']) {
        const b = (await btn(page, name).boundingBox())!;
        expect(b.height, name).toBeGreaterThanOrEqual(minSize(88));
      }
      // drei Reiter überdecken den Titel nicht
      const brand = (await page.locator('.app-header__brand').boundingBox())!;
      const tabs = (await page.locator('.admin__tabs').boundingBox())!;
      expect(brand.x + brand.width).toBeLessThanOrEqual(tabs.x);
      expect(await overflow(page)).toEqual([]);
      // Bild zur Abnahme
      await page.screenshot({ path: test.info().outputPath('samen.png') });
    },
  );
});
