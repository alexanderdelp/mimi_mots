import { expect, test, type Page } from './fixtures';
import { btn, hold, prepare, stored, storeOnce } from './views';

const SEEN = ['apfel', 'banane', 'erdbeere', 'birne', 'kirsche', 'zitrone', 'karotte'];

/** Französisch mit 7 gesehenen Wörtern auf Stufe 0 („noch üben“); Bremse wie angegeben. */
async function seed(page: Page, brakeNew?: boolean) {
  const entry = { box: 0, seen: 1, lastSeenAt: '2026-10-30T08:00:00.000Z' };
  await storeOnce(page, {
    settings: { companion: 'mimi', language: 'fr', mode: 'speak' },
    progress: { en: {}, fr: Object.fromEntries(SEEN.map((id) => [id, entry])) },
    tutorialDone: true,
    ...(brakeNew === undefined ? {} : { brakeNew }),
  });
}

const tab = (page: Page, name: string) => page.getByRole('tab', { name });

test.describe('B-82 Bremse für neue Wörter / B-83 Reiter im Elternbereich', () => {
  test('AT-82.1: keine Kachel „Nur bekannte Wörter“ auf der Startseite', async ({ page }) => {
    await prepare(page);
    await seed(page);
    await page.goto('./');
    await expect(btn(page, 'Nur bekannte Wörter')).toHaveCount(0);
  });

  test(
    'AT-83.1/AT-82.2/AT-86.2: Reiter „Sprachen“ und „Sonstiges“, Bremse schaltbar und gemerkt',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page);
      await seed(page);
      await page.goto('./');
      await hold(page, '.app-header__icon');
      await expect(tab(page, 'Sprachen')).toHaveAttribute('aria-selected', 'true');
      await expect(btn(page, 'Lernstand zurücksetzen')).toBeVisible();
      await expect(btn(page, 'Mimi')).toBeHidden(); // B-94: Tiere einzeln

      await tab(page, 'Sonstiges').click();
      await expect(tab(page, 'Sonstiges')).toHaveAttribute('aria-selected', 'true');
      await expect(btn(page, 'Lernstand zurücksetzen')).toBeHidden();
      await expect(btn(page, 'Mimi')).toBeVisible();
      await expect(btn(page, 'Mots')).toBeVisible();
      await expect(btn(page, 'Tutorial sprechen')).toBeVisible();
      await expect(btn(page, 'Tutorial hören')).toBeVisible(); // B-89: je Modus
      // B-86: Auswahlkachel „Bremsen“ wie bei den Begleitern – an = lila gerahmt
      const brake = btn(page, 'Bremsen');
      await expect(brake).toHaveAttribute('aria-pressed', 'true'); // Standard: an
      await expect(brake).toHaveClass(/choice-tile/);
      const width = (await brake.boundingBox())!.width;
      await brake.click();
      await expect(brake).toHaveAttribute('aria-pressed', 'false');
      expect((await brake.boundingBox())!.width).toBe(width); // nichts springt
      expect((await stored(page)).brakeNew).toBe(false);
      await page.reload();
      await hold(page, '.app-header__icon');
      await tab(page, 'Sonstiges').click();
      await expect(btn(page, 'Bremsen')).toHaveAttribute('aria-pressed', 'false');
    },
  );

  // AT-82.3 (Bremse in der Runde) prüft seit 2026-11-08 ein Unit-Test in tests/round.test.ts –
  // zwölf Wörter durch die Oberfläche waren wegen Audio in WebKit unter Windows unzuverlässig.
});
