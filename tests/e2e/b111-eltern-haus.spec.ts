// B-111: Haus statt Pfeil im Elternbereich – wie der Zurück-Button in „Meine Wörter“.
import { expect, test, type Page } from './fixtures';
import { adminView, btn, prepare } from './views';

async function homeButton(page: Page, view: string) {
  const button = page
    .locator(`[data-view="${view}"]`)
    .getByRole('button', { name: 'Zurück', exact: true });
  await expect(button).toBeVisible();
  const svg = button.locator('svg');
  return {
    icon: await svg.getAttribute('data-icon'),
    button: (await button.boundingBox())!,
    svg: (await svg.boundingBox())!,
  };
}

test.describe('B-111 Haus im Elternbereich', () => {
  test(
    'AT-111.1: Haus statt Pfeil, so groß wie in „Meine Wörter“',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await page.goto('./');
      await btn(page, 'Meine Wörter').click();
      const words = await homeButton(page, 'words');
      await adminView(page);
      const admin = await homeButton(page, 'admin');
      expect(admin.icon).toBe('home');
      await expect(page.locator('[data-view="admin"] svg[data-icon="back"]')).toHaveCount(0);
      expect(admin.button.width).toBeCloseTo(words.button.width, 0);
      expect(admin.button.height).toBeCloseTo(words.button.height, 0);
      expect(admin.svg.width).toBeCloseTo(words.svg.width, 0);
      expect(admin.svg.height).toBeCloseTo(words.svg.height, 0);
    },
  );

  test('AT-111.2: Tipp auf das Haus führt zur Startseite', async ({ page }) => {
    await prepare(page, {});
    await adminView(page);
    await page
      .locator('[data-view="admin"]')
      .getByRole('button', { name: 'Zurück', exact: true })
      .click();
    await expect(page.locator('[data-view="start"]')).toBeVisible();
  });
});
