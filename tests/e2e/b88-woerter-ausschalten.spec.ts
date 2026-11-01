import { expect, isPhone, test, type Page } from './fixtures';
import { vocabularyIds } from './helpers';
import { btn, prepare } from './views';

const KEY = 'mimi-mots:v1';
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);
const entry = { box: 3, seen: 4, lastSeenAt: '2026-10-29T10:00:00.000Z' };
const word = (page: Page, id: string) => page.locator(`.admin__word[data-word-id="${id}"]`);
const FR = vocabularyIds('fr');

/** Französisch, Hund mit Lernstand; `disabled`: ausgeschaltete Wörter, `tutorialDone` wie angegeben. */
async function seed(page: Page, disabled: string[] = [], tutorialDone = true) {
  await prepare(page);
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
        progress: { en: {}, fr: { hund: entry } },
        tutorialDone,
        disabledWords: { fr: disabled },
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

async function openAdmin(page: Page) {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await expect(page.locator('[data-view="admin"]')).toBeVisible();
}

const look = (page: Page, id: string) =>
  word(page, id).evaluate((e) => {
    const s = getComputedStyle(e);
    return { filter: s.filter, opacity: Number(s.opacity) };
  });

test.describe('B-88 Wörter ein-/ausschalten', () => {
  test('AT-88.1: Tipp auf ein Emoji schaltet das Wort aus und wieder ein', async ({ page }) => {
    await seed(page);
    await openAdmin(page);
    const hund = word(page, 'hund');
    await expect(hund).toHaveRole('button');
    await expect(hund).toHaveAccessibleName('Hund · le chien');
    await expect(hund).toHaveAttribute('aria-pressed', 'true');
    expect(await look(page, 'hund')).toEqual({ filter: 'none', opacity: 1 });
    const before = await hund.boundingBox();

    await hund.click();
    await expect(hund).toHaveAttribute('aria-pressed', 'false');
    await page.clock.runFor(300);
    const off = await look(page, 'hund');
    expect(off.filter).toContain('grayscale(1)');
    expect(off.opacity).toBeCloseTo(0.45);
    expect(await hund.boundingBox()).toEqual(before); // gleiche Stelle, gleiche Stufe
    await expect(page.locator('.admin__level[data-level="3"] .admin__word')).toHaveCount(1);
    let data = await stored(page);
    expect(data.disabledWords).toEqual({ en: [], fr: ['hund'], ja: [], it: [] });
    expect(data.progress.fr).toEqual({ hund: entry });

    await btn(page, 'Englisch').click(); // andere Sprache: Hund ist dort an
    await expect(word(page, 'hund')).toHaveAttribute('aria-pressed', 'true');
    await btn(page, 'Französisch').click();
    await word(page, 'hund').click();
    await expect(word(page, 'hund')).toHaveAttribute('aria-pressed', 'true');
    data = await stored(page);
    expect(data.disabledWords.fr).toEqual([]);
  });

  test('AT-88.2: ausgeschaltete Wörter kommen in der Runde nicht vor und werden nicht vorgeladen', async ({
    page,
  }) => {
    const on = ['hund', 'katze', 'maus', 'pferd'].filter((id) => FR.includes(id));
    await seed(
      page,
      FR.filter((id) => !on.includes(id)),
    );
    const requested: string[] = [];
    page.on('request', (r) => {
      const path = new URL(r.url()).pathname;
      if (path.includes('/audio/fr/')) requested.push(path.split('/').pop()!.replace('.mp3', ''));
    });
    await page.goto('./');
    await btn(page, 'Los geht’s').click();
    for (let i = 0; i < 10; i++) {
      const id = (await page.locator('.word-card').getAttribute('data-word-id'))!;
      expect(on).toContain(id);
      await btn(page, 'Auf Französisch anhören').click();
      await btn(page, 'Wusste ich').click();
      await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', id);
    }
    await expect.poll(() => new Set(requested).size).toBe(on.length);
    expect([...new Set(requested)].sort()).toEqual([...on].sort());
  });

  test.describe('mit Tutorial', () => {
    test.use({ tutorial: true });

    test('AT-88.2: ist Apfel aus, ist das Probewort ein eingeschaltetes Wort', async ({ page }) => {
      await seed(page, ['apfel'], false);
      await page.goto('./');
      await btn(page, 'Los geht’s').click();
      await expect(page.locator('.view--round')).toHaveAttribute('data-tutorial', '1');
      const id = await page.locator('.word-card').getAttribute('data-word-id');
      expect(id).toBe(FR.find((w) => w !== 'apfel'));
    });
  });

  test('AT-88.3: das letzte eingeschaltete Wort lässt sich nicht ausschalten', async ({ page }) => {
    const [last, ...rest] = FR;
    await seed(page, rest);
    await openAdmin(page);
    await expect(word(page, last)).toBeDisabled();
    await expect(word(page, last)).toHaveAttribute('aria-pressed', 'true');
    expect(await look(page, last)).toEqual({ filter: 'none', opacity: 1 });
    await expect(word(page, rest[0])).toBeEnabled();
    await word(page, rest[0]).click();
    await expect(word(page, last)).toBeEnabled();
  });

  test('AT-88.6: Wort-Buttons auf dem iPad ≥ 44 px, alles passt auf den Bildschirm', async ({
    page,
  }) => {
    await seed(page, FR.slice(0, 20));
    await openAdmin(page);
    const sizes = await page
      .locator('.admin__word')
      .evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]),
      );
    expect(sizes.length).toBe(FR.length);
    const min = isPhone() ? 28 : 44;
    for (const [w, h] of sizes) {
      expect(w).toBeGreaterThanOrEqual(min - 0.5);
      expect(h).toBeGreaterThanOrEqual(min - 0.5);
    }
    const fits = await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight &&
        document.documentElement.scrollWidth <= innerWidth,
    );
    expect(fits).toBe(true);
  });
});
