import { expect, test, type Page } from './fixtures';
import { btn, hold, prepare, stored, storeOnce, TODAY } from './views';

// B-106: Wörter im Elternbereich per Ziehen in eine andere Stufe legen.
const entry = { box: 3, seen: 4, lastSeenAt: '2026-10-29T10:00:00.000Z' };
const word = (page: Page, id: string) => page.locator(`.admin__word[data-word-id="${id}"]`);
const row = (page: Page, level: string) => page.locator(`.admin__level[data-level="${level}"]`);
const inRow = (page: Page, level: string, id: string) =>
  row(page, level).locator(`.admin__word[data-word-id="${id}"]`);

/** Französisch; Hund in Stufe 3 (Sprechen und Hören), Englisch ebenso. */
async function seed(page: Page, disabled: string[] = []) {
  await prepare(page);
  await storeOnce(page, {
    settings: { companion: 'mimi', language: 'fr', mode: 'speak' },
    progress: { en: { hund: entry }, fr: { hund: entry } },
    listenProgress: { en: {}, fr: { hund: entry } },
    tutorialDone: true,
    listenTutorialDone: true,
    disabledWords: { fr: disabled },
  });
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await expect(page.locator('[data-view="admin"]')).toBeVisible();
}

const center = async (page: Page, selector: string) => {
  const box = (await page.locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Mit der Maus vom Wort in die Zeile ziehen (Mitte des freien Bereichs der Zeile). */
async function dragMouse(page: Page, id: string, level: string, release = true) {
  const from = await center(page, `.admin__word[data-word-id="${id}"]`);
  const to = await center(page, `.admin__level[data-level="${level}"] .admin__words`);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  if (release) await page.mouse.up();
}

/** Dasselbe mit Touch-Pointer-Events (wie auf dem iPad). */
async function dragTouch(page: Page, id: string, level: string) {
  const from = await center(page, `.admin__word[data-word-id="${id}"]`);
  const to = await center(page, `.admin__level[data-level="${level}"] .admin__words`);
  await page.evaluate(
    ({ id, from, to }) => {
      const chip = document.querySelector(`.admin__word[data-word-id="${id}"]`)!;
      const fire = (target: EventTarget, type: string, x: number, y: number) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 7,
            pointerType: 'touch',
            isPrimary: true,
            button: type === 'pointermove' ? -1 : 0,
            clientX: x,
            clientY: y,
          }),
        );
      fire(chip, 'pointerdown', from.x, from.y);
      for (let i = 1; i <= 6; i++) {
        const x = from.x + ((to.x - from.x) * i) / 6;
        const y = from.y + ((to.y - from.y) * i) / 6;
        fire(document.elementFromPoint(x, y) ?? document, 'pointermove', x, y);
      }
      fire(document.elementFromPoint(to.x, to.y) ?? document, 'pointerup', to.x, to.y);
    },
    { id, from, to },
  );
}

const count = (page: Page, level: string) =>
  row(page, level).locator('.admin__title').textContent();

