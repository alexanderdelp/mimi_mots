// Startansicht – Platzhalter bis B-11 (Auswahl Begleiter, Sprache, Dauer).
import type { Store } from '../state';

export function renderStart(store: Store): HTMLElement {
  const view = document.createElement('main');
  view.className = 'view view--start';
  view.dataset.view = 'start';

  const title = document.createElement('h1');
  title.textContent = 'Mimi & Mots';

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'play-button';
  play.setAttribute('aria-label', 'Los geht’s');
  play.textContent = '▶';
  play.addEventListener('click', () => store.dispatch({ type: 'play' }));

  view.append(title, play);
  return view;
}
