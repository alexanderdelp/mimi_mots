// B-100: Reiter „Sonstiges“ – alle Bedienelemente in einer festen Spalte (Flucht), Rundendauer als
// Schieberegler (natives range, 3 bis 10 Minuten).
import { expect, isPhone, minSize, test, type Page } from './fixtures';
import { btn, hold, overflow, prepare, settle, stored } from './views';

const slider = (page: Page) => page.getByRole('slider', { name: 'Rundendauer' });
const minutes = (page: Page) => page.locator('.admin__minutes');

async function openOther(page: Page) {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name: 'Sonstiges' }).click();
  await settle(page);
}

type Box = { x: number; y: number; width: number; height: number };
const box = async (page: Page, selector: string): Promise<Box> =>
  (await page.locator(selector).boundingBox())!;

/** Linke und rechte Kante jedes Bedienelements der Spalte. */
async function edges(page: Page) {
  const out: Record<string, [number, number]> = {};
  const span = (a: Box, b: Box = a): [number, number] => [a.x, b.x + b.width];
  out.regler = span(await box(page, '.admin__slider'));
  out.tiere = span(
    (await btn(page, 'Mimi').boundingBox())!,
    (await btn(page, 'Mots').boundingBox())!,
  );
  out.sprechen = span((await btn(page, 'Sprechen zurücksetzen').boundingBox())!);
  out.hoeren = span((await btn(page, 'Hören zurücksetzen').boundingBox())!);
  out.bremsen = span((await btn(page, 'Bremsen').boundingBox())!);
  out.version = span(await box(page, '.admin__version-text'), await box(page, '.admin__copy'));
  return out;
}

function expectAligned(all: Record<string, [number, number]>, [left, right]: [number, number]) {
  for (const [name, [l, r]] of Object.entries(all)) {
    expect(Math.abs(l - left), `${name} links`).toBeLessThanOrEqual(1);
    expect(Math.abs(r - right), `${name} rechts`).toBeLessThanOrEqual(1);
  }
}

/** Mitte des Griffs bei `value` Minuten (WebKit: Griff läuft innerhalb der Spur). */
async function thumbX(page: Page, value: number) {
  const b = (await slider(page).boundingBox())!;
  const thumb = await thumbSize(page);
  return b.x + thumb / 2 + ((value - 3) / 7) * (b.width - thumb);
}

const thumbSize = (page: Page) =>
  page
    .locator('.admin__track')
    .evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--thumb')));

/** Farben einzelner Bildpunkte des Reglers (CSS-Pixel, relativ zum Regler) aus einem Screenshot;
 *  mit Radius der dunkelste Bildpunkt im Umkreis (Striche sind nur 2 px breit, Kantenglättung). */
async function pixels(page: Page, points: [number, number, number?][]) {
  const b = (await slider(page).boundingBox())!;
  const clip = { x: b.x, y: b.y - 4, width: b.width, height: b.height + 8 };
  const png = (await page.screenshot({ clip, scale: 'css', animations: 'disabled' })).toString(
    'base64',
  );
  return page.evaluate(
    async ({ png, points }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${png}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const all = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const px = (x: number, y: number) => {
        const i = (Math.round(y + 4) * canvas.width + Math.round(x)) * 4;
        return [all[i], all[i + 1], all[i + 2]];
      };
      const at = ([x, y, r = 0]: [number, number, number?]) => {
        let best = px(x, y);
        for (let dx = -r; dx <= r; dx++)
          for (let dy = -r; dy <= r; dy++) {
            const c = px(x + dx, y + dy);
            if (c[0] + c[1] + c[2] < best[0] + best[1] + best[2]) best = c;
          }
        return best;
      };
      // Rot- oder Grüntöne irgendwo im Regler?
      let colorful = 0;
      for (let i = 0; i < all.length; i += 4) {
        const [r, g, bl] = [all[i], all[i + 1], all[i + 2]];
        if ((g > r + 30 && g > bl + 30) || (r > g + 60 && r > bl + 60)) colorful++;
      }
      return { points: points.map(at), colorful };
    },
    { png, points },
  );
}

const token = (page: Page, name: string) =>
  page.evaluate((name) => {
    const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  }, name);

function expectColor(actual: number[], expected: number[], tolerance = 12) {
  for (let i = 0; i < 3; i++) {
    expect(Math.abs(actual[i] - expected[i]), `${actual} ≈ ${expected}`).toBeLessThanOrEqual(
      tolerance,
    );
  }
}

