// „Weiter“-Button im Tutorial (B-95): nur er schaltet die Schritte weiter, alle anderen Buttons
// und Flächen tun im Tutorial nichts; der Lautsprecher spielt in seinem Schritt das Probewort.
import { expect, minSize, test, type Page } from './fixtures';
import { mediaCalls } from './helpers';
import { btn, hold, listenView, overflow, prepare, roundView, stored } from './views';

test.use({ tutorial: true }); // hier soll das Tutorial erscheinen

const STEPS = 10;
const SPEAKER = 'Auf Französisch anhören';
const round = (page: Page) => page.locator('[data-view="round"]');
const bubble = (page: Page) => page.locator('.tutorial-bubble');
const next = (page: Page) => btn(page, 'Weiter');
const step = (page: Page) => round(page).getAttribute('data-tutorial');
const plays = async (page: Page) =>
  (await mediaCalls(page)).filter((c) => c.op === 'play').map((c) => c.src);

type Mode = 'speak' | 'listen';
const MODES: Mode[] = ['speak', 'listen'];

/** Öffnet das Tutorial des Modus (Französisch, Mimi). */
async function openTutorial(page: Page, mode: Mode) {
  await prepare(page, mode === 'speak' ? { tutorial: true } : { listenTutorial: true });
  if (mode === 'speak') await roundView(page);
  else await listenView(page);
  await expect(round(page)).toHaveAttribute('data-tutorial', '1');
}

