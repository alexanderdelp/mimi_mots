// Schlafseite (B-65): Beide Begleiter schlafen. Kopfleiste wie überall, Bild und ein Satz.
// Aufwecken nur durch Gedrückthalten des Icons in der Kopfleiste – bewusst ohne jeden Hinweis
// (keine Schaltfläche, keine Rückmeldung beim Drücken), damit es Sache der Eltern bleibt.
import { bothSleepingUrl } from '../components/avatar';
import { createAppHeader } from '../components/app-header';
import { onLongPress } from '../components/long-press';
import type { Store } from '../state';
import type { ViewHandle } from './view';

export const SLEEP_TEXT = 'Gute Nacht und bis morgen!';

export function renderSleep(store: Store): ViewHandle {
  const view = document.createElement('main');
  view.className = 'view view--sleep';
  view.dataset.view = 'sleep';

  const header = createAppHeader();
  const logo = header.querySelector<HTMLElement>('.app-header__icon')!;
  const release = onLongPress(logo, () => store.dispatch({ type: 'wake' }));

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
