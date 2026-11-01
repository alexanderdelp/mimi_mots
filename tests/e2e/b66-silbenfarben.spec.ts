import { expect, test, type Page } from './fixtures';
import words from '../../src/data/words.json' with { type: 'json' };
import { fakeMedia } from './helpers';
import { btn } from './views';

const LILA_900 = 'rgb(59, 42, 99)';
const BEERE_600 = 'rgb(176, 58, 117)';

async function startRound(page: Page) {
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, 'Französisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
}

const syllables = (page: Page) =>
  page
    .locator('.word-card__de .word-card__syllable')
    .evaluateAll((spans) =>
      spans.map((s) => ({ text: s.textContent, color: getComputedStyle(s).color })),
    );

test.describe('B-66 Silbenfarben', () => {
  test('AT-66.2/66.3/66.5: Silben abwechselnd gefärbt, Wort bleibt ein Wort', async ({ page }) => {
    await fakeMedia(page);
    await startRound(page);
    for (let i = 0; i < 8; i++) {
      const id = (await page.locator('.word-card').getAttribute('data-word-id'))!;
      const word = words.find((w) => w.id === id)!;
      await expect(page.locator('.word-card__de')).toHaveText(word.de);
      expect(await syllables(page)).toEqual(
        word.syllables.map((text, n) => ({ text, color: n % 2 ? BEERE_600 : LILA_900 })),
      );
      await btn(page, 'Auf Französisch anhören').click();
      await btn(page, 'Noch üben').click();
      await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', id);
    }
  });

  test('AT-66.5: lange Wörter passen in die Wortkarte', { tag: '@layout' }, async ({ page }) => {
    await fakeMedia(page);
    await startRound(page);
    const longest = [...words].sort((a, b) => b.de.length - a.de.length).slice(0, 3);
    const fits = await page.evaluate(
      (list) => {
        const card = document.querySelector<HTMLElement>('.word-card')!;
        const probe = document.createElement('p');
        probe.className = 'word-card__de';
        card.append(probe);
        const result = list.map((syllables) => {
          probe.replaceChildren(
            ...syllables.map((s, i) => {
              const span = document.createElement('span');
              span.className = `word-card__syllable word-card__syllable--${i % 2 ? 'b' : 'a'}`;
              span.textContent = s;
              return span;
            }),
          );
          const inner = card.getBoundingClientRect();
          const box = probe.getBoundingClientRect();
          const fitsX = probe.scrollWidth <= Math.ceil(box.width) && box.width <= inner.width;
          return fitsX && probe.offsetHeight < 80;
        });
        probe.remove();
        return result;
      },
      longest.map((w) => w.syllables),
    );
    expect(fits).toEqual(longest.map(() => true));
  });
});
