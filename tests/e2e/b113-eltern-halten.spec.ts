// B-113: Der Elternbereich öffnet sich erst nach 1 s Halten des App-Icons; [×] bleibt bei 600 ms.
import { expect, test, type Page } from './fixtures';
import { hold, prepare, roundView } from './views';

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);

test.describe('B-113 Elternbereich erst nach 1 s', () => {
  const cases: { name: string; seed: { sleeping?: string[]; greeting?: boolean } }[] = [
    { name: 'start', seed: {} },
    { name: 'sleep', seed: { sleeping: ['mimi', 'mots'] } },
    { name: 'welcome', seed: { greeting: true } },
  ];
  for (const { name, seed } of cases) {
    test(`AT-113.1/113.2: ${name} – 0,9 s nicht, 1 s schon`, async ({ page }) => {
      await prepare(page, seed);
      await page.goto('./');
      await expect(view(page, name)).toBeVisible();
      const icon = view(page, name).locator('.app-header__icon');
      await hold(page, icon, 900);
      await expect(view(page, name)).toBeVisible();
      await expect(view(page, 'admin')).toHaveCount(0);
      await hold(page, icon, 1000);
      await expect(view(page, 'admin')).toBeVisible();
    });
  }

  test('AT-113.3: [×] beendet die Runde weiterhin nach 600 ms', async ({ page }) => {
    await prepare(page, {});
    await roundView(page);
    await hold(page, '.close-button', 500);
    await expect(view(page, 'round')).toBeVisible();
    await hold(page, '.close-button', 600);
    await expect(view(page, 'end')).toBeVisible();
  });
});
