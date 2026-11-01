import { readFileSync } from 'node:fs';
import { expect, test, type Page } from './fixtures';
import { hold, lowContrast, overflow, prepare, settle } from './views';

// Version · Commit (7 Hexzeichen oder „unbekannt“) · Datum TT.MM.JJJJ – unabhängig vom echten Datum
const FORMAT = /^\d+\.\d+\.\d+ · ([0-9a-f]{7}|unbekannt) · \d{2}\.\d{2}\.\d{4}$/;

async function openTab(page: Page, name: 'Sonstiges' | 'Sprachen') {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name }).click();
  await settle(page);
}

test.describe('B-98 Version im Elternbereich', () => {
  test('AT-98.1: „Sonstiges“ zeigt Version · Commit · Datum, „Sprachen“ nicht', async ({
    page,
  }) => {
    await prepare(page, {});
    await openTab(page, 'Sonstiges');
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
    const label = page.locator('.admin__version-text'); // seit B-99 in einem Kopier-Button
    await expect(label).toHaveText(FORMAT);
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(await label.textContent()).toMatch(
      new RegExp(`^${pkg.version.replace(/\./g, '\\.')} · `),
    );

    await page.getByRole('tab', { name: 'Sprachen' }).click();
    await expect(page.locator('.admin__version')).toBeHidden();
    await expect(page.getByText('Version', { exact: true })).toBeHidden();
  });

  test(
    'AT-98.3: Reiter „Sonstiges“ mit Version passt, Kontrast ok',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await openTab(page, 'Sonstiges');
      await expect(page.locator('.admin__version')).toBeVisible();
      expect(await overflow(page)).toEqual([]);
      expect(await lowContrast(page)).toEqual([]);
    },
  );
});
