import { expect, test, type Page, minSize, skipRotationOnPhone } from './fixtures';
import { fakeMedia } from './helpers';

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const dial = (page: Page) => page.locator('.round__timer svg.timer-dial');
const fraction = async (page: Page) => Number(await dial(page).getAttribute('data-fraction'));
const MIN = 60_000;

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
  await page.clock.install();
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, 'Französisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(dial(page)).toBeVisible();
});

async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms);
  await page.clock.runFor(300);
}

test.describe('B-41 Timer-Zifferblatt', () => {
  test('AT-41.1: rundes Zifferblatt rechts in der Kopfleiste, 12 Striche, keine Ziffern', async ({
    page,
  }) => {
    const vp = page.viewportSize()!;
    const header = (await page.locator('header.app-header').boundingBox())!;
    const box = (await dial(page).boundingBox())!;
    // seit B-27: 88 px in der Kopfleiste
    expect(box.width).toBeGreaterThanOrEqual(minSize(80));
    expect(box.width).toBeLessThanOrEqual(140);
    expect(box.height).toBeCloseTo(box.width, 0);
    expect(box.x + box.width).toBeGreaterThan(vp.width * 0.85);
    expect(box.y).toBeGreaterThanOrEqual(header.y);
    expect(box.y + box.height).toBeLessThanOrEqual(header.y + header.height);
    await expect(dial(page).locator('.timer-dial__ticks line')).toHaveCount(12);
    expect(await dial(page).evaluate((el) => el.textContent)).toBe('');
  });

  test('AT-41.2: volle Scheibe, nach halber Zeit Halbkreis 6–12 Uhr', async ({ page }) => {
    expect(await fraction(page)).toBeGreaterThan(0.99);
    await advance(page, 2.5 * MIN - 300); // seit B-89: 5 Minuten
    expect(await fraction(page)).toBeCloseTo(0.5, 2);
    const sector = (await dial(page).locator('.timer-dial__sector').boundingBox())!;
    const face = (await dial(page).locator('.timer-dial__face').boundingBox())!;
    // Halbkreis liegt in der linken Hälfte (von 6 Uhr über 9 bis 12 Uhr)
    // (±3 px Toleranz: die Box der Scheibe enthält die Randlinie)
    expect(Math.abs(sector.x - (face.x + face.width * 0.083))).toBeLessThan(3);
    expect(Math.abs(sector.x + sector.width - (face.x + face.width / 2))).toBeLessThan(3);
    await advance(page, 1.25 * MIN - 300);
    expect(await fraction(page)).toBeCloseTo(0.25, 2); // schrumpft weiter Richtung 12 Uhr
  });

  test('AT-41.3: Aktualisierung mindestens einmal pro Sekunde', async ({ page }) => {
    const values: number[] = [];
    for (let i = 0; i < 4; i++) {
      await page.clock.runFor(1000);
      values.push(await fraction(page));
    }
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThan(values[i - 1]);
  });

  test('AT-41.4: nach Ablauf leer, ohne Animation', async ({ page }) => {
    await advance(page, 5 * MIN + 1000);
    expect(await fraction(page)).toBe(0);
    await expect(dial(page).locator('.timer-dial__sector')).toHaveAttribute('d', '');
    const animations = await dial(page).evaluate(
      (el) => [el, ...el.querySelectorAll('*')].flatMap((n) => n.getAnimations()).length,
    );
    expect(animations).toBe(0);
  });

  test('AT-41.5: in der Pause bleibt der Sektor stehen', async ({ page }) => {
    skipRotationOnPhone();
    await advance(page, 0.5 * MIN);
    const landscape = page.viewportSize()!;
    await page.setViewportSize({ width: landscape.height, height: landscape.width });
    await expect(page.getByRole('alert')).toBeVisible();
    const paused = await fraction(page);
    await advance(page, 2 * MIN);
    expect(await fraction(page)).toBe(paused);
    await page.setViewportSize(landscape);
    await expect(page.getByRole('alert')).toBeHidden();
    await advance(page, 0.5 * MIN);
    expect(await fraction(page)).toBeLessThan(paused);
  });

  test('AT-41.6: Token-Farben, nicht antippbar, keine Überlappung', async ({ page }) => {
    const colors = await dial(page).evaluate((el) =>
      [...el.querySelectorAll('circle, path, line')].flatMap((n) => {
        const s = getComputedStyle(n);
        // Linien haben keine Fläche – dort zählt nur die Strichfarbe
        const used = n.tagName === 'line' ? [s.stroke] : [s.fill, s.stroke];
        return used.filter((c) => c && c !== 'none');
      }),
    );
    const tokens = ['rgb(255, 255, 255)', 'rgb(59, 42, 99)', 'rgb(106, 76, 156)'];
    for (const c of colors) expect(tokens, c).toContain(c);
    await expect(page.locator('.round__timer')).toHaveCSS('pointer-events', 'none');
    const vp = page.viewportSize()!;
    const box = (await dial(page).boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    const others = await page
      .locator('.word-card, .round__flag, .speak-button, .round__foreign, .close-button')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    for (const o of others) {
      const overlap =
        box.x < o.right &&
        o.left < box.x + box.width &&
        box.y < o.bottom &&
        o.top < box.y + box.height;
      expect(overlap).toBe(false);
    }
  });
});
