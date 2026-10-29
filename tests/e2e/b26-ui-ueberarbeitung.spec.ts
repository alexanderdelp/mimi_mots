import { expect, test, type Locator, type Page } from '@playwright/test';
import { mediaCalls } from './helpers';

const KEY = 'mimi-mots:v1';
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const box = async (l: Locator) => (await l.boundingBox())!;

type SpeechCall = { op: 'cancel' } | { op: 'speak'; text: string };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    (window as unknown as { __speech: unknown[] }).__speech = calls;
    class FakeUtterance {
      lang = '';
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance });
    const media: unknown[] = [];
    (window as unknown as { __media: unknown[] }).__media = media;
    HTMLMediaElement.prototype.play = function () {
      media.push({ op: 'play', src: new URL(this.src).pathname, time: this.currentTime });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      media.push({ op: 'pause' });
    };
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel: () => calls.push({ op: 'cancel' }),
        speak: (u: FakeUtterance) => calls.push({ op: 'speak', text: u.text }),
        getVoices: () => [],
      },
    });
  });
});

async function startRound(page: Page) {
  await page.goto('./');
  await btn(page, 'Mots').click();
  await btn(page, 'Englisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
}

test.describe('B-26 UI-Überarbeitung – Startseite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('AT-26.1: zwei Dauern nur als Uhr (seit B-27: 3/7 Minuten)', async ({ page }) => {
    const group = page.getByRole('group', { name: 'Wie lange?' });
    await expect(group.getByRole('button')).toHaveCount(2);
    const five = btn(page, '3 Minuten');
    const ten = btn(page, '7 Minuten');
    for (const tile of [five, ten]) expect(await tile.innerText()).toBe('');
    await expect(five.locator('svg.clock-icon')).toHaveAttribute('data-angle', '18');
    await expect(ten.locator('svg.clock-icon')).toHaveAttribute('data-angle', '42');
    const [b5, b10] = [await box(five), await box(ten)];
    expect(b10.y).toBeGreaterThan(b5.y + b5.height - 1); // untereinander
    expect(b10.x).toBeCloseTo(b5.x, 0);
  });

  test('AT-26.2: längere Dauer wählen und merken', async ({ page }) => {
    await expect(btn(page, '3 Minuten')).toHaveAttribute('aria-pressed', 'true');
    await btn(page, '7 Minuten').click();
    await expect(btn(page, '7 Minuten')).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, '3 Minuten')).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(btn(page, '7 Minuten')).toHaveAttribute('aria-pressed', 'true');
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.settings.durationMin).toBe(7);
  });

  test('AT-26.3: Sprachen 2 × 2 mit Japanisch ausgegraut', async ({ page }) => {
    const group = page.getByRole('group', { name: 'In welcher Sprache?' });
    await expect(group.getByRole('button')).toHaveCount(3);
    const [en, fr, ja] = [
      btn(page, 'Englisch'),
      btn(page, 'Französisch'),
      btn(page, 'Japanisch (bald)'),
    ];
    await expect(ja).toBeDisabled();
    await expect(ja.locator('img')).toHaveAttribute('src', /flag_jp\.svg$/);
    expect(Number(await ja.evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(1);
    await ja.click({ force: true });
    await expect(ja).toHaveAttribute('aria-pressed', 'false');

    const [bEn, bFr, bJa] = [await box(en), await box(fr), await box(ja)];
    expect(bFr.y).toBeCloseTo(bEn.y, 0); // erste Zeile: EN | FR
    expect(bFr.x).toBeGreaterThan(bEn.x);
    expect(bJa.x).toBeCloseTo(bEn.x, 0); // zweite Zeile: JA | (leer)
    expect(bJa.y).toBeGreaterThan(bEn.y + bEn.height - 1);
  });

  test('AT-26.4: Kachelgrößen', async ({ page }) => {
    const vp = page.viewportSize()!;
    const big = await box(btn(page, 'Mimi'));
    const small = await Promise.all(
      ['Englisch', 'Französisch', 'Japanisch (bald)', '3 Minuten', '7 Minuten'].map((n) =>
        box(btn(page, n)),
      ),
    );
    const gap = (await box(btn(page, '7 Minuten'))).y - (small[3].y + small[3].height);
    for (const s of small) {
      expect(s.width).toBeCloseTo(big.width, 0);
      expect(s.height).toBeCloseTo((big.height - gap) / 2, 0);
      expect(s.height).toBeGreaterThanOrEqual(88);
      expect(s.y + s.height).toBeLessThanOrEqual(vp.height);
      expect(s.x + s.width).toBeLessThanOrEqual(vp.width);
    }
    // zwei flache Kacheln ergeben zusammen genau die Höhe einer Begleiter-Kachel
    expect(small[4].y + small[4].height - small[3].y).toBeCloseTo(big.height, 0);
  });
});

