import { expect, test, type Page } from './fixtures';
import { btn, prepare } from './views';

const KEY = 'mimi-mots:v1';
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

async function hold(page: Page, selector: string, ms = 700) {
  const box = (await page.locator(selector).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

async function openAdmin(page: Page) {
  await hold(page, '.app-header__icon');
  await expect(page.locator('[data-view="admin"]')).toBeVisible();
}

test.describe('B-73 Sprachen ein-/ausschalten', () => {
  test('AT-73.1: Erststart – Englisch und Französisch wählbar, Japanisch ausgegraut', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await expect(btn(page, 'Englisch')).toBeEnabled();
    await expect(btn(page, 'Französisch')).toBeEnabled();
    await expect(btn(page, 'Japanisch')).toBeDisabled();
  });

  test('AT-73.2/73.3: im Elternbereich ein- und ausschalten, letzte bleibt an', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await openAdmin(page);
    await btn(page, 'Japanisch').click();
    const width = async () => (await page.locator('.admin__toggle').boundingBox())!.width;
    const offWidth = await width();
    await btn(page, 'Sprache einschalten').click();
    await expect(btn(page, 'Sprache ausschalten')).toBeEnabled();
    expect(await width()).toBe(offWidth); // gleiche Breite, nichts springt
    await btn(page, 'Englisch').click();
    await btn(page, 'Sprache ausschalten').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Sprache ausschalten').click();
    await btn(page, 'Japanisch').click();
    await expect(btn(page, 'Sprache ausschalten')).toBeDisabled(); // die letzte aktive
    expect((await stored(page)).enabledLanguages).toEqual(['ja']);

    await btn(page, 'Zurück').click();
    await expect(btn(page, 'Englisch')).toBeDisabled();
    await expect(btn(page, 'Französisch')).toBeDisabled();
    await expect(btn(page, 'Japanisch')).toBeEnabled();
    // AT-73.4: nur noch eine aktiv → vorausgewählt
    await expect(btn(page, 'Japanisch')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(btn(page, 'Japanisch')).toHaveAttribute('aria-pressed', 'true');
  });

  test('AT-73.4: gewählte Sprache ausgeschaltet → keine Sprache gewählt, Play aus', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Französisch').click();
    await expect(btn(page, 'Los geht’s')).toBeEnabled();
    await openAdmin(page);
    await btn(page, 'Japanisch').click();
    await btn(page, 'Sprache einschalten').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Sprache ausschalten').click();
    await btn(page, 'Zurück').click();
    for (const name of ['Englisch', 'Japanisch']) {
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(btn(page, 'Französisch')).toBeDisabled();
    await expect(btn(page, 'Los geht’s')).toBeDisabled();
  });
});
