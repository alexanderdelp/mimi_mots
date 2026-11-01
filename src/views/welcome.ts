// Begrüßung (B-97): erster Bildschirm beim Öffnen, wenn mindestens ein Tier wach ist. Ohne
// Namen fragt sie danach (tippt ggf. ein Elternteil), sonst „Hallo Lina!“. Beide Tiere sind
// dabei: wache winken, schlafende zeigen ihr Schlafbild – nur Bildtausch, keine Animation.
import { createAppHeader, onIconHold } from '../components/app-header';
import {
  COMPANIONS,
  COMPANION_NAMES,
  createAvatar,
  sleepingAvatarUrl,
  type Companion,
} from '../components/avatar';
import { roundButton } from '../components/icons';
import type { Store } from '../state';
import { NAME_MAX, cleanName, type ChildData } from '../storage';
import type { ViewHandle } from './view';

export const NAME_QUESTION = 'Wie heißt du?';
export const greeting = (name: string) => `Hallo ${name}!`;

function companion(c: Companion, asleep: boolean): HTMLElement {
  if (!asleep) return createAvatar(c, 'winkt').el;
  const box = document.createElement('div');
  box.className = 'avatar avatar--sleeping';
  const img = document.createElement('img');
  img.src = sleepingAvatarUrl(c);
  img.alt = COMPANION_NAMES[c];
  img.draggable = false;
  box.append(img);
  return box;
}

/** Namensfrage: Eingabe und Haken-Button, der bei leerer Eingabe ausgegraut ist. */
function nameForm(store: Store): { text: HTMLElement; action: HTMLElement } {
  const label = document.createElement('label');
  label.className = 'welcome__text';
  label.htmlFor = 'welcome-name';
  label.textContent = NAME_QUESTION;

  const input = document.createElement('input');
  input.id = 'welcome-name';
  input.className = 'welcome__input';
  input.type = 'text';
  input.maxLength = NAME_MAX;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('autocorrect', 'off');
  input.enterKeyHint = 'done';

  const done = roundButton('Fertig', 'check', 'play-button welcome__button');
  done.type = 'submit';
  const update = () => (done.disabled = cleanName(input.value) === null);
  input.addEventListener('input', update);
  update();

  const form = document.createElement('form');
  form.className = 'welcome__form';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = cleanName(input.value);
    if (name === null) return;
    input.blur(); // Tastatur zu
    store.dispatch({ type: 'name', name });
  });
  form.append(input, done);
  return { text: label, action: form };
}

function body(store: Store, data: ChildData): HTMLElement {
  const el = document.createElement('div');
  el.className = 'welcome__body';
  let text: HTMLElement;
  let action: HTMLElement;
  if (data.name === null) {
    ({ text, action } = nameForm(store));
  } else {
    text = document.createElement('p');
    text.className = 'welcome__text';
    text.textContent = greeting(data.name);
    action = roundButton('Weiter', 'next', 'play-button welcome__button');
    action.addEventListener('click', () => store.dispatch({ type: 'enter' }));
  }
  const center = document.createElement('div');
  center.className = 'welcome__center';
  center.append(action);
  const [left, right] = COMPANIONS.map((c) => companion(c, data.rest.sleeping.includes(c)));
  el.append(text, left, center, right);
  return el;
}

export function renderWelcome(store: Store): ViewHandle {
  const view = document.createElement('main');
  view.className = 'view view--welcome';
  view.dataset.view = 'welcome';

  const header = createAppHeader();
  const release = onIconHold(header, () => store.dispatch({ type: 'admin' }));

  let shown = store.getState().data;
  const show = () => {
    view.dataset.named = String(shown.name !== null);
    view.replaceChildren(header, body(store, shown));
  };
  show();
  // Name eingegeben oder neuer Tag (alle wach): neu zeichnen
  const unsubscribe = store.subscribe((state) => {
    if (state.view !== 'welcome') return;
    const { data } = state;
    if (data.name === shown.name && data.rest === shown.rest) return;
    shown = data;
    show();
  });
  return {
    el: view,
    dispose: () => {
      release();
      unsubscribe();
    },
  };
}
