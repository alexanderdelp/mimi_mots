import { expect, test, type Locator, type Page } from './fixtures';
import { fakeMedia } from './helpers';

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const round = (page: Page) => page.locator('[data-view="round"]');
const box = async (l: Locator) => (await l.boundingBox())!;
const MIN = 60_000;

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
});

async function startRound(page: Page, duration: '3 Minuten' | '7 Minuten' = '3 Minuten') {
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, 'Französisch').click();
  await btn(page, duration).click();
  await btn(page, 'Los geht’s').click();
  await expect(round(page)).toBeVisible();
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('.round__avatar .avatar img');
    return !!img && img.complete && img.naturalWidth > 0;
  });
}

test.describe('B-27 Lernansicht überarbeiten', () => {
  test('AT-27.1: Dauer 3 und 7 Minuten, Erststart 3', async ({ page }) => {
    await page.goto('./');
    const group = page.getByRole('group', { name: 'Wie lange?' });
    await expect(group.getByRole('button')).toHaveCount(2);
    await expect(btn(page, '3 Minuten').locator('svg.clock-icon')).toHaveAttribute(
      'data-angle',
      '18',
    );
    await expect(btn(page, '7 Minuten').locator('svg.clock-icon')).toHaveAttribute(
      'data-angle',
      '42',
    );
    await expect(btn(page, '3 Minuten')).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, '7 Minuten')).toHaveAttribute('aria-pressed', 'false');
  });

  for (const [old, now] of [
    [5, '3 Minuten'],
    [10, '7 Minuten'],
  ] as const) {
    test(`AT-27.2: gespeicherte ${old} Minuten → ${now}`, async ({ page }) => {
      await page.addInitScript((d) => {
        if (!sessionStorage.getItem('seeded')) {
          localStorage.setItem(
            'mimi-mots:v1',
            JSON.stringify({
              version: 1,
              settings: { companion: 'mots', language: 'fr', durationMin: d },
              progress: { en: {}, fr: {} },
            }),
          );
          sessionStorage.setItem('seeded', '1');
        }
      }, old);
      await page.goto('./');
      await expect(btn(page, now)).toHaveAttribute('aria-pressed', 'true');
      await expect(btn(page, 'Los geht’s')).toBeEnabled();
    });
  }

  for (const [duration, minutes] of [
    ['3 Minuten', 3],
    ['7 Minuten', 7],
  ] as const) {
    test(`AT-27.3: Runde läuft nach ${minutes}:00 ab`, async ({ page }) => {
      await page.clock.install();
      await startRound(page, duration);
      await page.clock.fastForward(minutes * MIN - 2000);
      await page.clock.runFor(300);
      await expect(round(page)).toHaveAttribute('data-expired', 'false');
      await page.clock.fastForward(2000);
      await page.clock.runFor(300);
      await expect(round(page)).toHaveAttribute('data-expired', 'true');
    });
  }

  test('AT-27.4: [×] und Timer in der Kopfleiste, gleiche Höhe überall', async ({ page }) => {
    await page.goto('./');
    const startHeader = await box(page.locator('header.app-header'));
    await startRound(page);
    const header = await box(page.locator('header.app-header'));
    expect(header).toEqual(startHeader);
    const close = await box(btn(page, 'Beenden'));
    const timer = await box(page.locator('.round__timer'));
    const brand = await box(page.locator('.app-header__brand'));
    const vp = page.viewportSize()!;
    for (const b of [close, timer]) {
      expect(b.width).toBeGreaterThanOrEqual(88);
      expect(b.height).toBeGreaterThanOrEqual(88);
      expect(b.y).toBeGreaterThanOrEqual(header.y);
      expect(b.y + b.height).toBeLessThanOrEqual(header.y + header.height);
      // vertikal mittig
      expect(Math.abs(b.y + b.height / 2 - (header.y + header.height / 2))).toBeLessThan(2);
    }
    expect(close.x).toBeLessThan(vp.width * 0.1);
    expect(timer.x + timer.width).toBeGreaterThan(vp.width * 0.9);
    expect(Math.abs(brand.x + brand.width / 2 - vp.width / 2)).toBeLessThan(2);
  });

  test('AT-27.5: zwei gleich große Karten nebeneinander', async ({ page }) => {
    await startRound(page);
    const left = await box(page.locator('.word-card'));
    const right = await box(page.locator('.round__answer'));
    expect(right.width).toBeCloseTo(left.width, 0);
    expect(right.height).toBeCloseTo(left.height, 0);
    expect(right.y).toBeCloseTo(left.y, 0);
    expect(right.x).toBeGreaterThan(left.x + left.width);
    // rechte Karte: Flagge oben, Fremdwort-Bereich, Lautsprecher unten
    const flag = await box(page.locator('.round__answer .round__flag'));
    const foreign = await box(page.locator('.round__answer .round__foreign'));
    const speaker = await box(btn(page, 'Auf Französisch anhören'));
    expect(flag.y + flag.height).toBeLessThanOrEqual(foreign.y + 1);
    expect(foreign.y + foreign.height).toBeLessThanOrEqual(speaker.y + 1);
    for (const b of [flag, foreign, speaker]) {
      expect(b.y).toBeGreaterThanOrEqual(right.y);
      expect(b.y + b.height).toBeLessThanOrEqual(right.y + right.height);
    }
    // Aufdecken ändert die Kartengrößen nicht
    await btn(page, 'Auf Französisch anhören').click();
    await expect(page.locator('.round__foreign')).not.toHaveText('');
    expect(await box(page.locator('.round__answer'))).toEqual(right);
    expect(await box(page.locator('.word-card'))).toEqual(left);
  });

  test('AT-27.6: Begleiter groß links unten', async ({ page }) => {
    await startRound(page);
    const vh = page.viewportSize()!.height;
    const avatar = await box(page.locator('.round__avatar .avatar'));
    const rating = await box(page.locator('.round__rating'));
    const left = await box(page.locator('.word-card'));
    expect(avatar.height).toBeGreaterThanOrEqual(vh * 0.4);
    expect(avatar.height).toBeLessThanOrEqual(440);
    expect(avatar.x).toBeLessThan(40);
    expect(Math.abs(avatar.y + avatar.height - (rating.y + rating.height))).toBeLessThan(2);
    expect(avatar.x + avatar.width).toBeLessThanOrEqual(left.x);
  });

  test('AT-27.7: Bewertung mittig unter den Karten', async ({ page }) => {
    await startRound(page);
    await btn(page, 'Auf Französisch anhören').click();
    const left = await box(page.locator('.word-card'));
    const right = await box(page.locator('.round__answer'));
    const known = await box(btn(page, 'Wusste ich'));
    const practice = await box(btn(page, 'Noch üben'));
    const cardsCenter = (left.x + right.x + right.width) / 2;
    const buttonsCenter = (known.x + practice.x + practice.width) / 2;
    expect(Math.abs(buttonsCenter - cardsCenter)).toBeLessThan(2);
    expect(known.y).toBeGreaterThanOrEqual(left.y + left.height);
  });

  test('AT-27.8: alles im Bildschirm, keine Überlappung', async ({ page }) => {
    await startRound(page);
    await btn(page, 'Auf Französisch anhören').click();
    const vp = page.viewportSize()!;
    const parts = await page
      .locator(
        '.close-button, .round__timer, .app-header__brand, .round__avatar .avatar, .word-card, .round__answer, .rating-button',
      )
      .evaluateAll((els) =>
        els.map((e) => ({ n: e.className, ...e.getBoundingClientRect().toJSON() })),
      );
    for (const p of parts) {
      expect(p.left, p.n).toBeGreaterThanOrEqual(0);
      expect(p.top, p.n).toBeGreaterThanOrEqual(0);
      expect(p.right, p.n).toBeLessThanOrEqual(vp.width);
      expect(p.bottom, p.n).toBeLessThanOrEqual(vp.height);
    }
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const [a, b] = [parts[i], parts[j]];
        const overlap =
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap, `${a.n} / ${b.n}`).toBe(false);
      }
    }
    const scroll = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
    ]);
    expect(scroll).toEqual([vp.width, vp.height]);
  });
});