test.describe('B-26 UI-Überarbeitung – Lernseite', () => {
  test('AT-26.5: Kopfleiste wie auf der Startseite', async ({ page }) => {
    await page.goto('./');
    const startHeader = await box(page.locator('header.app-header'));
    await startRound(page);
    const header = page.locator('header.app-header');
    await expect(header.getByRole('heading', { level: 1 })).toHaveText('Mimi & Mots');
    await expect(header.locator('img')).toHaveAttribute('src', /icons\/icon\.svg$/);
    expect(await box(header)).toEqual(startHeader);
    const close = await box(btn(page, 'Beenden'));
    const timer = await box(page.locator('.round__timer'));
    // seit B-27 liegen [×] und Timer in der Kopfleiste
    for (const b of [close, timer]) {
      expect(b.y).toBeGreaterThanOrEqual(startHeader.y);
      expect(b.y + b.height).toBeLessThanOrEqual(startHeader.y + startHeader.height);
    }
    expect(close.x).toBeLessThan(page.viewportSize()!.width / 4);
    expect(timer.x).toBeGreaterThan((page.viewportSize()!.width * 3) / 4);
  });

  test('AT-26.6: Lautsprecher statt Flaggen-Tipp', async ({ page }) => {
    await startRound(page);
    const flag = page.locator('.round__flag');
    await expect(flag).toBeVisible();
    expect(await flag.evaluate((e) => e.tagName)).toBe('IMG'); // keine Schaltfläche
    await flag.click({ force: true });
    await expect(page.locator('.round__foreign')).toHaveText('');

    const speaker = btn(page, 'Auf Englisch anhören');
    const s = await box(speaker);
    const f = await box(flag);
    const card = await box(page.locator('.round__answer'));
    expect(s.width).toBe(s.height);
    // seit B-27: Flagge oben und Lautsprecher unten in der rechten Karte, ohne Überlappung
    for (const b of [s, f]) {
      expect(b.x).toBeGreaterThanOrEqual(card.x);
      expect(b.x + b.width).toBeLessThanOrEqual(card.x + card.width);
      expect(b.y).toBeGreaterThanOrEqual(card.y);
      expect(b.y + b.height).toBeLessThanOrEqual(card.y + card.height);
    }
    expect(s.y).toBeGreaterThanOrEqual(f.y + f.height);
    await expect(speaker).toHaveCSS('background-color', 'rgb(106, 76, 156)');
    await expect(speaker.locator('svg')).toHaveAttribute('data-icon', 'speaker');

    await speaker.click();
    await expect(page.locator('.round__foreign')).not.toHaveText('');
    await speaker.click();
    // Englisch: Gerätestimme, jeder Tipp von vorn (Französisch: MP3, siehe B-31)
    const calls = await page.evaluate(
      () => (window as unknown as { __speech: SpeechCall[] }).__speech,
    );
    expect(calls.map((c) => c.op)).toEqual(['cancel', 'speak', 'cancel', 'speak']);
    const media = await mediaCalls(page);
    expect(media.filter((c) => c.op === 'play')).toEqual([]);
  });

  test('AT-26.7: Bewertung als runde Symbol-Buttons wie Play', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mots').click();
    await btn(page, 'Englisch').click();
    const play = btn(page, 'Los geht’s');
    await expect(play).toHaveCSS('background-color', 'rgb(106, 76, 156)'); // Übergang abwarten
    const playStyle = await play.evaluate((e) => {
      const s = getComputedStyle(e);
      return [s.width, s.height, s.borderRadius, s.backgroundColor, s.color].join('|');
    });
    await play.click();
    await btn(page, 'Auf Englisch anhören').click();
    for (const name of ['Wusste ich', 'Noch üben']) {
      const b = btn(page, name);
      await expect(b).toBeVisible();
      expect(await b.innerText()).toBe('');
      const style = await b.evaluate((e) => {
        const s = getComputedStyle(e);
        return [s.width, s.height, s.borderRadius, s.backgroundColor, s.color].join('|');
      });
      expect(style).toBe(playStyle);
    }
  });

  test('AT-26.8: Lernseite passt ohne Überlappung', async ({ page }) => {
    await startRound(page);
    await btn(page, 'Auf Englisch anhören').click();
    const vp = page.viewportSize()!;
    const parts = await page
      .locator(
        'header.app-header, .close-button, .round__timer, .round__avatar .avatar, .word-card, .round__flag, .speak-button, .round__foreign, .rating-button',
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
        const pair = a.n + ' ' + b.n;
        const wanted = /app-header/.test(pair) && /close-button|round__timer/.test(pair);
        if (!wanted) expect(overlap, `${a.n} / ${b.n}`).toBe(false);
      }
    }
    const scroll = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
    ]);
    expect(scroll).toEqual([vp.width, vp.height]);
  });
});

test('AT-26.9: lange Fremdwörter passen vollständig', async ({ page }) => {
  await startRound(page);
  await btn(page, 'Auf Englisch anhören').click();
  // gleiche Logik wie die App (fitText mit Trennstufe), angewendet auf das echte Feld
  const results = await page.locator('.round__foreign').evaluate((el) => {
    const BREAK = 'fit-text--break';
    const fit = (text: string) => {
      el.textContent = text;
      const over = () => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      const shrink = (floor: number) => {
        let size = 56;
        (el as HTMLElement).style.fontSize = `${size}px`;
        while (size > floor && over()) {
          size = Math.max(floor, size - 2);
          (el as HTMLElement).style.fontSize = `${size}px`;
        }
        return size;
      };
      el.classList.remove(BREAK);
      let size = shrink(36);
      if (over()) {
        el.classList.add(BREAK);
        size = shrink(28);
      }
      return { text, size, fits: !over() };
    };
    return [
      'les lunettes de soleil',
      'la pomme de terre',
      'the butterfly net',
      'extraordinairement',
      'anticonstitutionnellement',
    ].map(fit);
  });
  for (const r of results) {
    expect(r.fits, r.text).toBe(true);
    expect(r.size, r.text).toBeGreaterThanOrEqual(36);
  }
});
