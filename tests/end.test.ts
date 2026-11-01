// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { childDefaults } from '../src/storage';
import { createStore } from './test-store';
import { END_TEXT, renderEnd } from '../src/views/end';

function endStore(companion: 'mimi' | 'mots' = 'mots') {
  const data = childDefaults();
  data.settings = { companion, language: 'fr', mode: 'speak' };
  const store = createStore(data);
  store.dispatch({ type: 'play' });
  store.dispatch({ type: 'finish' });
  return store;
}

describe('renderEnd (B-43)', () => {
  it('zeigt den gewählten Begleiter in der Pose „winkt“', () => {
    const { el } = renderEnd(endStore('mots'));
    const avatar = el.querySelector<HTMLElement>('.avatar')!;
    expect(avatar.dataset.pose).toBe('winkt');
    expect(avatar.querySelector('img')!.getAttribute('src')).toMatch(/pony_waving\.png$/);
  });

  it('zeigt Kopfleiste und den freundlichen Satz, ohne Zahlen', () => {
    const { el } = renderEnd(endStore());
    expect(el.querySelector('header.app-header h1')!.textContent).toBe('Mimi & Mots');
    expect(el.querySelector('.end__text')!.textContent).toBe(END_TEXT);
    expect(END_TEXT).toBe('Bis zum nächsten Mal!');
    expect(el.textContent).not.toMatch(/\d/);
  });

  it('Haus-Button führt zurück zum Start', () => {
    const store = endStore();
    const { el } = renderEnd(store);
    const home = el.querySelector<HTMLButtonElement>('.home-button')!;
    expect(home.getAttribute('aria-label')).toBe('Zurück');
    expect(home.textContent).toBe('');
    expect(home.querySelector('svg')!.dataset.icon).toBe('home');
    home.click();
    expect(store.getState().view).toBe('start');
  });
});
