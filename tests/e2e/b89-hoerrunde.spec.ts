// Hörrunde (B-89): Fremdwort hören, Bild und deutsches Wort per Auge aufdecken; eigener
// Lernstand und eigenes Tutorial; Modus statt Dauer auf der Startseite.
import { expect, test, type Page } from './fixtures';
import { mediaCalls } from './helpers';
import words from '../../src/data/words.json' with { type: 'json' };
import { btn, hold, listenView, prepare, stored, storeOnce } from './views';

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const plays = async (page: Page) =>
  (await mediaCalls(page)).filter((c) => c.op === 'play').map((c) => c.src);
const entry = (box: number) => ({ box, seen: 2, lastSeenAt: '2026-10-29T10:00:00.000Z' });

/** Stand vor dem ersten Laden: Hörrunde gewählt, Lernstände je Modus. */
async function seed(page: Page, data: object = {}) {
  await storeOnce(page, {
    version: 1,
    settings: { companion: 'mimi', language: 'fr', mode: 'listen' },
    ...data,
  });
}

const wordId = (page: Page) => page.locator('.word-card').getAttribute('data-word-id');
const french = (id: string) => words.find((w) => w.id === id)!.fr;

test.describe('B-89 Hörrunde', () => {
  test(
    'AT-89.4: Fremdwort sofort da und abgespielt, Bild per Auge aufdecken',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await listenView(page);
      const id = (await wordId(page))!;
      // in der Mitte die Fremdwortkarte, rechts die Bildkarte
      const answer = (await page.locator('.round__answer').boundingBox())!;
      const card = (await page.locator('.word-card').boundingBox())!;
      const avatar = (await page.locator('.round__avatar').boundingBox())!;
      expect(avatar.x).toBeLessThan(answer.x);
      expect(answer.x + answer.width).toBeLessThanOrEqual(card.x);
      expect(card.width).toBeCloseTo(answer.width, 0);
      await expect(page.locator('.round__foreign')).toHaveText(french(id));
      await expect.poll(() => plays(page)).toEqual([`/mimi_mots/audio/fr/${id}.mp3`]);

      // verdeckt: nur der Auge-Button, keine Bewertung
      await expect(page.locator('.word-card__emoji')).toBeHidden();
      await expect(page.locator('.word-card__de')).toBeHidden();
      const reveal = btn(page, 'Zeig mir das deutsche Wort');
      await expect(reveal).toBeVisible();
      await expect(page.locator('.round__rating')).toBeHidden();

      // Lautsprecher spielt erneut, deckt aber nicht auf
      await btn(page, 'Auf Französisch anhören').click();
      await expect.poll(async () => (await plays(page)).length).toBe(2);
      await expect(view(page, 'round')).toHaveAttribute('data-revealed', 'false');

      await reveal.click();
      await expect(view(page, 'round')).toHaveAttribute('data-revealed', 'true');
      await expect(page.locator('.word-card__emoji')).toBeVisible();
      await expect(page.locator('.word-card__de .word-card__syllable').first()).toBeVisible();
      await expect(reveal).toBeHidden();
      await expect(btn(page, 'Wusste ich')).toBeVisible();
      await expect(btn(page, 'Noch üben')).toBeVisible();
      expect(await plays(page)).toHaveLength(2); // Aufdecken spielt nicht

      // nächstes Wort: wieder verdeckt und einmal abgespielt
      await btn(page, 'Wusste ich').click();
      await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', id);
      await expect(view(page, 'round')).toHaveAttribute('data-revealed', 'false');
      const next = (await wordId(page))!;
      await expect
        .poll(async () => (await plays(page)).at(-1))
        .toBe(`/mimi_mots/audio/fr/${next}.mp3`);
      expect(await plays(page)).toHaveLength(3);
    },
  );

  test('AT-89.5: Bewertungen landen im Hör-Lernstand, der Sprech-Lernstand bleibt', async ({
    page,
  }) => {
    await prepare(page);
    await seed(page, { progress: { fr: { hund: entry(3) } } });
    await page.goto('./');
    await btn(page, 'Los geht’s').click();
    const id = (await wordId(page))!;
    await btn(page, 'Zeig mir das deutsche Wort').click();
    await btn(page, 'Noch üben').click();
    await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', id);
    const data = await stored(page);
    expect(data.listenProgress.fr[id]).toMatchObject({ box: 0, seen: 1 });
    expect(data.progress.fr).toEqual({ hund: entry(3) });
  });

  test(
    'AT-89.7: Elternbereich zeigt den Lernstand je Modus, Zurücksetzen nur für diesen',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page);
      await seed(page, {
        progress: { fr: { hund: entry(3) } },
        listenProgress: { fr: { katze: entry(1), maus: entry(1) } },
      });
      await page.goto('./');
      await hold(page, '.app-header__icon');
      await expect(view(page, 'admin')).toBeVisible();
      const level = (name: string) =>
        page.locator(`.admin__level[data-level="${name}"] .admin__word`);

      // Modi vor den Flaggen, gleiche Symbole wie auf der Startseite
      const speak = btn(page, 'Sprechen');
      const listen = btn(page, 'Hören');
      await expect(speak.locator('svg[data-icon="speak"]')).toBeVisible();
      await expect(listen.locator('svg[data-icon="listen"]')).toBeVisible();
      const flag = (await btn(page, 'Englisch').boundingBox())!;
      expect((await listen.boundingBox())!.x).toBeLessThan(flag.x);
      await expect(listen).toHaveAttribute('aria-pressed', 'true'); // wie zuletzt gewählt

      await expect(level('1')).toHaveCount(2);
      await expect(level('3')).toHaveCount(0);
      await speak.click();
      await expect(level('3')).toHaveCount(1);
      await expect(level('1')).toHaveCount(0);

      await listen.click();
      await btn(page, 'Lernstand zurücksetzen').click();
      await expect(page.locator('.admin__question')).toHaveText(
        'Französisch, Hören: Wirklich zurücksetzen?',
      );
      const fits = await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          [...document.querySelectorAll('.admin__toolbar button')].every(
            (b) => b.getBoundingClientRect().right <= innerWidth,
          ),
      );
      expect(fits).toBe(true);
      await btn(page, 'Ja, zurücksetzen').click();
      await expect(level('1')).toHaveCount(0);
      const data = await stored(page);
      expect(data.listenProgress.fr).toEqual({});
      expect(data.progress.fr).toEqual({ hund: entry(3) });

      // ausgeschaltete Wörter (B-88) gelten in beiden Modi
      await page.locator('.admin__word[data-word-id="hund"]').click();
      await speak.click();
      await expect(page.locator('.admin__word[data-word-id="hund"]')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    },
  );
});

