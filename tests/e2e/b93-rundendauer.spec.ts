import { expect, test, type Page } from './fixtures';
import { btn, prepare, storeOnce } from './views';

const MIN = 60_000;
const round = (page: Page) => page.locator('[data-view="round"]');

/** Zeitsprung (ohne jeden 250-ms-Takt einzeln abzuarbeiten), danach ein Takt. */
async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms);
  await page.clock.runFor(300);
}

/** Gespeicherter Stand mit Dauer, Tutorials gesehen, Französisch gewählt. */
async function seed(page: Page, mode: 'speak' | 'listen', roundMin?: number) {
  await storeOnce(page, {
    settings: { companion: 'mimi', language: 'fr', mode },
    progress: { en: {}, fr: {}, ja: {}, it: {} },
    tutorialDone: true,
    listenTutorialDone: true,
    ...(roundMin === undefined ? {} : { roundMin }),
  });
}

test.describe('B-93 Rundendauer im Elternbereich', () => {
  // AT-93.1 (Einstellen, gemerkt als roundMin) seit B-100 als Schieberegler: AT-100.2/AT-100.3
  // in b100-sonstiges.spec.ts; der Reducer bleibt als Unit-Test AT-93.1 in state.test.ts.

  for (const [mode, name] of [
    ['speak', 'Sprechrunde'],
    ['listen', 'Hörrunde'],
  ] as const) {
    test(`AT-93.3: ${name} dauert 3 Minuten, wenn eingestellt`, async ({ page }) => {
      await prepare(page);
      await seed(page, mode, 3);
      await page.goto('./');
      await btn(page, 'Los geht’s').click();
      await expect(round(page)).toBeVisible();
      await advance(page, 1.5 * MIN - 300);
      // volle Scheibe = eingestellte Dauer: nach der Hälfte ist sie halb
      const fraction = Number(
        await page.locator('.round__timer svg.timer-dial').getAttribute('data-fraction'),
      );
      expect(fraction).toBeCloseTo(0.5, 2);
      await advance(page, 1.5 * MIN - 2300);
      await expect(round(page)).toHaveAttribute('data-expired', 'false');
      await advance(page, 2000);
      await expect(round(page)).toHaveAttribute('data-expired', 'true');
    });
  }

  test('AT-93.3: 10 Minuten – nach 9 Minuten läuft die Runde noch', async ({ page }) => {
    await prepare(page);
    await seed(page, 'speak', 10);
    await page.goto('./');
    await btn(page, 'Los geht’s').click();
    await advance(page, 9 * MIN);
    await expect(round(page)).toHaveAttribute('data-expired', 'false');
    await advance(page, MIN);
    await expect(round(page)).toHaveAttribute('data-expired', 'true');
  });

  // AT-93.4 (Elternbereich passt) seit B-100 ersetzt durch AT-100.5 in b100-sonstiges.spec.ts.
});
