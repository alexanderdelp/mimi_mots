import { expect, test, type Page } from '@playwright/test';

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-view="start"] img')].every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
  );
  await page.evaluate(() => document.fonts.ready);
}

test.describe('B-11 Startansicht', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await imagesLoaded(page);
  });

  test('AT-11.1: Header und drei Gruppen', async ({ page }) => {
    const header = page.locator('header.app-header');
    await expect(header.locator('img')).toHaveAttribute('src', /icons\/icon\.svg$/);
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('Mimi & Mots');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([
      'Wer begleitet dich?',
      'Welche Sprache?',
      'Wie lange?',
    ]);
    for (const name of ['Wer begleitet dich?', 'Welche Sprache?', 'Wie lange?']) {
      await expect(page.getByRole('group', { name })).toBeVisible();
    }
  });

  test('AT-11.2: Inhalte der Kacheln', async ({ page }) => {
    await expect(btn(page, 'Mimi').locator('img')).toHaveAttribute('src', /cat_sitting\.png$/);
    await expect(btn(page, 'Mots').locator('img')).toHaveAttribute('src', /pony_sitting\.png$/);
    await expect(btn(page, 'Englisch').locator('img')).toHaveAttribute('src', /flag_gb\.svg$/);
    await expect(btn(page, 'Französisch').locator('img')).toHaveAttribute('src', /flag_fr\.svg$/);
    for (const name of ['Englisch', 'Französisch']) {
      expect(await btn(page, name).innerText()).toBe(''); // nur Flagge, kein Text
    }
    // seit B-26: nur Uhr-Symbol, kein Text
    const dauer = btn(page, '5 Minuten');
    await expect(dauer.locator('svg.clock-icon')).toBeVisible();
    expect(await dauer.innerText()).toBe('');
  });

  test('AT-11.3: Erststart – nur Dauer gewählt, Play deaktiviert', async ({ page }) => {
    for (const name of ['Mimi', 'Mots', 'Englisch', 'Französisch']) {
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'false');
    }
    await expect(btn(page, '5 Minuten')).toHaveAttribute('aria-pressed', 'true');
    const play = btn(page, 'Los geht’s');
    await expect(play).toBeDisabled();
    await play.click({ force: true });
    await expect(page.locator('[data-view="start"]')).toBeVisible();
  });

  test('AT-11.4: Play erst aktiv mit vollständiger Auswahl', async ({ page }) => {
    const play = btn(page, 'Los geht’s');
    await btn(page, 'Mots').click();
    await expect(play).toBeDisabled();
    await btn(page, 'Französisch').click();
    await expect(play).toBeEnabled();
    await play.click();
    await expect(page.locator('[data-view="round"]')).toBeVisible();
  });

  test('AT-11.5: alles im Bildschirm, keine Überlappung, Mindestgrößen', async ({ page }) => {
    const vp = page.viewportSize()!;
    const boxes = await page
      .locator('header.app-header, .choice-group__title, .choice-tile, .play-button')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { name: el.className, x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
    for (const b of boxes) {
      expect(b.x, b.name).toBeGreaterThanOrEqual(0);
      expect(b.y, b.name).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w, b.name).toBeLessThanOrEqual(vp.width);
      expect(b.y + b.h, b.name).toBeLessThanOrEqual(vp.height);
    }
    // keine zwei Elemente überlappen sich
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.name} / ${b.name}`).toBe(false);
      }
    }
    const tiles = boxes.filter((b) => b.name.includes('choice-tile'));
    expect(tiles).toHaveLength(7);
    for (const t of tiles) {
      expect(t.w).toBeGreaterThanOrEqual(88);
      expect(t.h).toBeGreaterThanOrEqual(88);
      expect(t.w).toBeCloseTo(tiles[0].w, 1); // alle Kacheln gleich breit
    }
    // seit B-26: Begleiter hoch, Sprache/Dauer flach – jeweils innerhalb der Gruppe gleich
    const [mimi, mots, ...small] = tiles;
    expect(mots.h).toBeCloseTo(mimi.h, 1);
    for (const t of small) expect(t.h).toBeCloseTo(small[0].h, 1);
    const play = boxes.find((b) => b.name.includes('play-button'))!;
    expect(play.w).toBeGreaterThanOrEqual(96);
    expect(play.h).toBe(play.w);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(vp.height);
  });

  test('AT-11.6: Screenshot Erststart und vollständige Auswahl', async ({ page }) => {
    await expect(page).toHaveScreenshot('start-erststart.png');
    await btn(page, 'Mimi').click();
    await btn(page, 'Französisch').click();
    await page.waitForTimeout(250);
    await expect(page).toHaveScreenshot('start-auswahl.png');
  });
});
