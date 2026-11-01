// Abschluss (anforderungen.md §3.3): Begleiter winkt groß, freundlicher Satz ohne
// Leistungsbezug, runder Haus-Button zurück zum Start. Keine Zusammenfassung, keine Zahlen.
import { createAppHeader } from '../components/app-header';
import { createAvatar } from '../components/avatar';
import { roundButton } from '../components/icons';
import type { Store } from '../state';
import type { ViewHandle } from './view';

export const END_TEXT = 'Bis zum nächsten Mal!';

export function renderEnd(store: Store): ViewHandle {
  const view = document.createElement('main');
  view.className = 'view view--end';
  view.dataset.view = 'end';

  const avatar = createAvatar(store.getState().data.settings.companion ?? 'mimi', 'winkt');

  const text = document.createElement('p');
  text.className = 'end__text';
  text.textContent = END_TEXT;

  const home = roundButton('Zurück', 'home', 'home-button');
  home.addEventListener('click', () => store.dispatch({ type: 'home' }));

  const body = document.createElement('div');
  body.className = 'end__body';
  body.append(avatar.el, text, home);

  view.append(createAppHeader({ name: store.getState().data.name }), body);
  return { el: view };
}
