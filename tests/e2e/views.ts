// B-60/B-61: führt reproduzierbar zu jeder Ansicht und prüft sie im Browser (Überlauf, Kontrast,
// Farben, Schaltflächen, Bewegung). Zufall und Uhr sind festgelegt.
import { expect, type Locator, type Page } from '@playwright/test';
import { fakeMedia, vocabularyIds } from './helpers';

export const KEY = 'mimi-mots:v1';

/** Legt einen gespeicherten Stand an, bevor die App lädt – nur beim ersten Laden des Tabs, damit
 *  Neuladen den Stand der App zeigt (B-91: eine Stelle statt Kopien je Test). */
export async function storeOnce(page: Page, data: object | string) {
  const value = typeof data === 'string' ? data : JSON.stringify(data);
  await page.addInitScript(
    ([key, v]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, v);
        sessionStorage.setItem('seeded', '1');
      }
    },
    [KEY, value] as const,
  );
}

/** Gespeicherter Stand der App (null, wenn nichts gespeichert ist). */
export const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEY);
export const TODAY = new Date(2026, 9, 30, 10, 0);

export const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

interface Seed {
  language?: 'en' | 'fr' | 'ja' | 'it';
  sleeping?: string[];
  /** Tutorial noch nicht gesehen (B-74); sonst gilt es als gesehen. */
  tutorial?: boolean;
  /** Tutorial der Hörrunde noch nicht gesehen (B-89). */
  listenTutorial?: boolean;
}