test.describe('B-106 Wörter per Ziehen in eine Stufe legen', () => {
  test('AT-106.1: Wort mit Lernstand in eine andere Stufe ziehen', async ({ page }) => {
    await seed(page);
    await expect(count(page, '3')).resolves.toBe('Stufe 3 · 1');
    await dragMouse(page, 'hund', '1');
    await expect(inRow(page, '1', 'hund')).toBeVisible();
    await expect(row(page, '3').locator('.admin__word')).toHaveCount(0);
    await expect(row(page, '3').locator('.admin__title')).toHaveText('Stufe 3 · 0');
    await expect(row(page, '1').locator('.admin__title')).toHaveText('Stufe 1 · 1');
    const data = await stored(page);
    expect(data.progress.fr.hund).toEqual({ ...entry, box: 1 });
    expect(data.listenProgress.fr.hund).toEqual(entry);
    expect(data.progress.en.hund).toEqual(entry);
  });

  test('AT-106.2: neues Wort in eine Stufe ziehen legt einen Lernstand an', async ({ page }) => {
    await seed(page);
    await dragMouse(page, 'katze', '2');
    await expect(inRow(page, '2', 'katze')).toBeVisible();
    const data = await stored(page);
    const { lastSeenAt, ...rest } = data.progress.fr.katze;
    expect(rest).toEqual({ box: 2, seen: 0 });
    const ms = Date.parse(lastSeenAt) - TODAY.getTime(); // Uhr läuft ab TODAY weiter
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(ms).toBeLessThan(60_000);
  });

  test('AT-106.3: in „Neu“ ziehen löscht den Lernstand nur hier', async ({ page }) => {
    await seed(page);
    await dragMouse(page, 'hund', 'neu');
    await expect(inRow(page, 'neu', 'hund')).toBeVisible();
    const data = await stored(page);
    expect(data.progress.fr).toEqual({});
    expect(data.listenProgress.fr.hund).toEqual(entry);
    expect(data.progress.en.hund).toEqual(entry);
  });

  test('AT-106.4: Tippen schaltet, Ziehen nicht; ausgeschaltet bleibt aus', async ({ page }) => {
    await seed(page, ['hund']);
    await expect(word(page, 'hund')).toHaveAttribute('aria-pressed', 'false');
    await dragMouse(page, 'hund', '0');
    await expect(inRow(page, '0', 'hund')).toHaveAttribute('aria-pressed', 'false');
    let data = await stored(page);
    expect(data.disabledWords.fr).toEqual(['hund']);
    expect(data.progress.fr.hund.box).toBe(0);

    await word(page, 'hund').click(); // Tipp ohne Bewegung schaltet wieder ein
    await expect(word(page, 'hund')).toHaveAttribute('aria-pressed', 'true');
    data = await stored(page);
    expect(data.disabledWords.fr).toEqual([]);
  });

  test('AT-106.5: Ziel hervorgehoben, eigene Zeile oder außerhalb ändert nichts', async ({
    page,
  }) => {
    await seed(page);
    await dragMouse(page, 'hund', '0', false);
    await expect(page.locator('.drag-ghost')).toHaveCount(1);
    await expect(page.locator('.drag-ghost')).toHaveAttribute('aria-hidden', 'true');
    await expect(row(page, '0')).toHaveAttribute('data-drop-target', 'true');
    await expect(page.locator('[data-drop-target]')).toHaveCount(1);
    const look = await row(page, '0').evaluate((e) => {
      const s = getComputedStyle(e);
      return { background: s.backgroundColor, shadow: s.boxShadow };
    });
    expect(look.background).toBe('rgb(237, 228, 244)'); // --lila-100
    expect(look.shadow).toContain('rgb(106, 76, 156)'); // --lila-700, kein Rot/Grün
    await page.mouse.up();
    await expect(inRow(page, '0', 'hund')).toBeVisible();
    await expect(page.locator('.drag-ghost, [data-drop-target], [data-dragging]')).toHaveCount(0);

    // zurück auf die eigene Zeile: unverändert
    const before = await stored(page);
    await dragMouse(page, 'hund', '0');
    expect(await stored(page)).toEqual(before);

    // außerhalb der Zeilen (Kopfleiste) loslassen: unverändert
    const from = await center(page, '.admin__word[data-word-id="hund"]');
    const out = await center(page, '.app-header');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(out.x, out.y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('.drag-ghost, [data-drop-target]')).toHaveCount(0);
    expect(await stored(page)).toEqual(before);
    await expect(word(page, 'hund')).toHaveAttribute('aria-pressed', 'true');
  });

  test('AT-106.6: Touch und Modus Hören', async ({ page }) => {
    await seed(page);
    await btn(page, 'Hören').click();
    await dragTouch(page, 'hund', '4');
    await expect(inRow(page, '4', 'hund')).toBeVisible();
    const data = await stored(page);
    expect(data.listenProgress.fr.hund).toEqual({ ...entry, box: 4 });
    expect(data.progress.fr.hund).toEqual(entry);
    await expect(word(page, 'hund')).toHaveAttribute('aria-pressed', 'true');
  });
});
