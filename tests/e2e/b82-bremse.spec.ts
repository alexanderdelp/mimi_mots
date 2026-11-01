import { expect, test, type Page } from './fixtures';
import { btn, prepare } from './views';

const KEY = 'mimi-mots:v1';
const SEEN = ['apfel', 'banane', 'erdbeere', 'birne', 'kirsche', 'zitrone', 'karotte'];
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

/** Französisch mit 7 gesehenen Wörtern auf Stufe 0 („noch üben“); Bremse wie angegeben. */
async function seed(page: Page, brakeNew?: boolean) {
  const entry = { box: 0, seen: 1, lastSeenAt: '2026-10-30T08:00:00.000Z' };
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('seeded', '1');
      }
    },
    [
      KEY,
      JSON.stringify({
        version: 1,
        settings: { companion: 'mimi', language: 'fr', mode: 'speak' },
        progress: { en: {}, fr: Object.fromEntries(SEEN.map((id) => [id, entry])) },
        tutorialDone: true,
        ...(brakeNew === undefined ? {} : { brakeNew }),
      }),
    ] as const,
  );
}

async function hold(page: Page, selector: string, ms = 700) {
  const box = (await page.locator(selector).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

/** Zwölf Wörter mit „Noch üben“ durchspielen; liefert die gezeigten ids. */
async function playWords(page: Page): Promise<string[]> {
  await btn(page, 'Los geht’s').click();
  const ids: string[] = [];
  for (let i = 0; i < 12; i++) {
    const id = (await page.locator('.word-card').getAttribute('data-word-id'))!;
    ids.push(id);
    await btn(page, 'Auf Französisch anhören').click();
    await btn(page, 'Noch üben').click();
    await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', id);
  }
  return ids;
}

const tab = (page: Page, name: string) => page.getByRole('tab', { name });

test.describe('B-82 Bremse für neue Wörter / B-83 Reiter im Elternbereich', () => {
  test('AT-82.1: keine Kachel „Nur bekannte Wörter“ auf der Startseite', async ({ page }) => {
    await prepare(page);
    await seed(page);
    await page.goto('./');
    await expect(btn(page, 'Nur bekannte Wörter')).toHaveCount(0);
  });

  test('AT-83.1/AT-82.2/AT-86.2: Reiter „Sprachen“ und „Sonstiges“, Bremse schaltbar und gemerkt', async ({
    page,
  }) => {
    await prepare(page);
    await seed(page);
    await page.goto('./');
    await hold(page, '.app-header__icon');
    await expect(tab(page, 'Sprachen')).toHaveAttribute('aria-selected', 'true');
    await expect(btn(page, 'Lernstand zurücksetzen')).toBeVisible();
    await expect(btn(page, 'Tiere aufwecken')).toBeHidden();

    await tab(page, 'Sonstiges').click();
    await expect(tab(page, 'Sonstiges')).toHaveAttribute('aria-selected', 'true');
    await expect(btn(page, 'Lernstand zurücksetzen')).toBeHidden();
    await expect(btn(page, 'Tiere aufwecken')).toBeVisible();
    await expect(btn(page, 'Sprechen zurücksetzen')).toBeVisible();
    await expect(btn(page, 'Hören zurücksetzen')).toBeVisible(); // B-89: je Modus
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
  });

  test('AT-82.3: Bremse an – bei 6+ Wörtern auf „noch üben“ kommen keine neuen', async ({
    page,
  }) => {
    await prepare(page);
    await seed(page);
    await page.goto('./');
    const ids = await playWords(page);
    for (const id of ids) expect(SEEN).toContain(id);
  });

  test('AT-82.3: Bremse aus – neue Wörter kommen wie bisher', async ({ page }) => {
    await prepare(page);
    await seed(page, false);
    await page.goto('./');
    const ids = await playWords(page);
    expect(ids.some((id) => !SEEN.includes(id))).toBe(true);
  });
});
