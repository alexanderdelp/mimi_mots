import { expect, minSize, test, type Page } from './fixtures';
import { btn, hold, overflow, prepare, stored, storeOnce } from './views';

const MIN = 60_000;
const round = (page: Page) => page.locator('[data-view="round"]');
const minutes = (page: Page) => page.locator('.admin__minutes');

async function openOther(page: Page) {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name: 'Sonstiges' }).click();
}

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
  test('AT-93.1: „−“ und „+“ stellen 3 bis 10 Minuten ein, gemerkt als roundMin', async ({
    page,
  }) => {
    await prepare(page, {});
    await openOther(page);
    await expect(page.getByText('Rundendauer', { exact: true })).toBeVisible();
    await expect(minutes(page)).toHaveText('5 Min.');
    const shorter = btn(page, 'Kürzer');
    const longer = btn(page, 'Länger');
    const width = (await minutes(page).boundingBox())!.width;

    await shorter.click();
    await shorter.click();
    await expect(minutes(page)).toHaveText('3 Min.');
    await expect(shorter).toBeDisabled();
    await expect(longer).toBeEnabled();
    expect((await stored(page)).roundMin).toBe(3);

    for (let i = 0; i < 7; i++) await longer.click();
    await expect(minutes(page)).toHaveText('10 Min.');
    await expect(longer).toBeDisabled();
    await expect(shorter).toBeEnabled();
    // Anzeige gleich breit, egal ob ein- oder zweistellig
    expect((await minutes(page).boundingBox())!.width).toBeCloseTo(width, 0);
    expect((await stored(page)).roundMin).toBe(10);

    await page.reload();
    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    await expect(minutes(page)).toHaveText('10 Min.');
  });

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

  test(
    'AT-93.4: Reiter „Sonstiges“ passt, „−“ und „+“ groß genug',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await openOther(page);
      for (const name of ['Kürzer', 'Länger']) {
        const box = (await btn(page, name).boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(minSize(88));
        expect(box.height).toBeGreaterThanOrEqual(minSize(88));
      }
      expect(await overflow(page)).toEqual([]);
    },
  );
});
