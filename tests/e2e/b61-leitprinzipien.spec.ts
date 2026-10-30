import { expect, test, type Page, minSize } from './fixtures';
import { VIEWS, adminView, btn, endView, prepare, settle, sleepView } from './views';

/** Ansichten für das Kind (der Elternbereich ist für Erwachsene). */
const CHILD_VIEWS = VIEWS.filter((v) => v.name !== 'elternbereich');

/** Farben (Text, Hintergrund, Rahmen, SVG) mit Rot- oder Grünton; Bilder und Emoji zählen nicht. */
const redOrGreen = (page: Page) =>
  page.evaluate(() => {
    const hue = (c: string) => {
      const m = c.match(/[\d.]+/g);
      if (!m || (m.length > 3 && Number(m[3]) === 0)) return null;
      const [r, g, b] = m.slice(0, 3).map((v) => Number(v) / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.35 || max < 0.25) return null; // Grau, Weiß, sehr dunkel
      const d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const out: string[] = [];
    for (const el of document.querySelectorAll<Element>('body *')) {
      if (
        el.closest('img, .word-card__emoji, .admin__word') ||
        !(el as HTMLElement).getClientRects().length
      ) {
        continue;
      }
      const s = getComputedStyle(el);
      for (const prop of [
        'color',
        'backgroundColor',
        'borderTopColor',
        'fill',
        'stroke',
      ] as const) {
        const h = hue(s[prop]);
        if (h === null) continue;
        const red = h < 20 || h > 345;
        const green = h > 80 && h < 160;
        if (red || green) out.push(`${el.tagName}.${el.getAttribute('class')} ${prop} ${s[prop]}`);
      }
    }
    return out;
  });

/** Sichtbare Schaltflächen unter 88 × 88 px (iPhone: 44 × 44 px, B-76). */
const smallButtons = (page: Page) =>
  page.evaluate(
    (min) =>
      [...document.querySelectorAll('button')]
        .filter((b) => b.getClientRects().length)
        .map((b) => ({
          name: b.getAttribute('aria-label') ?? b.textContent,
          r: b.getBoundingClientRect(),
        }))
        .filter(({ r }) => r.width < min - 0.5 || r.height < min - 0.5)
        .map(({ name, r }) => `${name} ${Math.round(r.width)}×${Math.round(r.height)}`),
    minSize(88),
  );

/** Längste Übergänge und Animationen (ms) je Element, außer dem dokumentierten Ring von [×]. */
const slowMotion = (page: Page, limit: number) =>
  page.evaluate((limit) => {
    const ms = (v: string) =>
      Math.max(...v.split(',').map((t) => parseFloat(t) * (t.includes('ms') ? 1 : 1000)));
    const out: string[] = [];
    for (const el of document.querySelectorAll<Element>('body *')) {
      if (el.closest('.close-button__ring')) continue;
      const s = getComputedStyle(el);
      const longest = Math.max(
        ms(s.transitionDuration),
        s.animationName === 'none' ? 0 : ms(s.animationDuration),
      );
      if (longest > limit) out.push(`${el.tagName}.${el.getAttribute('class')} ${longest} ms`);
    }
    return out;
  }, limit);

/** Wörter Text außerhalb der Lernwörter (Wortkarte, Fremdwort). */
const uiWords = (page: Page) =>
  page.evaluate(() => {
    const copy = document.querySelector('main')!.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('.word-card, .round__foreign').forEach((n) => n.remove());
    return (copy.innerText || copy.textContent || '').split(/\s+/).filter((w) => /\p{L}/u.test(w));
  });

test.describe('B-61 Leitprinzipien', () => {
  for (const view of CHILD_VIEWS) {
    test(`AT-61.1/61.2/61.6: ${view.name} – keine Rot/Grün-Töne, große Ziele, wenig Text`, async ({
      page,
    }) => {
      await prepare(page, view.seed);
      await view.open(page);
      await settle(page);
      expect(await redOrGreen(page)).toEqual([]);
      expect(await smallButtons(page)).toEqual([]);
      const words = await uiWords(page);
      // Grenze seit B-75 bei 14 Wörtern (die Kachel „Nur bekannte“ ist seit B-82 wieder weg)
      expect(words.length, words.join(' ')).toBeLessThanOrEqual(14);
      expect(words.join(' ')).not.toMatch(
        /\d|super|toll|richtig|falsch|prima|gut gemacht|punkt|stern/i,
      );
    });
  }

  test('AT-61.2: auch im Elternbereich sind alle Schaltflächen ≥ 88 px', async ({ page }) => {
    await prepare(page, {});
    await adminView(page);
    expect(await smallButtons(page)).toEqual([]);
  });

  test('AT-61.3: Avatare ohne Bewegung, Übergänge ≤ 200 ms, mit „Bewegung reduzieren“ 0 ms', async ({
    page,
  }) => {
    await prepare(page, {});
    await endView(page);
    const avatar = await page.locator('.avatar, .avatar img').evaluateAll((els) =>
      els.map((e) => {
        const s = getComputedStyle(e);
        return [s.animationName, s.transitionDuration];
      }),
    );
    for (const [animation, transition] of avatar) {
      expect(animation).toBe('none');
      expect(transition).toBe('0s');
    }
    expect(await slowMotion(page, 200)).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await slowMotion(page, 0)).toEqual([]);
  });

  test('AT-61.4: ein kompletter Ablauf fragt keinen fremden Server an', async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL!).origin;
    const foreign: string[] = [];
    page.on('request', (r) => {
      const url = new URL(r.url());
      if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== origin)
        foreign.push(r.url());
    });
    await prepare(page, {});
    await endView(page);
    await btn(page, 'Zurück').click();
    await btn(page, 'Los geht’s').click(); // zweiter Begleiter
    await page.locator('.close-button').hover();
    await page.mouse.down();
    await page.clock.runFor(700);
    await page.mouse.up();
    await btn(page, 'Zurück').click();
    await expect(page.locator('[data-view="sleep"]')).toBeVisible();
    await sleepView(page);
    await adminView(page);
    await settle(page);
    expect(foreign).toEqual([]);
  });

  test('Selbsttest: die Prüfungen erkennen Rot/Grün und kleine Schaltflächen', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await page.evaluate(() => {
      const b = document.createElement('button');
      b.textContent = 'klein';
      b.style.cssText = 'position:absolute;left:0;top:0;width:40px;height:40px;background:#2e9d3a';
      document.body.append(b);
    });
    expect(await redOrGreen(page)).toContainEqual(expect.stringContaining('backgroundColor'));
    expect(await smallButtons(page)).toContainEqual('klein 40×40');
  });
});
