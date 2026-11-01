import { expect, test } from './fixtures';
import { VIEWS, lowContrast, overflow, prepare, settle } from './views';

test.describe('B-60 Layout-Prüfung', () => {
  for (const view of VIEWS) {
    test(
      `AT-60.1/60.2: ${view.name} passt und ist kontrastreich genug`,
      { tag: '@layout' },
      async ({ page }) => {
        await prepare(page, view.seed);
        await view.open(page);
        await settle(page);
        expect(await overflow(page)).toEqual([]);
        expect(await lowContrast(page)).toEqual([]);
      },
    );
  }

  // B-91: alle Screenshots an einer Stelle – je Ansicht ein Bild (früher auch in B-11, B-43,
  // B-65, B-69). Nach UI-Änderungen: npx playwright test b60 --update-snapshots
  for (const name of [
    'begruessung-name',
    'begruessung',
    'start-erststart',
    'start-schlafend',
    'runde-verdeckt',
    'runde-fr',
    'hoerrunde-aufgedeckt',
    'abschluss',
    'schlafseite',
    'elternbereich',
    'elternbereich-sonstiges',
  ]) {
    test(`AT-60.3: Screenshot ${name}`, { tag: '@layout' }, async ({ page }) => {
      const view = VIEWS.find((v) => v.name === name)!;
      await prepare(page, view.seed);
      await view.open(page);
      await settle(page);
      // die Uhr läuft (eigene Tests in B-41) – im Bild ausgeblendet; seit B-99 steht sie beim
      // Begleiter, rechts in der Kopfleiste steht der Name (der bleibt sichtbar)
      // B-100: im Reiter „Sonstiges“ auch den Versionstext (Commit und Build-Datum ändern sich);
      // unsichtbar statt maskiert – die Maske wäre so breit wie der Text und änderte das Bild
      await page.addStyleTag({ content: '.admin__version-text { visibility: hidden; }' });
      await expect(page).toHaveScreenshot(`${name}.png`, {
        mask: [page.locator('.round__timer')],
      });
    });
  }

  for (const [width, height] of [
    [768, 1024],
    [820, 1180],
    [1024, 1366],
    [393, 852], // iPhone hochkant (B-76)
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
