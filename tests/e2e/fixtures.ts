// Gemeinsame Test-Basis: Seit B-74 kommt in der ersten Runde ein Tutorial. Damit die übrigen
// Tests nicht jedes Mal hindurchklicken müssen, gilt es standardmäßig als gesehen – nur beim
// ersten Lesen des Speichers durch die App, gespeichert wird dadurch nichts. Tutorial-Tests schalten das ab:
// test.use({ tutorial: true }).
import { test as base } from '@playwright/test';

export { expect, type Locator, type Page } from '@playwright/test';

export const test = base.extend<{ tutorial: boolean }>({
  tutorial: [false, { option: true }],
  page: async ({ page, tutorial }, use) => {
    if (!tutorial) {
      await page.addInitScript(() => {
        // erst nach den Seeds anderer Init-Skripte aktiv und nur für das erste Lesen (die App
        // beim Start) – Seeds und Prüfungen der Tests sehen den echten Speicher
        setTimeout(() => {
          const read = Storage.prototype.getItem;
          Storage.prototype.getItem = function (key: string) {
            const value = read.call(this, key);
            if (key !== 'mimi-mots:v1') return value;
            Storage.prototype.getItem = read;
            try {
              const data = value ? JSON.parse(value) : { version: 1 };
              if (data && typeof data === 'object' && !('tutorialDone' in data)) {
                data.tutorialDone = true;
              }
              return JSON.stringify(data);
            } catch {
              return value;
            }
          };
        }, 0);
      });
    }
    await use(page);
  },
});
