// Schlafseite (B-65): Beide Begleiter schlafen. Kopfleiste wie überall, Bild und ein Satz.
// Aufwecken nur im Elternbereich; der öffnet sich durch verstecktes Halten des Icons (B-69).
import { bothSleepingUrl } from '../components/avatar';
import { createAppHeader, onIconHold } from '../components/app-header';
import type { Store } from '../state';
import type { ViewHandle } from './view';

export const SLEEP_TEXT = 'Gute Nacht und bis morgen!';

export function renderSleep(store: Store): ViewHandle {
  const view = document.createElement('main');
  view.className = 'view view--sleep';
  view.dataset.view = 'sleep';

  const header = createAppHeader({ name: store.getState().data.name });
  const release = onIconHold(header, () => store.dispatch({ type: 'admin' }));

  const picture = document.createElement('img');
  picture.className = 'sleep__picture';
  picture.src = bothSleepingUrl();
  picture.alt = SLEEP_TEXT;
  picture.draggable = false;

  const text = document.createElement('p');
  text.className = 'sleep__text';
  text.textContent = SLEEP_TEXT;

  const body = document.createElement('div');
  body.className = 'sleep__body';
  body.append(picture, text);

  view.append(header, body);
  return { el: view, dispose: release };
}
