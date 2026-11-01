import { expect, test, type Page } from './fixtures';
import { btn, hold, prepare, stored } from './views';

async function openAdmin(page: Page) {
  await hold(page, '.app-header__icon');
  await expect(page.locator('[data-view="admin"]')).toBeVisible();
}

// B-81: ausgeschaltete Sprachen fehlen auf der Startseite ganz (vorher ausgegraut). Italienisch
// statt Japanisch, weil eine Sprache nur mit gewählten Aufnahmen spielbar ist (B-84).
const gone = (page: Page, name: string) => expect(btn(page, name)).toHaveCount(0);

test.describe('B-73/B-81 Sprachen ein-/ausschalten', () => {
  test('AT-73.1/AT-81.1: Erststart – nur Englisch und Französisch, die anderen fehlen', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await expect(btn(page, 'Englisch')).toBeEnabled();
    await expect(btn(page, 'Französisch')).toBeEnabled();
    await gone(page, 'Japanisch');
    await gone(page, 'Italienisch');
    const group = page.getByRole('group', { name: 'In welcher Sprache?' });
    await expect(group.getByRole('button')).toHaveCount(2);
  });

  test('AT-73.2/73.3/AT-81.2: im Elternbereich ein- und ausschalten, letzte bleibt an', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await openAdmin(page);
    await btn(page, 'Italienisch').click();
    const width = async () => (await page.locator('.admin__toggle').boundingBox())!.width;
    const offWidth = await width();
    await btn(page, 'Sprache einschalten').click();
    await expect(btn(page, 'Sprache ausschalten')).toBeEnabled();
    expect(await width()).toBe(offWidth); // gleiche Breite, nichts springt
    await btn(page, 'Englisch').click();
    await btn(page, 'Sprache ausschalten').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Sprache ausschalten').click();
    await btn(page, 'Italienisch').click();
    await expect(btn(page, 'Sprache ausschalten')).toBeDisabled(); // die letzte aktive
    expect((await stored(page)).enabledLanguages).toEqual(['it']);

    await btn(page, 'Zurück').click();
    await gone(page, 'Englisch');
    await gone(page, 'Französisch');
    await expect(btn(page, 'Italienisch')).toBeEnabled();
    // AT-73.4: nur noch eine aktiv → vorausgewählt
    await expect(btn(page, 'Italienisch')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(btn(page, 'Italienisch')).toHaveAttribute('aria-pressed', 'true');
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
    await btn(page, 'Italienisch').click();
    await btn(page, 'Sprache einschalten').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Sprache ausschalten').click();
    await btn(page, 'Zurück').click();
    for (const name of ['Englisch', 'Italienisch']) {
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'false');
    }
    await gone(page, 'Französisch');
    await expect(btn(page, 'Los geht’s')).toBeDisabled();
  });
});
