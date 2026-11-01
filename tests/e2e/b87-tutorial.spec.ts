// Tutorial (B-74, Ablauf seit B-87): der gewählte Begleiter erklärt an einem Probewort; jeder Tipp
// geht weiter, das Gemeinte wird mit dem Stift eingekreist, zu Beginn ist alles andere unscharf.
import { expect, test, type Page } from './fixtures';
import { mediaCalls } from './helpers';
import { btn, hold, prepare, stored } from './views';

test.use({ tutorial: true }); // hier soll das Tutorial erscheinen

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const bubble = (page: Page) => page.locator('.tutorial-bubble');
const target = (page: Page) => page.locator('.tutorial-target');
const avatarSrc = (page: Page) => page.locator('.round__avatar img');

async function startRound(page: Page) {
  await btn(page, 'Mots').click();
  await btn(page, 'Französisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(view(page, 'round')).toBeVisible();
}

/** Ein Tipp irgendwohin – auf die leere Fläche unten in der Mitte. */
async function tapAnywhere(page: Page) {
  const { width, height } = page.viewportSize()!;
  await page.mouse.click(width / 2, height - 8);
}

type Blur = 'none' | 'all' | 'answer';
/** Text, Pose (Dateiname), eingekreistes Element (Name bzw. Klasse), unscharf */
const STEPS: [string, string, string | null, Blur][] = [
  ['Hallo! Schön, dass du da bist!', 'waving', null, 'all'],
  ['Lass uns mal sehen, was du hier machen kannst.', 'idle', null, 'all'],
  ['Hier ist das Wort zum Übersetzen.', 'pointing', 'word-card', 'answer'],
  ['Sprich das übersetzte Wort laut aus.', 'pointing', 'round__flag', 'none'],
  ['Tippe hier, um es anzuhören.', 'pointing', 'Auf Französisch anhören', 'none'],
  ['Hast du es gewusst? Dann tippe hier.', 'sitting', 'Wusste ich', 'none'],
  ['Wusstest du es noch nicht? Dann tippe hier.', 'sitting', 'Noch üben', 'none'],
  ['Das Wort kommt dann später wieder.', 'sitting', 'Noch üben', 'none'],
  ['Nach einiger Zeit werde ich müde und möchte mich hinlegen.', 'pointing', 'round__timer', 'all'],
  ['Los geht’s!', 'waving', null, 'all'],
];

/** Welche Teile je Blur-Modus unscharf sind (Kopfleiste, Begleiter, Sprechblase und Uhr nie). */
const BLURRED: Record<Blur, string[]> = {
  none: [],
  all: ['.word-card', '.round__answer'],
  answer: ['.round__answer'],
};
const PARTS = [
  '.word-card',
  '.round__answer',
  '.close-button',
  '.app-header__brand',
  '.round__timer',
  '.round__avatar',
];
const isBlurred = (page: Page, selector: string) =>
  page.locator(selector).evaluate((e) => getComputedStyle(e).filter.includes('blur'));

test.describe('B-87 Tutorial', () => {
  test(
    'AT-87.2–87.5: Ablauf mit Begleiter, Blur, Umkreisungen; danach normale Runde',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page);
      await page.goto('./');
      await startRound(page);
      await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', 'apfel');
      const dial = page.locator('.round__timer svg');
      const before = await dial.innerHTML();
      await page.clock.runFor(5000);
      expect(await dial.innerHTML()).toBe(before); // Uhr steht

      const vp = page.viewportSize()!;
      for (const [i, [text, pose, mark, blur]] of STEPS.entries()) {
        await expect(bubble(page), `Schritt ${i + 1}`).toHaveText(text);
        // AT-87.2: der gewählte Begleiter (Mots) spricht, Pose je Schritt
        await expect(avatarSrc(page)).toHaveAttribute('src', new RegExp(`pony_${pose}`));
        // AT-87.6: die Uhr erscheint erst mit ihrem Schritt
        if (i < 8) await expect(page.locator('.round__timer')).toBeHidden();
        else await expect(page.locator('.round__timer')).toBeVisible();
        // AT-87.3: Fokus – je Schritt ist genau das Richtige unscharf (Übergang ≤ 200 ms abwarten)
        await expect(view(page, 'round')).toHaveAttribute('data-tutorial-blur', blur);
        for (const part of PARTS) {
          await expect
            .poll(() => isBlurred(page, part), `${part} in Schritt ${i + 1}`)
            .toBe(BLURRED[blur].includes(part));
        }
        // AT-87.4: das Gemeinte ist eingekreist, der Kreis bleibt im Bild
        if (mark === null) {
          await expect(target(page)).toHaveCount(0);
        } else {
          await expect(target(page)).toHaveCount(1);
          const name =
            (await target(page).getAttribute('aria-label')) ??
            (await target(page).getAttribute('class'));
          expect(name).toContain(mark);
          const ring = (await page.locator('.tutorial-mark').boundingBox())!;
          const box = (await target(page).boundingBox())!;
          expect(ring.x).toBeLessThan(box.x); // umschließt das Ziel
          expect(ring.x + ring.width).toBeGreaterThan(box.x + box.width);
          expect(ring.x).toBeGreaterThanOrEqual(-1);
          expect(ring.y).toBeGreaterThanOrEqual(-1);
          expect(ring.x + ring.width).toBeLessThanOrEqual(vp.width + 1);
          await expect(page.locator('.tutorial-mark path')).toHaveCSS(
            'stroke',
            'rgb(176, 58, 117)',
          );
        }
        // nach dem Lautsprecher ist das Probewort aufgedeckt
        if (i >= 5) await expect(page.locator('.round__foreign')).toHaveText('la pomme');
        else await expect(page.locator('.round__foreign')).toHaveText('');
        await tapAnywhere(page); // AT-87.5: ein Tipp irgendwohin geht weiter
      }

      // normale Runde mit Mots, Uhr läuft, Lernstand ohne Probewort
      await expect(bubble(page)).toBeHidden();
      await expect(target(page)).toHaveCount(0);
      await expect(view(page, 'round')).not.toHaveAttribute('data-tutorial-blur');
      await expect(page.locator('.tutorial-mark')).toHaveCount(0);
      await expect(page.locator('.round__timer')).toBeVisible();
      await page.clock.runFor(5000);
      expect(await dial.innerHTML()).not.toBe(before);
      const data = await stored(page);
      expect(data.tutorialDone).toBe(true);
      expect(data.progress.fr).toEqual({});
    },
  );

  test('AT-87.5: Buttons wirken im Tutorial nicht, gehen aber weiter; Lautsprecher spielt', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await startRound(page);
    // Schritt 1: der (unscharfe) Lautsprecher geht nur weiter – kein Aufdecken, kein Ton
    await btn(page, 'Auf Französisch anhören').click();
    await expect(bubble(page)).toHaveText(STEPS[1][0]);
    await expect(page.locator('.round__foreign')).toHaveText('');
    expect((await mediaCalls(page)).filter((c) => c.op === 'play')).toEqual([]);
    await tapAnywhere(page);
    await tapAnywhere(page);
    await tapAnywhere(page);
    await expect(bubble(page)).toHaveText(STEPS[4][0]);
    await btn(page, 'Auf Französisch anhören').click();
    await expect(bubble(page)).toHaveText(STEPS[5][0]);
    const plays = (await mediaCalls(page)).filter((c) => c.op === 'play');
    expect(plays.at(-1)).toMatchObject({ src: '/mimi_mots/audio/fr/apfel.mp3' });
    await btn(page, 'Wusste ich').click();
    await expect(bubble(page)).toHaveText(STEPS[6][0]);
    expect((await stored(page))?.progress?.fr ?? {}).toEqual({}); // nichts bewertet
  });

  test('AT-87.4: der Kreis wird gezogen (Animation), bei reduzierter Bewegung sofort', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await startRound(page);
    await tapAnywhere(page);
    await tapAnywhere(page);
    const path = page.locator('.tutorial-mark path');
    await expect(path).toHaveCSS('animation-name', 'tutorial-draw');
    // durchgängig: Strichmuster und Weglänge passen, die Schleife geht mehr als einmal herum
    await expect(path).toHaveAttribute('pathLength', '100');
    await expect(path).toHaveCSS('stroke-dasharray', '100px');
    await expect(path).toHaveCSS('animation-play-state', 'running');
    await page.clock.runFor(1000);
    await expect(path).toHaveCSS('stroke-dashoffset', '0px');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(path).toHaveCSS('animation-name', 'none');
  });

  test('AT-87.1: Abbruch im Tutorial → Auswahl, niemand schläft, Tutorial bleibt offen', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await startRound(page);
    await tapAnywhere(page);
    await hold(page, '.close-button');
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mots')).toBeEnabled();
    await expect(btn(page, 'Sprechen')).toBeEnabled();
    const data = await stored(page);
    expect(data.tutorialDone).toBe(false);
    expect(data.rest?.sleeping ?? []).toEqual([]);
    // nächste Runde zeigt das Tutorial wieder von vorn
    await btn(page, 'Los geht’s').click();
    await expect(bubble(page)).toHaveText(STEPS[0][0]);
  });

  test('AT-74.4: kommt nur einmal, im Elternbereich zurücksetzbar', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await startRound(page);
    for (let i = 0; i < STEPS.length; i++) await tapAnywhere(page);
    await expect(bubble(page)).toBeHidden();
    await hold(page, '.close-button');
    await btn(page, 'Zurück').click();
    await page.reload();
    await btn(page, 'Los geht’s').click(); // Mimi ist übrig
    await expect(view(page, 'round')).toBeVisible();
    await expect(bubble(page)).toBeHidden();
    await hold(page, '.close-button');
    await btn(page, 'Zurück').click();

    // Schlafseite → Elternbereich: Tutorial zurücksetzen, aufwecken, nächste Runde zeigt es
    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Sonstiges' }).click(); // B-83
    await btn(page, 'Sprechen zurücksetzen').click();
    await expect(btn(page, 'Sprechen zurücksetzen')).toBeDisabled();
    await btn(page, 'Tiere aufwecken').click();
    await btn(page, 'Zurück').click();
    await btn(page, 'Los geht’s').click();
    await expect(bubble(page)).toHaveText(STEPS[0][0]);
  });
});
