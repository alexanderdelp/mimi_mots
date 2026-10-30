import { expect, test, type Page } from './fixtures';
import { btn, prepare } from './views';

const KEY = 'mimi-mots:v1';
const SEEN = ['apfel', 'banane', 'erdbeere', 'birne', 'kirsche', 'zitrone', 'karotte'];
const known = (page: Page) => btn(page, 'Nur bekannte');

/** Französisch mit 7 gesehenen Wörtern, Englisch mit 2. */
async function seed(page: Page) {
  const entry = { box: 1, seen: 1, lastSeenAt: '2026-10-30T08:00:00.000Z' };
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
        settings: { companion: 'mimi', language: 'en', durationMin: 3 },
        progress: {
          en: { apfel: entry, hund: entry },
          fr: Object.fromEntries(SEEN.map((id) => [id, entry])),
          ja: {},
        },
        tutorialDone: true,
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

test.describe('B-75 Nur bekannte Wörter', () => {
  test('AT-75.1/75.2: Kachel neben Play, ausgegraut unter 6 gesehenen Wörtern', async ({
    page,
  }) => {
    await prepare(page);
    await seed(page);
    await page.goto('./');
    const tile = known(page);
    await expect(tile).toBeDisabled(); // Englisch: 2 gesehen
    const [k, p] = [await tile.boundingBox(), await btn(page, 'Los geht’s').boundingBox()];
    expect(k!.height).toBeGreaterThanOrEqual(88);
    expect(k!.x + k!.width).toBeLessThan(p!.x);
    await btn(page, 'Französisch').click();
    await expect(tile).toBeEnabled();
    await tile.click();
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await tile.click();
    await expect(tile).toHaveAttribute('aria-pressed', 'false');
    await btn(page, 'Englisch').click();
    await expect(tile).toBeDisabled();
  });

  test('AT-75.3/75.4: gewählt kommen nur bekannte Wörter, danach wieder abgewählt', async ({
    page,
  }) => {
    await prepare(page);
    await seed(page);
    await page.goto('./');
    await btn(page, 'Französisch').click();
    await known(page).click();
    await btn(page, 'Los geht’s').click();
    for (let i = 0; i < 12; i++) {
      const id = (await page.locator('.word-card').getAttribute('data-word-id'))!;
      expect(SEEN, `Wort ${i + 1}`).toContain(id);
      await btn(page, 'Auf Französisch anhören').click();
      await btn(page, 'Noch üben').click();
      await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', id);
    }
    await hold(page, '.close-button');
    await btn(page, 'Zurück').click();
    await expect(known(page)).toHaveAttribute('aria-pressed', 'false');
    const stored = await page.evaluate((k) => localStorage.getItem(k)!, KEY);
    expect(stored).not.toContain('knownOnly');
    await page.reload();
    await expect(known(page)).toHaveAttribute('aria-pressed', 'false');
  });
});
