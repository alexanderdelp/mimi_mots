import { expect, test, type Page } from './fixtures';
import { btn, prepare } from './views';

test.use({ tutorial: true }); // hier soll das Tutorial erscheinen

const KEY = 'mimi-mots:v1';
const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const bubble = (page: Page) => page.locator('.tutorial-bubble');
const target = (page: Page) => page.locator('.tutorial-target');

async function hold(page: Page, selector: string, ms = 700) {
  const box = (await page.locator(selector).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

async function startRound(page: Page) {
  await btn(page, 'Mots').click();
  await btn(page, 'Französisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(view(page, 'round')).toBeVisible();
}

/** Ein Tipp irgendwohin (auf die Wortkarte) – für Sprechblasen ohne Ziel. */
const tapAnywhere = (page: Page) => page.locator('.word-card').click();

async function runTutorial(page: Page) {
  await tapAnywhere(page);
  await tapAnywhere(page);
  await btn(page, 'Auf Französisch anhören').click();
  await btn(page, 'Wusste ich').click();
  await btn(page, 'Noch üben').click();
  await tapAnywhere(page);
  await expect(bubble(page)).toBeHidden();
}

test.describe('B-74 Tutorial', () => {
  test('AT-74.1–74.3: drei Schritte mit Mimi und Probewort, danach normale Runde', async ({
    page,
  }) => {
    await prepare(page);
    await page.goto('./');
    await startRound(page);
    // AT-74.1: Mimi (obwohl Mots gewählt), Probewort Apfel, Uhr steht
    await expect(page.locator('.round__avatar img')).toHaveAttribute('src', /cat_waving/);
    await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', 'apfel');
    await expect(btn(page, 'Beenden')).toBeVisible();
    const dial = page.locator('.round__timer svg');
    const before = await dial.innerHTML();
    await page.clock.runFor(5000);
    expect(await dial.innerHTML()).toBe(before);

    // AT-74.2: Begrüßung – ein Tipp irgendwohin geht weiter, ohne dass ein Button wirkt
    await expect(bubble(page)).toHaveText('Schön, dass du da bist!');
    await expect(page.locator('.round__avatar img')).toHaveAttribute('src', /cat_waving/);
    await expect(target(page)).toHaveCount(0);
    await btn(page, 'Auf Französisch anhören').click();
    await expect(page.locator('.round__foreign')).toHaveText('');
    await expect(bubble(page)).toHaveText('Ich erkläre dir, was du hier machst.');
    await expect(page.locator('.round__avatar img')).toHaveAttribute('src', /cat_pointing/);
    await tapAnywhere(page);
    // Schritt 1 – Lautsprecher, mit dem Stift eingekreist
    await expect(bubble(page)).toHaveText('Tippe hier – so klingt das Wort.');
    await expect(target(page).locator('.tutorial-mark path')).toHaveCSS(
      'stroke',
      'rgb(176, 58, 117)',
    );
    const ring = (await target(page).locator('.tutorial-mark').boundingBox())!;
    expect(ring.width).toBeGreaterThan(ring.height * 1.3); // oval, nicht kreisrund
    await expect(target(page)).toHaveAttribute('aria-label', 'Auf Französisch anhören');
    await btn(page, 'Auf Französisch anhören').click();
    await expect(page.locator('.round__foreign')).toHaveText('la pomme');
    // Schritt 2 – Daumen; der andere Button wirkt nicht
    await expect(bubble(page)).toHaveText('Wusstest du es? Dann tippe hier.');
    await expect(target(page)).toHaveAttribute('aria-label', 'Wusste ich');
    await btn(page, 'Noch üben').click();
    await expect(bubble(page)).toHaveText('Wusstest du es? Dann tippe hier.');
    await btn(page, 'Wusste ich').click();
    // Schritt 3 – Wiederholen
    await expect(bubble(page)).toHaveText('Noch nicht? Dann tippe hier.');
    await expect(target(page)).toHaveAttribute('aria-label', 'Noch üben');
    await btn(page, 'Noch üben').click();
    // Abschluss-Blase, dann ein Tipp irgendwohin
    await expect(bubble(page)).toHaveText('Und jetzt viel Erfolg – los geht’s!');
    await expect(target(page)).toHaveCount(0);
    await tapAnywhere(page);

    // AT-74.3: normale Runde mit Mots, Uhr läuft, Lernstand ohne Probewort
    await expect(bubble(page)).toBeHidden();
    await expect(target(page)).toHaveCount(0);
    await expect(page.locator('.round__avatar img')).toHaveAttribute('src', /pony_/);
    await page.clock.runFor(5000);
    expect(await dial.innerHTML()).not.toBe(before);
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.tutorialDone).toBe(true);
    expect(stored.progress.fr).toEqual({});
  });

  test('AT-74.4: kommt nur einmal, im Elternbereich zurücksetzbar', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await startRound(page);
    await runTutorial(page);
    await hold(page, '.close-button');
    await btn(page, 'Zurück').click();
    await page.reload();
    await btn(page, 'Los geht’s').click(); // Mimi und 7 Minuten sind übrig
    await expect(view(page, 'round')).toBeVisible();
    await expect(bubble(page)).toBeHidden();
    await hold(page, '.close-button');
    await btn(page, 'Zurück').click();

    // Schlafseite → Elternbereich: Tutorial zurücksetzen, aufwecken, nächste Runde zeigt es
    await hold(page, '.app-header__icon');
    await btn(page, 'Tutorial zurücksetzen').click();
    await expect(btn(page, 'Tutorial zurücksetzen')).toBeDisabled();
    await btn(page, 'Tiere aufwecken').click();
    await btn(page, 'Zurück').click();
    await btn(page, 'Los geht’s').click();
    await expect(bubble(page)).toHaveText('Schön, dass du da bist!');
  });
});
