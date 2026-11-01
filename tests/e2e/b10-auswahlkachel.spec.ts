import { expect, test, type Locator, type Page } from './fixtures';

const TOKEN_COLORS = {
  'lila-900': 'rgb(59, 42, 99)',
  'lila-700': 'rgb(106, 76, 156)',
  'lila-500': 'rgb(154, 124, 196)',
  'lila-200': 'rgb(220, 205, 238)',
  'lila-100': 'rgb(237, 228, 244)',
  'lila-50': 'rgb(248, 244, 251)',
  white: 'rgb(255, 255, 255)',
  'grau-700': 'rgb(74, 68, 88)',
};
const SHADOW_COLOR = 'rgba(59, 42, 99, 0.12)';

const tiles = (page: Page) => page.locator('.choice-tile');

async function tileStyle(tile: Locator) {
  return tile.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, shadow: s.boxShadow };
  });
}

/** Position/Größe aller Kacheln und ihrer direkten Inhalte. */
async function geometry(page: Page) {
  return tiles(page).evaluateAll((els) =>
    els.map((el) =>
      [el, ...el.children].map((n) => {
        const r = n.getBoundingClientRect();
        return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100);
      }),
    ),
  );
}

async function imagesLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('.choice-tile img')].every(
      (i) => i.complete && i.naturalWidth > 0,
    ),
  );
}

test.describe('B-10 Auswahlkachel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await imagesLoaded(page);
  });

  test('AT-10.1: Optik ausgewählt / nicht ausgewählt', async ({ page }) => {
    const mimi = page.getByRole('button', { name: 'Mimi' });
    const off = await tileStyle(mimi);
    expect(off.bg).toBe(TOKEN_COLORS.white);
    expect(off.shadow).toContain(`${TOKEN_COLORS['grau-700']} 0px 0px 0px 2px inset`);

    await mimi.click();
    // Hintergrund blendet in ≤ 200 ms über; toHaveCSS wartet darauf.
    await expect(mimi).toHaveCSS('background-color', TOKEN_COLORS['lila-100']);
    const on = await tileStyle(mimi);
    expect(on.shadow).toContain(`${TOKEN_COLORS['lila-700']} 0px 0px 0px 5px inset`);
  });

  test('AT-10.2: genau eine Kachel pro Gruppe ausgewählt', async ({ page }) => {
    const mimi = page.getByRole('button', { name: 'Mimi' });
    const mots = page.getByRole('button', { name: 'Mots' });
    const en = page.getByRole('button', { name: 'Englisch' });
    const fr = page.getByRole('button', { name: 'Französisch' });
    const dauer = page.getByRole('button', { name: 'Sprechen' });

    for (const t of [mimi, mots, en, fr]) await expect(t).toHaveAttribute('aria-pressed', 'false');
    await expect(dauer).toHaveAttribute('aria-pressed', 'true');

    await mimi.click();
    await en.click();
    await expect(mimi).toHaveAttribute('aria-pressed', 'true');
    await expect(en).toHaveAttribute('aria-pressed', 'true');

    await mots.click();
    await expect(mots).toHaveAttribute('aria-pressed', 'true');
    await expect(mimi).toHaveAttribute('aria-pressed', 'false');
    await expect(en).toHaveAttribute('aria-pressed', 'true'); // andere Gruppe unberührt

    await mots.click();
    await expect(mots).toHaveAttribute('aria-pressed', 'true');
    await dauer.click();
    await expect(dauer).toHaveAttribute('aria-pressed', 'true');
  });

  test('AT-10.3: Auswahlwechsel verschiebt nichts', { tag: '@layout' }, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); // ohne Übergang, kein Warten (B-91)
    const before = await geometry(page);
    for (const name of ['Mimi', 'Mots', 'Englisch', 'Französisch']) {
      await page.getByRole('button', { name }).click();
      expect(await geometry(page), name).toEqual(before);
    }
  });

  test('AT-10.5: nur Token-Farben in beiden Zuständen', async ({ page }) => {
    const allowed = new Set(Object.values(TOKEN_COLORS));
    const check = async () => {
      for (const tile of await tiles(page).all()) {
        const s = await tileStyle(tile);
        expect(allowed.has(s.bg), s.bg).toBe(true);
        expect(allowed.has(s.color), s.color).toBe(true);
        const shadowColors = s.shadow.match(/rgba?\([^)]+\)/g) ?? [];
        for (const c of shadowColors) {
          expect(allowed.has(c) || c === SHADOW_COLOR, c).toBe(true);
        }
      }
    };
    await page.emulateMedia({ reducedMotion: 'reduce' }); // ohne Übergang, kein Warten (B-91)
    await check();
    for (const name of ['Mimi', 'Französisch']) await page.getByRole('button', { name }).click();
    await check();
  });
});