/** Tipp per Maus auf die Mitte eines Elements – auch wenn es (noch) unsichtbar ist. */
async function tapCenter(page: Page, selector: string) {
  const box = (await page.locator(selector).first().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** Alles, was im Tutorial nichts tun darf (außer dem Lautsprecher in seinem Schritt). */
const ELSEWHERE = [
  '.word-card .word-card__emoji',
  '.round__answer .round__flag',
  '.round__avatar img',
  '.tutorial-bubble__text',
  '[aria-label="Wusste ich"]',
  '[aria-label="Noch üben"]',
  '.app-header__brand',
];

test.describe('B-95 „Weiter“-Button im Tutorial', () => {
  for (const mode of MODES) {
    test(
      `AT-95.1/95.5 (${mode}): in jedem Schritt rund, lila, nur Pfeil, groß genug, scharf, frei; alles passt`,
      { tag: '@layout' },
      async ({ page }) => {
        await openTutorial(page, mode);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const vp = page.viewportSize()!;
        for (let i = 1; i <= STEPS; i++) {
          await expect(round(page)).toHaveAttribute('data-tutorial', String(i));
          const button = next(page);
          await expect(button, `Schritt ${i}`).toBeVisible();
          // AT-95.1: rund, lila, nur ein Pfeil-Symbol (kein sichtbarer Text)
          await expect(button).toHaveCSS('background-color', 'rgb(106, 76, 156)');
          await expect(button).toHaveCSS('border-radius', '50%');
          await expect(button.locator('svg[data-icon="next"]')).toHaveCount(1);
          await expect(button).toHaveText('');
          // bei der Sprechblase, groß genug, ganz im Bild
          await expect(bubble(page).locator('.tutorial-next')).toHaveCount(1);
          const box = (await button.boundingBox())!;
          expect(box.width).toBeGreaterThanOrEqual(minSize(88));
          expect(box.height).toBeGreaterThanOrEqual(minSize(88));
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
          expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
          // nie unscharf: weder der Button noch etwas um ihn herum
          const blurred = await button.evaluate((e) => {
            for (let n: Element | null = e; n; n = n.parentElement) {
              if (getComputedStyle(n).filter.includes('blur')) return true;
            }
            return false;
          });
          expect(blurred, `Schritt ${i} unscharf`).toBe(false);
          // verdeckt nichts und wird von nichts verdeckt (auch nicht vom Kreis)
          const covered = await button.evaluate((e) => {
            const r = e.getBoundingClientRect();
            const hit = (a: DOMRect, b: DOMRect) =>
              a.left < b.right - 0.5 &&
              b.left < a.right - 0.5 &&
              a.top < b.bottom - 0.5 &&
              b.top < a.bottom - 0.5;
            const others = [
              '.round__avatar .avatar',
              '.round-card',
              '.round__rating .round-button',
              '.app-header',
              '.tutorial-mark',
              '.tutorial-bubble__text',
            ];
            const out = others.flatMap((s) =>
              [...document.querySelectorAll(s)]
                .filter((o) => hit(r, o.getBoundingClientRect()))
                .map(() => s),
            );
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (!e.contains(top)) out.push(`oben: ${top?.className}`);
            return out;
          });
          expect(covered, `Schritt ${i}`).toEqual([]);
          // AT-95.5: alles passt auf den Bildschirm
          expect(await overflow(page), `Schritt ${i}`).toEqual([]);
          await button.click();
        }
        // nach dem Tutorial ist der Button weg
        await expect(round(page)).not.toHaveAttribute('data-tutorial');
        await expect(next(page)).toHaveCount(0);
      },
    );

    test(`AT-95.2 (${mode}): nur „Weiter“ schaltet weiter; nichts bewertet, nichts aufgedeckt`, async ({
      page,
    }) => {
      await openTutorial(page, mode);
      const revealed = mode === 'listen' ? 'data-revealed' : null;
      for (let i = 1; i <= STEPS; i++) {
        const before = {
          text: await bubble(page).textContent(),
          foreign: await page.locator('.round__foreign').textContent(),
          revealed: revealed && (await round(page).getAttribute(revealed)),
        };
        const taps = [
          ...ELSEWHERE,
          '.speak-button',
          ...(mode === 'listen' ? ['.reveal-button'] : []),
        ];
        for (const target of taps) await tapCenter(page, target);
        // auf die leere Fläche unten in der Mitte
        const vp = page.viewportSize()!;
        await page.mouse.click(vp.width / 2, vp.height - 8);
        expect(await step(page), `Schritt ${i}`).toBe(String(i));
        await expect(bubble(page)).toHaveText(before.text!);
        await expect(page.locator('.round__foreign')).toHaveText(before.foreign!);
        if (revealed) await expect(round(page)).toHaveAttribute(revealed, before.revealed!);
        await next(page).click();
      }
      // „Weiter“ im letzten Schritt beginnt die Runde mit dem ersten echten Wort
      await expect(bubble(page)).toBeHidden();
      await expect(round(page)).not.toHaveAttribute('data-tutorial');
      await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', /.+/);
      const data = await stored(page);
      expect(data[mode === 'speak' ? 'tutorialDone' : 'listenTutorialDone']).toBe(true);
      expect(data[mode === 'speak' ? 'progress' : 'listenProgress'].fr).toEqual({});
    });
  }

  test('AT-95.3: Lautsprecher spielt nur in seinem Schritt (auch mehrmals), danach aufgedeckt', async ({
    page,
  }) => {
    await openTutorial(page, 'speak');
    for (let i = 1; i <= 4; i++) {
      await btn(page, SPEAKER).click();
      expect(await step(page)).toBe(String(i));
      if (i < 4) await next(page).click();
    }
    expect(await plays(page)).toEqual([]); // Schritte 1–4: nichts
    await next(page).click();
    await expect(round(page)).toHaveAttribute('data-tutorial', '5'); // Lautsprecher-Schritt
    await expect(page.locator('.round__foreign')).toHaveText('');
    await btn(page, SPEAKER).click();
    await btn(page, SPEAKER).click();
    await expect
      .poll(() => plays(page))
      .toEqual(['/mimi_mots/audio/fr/apfel.mp3', '/mimi_mots/audio/fr/apfel.mp3']);
    expect(await step(page)).toBe('5');
    await expect(page.locator('.round__foreign')).toHaveText(''); // erst ab dem nächsten Schritt
    await next(page).click();
    await expect(page.locator('.round__foreign')).toHaveText('la pomme');
    await tapCenter(page, '.speak-button');
    expect(await plays(page)).toHaveLength(2); // im Schritt danach wieder nichts
    expect((await stored(page))?.progress?.fr ?? {}).toEqual({});
  });

  test('AT-95.3 (Hören): Lautsprecher spielt in seinem Schritt, das Auge deckt nicht auf', async ({
    page,
  }) => {
    await openTutorial(page, 'listen');
    await next(page).click();
    await next(page).click();
    await expect(round(page)).toHaveAttribute('data-tutorial', '3');
    await expect.poll(() => plays(page)).toHaveLength(1); // beim Zeigen auf das Wort einmal
    await btn(page, SPEAKER).click();
    expect(await plays(page)).toHaveLength(1);
    await next(page).click(); // Lautsprecher-Schritt
    await btn(page, SPEAKER).click();
    await btn(page, SPEAKER).click();
    await expect.poll(() => plays(page)).toHaveLength(3);
    await next(page).click(); // Auge-Schritt
    await btn(page, 'Zeig mir das deutsche Wort').click();
    await expect(round(page)).toHaveAttribute('data-revealed', 'false');
    expect(await step(page)).toBe('5');
    await next(page).click();
    await expect(round(page)).toHaveAttribute('data-revealed', 'true');
    expect((await stored(page))?.listenProgress?.fr ?? {}).toEqual({});
  });

  for (const mode of MODES) {
    test(`AT-95.4 (${mode}): [×] gehalten bricht das Tutorial ab`, async ({ page }) => {
      await openTutorial(page, mode);
      await next(page).click();
      await next(page).click();
      await page.locator('.close-button').click(); // ein Tipp bewirkt nichts
      expect(await step(page)).toBe('3');
      await hold(page, '.close-button');
      await expect(page.locator('[data-view="start"]')).toBeVisible();
      const data = await stored(page);
      expect(data[mode === 'speak' ? 'tutorialDone' : 'listenTutorialDone']).toBe(false);
      expect(data.rest?.sleeping ?? []).toEqual([]);
    });
  }
});