test.describe('B-100 Sonstiges: Flucht und Schieberegler', () => {
  test(
    'AT-100.1: alle Bedienelemente in einer Spalte mit gleichen Kanten, unabhängig vom Inhalt',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await openOther(page);
      const first = await edges(page);
      const column = first.regler;
      expectAligned(first, column);
      // iPhone: schmalere Spalte als auf dem iPad
      const width = column[1] - column[0];
      if (isPhone()) expect(width).toBeLessThan(300);
      else expect(width).toBeGreaterThanOrEqual(300);
      expect(await overflow(page)).toEqual([]);

      // 10 Min., 3 Min., ausgegraute Buttons: dieselbe Spalte
      await slider(page).focus();
      await page.keyboard.press('End');
      await expect(minutes(page)).toHaveText('10 Min.');
      expectAligned(await edges(page), column);
      await page.keyboard.press('Home');
      await expect(minutes(page)).toHaveText('3 Min.');
      expectAligned(await edges(page), column);
      await btn(page, 'Sprechen zurücksetzen').click();
      await btn(page, 'Hören zurücksetzen').click();
      await btn(page, 'Bremsen').click();
      await expect(btn(page, 'Sprechen zurücksetzen')).toBeDisabled();
      await expect(btn(page, 'Hören zurücksetzen')).toBeDisabled();
      expectAligned(await edges(page), column);
      expect(await overflow(page)).toEqual([]);
    },
  );

  test('AT-100.2: Schieberegler 3 bis 10, Standard 5, Anzeige in fester Breite', async ({
    page,
  }) => {
    await prepare(page, {});
    await openOther(page);
    const range = slider(page);
    await expect(range).toHaveAttribute('type', 'range');
    await expect(range).toHaveAttribute('min', '3');
    await expect(range).toHaveAttribute('max', '10');
    await expect(range).toHaveAttribute('step', '1');
    await expect(range).toHaveValue('5');
    await expect(minutes(page)).toHaveText('5 Min.');
    await expect(btn(page, 'Kürzer')).toHaveCount(0);
    await expect(btn(page, 'Länger')).toHaveCount(0);

    // Anzeige rechts neben dem Regler, gleich breit bei 3 und 10 Minuten
    const shown = (await minutes(page).boundingBox())!;
    const rangeBox = (await range.boundingBox())!;
    expect(shown.x).toBeGreaterThanOrEqual(rangeBox.x + rangeBox.width);
    await range.focus();
    await page.keyboard.press('Home');
    await expect(minutes(page)).toHaveText('3 Min.');
    const three = (await minutes(page).boundingBox())!;
    await page.keyboard.press('End');
    await expect(minutes(page)).toHaveText('10 Min.');
    const ten = (await minutes(page).boundingBox())!;
    expect(three.width).toBeCloseTo(shown.width, 0);
    expect(ten.width).toBeCloseTo(shown.width, 0);
    expect(ten.x).toBeCloseTo(shown.x, 0);
    expect((await range.boundingBox())!.width).toBeCloseTo(rangeBox.width, 0);
  });

  test('AT-100.3: Ziehen, Tipp auf die Spur und Pfeiltasten stellen ganze Minuten ein', async ({
    page,
  }) => {
    await prepare(page, {});
    await openOther(page);
    const range = slider(page);
    const b = (await range.boundingBox())!;
    const y = b.y + b.height / 2;

    // Ziehen von 5 nach 8: die Anzeige läuft mit, nach dem Loslassen gespeichert
    await page.mouse.move(await thumbX(page, 5), y);
    await page.mouse.down();
    await page.mouse.move(await thumbX(page, 6.6), y, { steps: 5 });
    await expect(minutes(page)).toHaveText('7 Min.');
    await expect(range).toHaveValue('7');
    await page.mouse.move(await thumbX(page, 8.2), y, { steps: 5 });
    await expect(minutes(page)).toHaveText('8 Min.');
    await page.mouse.up();
    await expect(range).toHaveValue('8');
    await expect.poll(async () => (await stored(page)).roundMin).toBe(8);

    // über die Enden hinaus: nie über 10, nie unter 3
    await page.mouse.move(await thumbX(page, 8), y);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width + 80, y, { steps: 5 });
    await page.mouse.up();
    await expect(minutes(page)).toHaveText('10 Min.');
    await expect.poll(async () => (await stored(page)).roundMin).toBe(10);
    await page.mouse.move(await thumbX(page, 10), y);
    await page.mouse.down();
    await page.mouse.move(b.x - 80, y, { steps: 5 });
    await page.mouse.up();
    await expect(minutes(page)).toHaveText('3 Min.');
    await expect.poll(async () => (await stored(page)).roundMin).toBe(3);

    // Tipp auf die Spur rastet auf die nächste Minute ein
    await page.mouse.click(await thumbX(page, 6.3), y);
    await expect(range).toHaveValue('6');
    await expect(minutes(page)).toHaveText('6 Min.');
    await expect.poll(async () => (await stored(page)).roundMin).toBe(6);

    // Pfeiltasten: je eine Minute, an den Grenzen bleibt es
    await range.focus();
    await page.keyboard.press('ArrowRight');
    await expect(minutes(page)).toHaveText('7 Min.');
    await expect.poll(async () => (await stored(page)).roundMin).toBe(7);
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
    await expect(minutes(page)).toHaveText('3 Min.');
    await page.keyboard.press('ArrowLeft');
    await expect(range).toHaveValue('3');
    for (let i = 0; i < 9; i++) await page.keyboard.press('ArrowRight');
    await expect(range).toHaveValue('10');
    await expect.poll(async () => (await stored(page)).roundMin).toBe(10);

    // nach Neuladen wieder eingestellt
    await page.reload();
    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    await expect(slider(page)).toHaveValue('10');
    await expect(minutes(page)).toHaveText('10 Min.');
  });

  test(
    'AT-100.4: Spur lila-200, links vom Griff lila-700, weißer Griff mit Rand, acht Striche',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await openOther(page);
      const [l700, l200, l500] = await Promise.all(
        ['--lila-700', '--lila-200', '--lila-500'].map((t) => token(page, t)),
      );
      const thumb = await thumbSize(page);
      expect(thumb).toBe(isPhone() ? 32 : 44);
      const b = (await slider(page).boundingBox())!;
      const mid = b.height / 2;
      const rail = await page
        .locator('.admin__track')
        .evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--rail')));
      const x = (v: number) => thumb / 2 + ((v - 3) / 7) * (b.width - thumb);
      const tickY = mid + rail / 2 + (isPhone() ? 6 : 8);

      const check = async (value: number) => {
        const before = x(value) - thumb / 2 - 6; // gefüllter Teil, knapp links vom Griff
        const after = x(value) + thumb / 2 + 6; // Spur rechts vom Griff
        const ticks = [3, 4, 5, 6, 7, 8, 9, 10].filter((v) => v !== value);
        // Lücken zwischen den Strichen, soweit nicht unter dem Griff
        const step = (b.width - thumb) / 7;
        const gaps = [3, 4, 5, 6, 7, 8, 9]
          .map((v) => x(v) + step / 2)
          .filter((g) => Math.abs(g - x(value)) > thumb / 2 + 8);
        const { points, colorful } = await pixels(page, [
          [Math.max(before, 4), mid],
          [Math.min(after, b.width - 4), mid],
          [x(value), mid],
          [x(value) + thumb / 2 - 2, mid],
          ...ticks.map((v) => [x(v), tickY, 2] as [number, number, number]),
          ...gaps.map((g) => [g, tickY] as [number, number]),
        ]);
        const [fill, rest, center, rim, ...marks] = points;
        if (value > 3) expectColor(fill, l700);
        if (value < 10) expectColor(rest, l200);
        expectColor(center, [255, 255, 255]);
        expectColor(rim, l700, 30);
        // Striche genau unter den Griffpositionen, dazwischen nichts
        for (const mark of marks.slice(0, ticks.length)) expectColor(mark, l500, 40);
        for (const gap of marks.slice(ticks.length)) expectColor(gap, [255, 255, 255]);
        expect(colorful).toBe(0);
      };
      await check(5);
      // der gefüllte Teil wächst mit dem Wert
      await slider(page).focus();
      await page.keyboard.press('End');
      await page.keyboard.press('ArrowLeft');
      await expect(minutes(page)).toHaveText('9 Min.');
      await page.mouse.move(0, 0);
      await check(9);
    },
  );

  test(
    'AT-100.5: Reiter „Sonstiges“ passt, Regler ≥ 44 px hoch, Buttons und Kacheln groß genug',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await openOther(page);
      expect((await slider(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
      for (const name of [
        'Mimi',
        'Mots',
        'Sprechen zurücksetzen',
        'Hören zurücksetzen',
        'Bremsen',
      ]) {
        const b = (await btn(page, name).boundingBox())!;
        expect(b.width, name).toBeGreaterThanOrEqual(minSize(88));
        expect(b.height, name).toBeGreaterThanOrEqual(minSize(88));
      }
      expect(await overflow(page)).toEqual([]);
    },
  );
});
