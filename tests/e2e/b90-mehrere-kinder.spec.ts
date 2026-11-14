// B-90: mehrere Kinder – Begrüßung mit Kacheln, Reiter „Kinder“ im Elternbereich, Daten je Kind.
// Speicherformat bleibt v2 (konnte schon mehrere Kinder): ein Stand von 0.9.x bleibt erhalten.
import { CHILD_ID, expect, test, type Page } from './fixtures';
import { TODAY, btn, hold, overflow, settle, storeOnce, storedAll } from './views';

test.use({ greeting: true });

const ID_B = '00000000-0000-4000-8000-000000000002';
const AT = '2026-10-29T08:00:00.000Z';
const entry = (box: number) => ({ box, seen: 3, lastSeenAt: '2026-10-29T10:00:00.000Z' });

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const tiles = (page: Page) => page.locator('.welcome__child');
const tile = (page: Page, name: string) => tiles(page).filter({ hasText: name });
const headerName = (page: Page) => page.locator('.app-header__name');
const childTab = (page: Page) => page.getByRole('tab', { name: 'Kinder' });
const childRow = (page: Page, name: string) =>
  page.locator('.admin__child').filter({ hasText: name });
const addInput = (page: Page) => page.getByRole('textbox', { name: 'Name des neuen Kinds' });

/** Kind wie bis 0.9.x gespeichert – mit allem, was es gibt. */
const lina = {
  id: CHILD_ID,
  name: 'Lina',
  settings: { companion: 'mots', language: 'fr', mode: 'speak' },
  progress: { en: {}, fr: { apfel: entry(2), hund: entry(0) }, ja: {} },
  listenProgress: { en: { katze: entry(1) }, fr: {}, ja: {} },
  rest: { sleeping: [], since: null },
  enabledLanguages: ['en', 'fr'],
  tutorialDone: true,
  listenTutorialDone: true,
  brakeNew: false,
  disabledWords: { en: [], fr: [], ja: [] },
  roundMin: 7,
  enabledFlowers: ['sunflower', 'peony', 'clematis'],
  garden: { plants: [{ flower: 'peony', stage: 3 }], rounds: 1, need: 4 },
  createdAt: AT,
  updatedAt: AT,
};

const max = {
  id: ID_B,
  name: 'Max',
  settings: { companion: 'mimi', language: 'en', mode: 'speak' },
  progress: { en: { hund: entry(4) }, fr: {}, ja: {} },
  rest: { sleeping: [], since: null },
  enabledLanguages: ['en', 'fr'],
  roundMin: 5,
  createdAt: AT,
  updatedAt: AT,
};

const family = (children: object[], active = CHILD_ID) => ({
  version: 2,
  activeChildId: active,
  children,
});

/** Vier Kinder (Testnamen). */
const four = () =>
  family(
    ['Lina', 'Max', 'Emilia-Sophie', 'Ole'].map((name, i) => ({
      id: `00000000-0000-4000-8000-00000000000${i + 1}`,
      name,
      createdAt: AT,
      updatedAt: AT,
    })),
  );

async function open(page: Page, data: object) {
  await page.clock.install({ time: TODAY });
  await storeOnce(page, data);
  await page.goto('./');
  await expect(view(page, 'welcome')).toBeVisible();
}

async function admin(page: Page) {
  await hold(page, '.app-header__icon');
  await expect(view(page, 'admin')).toBeVisible();
}

async function kids(page: Page) {
  await admin(page);
  await childTab(page).click();
  await expect(page.locator('.admin__kids')).toBeVisible();
}

async function addChild(page: Page, name: string) {
  await addInput(page).fill(name);
  await btn(page, 'Kind anlegen').click();
}

const leave = (page: Page) => btn(page, 'Zurück').click();

