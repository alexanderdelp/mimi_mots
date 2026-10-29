import { expect, test, type Page } from '@playwright/test';

const KEY = 'mimi-mots:v1';
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const known = (page: Page) => page.getByRole('button', { name: /Wusste ich/ });
const practice = (page: Page) => page.getByRole('button', { name: /Noch üben/ });
const wordId = (page: Page) => page.locator('.word-card').getAttribute('data-word-id');
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);

test.beforeEach(async ({ page }) => {
  // stumme Sprachausgabe, damit die Tests nichts abspielen
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { cancel() {}, speak() {}, getVoices: () => [] },
    });
  });
});

async function startRound(page: Page, language: 'Englisch' | 'Französisch' = 'Englisch') {
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, language).click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
}

const flag = (page: Page) => page.getByRole('button', { name: /^Auf / });

test.describe('B-23 Selbsteinschätzung', () => {
  test('AT-23.1: Buttons erst nach dem Aufdecken', async ({ page }) => {
    await startRound(page);
    await expect(known(page)).toBeHidden();
    await expect(practice(page)).toBeHidden();
    await flag(page).click();
    await expect(known(page)).toBeVisible();
    await expect(practice(page)).toBeVisible();
    await expect(known(page).locator('svg')).toHaveAttribute('data-icon', 'thumbsUp');
    await expect(practice(page).locator('svg')).toHaveAttribute('data-icon', 'repeat');
  });

  test('AT-23.2: gleich groß, gleich gestaltet, nur Token-Farben', async ({ page }) => {
    await startRound(page);
    await flag(page).click();
    const style = (l: ReturnType<typeof known>) =>
      l.evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          w: r.width,
          h: r.height,
          bg: s.backgroundColor,
          color: s.color,
          shadow: s.boxShadow,
          font: s.fontSize + s.fontWeight,
        };
      });
    const a = await style(known(page));
    const b = await style(practice(page));
    expect(a).toEqual(b);
    expect(a.h).toBeGreaterThanOrEqual(88);
    const tokens = [
      'rgb(59, 42, 99)',
      'rgb(106, 76, 156)',
      'rgb(154, 124, 196)',
      'rgb(220, 205, 238)',
      'rgb(237, 228, 244)',
      'rgb(255, 255, 255)',
      'rgba(59, 42, 99, 0.12)',
    ];
    for (const c of [a.bg, a.color, ...(a.shadow.match(/rgba?\([^)]+\)/g) ?? [])]) {
      expect(tokens, c).toContain(c);
    }
  });

  for (const [name, button, box] of [
    ['Wusste ich', known, 1],
    ['Noch üben', practice, 0],
  ] as const) {
    test(`AT-23.${box ? 3 : 4}: „${name}“ → nächstes Wort, Box ${box}`, async ({ page }) => {
      await startRound(page);
      const first = await wordId(page);
      await flag(page).click();
      await button(page).click();
      await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', first!);
      await expect(known(page)).toBeHidden();
      await expect(page.locator('.round__foreign')).toHaveText('');
      const data = await stored(page);
      expect(data.progress.en[first!]).toMatchObject({ box, seen: 1 });
    });
  }

  test('AT-23.5: kein Feedback, nächstes Wort sofort', async ({ page }) => {
    await startRound(page);
    await flag(page).click();
    const textBefore = (await page.locator('[data-view="round"]').innerText()).length;
    const childCount = await page.locator('[data-view="round"] *').count();
    const t0 = Date.now();
    await known(page).click();
    await expect(page.locator('.word-card__de')).not.toHaveText('');
    expect(Date.now() - t0).toBeLessThan(1000); // inkl. Testoverhead; App selbst ≤ 200 ms
    const elapsed = await page.evaluate(() => {
      const a = document.querySelector('.word-card')!.getAnimations();
      return a.map((x) => (x.effect?.getComputedTiming().duration as number) ?? 0);
    });
    for (const d of elapsed) expect(d).toBeLessThanOrEqual(200);
    // keine neuen Elemente (Lob, Häkchen, Sterne …)
    expect(await page.locator('[data-view="round"] *').count()).toBe(childCount);
    const textAfter = (await page.locator('[data-view="round"]').innerText()).length;
    expect(textAfter).toBeLessThanOrEqual(textBefore + 20);
    await expect(page.locator('[data-view="round"]')).not.toContainText(
      /super|toll|richtig|falsch|prima|gut gemacht|punkt|stern/i,
    );
  });

  test('AT-23.6: 12 Wörter am Stück', async ({ page }) => {
    await startRound(page);
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      seen.push((await wordId(page))!);
      await flag(page).click();
      await (i % 3 ? known(page) : practice(page)).click();
    }
    for (let i = 0; i < seen.length; i++) {
      expect(seen.slice(Math.max(0, i - 3), i), `Position ${i}`).not.toContain(seen[i]);
    }
    const progress = (await stored(page)).progress.en;
    for (const id of seen) expect(progress[id], id).toBeDefined();
  });

  test('AT-23.7: Lernstand pro Sprache', async ({ page }) => {
    await startRound(page, 'Französisch');
    for (let i = 0; i < 3; i++) {
      await flag(page).click();
      await known(page).click();
    }
    const data = await stored(page);
    expect(Object.keys(data.progress.fr)).toHaveLength(3);
    expect(data.progress.en).toEqual({});
  });

  test('AT-23.8: Buttons verschieben nichts, alles im Bildschirm', async ({ page }) => {
    await startRound(page);
    const boxes = () =>
      page
        .locator('.close-button, .word-card, .speak-button, .round__foreign, .round__rating')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    const before = await boxes();
    await flag(page).click();
    await expect(known(page)).toBeVisible();
    expect(await boxes()).toEqual(before);
    const vp = page.viewportSize()!;
    for (const l of [known(page), practice(page)]) {
      const b = (await l.boundingBox())!;
      expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
    }
  });
});
