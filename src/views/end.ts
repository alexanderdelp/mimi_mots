// Abschluss – Platzhalter bis B-43 (Avatar winkt, Text, Haus-Button).
import type { Store } from '../state';

export function renderEnd(store: Store): HTMLElement {
  const view = document.createElement('main');
  view.className = 'view view--end';
  view.dataset.view = 'end';

  const home = document.createElement('button');
  home.type = 'button';
  home.className = 'home-button';
  home.setAttribute('aria-label', 'Zurück');
  home.textContent = '🏠';
  home.addEventListener('click', () => store.dispatch({ type: 'home' }));

  view.append(home);
  return view;
}