test.describe('B-90 Mehrere Kinder', () => {
  test('AT-90.1: ein Stand von 0.9.x bleibt unverändert erhalten', async ({ page }) => {
    const before = family([lina]);
    await open(page, before);
    await expect(page.getByText('Hallo Lina!')).toBeVisible();
    await expect(tiles(page)).toHaveCount(0);
    await btn(page, 'Weiter').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(headerName(page)).toHaveText('Lina');
    // Name ist nur Text, solange es ein Kind gibt
    await expect(page.locator('.app-header__name--button')).toHaveCount(0);
    await btn(page, 'Mein Garten').click();
    await expect(view(page, 'garden').locator('.garden__plant')).toHaveCount(1);
    await btn(page, 'Zurück').click();
    await admin(page);
    await expect(page.locator('.admin__level[data-level="2"] .admin__word')).toHaveCount(1);
    await expect(page.locator('.admin__level[data-level="0"] .admin__word')).toHaveCount(1);
    await expect(childTab(page)).toContainText('Lina');
    await leave(page);
    await page.reload();
    await expect(page.getByText('Hallo Lina!')).toBeVisible();
    // nichts geändert, nichts verloren – auch keine Zeitstempel
    expect(await storedAll(page)).toEqual(before);
  });

  test('AT-90.2: zweites Kind anlegen → zwei gleich große Kacheln, Tipp wählt das Kind', async ({
    page,
  }) => {
    await open(page, family([lina]));
    await kids(page);
    await expect(childRow(page, 'Lina')).toHaveCount(1);
    await addChild(page, '  Max ');
    await expect(childRow(page, 'Max')).toHaveCount(1);
    await expect(addInput(page)).toHaveValue('');
    await leave(page);
    await expect(view(page, 'welcome')).toBeVisible();
    await expect(page.getByText('Wer bist du?')).toBeVisible();
    await expect(tiles(page)).toHaveCount(2);
    const [a, b] = await tiles(page).evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return [Math.round(r.width), Math.round(r.height)];
      }),
    );
    expect(a).toEqual(b);
    expect(a[0]).toBeGreaterThanOrEqual(88);
    expect(a[1]).toBeGreaterThanOrEqual(88);
    await tile(page, 'Max').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(headerName(page)).toHaveText('Max');
    // neues Kind: eigener Stand ab Standard
    const saved = await storedAll(page);
    const added = saved.children.find((c: { name: string }) => c.name === 'Max');
    expect(saved.activeChildId).toBe(added.id);
    expect(added.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(added.progress).toEqual({ en: {}, fr: {}, ja: {} });
    expect(added.garden.plants).toEqual([]);
    // Name in der Kopfleiste führt zurück zur Begrüßung
    await page.locator('.app-header__name--button').click();
    await expect(page.getByText('Wer bist du?')).toBeVisible();
    await tile(page, 'Lina').click();
    await expect(headerName(page)).toHaveText('Lina');
  });

  test('AT-90.2: mit mehreren Kindern startet die App auf der Begrüßung', async ({ page }) => {
    await open(
      page,
      family([lina, { ...max, rest: { sleeping: ['mimi', 'mots'], since: '2026-10-30' } }], ID_B),
    );
    await expect(page.getByText('Wer bist du?')).toBeVisible();
    await tile(page, 'Max').click();
    await expect(view(page, 'sleep')).toBeVisible(); // bei Max schlafen beide
    await page.locator('.app-header__name--button').click();
    await tile(page, 'Lina').click();
    await expect(view(page, 'start')).toBeVisible();
  });

  test('AT-90.3: Lernstand, Auswahl, Schlaf und Garten sind je Kind getrennt', async ({ page }) => {
    await open(page, family([lina, max]));
    await tile(page, 'Lina').click();
    await expect(view(page, 'start')).toBeVisible();
    await btn(page, 'Englisch').click();
    await btn(page, 'Los geht’s').click();
    await btn(page, 'Auf Englisch anhören').click();
    await page.getByRole('button', { name: /Wusste ich/ }).click();
    await hold(page, '.close-button');
    await expect(view(page, 'end')).toBeVisible();
    const saved = await storedAll(page);
    const [a, b] = saved.children;
    expect(a.settings.language).toBe('en');
    expect(Object.keys(a.progress.en)).toHaveLength(1);
    expect(a.rest.sleeping).toEqual(['mots']);
    expect(b).toMatchObject({
      name: 'Max',
      settings: max.settings,
      progress: max.progress,
      rest: max.rest,
      garden: { plants: [] },
      updatedAt: AT, // unverändert
    });
    // Max sieht seinen eigenen Stand
    await page.reload();
    await tile(page, 'Max').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mein Garten')).toHaveCount(0); // Linas Garten gehört Lina
    await expect(btn(page, 'Englisch')).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, 'Mots')).toBeEnabled(); // Mots schläft nur bei Lina
  });

  test('AT-90.4: Umbenennen ändert den Namen auf Begrüßung und Kopfleiste', async ({ page }) => {
    await open(page, family([lina, max]));
    await kids(page);
    await childRow(page, 'Max').getByRole('button', { name: 'Umbenennen' }).click();
    const input = page.getByRole('textbox', { name: 'Neuer Name für Max' });
    await expect(input).toHaveValue('Max');
    await input.fill('lina');
    await expect(page.getByText('Den Namen gibt es schon.')).toBeVisible();
    await expect(btn(page, 'Speichern')).toBeDisabled();
    await input.fill('Moritz');
    await btn(page, 'Speichern').click();
    await expect(childRow(page, 'Moritz')).toHaveCount(1);
    await expect(childRow(page, 'Max')).toHaveCount(0);
    // Name des gewählten Kinds im Reiter
    await childRow(page, 'Lina').getByRole('button', { name: 'Umbenennen' }).click();
    await page.getByRole('textbox', { name: 'Neuer Name für Lina' }).fill('Lena');
    await btn(page, 'Speichern').click();
    await expect(childTab(page)).toContainText('Lena');
    await leave(page);
    await expect(tile(page, 'Moritz')).toBeVisible();
    await tile(page, 'Lena').click();
    await expect(headerName(page)).toHaveText('Lena');
    const names = (await storedAll(page)).children.map((c: { name: string }) => c.name);
    expect(names).toEqual(['Lena', 'Moritz']);
  });

  test('AT-90.5: Löschen fragt nach; das letzte Kind bleibt', async ({ page }) => {
    await open(page, family([lina, max]));
    await kids(page);
    const remove = childRow(page, 'Max').getByRole('button', { name: 'Löschen' });
    await remove.click();
    await expect(page.getByText('Max löschen?')).toBeVisible();
    await btn(page, 'Abbrechen').click();
    await expect(childRow(page, 'Max')).toHaveCount(1);
    expect((await storedAll(page)).children).toHaveLength(2);
    // gewähltes Kind löschen → das andere wird gewählt
    await childRow(page, 'Lina').getByRole('button', { name: 'Löschen' }).click();
    await btn(page, 'Ja, löschen').click();
    await expect(childRow(page, 'Lina')).toHaveCount(0);
    await expect(childTab(page)).toContainText('Max');
    const saved = await storedAll(page);
    expect(saved.children.map((c: { id: string }) => c.id)).toEqual([ID_B]);
    expect(saved.activeChildId).toBe(ID_B);
    expect(JSON.stringify(saved)).not.toContain('Lina'); // samt Lernstand und Garten weg
    // das letzte Kind lässt sich nicht löschen
    await expect(childRow(page, 'Max').getByRole('button', { name: 'Löschen' })).toBeDisabled();
    await leave(page);
    await expect(page.getByText('Hallo Max!')).toBeVisible();
  });

  test('AT-90.6: höchstens 4 Kinder, doppelte Namen werden abgelehnt', async ({ page }) => {
    await open(page, family([lina]));
    await kids(page);
    await addInput(page).fill('LINA');
    await expect(page.getByText('Den Namen gibt es schon.')).toBeVisible();
    await expect(btn(page, 'Kind anlegen')).toBeDisabled();
    await addInput(page).press('Enter');
    expect((await storedAll(page)).children).toHaveLength(1);
    await addInput(page).fill('   ');
    await expect(btn(page, 'Kind anlegen')).toBeDisabled();
    for (const name of ['Max', 'Ole', 'Ida']) await addChild(page, name);
    await expect(page.locator('.admin__child')).toHaveCount(4);
    await expect(page.getByText('Höchstens 4 Kinder.')).toBeVisible();
    await expect(addInput(page)).toBeDisabled();
    await expect(btn(page, 'Kind anlegen')).toBeDisabled();
    expect((await storedAll(page)).children).toHaveLength(4);
  });

  test(
    'AT-90.7: mit 4 Kindern passt die Begrüßung ohne Scrollen',
    { tag: '@layout' },
    async ({ page }) => {
      await open(page, four());
      await expect(tiles(page)).toHaveCount(4);
      await settle(page);
      expect(await overflow(page)).toEqual([]);
      const sizes = await tiles(page).evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return `${Math.round(r.width)}x${Math.round(r.height)}`;
        }),
      );
      expect(new Set(sizes).size).toBe(1);
      const [w, h] = sizes[0].split('x').map(Number);
      const least = test.info().project.name.startsWith('iphone') ? 44 : 88;
      expect(Math.min(w, h)).toBeGreaterThanOrEqual(least);
    },
  );

  test(
    'AT-90.7: Reiter „Kinder“ mit 4 Kindern und Löschabfrage passt',
    { tag: '@layout' },
    async ({ page }) => {
      await open(page, four());
      await kids(page);
      await settle(page);
      expect(await overflow(page)).toEqual([]);
      await childRow(page, 'Emilia-Sophie').getByRole('button', { name: 'Löschen' }).click();
      expect(await overflow(page)).toEqual([]);
      await btn(page, 'Abbrechen').click();
      await childRow(page, 'Ole').getByRole('button', { name: 'Umbenennen' }).click();
      expect(await overflow(page)).toEqual([]);
    },
  );

  test('AT-90.8: Einstellungen im Elternbereich wirken nur auf das gewählte Kind', async ({
    page,
  }) => {
    await open(page, family([lina, max]));
    await kids(page);
    // Lina ist gewählt (markiert); Max wählen
    await expect(childRow(page, 'Lina').locator('.choice-tile')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await childRow(page, 'Max').locator('.choice-tile').click();
    await expect(childTab(page)).toContainText('Max');
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    await btn(page, 'Bremsen').click(); // Max: an → aus
    await btn(page, 'Mimi').click(); // Mimi schläft bei Max
    // Lernstand: Max hat 1 Wort auf Stufe 4 (Englisch)
    await page.getByRole('tab', { name: 'Sprachen' }).click();
    await btn(page, 'Englisch').click();
    await expect(page.locator('.admin__level[data-level="4"] .admin__word')).toHaveCount(1);
    const saved = await storedAll(page);
    const [a, b] = saved.children;
    expect(saved.activeChildId).toBe(ID_B);
    expect(b.brakeNew).toBe(false);
    expect(b.rest.sleeping).toEqual(['mimi']);
    expect(a.brakeNew).toBe(false); // Linas Wert unverändert (war schon aus)
    expect(a.rest.sleeping).toEqual([]);
    expect(a.updatedAt).toBe(AT);
    // anderes Kind gewählt → zurück zur Begrüßung
    await leave(page);
    await expect(page.getByText('Wer bist du?')).toBeVisible();
  });
});