/** Uhr, Zufall, Audio-Attrappe und gespeicherter Stand – vor dem ersten Laden. */
export async function prepare(page: Page, seed?: Seed) {
  await fakeMedia(page);
  await page.clock.install({ time: TODAY });
  await page.addInitScript(() => {
    let a = 12345;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
  if (!seed) return;
  await storeOnce(page, {
    version: 1,
    settings: { companion: 'mimi', language: seed.language ?? 'fr', mode: 'speak' },
    progress: { en: {}, fr: {}, ja: {}, it: {} },
    enabledLanguages: ['en', 'fr', 'ja', 'it'],
    ...(seed.tutorial ? { tutorialDone: false } : {}),
    ...(seed.listenTutorial ? { listenTutorialDone: false } : {}),
    rest: {
      sleeping: seed.sleeping ?? [],
      since: '2026-10-30',
    },
  });
}

/** Gedrückt halten (Long-Press: [×], App-Icon) – über die Testuhr, `page.clock` muss laufen. */
export async function hold(page: Page, target: string | Locator, ms = 700) {
  const locator = typeof target === 'string' ? page.locator(target) : target;
  const box = (await locator.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(ms);
  await page.mouse.up();
}

/** Wartet, bis alle Bilder geladen sind und kurze Übergänge vorbei sind. */
export async function settle(page: Page) {
  await page.waitForFunction(() =>
    [...document.images].every(
      (img) => !img.offsetParent || (img.complete && img.naturalWidth > 0),
    ),
  );
  await page.clock.runFor(300);
}

export async function startView(page: Page) {
  await page.goto('./');
  await expect(page.locator('[data-view="start"]')).toBeVisible();
}

const LANGUAGE_NAME = {
  en: 'Englisch',
  fr: 'Französisch',
  ja: 'Japanisch',
  it: 'Italienisch',
} as const;
type Lang = keyof typeof LANGUAGE_NAME;

export async function roundView(page: Page, language: Lang = 'fr') {
  await startView(page);
  await btn(page, LANGUAGE_NAME[language]).click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
}

export async function revealedView(page: Page, language: Lang = 'fr') {
  await roundView(page, language);
  await btn(page, `Auf ${LANGUAGE_NAME[language]} anhören`).click();
  await expect(page.locator('.round__foreign')).not.toHaveText('');
}

/** B-89: Hörrunde – Fremdwort steht da, Bildkarte verdeckt. */
export async function listenView(page: Page, language: Lang = 'fr') {
  await startView(page);
  await btn(page, LANGUAGE_NAME[language]).click();
  await btn(page, 'Hören').click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"][data-mode="listen"]')).toBeVisible();
}

export async function listenRevealedView(page: Page, language: Lang = 'fr') {
  await listenView(page, language);
  await btn(page, 'Zeig mir das deutsche Wort').click();
  await expect(page.locator('[data-view="round"]')).toHaveAttribute('data-revealed', 'true');
}

export async function endView(page: Page) {
  await roundView(page);
  await hold(page, '.close-button');
  await expect(page.locator('[data-view="end"]')).toBeVisible();
}

export async function sleepView(page: Page) {
  await page.goto('./');
  await expect(page.locator('[data-view="sleep"]')).toBeVisible();
}

export async function adminView(page: Page) {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await expect(page.locator('[data-view="admin"]')).toBeVisible();
}

/** Ansichten für die Prüfungen: Name, Vorbereitung, Weg dorthin. */
export const VIEWS: { name: string; seed?: Seed; open: (page: Page) => Promise<void> }[] = [
  { name: 'start-erststart', open: startView },
  { name: 'start-schlafend', seed: { sleeping: ['mimi'] }, open: startView },
  { name: 'tutorial', seed: { tutorial: true }, open: (p) => roundView(p) },
  { name: 'runde-verdeckt', seed: {}, open: (p) => roundView(p) },
  { name: 'runde-en', seed: {}, open: (p) => revealedView(p, 'en') },
  { name: 'runde-fr', seed: {}, open: (p) => revealedView(p, 'fr') },
  ...(['ja', 'it'] as const)
    .filter((l) => vocabularyIds(l).length > 0) // B-84: nur Sprachen mit Wörtern
    .map((l) => ({ name: `runde-${l}`, seed: {}, open: (p: Page) => revealedView(p, l) })),
  { name: 'hoerrunde-verdeckt', seed: {}, open: (p) => listenView(p) },
  { name: 'hoerrunde-aufgedeckt', seed: {}, open: (p) => listenRevealedView(p) },
  { name: 'tutorial-hoeren', seed: { listenTutorial: true }, open: (p) => listenView(p) },
  { name: 'abschluss', seed: {}, open: endView },
  {
    name: 'schlafseite',
    seed: { sleeping: ['mimi', 'mots'] },
    open: sleepView,
  },
  { name: 'elternbereich', seed: {}, open: adminView },
];

/** Kein Scrollen, kein sichtbares Element über den Rand (Rundungen auf halbe Pixel). */
export const overflow = (page: Page, root = 'body') =>
  page.evaluate((root) => {
    const out: string[] = [];
    const de = document.documentElement;
    if (de.scrollHeight > innerHeight || de.scrollWidth > innerWidth) out.push('Seite scrollt');
    for (const el of document.querySelectorAll<HTMLElement>(`${root} *`)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
      if (el.closest('[hidden]')) continue;
      if (
        r.left < -0.5 ||
        r.top < -0.5 ||
        r.right > innerWidth + 0.5 ||
        r.bottom > innerHeight + 0.5
      ) {
        out.push(`${el.tagName}.${el.getAttribute('class')}`);
      }
    }
    return out;
  }, root);

/** Texte mit zu wenig Kontrast (WCAG 2.1, AA). */
export const lowContrast = (page: Page, root = 'body') =>
  page.evaluate((root) => {
    const rgb = (c: string) => c.match(/[\d.]+/g)!.map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const background = (el: Element | null): number[] => {
      for (; el; el = el.parentElement) {
        const c = rgb(getComputedStyle(el).backgroundColor);
        if (c.length < 4 || c[3] > 0.5) return c;
      }
      return [255, 255, 255];
    };
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(`${root} *`)) {
      const text = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent!.trim())
        .join('');
      if (!text || !el.offsetParent) continue;
      if (el.closest(':disabled, [aria-disabled="true"], [hidden]')) continue;
      const s = getComputedStyle(el);
      const size = parseFloat(s.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      const [a, b] = [lum(rgb(s.color)), lum(background(el))].sort((x, y) => y - x);
      const ratio = (a + 0.05) / (b + 0.05);
      if (ratio < (large ? 3 : 4.5)) out.push(`${text} (${ratio.toFixed(2)})`);
    }
    return out;
  }, root);
