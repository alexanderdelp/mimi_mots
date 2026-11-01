import { expect, test } from './fixtures';
import { enableLanguages, vocabularyIds } from './helpers';
import { btn, hold, storeOnce } from './views';

// B-91: Halten über die Testuhr statt echter Wartezeit
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test.describe('B-84 Nur Wörter mit gewählter Aufnahme', () => {
  test('AT-84.3/AT-86.3: Sprache ohne Wörter fehlt und lässt sich nicht einschalten', async ({
    page,
  }) => {
    test.skip(vocabularyIds('ja').length > 0, 'Japanisch hat inzwischen Wörter');
    await enableLanguages(page, ['en', 'fr', 'ja']); // alte Daten: ja war eingeschaltet
    await page.goto('./');
    await expect(btn(page, 'Englisch')).toBeVisible();
    await expect(btn(page, 'Japanisch')).toHaveCount(0);
    await hold(page, '.app-header__icon');
    await btn(page, 'Japanisch').click();
    await expect(page.locator('.admin__empty')).toHaveText('Noch keine Wörter vorhanden');
    await expect(btn(page, 'Sprache einschalten')).toBeDisabled();
  });

  test('AT-86.1: nur eine Sprache ohne Wörter an (alte Daten) → Standard, Play erst nach Wahl', async ({
    page,
  }) => {
    test.skip(vocabularyIds('ja').length > 0, 'Japanisch hat inzwischen Wörter');
    await storeOnce(page, {
      settings: { companion: 'mimi', language: 'ja', mode: 'speak' },
      enabledLanguages: ['ja'],
    });
    await page.goto('./');
    const group = page.getByRole('group', { name: 'In welcher Sprache?' });
    await expect(group.getByRole('button')).toHaveCount(2); // Englisch, Französisch
    await expect(btn(page, 'Los geht’s')).toBeDisabled(); // keine Sprache gewählt
    await btn(page, 'Englisch').click();
    await expect(btn(page, 'Los geht’s')).toBeEnabled();
  });

  test('AT-86.4: die letzte Sprache mit Wörtern lässt sich nicht ausschalten', async ({ page }) => {
    await enableLanguages(page, ['fr']);
    await page.goto('./');
    await hold(page, '.app-header__icon');
    await btn(page, 'Französisch').click();
    await expect(btn(page, 'Sprache ausschalten')).toBeDisabled();
  });

  test('AT-84.4: Lernstand im Elternbereich zeigt nur Wörter des Wortschatzes', async ({
    page,
  }) => {
    await enableLanguages(page, ['en', 'fr', 'it']);
    await page.goto('./');
    await hold(page, '.app-header__icon');
    await btn(page, 'Italienisch').click();
    const ids = await page
      .locator('.admin__word')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.wordId));
    expect(ids.sort()).toEqual(vocabularyIds('it').sort());
  });
});
