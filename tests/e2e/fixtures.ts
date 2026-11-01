// Gemeinsame Test-Basis. Damit die übrigen Tests nicht jedes Mal hindurchklicken müssen, gilt
// standardmäßig:
// - das Tutorial (B-74, seit B-89 je Modus) als gesehen – abschalten mit test.use({ tutorial: true });
// - das Kind heißt „Lina“ (B-97) – ohne Namen mit test.use({ childName: null });
// - die Begrüßung (B-97) wird gleich mit „Weiter“ verlassen – sie bleibt stehen mit
//   test.use({ greeting: true }) oder per Seed `greeting: true` (views.ts).
// Tutorial und Name wirken nur beim ersten Lesen des Speichers durch die App – gespeichert wird
// dadurch nichts; Seeds und Prüfungen der Tests sehen den echten Speicher.
import { test as base, type Page } from '@playwright/test';

export { expect, type Locator, type Page } from '@playwright/test';

/** Fester Wert für Tests – eine gültige UUID wie in der App (B-97). */
export const CHILD_ID = '00000000-0000-4000-8000-000000000001';

export const test = base.extend<{
  tutorial: boolean;
  childName: string | null;
  greeting: boolean;
}>({
  tutorial: [false, { option: true }],
  childName: ['Lina', { option: true }],
  greeting: [false, { option: true }],
  page: async ({ page, tutorial, childName, greeting }, use) => {
    if (!tutorial || childName !== null) {
      await page.addInitScript(
        ({ seen, name, id }) => {
          type Data = Record<string, unknown>;
          // erst nach den Seeds anderer Init-Skripte aktiv und nur für das erste Lesen (die App
          // beim Start)
          setTimeout(() => {
            const read = Storage.prototype.getItem;
            const parse = (text: string | null): Data | null => {
              try {
                const v = text ? JSON.parse(text) : null;
                return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
              } catch {
                return null;
              }
            };
            const patch = (child: Data) => {
              if (seen && !('tutorialDone' in child)) child.tutorialDone = true;
              if (seen && !('listenTutorialDone' in child)) child.listenTutorialDone = true;
              if (name !== null && !('name' in child)) child.name = name;
              return child;
            };
            const single = (child: Data) => {
              const at = new Date().toISOString();
              const row = patch({ ...child, id, createdAt: at, updatedAt: at });
              return JSON.stringify({ version: 2, activeChildId: id, children: [row] });
            };
            Storage.prototype.getItem = function (key: string) {
              const value = read.call(this, key);
              if (key !== 'mimi-mots:v2') return value;
              Storage.prototype.getItem = read;
              const stored = parse(value);
              if (stored && Array.isArray(stored.children)) {
                for (const c of stored.children) if (c && typeof c === 'object') patch(c as Data);
                return JSON.stringify(stored);
              }
              // kaputte Daten sieht die App unverändert; nichts gespeichert: Erststart (mit Namen)
              return value === null ? single(name === null ? { name: null } : {}) : value;
            };
          }, 0);
        },
        { seen: !tutorial, name: childName, id: CHILD_ID },
      );
    }
    if (!greeting) await skipGreeting(page);
    await use(page);
  },
});

/** Verlässt die Begrüßung (B-97) bei jedem Laden gleich mit „Weiter“ – wie ein Kind, das sofort
 *  weitertippt. Bleibt stehen, wenn `window.__keepGreeting` gesetzt ist (Seed `greeting`); die
 *  Namensfrage hat keinen „Weiter“-Button und bleibt ohnehin. */
async function skipGreeting(page: Page) {
  await page.addInitScript(() => {
    const skip = () => {
      if ((window as unknown as { __keepGreeting?: boolean }).__keepGreeting) return;
      document
        .querySelector<HTMLButtonElement>('[data-view="welcome"] button[aria-label="Weiter"]')
        ?.click();
    };
    new MutationObserver(skip).observe(document, { childList: true, subtree: true });
  });
}

/** iPhone-Projekt (B-76)? Dort gelten kleinere Mindestmaße. */
export const isPhone = () => test.info().project.name.startsWith('iphone');

/** Mindestgröße für Bedienelemente: die iPad-Vorgabe, auf dem iPhone das Apple-Mindestmaß 44 px. */
export const minSize = (ipad: number) => (isPhone() ? 44 : ipad);

/** Wechsel ins Hochformat per Größenänderung löst in der iPhone-Emulation kein
 *  Orientierungs-Ereignis aus (auf dem echten Gerät schon) – solche Tests laufen nur aufs iPad. */
export const skipRotationOnPhone = () =>
  test.skip(
    isPhone(),
    'Hochformat-Wechsel per setViewportSize wirkt in der iPhone-Emulation nicht',
  );