test.describe('B-89 Tutorial der Hörrunde', () => {
  test.use({ tutorial: true });

  type Blur = 'none' | 'all' | 'word';
  const STEPS: [string, string, string | null, Blur][] = [
    ['Hallo! Jetzt spitzen wir die Ohren.', 'waving', null, 'all'],
    ['Lass uns mal sehen, wie das Zuhören geht.', 'idle', null, 'all'],
    ['Hör gut zu: Hier ist das Wort.', 'pointing', 'round__answer', 'word'],
    ['Tippe hier, um es noch mal zu hören.', 'pointing', 'Auf Französisch anhören', 'word'],
    [
      'Was bedeutet es? Tippe hier, dann siehst du es.',
      'pointing',
      'Zeig mir das deutsche Wort',
      'none',
    ],
    ['Hast du es gewusst? Dann tippe hier.', 'sitting', 'Wusste ich', 'none'],
    ['Wusstest du es noch nicht? Dann tippe hier.', 'sitting', 'Noch üben', 'none'],
    ['Das Wort kommt dann später wieder.', 'sitting', 'Noch üben', 'none'],
    [
      'Nach einiger Zeit werde ich müde und möchte mich hinlegen.',
      'pointing',
      'round__timer',
      'all',
    ],
    ['Los geht’s!', 'waving', null, 'all'],
  ];

  /** Nächster Schritt: nur „Weiter“ schaltet weiter (B-95). */
  const next = (page: Page) => btn(page, 'Weiter').click();

  test('AT-89.6: eigenes Tutorial beim ersten Mal in der Hörrunde', async ({ page }) => {
    await prepare(page);
    await seed(page, { tutorialDone: true, listenTutorialDone: false });
    await page.goto('./');
    await btn(page, 'Los geht’s').click();
    await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', 'apfel');
    await expect(page.locator('.round__foreign')).toHaveText('la pomme');
    const bubble = page.locator('.tutorial-bubble');
    const target = page.locator('.tutorial-target');
    for (const [i, [text, pose, mark, blur]] of STEPS.entries()) {
      await expect(bubble, `Schritt ${i + 1}`).toHaveText(text);
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(12);
      await expect(page.locator('.round__avatar img')).toHaveAttribute(
        'src',
        new RegExp(`cat_${pose}`),
      );
      await expect(view(page, 'round')).toHaveAttribute('data-tutorial-blur', blur);
      if (mark === null) {
        await expect(target).toHaveCount(0);
      } else {
        const name =
          (await target.getAttribute('aria-label')) ?? (await target.getAttribute('class'));
        expect(name).toContain(mark);
      }
      // Bildkarte erst nach dem Auge-Schritt aufgedeckt
      await expect(view(page, 'round')).toHaveAttribute('data-revealed', String(i >= 5));
      // beim Zeigen auf das Wort wird es einmal abgespielt
      if (i === 2) {
        await expect.poll(() => plays(page)).toEqual(['/mimi_mots/audio/fr/apfel.mp3']);
      }
      await next(page);
    }
    await expect(bubble).toBeHidden();
    const data = await stored(page);
    expect(data.listenTutorialDone).toBe(true);
    expect(data.listenProgress.fr).toEqual({});
  });

  test(
    'AT-89.6: Tutorials im Elternbereich je Modus zurücksetzen',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page);
      await seed(page, { tutorialDone: true, listenTutorialDone: true });
      await page.goto('./');
      await hold(page, '.app-header__icon');
      await page.getByRole('tab', { name: 'Sonstiges' }).click();
      await expect(page.locator('.admin__title')).toContainText([
        'Tutorial Sprechen',
        'Tutorial Hören',
      ]);
      await btn(page, 'Hören zurücksetzen').click();
      await expect(btn(page, 'Hören zurücksetzen')).toBeDisabled();
      await expect(btn(page, 'Sprechen zurücksetzen')).toBeEnabled();
      expect(await stored(page)).toMatchObject({ tutorialDone: true, listenTutorialDone: false });
      const fits = await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      );
      expect(fits).toBe(true);
    },
  );

  test('AT-89.6: Abbruch lässt das Tutorial offen; Sprechen hat sein eigenes', async ({ page }) => {
    await prepare(page);
    await seed(page, { tutorialDone: false, listenTutorialDone: false });
    await page.goto('./');
    await btn(page, 'Los geht’s').click();
    await expect(page.locator('.tutorial-bubble')).toHaveText(STEPS[0][0]);
    await next(page);
    await hold(page, '.close-button');
    await expect(view(page, 'start')).toBeVisible();
    expect((await stored(page)).listenTutorialDone).toBe(false);
    await btn(page, 'Sprechen').click();
    await btn(page, 'Los geht’s').click();
    await expect(page.locator('.tutorial-bubble')).toHaveText('Hallo! Schön, dass du da bist!');
  });
});
