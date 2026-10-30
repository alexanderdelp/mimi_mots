import { expect, test } from './fixtures';
import { VIEWS, lowContrast, overflow, prepare, settle } from './views';

test.describe('B-60 Layout-Prüfung', () => {
  for (const view of VIEWS) {
    test(`AT-60.1/60.2: ${view.name} passt und ist kontrastreich genug`, async ({ page }) => {
      await prepare(page, view.seed);
      await view.open(page);
      await settle(page);
      expect(await overflow(page)).toEqual([]);
      expect(await lowContrast(page)).toEqual([]);
    });
  }

  for (const name of ['runde-verdeckt', 'runde-fr']) {
    test(`AT-60.3: Screenshot ${name}`, async ({ page }) => {
      const view = VIEWS.find((v) => v.name === name)!;
      await prepare(page, view.seed);
      await view.open(page);
      await settle(page);
      // die Uhr läuft (eigene Tests in B-41) – im Bild ausgeblendet
      await expect(page).toHaveScreenshot(`${name}.png`, {
        mask: [page.locator('.app-header__slot--end')],
      });
    });
  }

  for (const [width, height] of [
    [768, 1024],
    [820, 1180],
    [1024, 1366],
  ]) {
    test(`AT-60.1/60.3: Hochformat-Hinweis ${width} × ${height}`, async ({ page }) => {
      await prepare(page, {});
      await page.setViewportSize({ width, height });
      await page.goto('./');
      await expect(page.locator('.portrait-overlay')).toBeVisible();
      await settle(page);
      // die Startseite darunter ist für Querformat gebaut und verdeckt – nur der Hinweis zählt
      expect(await overflow(page, '.portrait-overlay')).toEqual([]);
      expect(await lowContrast(page, '.portrait-overlay')).toEqual([]);
      await expect(page).toHaveScreenshot(`hochformat-${width}x${height}.png`);
    });
  }

  test('Selbsttest: die Prüfungen erkennen Überlauf und schwachen Kontrast', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await page.evaluate(() => {
      const weak = document.createElement('p');
      weak.textContent = 'blass';
      weak.style.cssText = 'color:#bbb;background:#fff;font-size:16px';
      const wide = document.createElement('div');
      wide.textContent = 'zu breit';
      wide.style.cssText = 'position:absolute;left:0;top:0;width:200vw;color:#000;background:#fff';
      document.body.append(weak, wide);
    });
    expect(await lowContrast(page)).toContainEqual(expect.stringMatching(/^blass/));
    expect(await overflow(page)).toContainEqual('DIV.null');
  });
});
