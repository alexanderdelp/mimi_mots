// Lernrunde – Platzhalter bis B-21 ff. Beenden per Tipp; Long-Press folgt in B-25.
import type { Store } from '../state';

export function renderRound(store: Store): HTMLElement {
  const view = document.createElement('main');
  view.className = 'view view--round';
  view.dataset.view = 'round';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close-button';
  close.setAttribute('aria-label', 'Beenden');
  close.textContent = '×';
  close.addEventListener('click', () => store.dispatch({ type: 'finish' }));

  view.append(close);
  return view;
}
