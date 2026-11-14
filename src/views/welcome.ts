// Begrüßung (B-97): erster Bildschirm beim Öffnen, wenn mindestens ein Tier wach ist. Ohne
// Namen fragt sie danach (tippt ggf. ein Elternteil), sonst „Hallo Lina!“. Beide Tiere sind
// dabei: wache winken, schlafende zeigen ihr Schlafbild – nur Bildtausch, keine Animation.
// B-90: Mit mehreren Kindern fragt sie „Wer bist du?“ und zeigt je Kind eine gleich große Kachel
// mit dem Namen; beide Tiere winken (wer schläft, hängt vom Kind ab). Tippen wählt das Kind.
import { createAppHeader, onIconHold } from '../components/app-header';
import {
  COMPANIONS,
  COMPANION_NAMES,
  createAvatar,
  sleepingAvatarUrl,
  type Companion,
} from '../components/avatar';
import { roundButton } from '../components/icons';
import { childrenOf, type AppState, type Store } from '../state';
import { NAME_MAX, cleanName, type Child, type ChildData } from '../storage';
import type { ViewHandle } from './view';

export const NAME_QUESTION = 'Wie heißt du?';
export const WHO_QUESTION = 'Wer bist du?';
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

/** B-90: je Kind eine Kachel mit Namen, alle gleich groß (Raster). */
function childTiles(store: Store, children: readonly Child[]): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'welcome__children';
  grid.dataset.count = String(children.length);
  for (const child of children) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'welcome__child';
    tile.dataset.childId = child.id;
    const name = document.createElement('span');
    name.className = 'welcome__child-name';
    name.textContent = child.name ?? '?';
    tile.append(name);
    tile.addEventListener('click', () => store.dispatch({ type: 'pickChild', id: child.id }));
    grid.append(tile);
  }
  return grid;
}

function body(store: Store, data: ChildData, children: readonly Child[]): HTMLElement {
  const el = document.createElement('div');
  el.className = 'welcome__body';
  let text: HTMLElement;
  let action: HTMLElement;
  const many = children.length > 1;
  if (many) {
    text = document.createElement('p');
    text.className = 'welcome__text';
    text.textContent = WHO_QUESTION;
    action = childTiles(store, children);
  } else if (data.name === null) {
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
  const [left, right] = COMPANIONS.map((c) =>
    companion(c, !many && data.rest.sleeping.includes(c)),
  );
  el.append(text, left, center, right);
  return el;
}

export function renderWelcome(store: Store): ViewHandle {
  const view = document.createElement('main');
  view.className = 'view view--welcome';
  view.dataset.view = 'welcome';

  const header = createAppHeader();
  const release = onIconHold(header, () => store.dispatch({ type: 'admin' }));

  let shown: AppState = store.getState();
  const show = () => {
    const children = childrenOf(shown);
    view.dataset.named = String(shown.data.name !== null);
    view.dataset.children = String(children.length);
    view.replaceChildren(header, body(store, shown.data, children));
  };
  show();
  // Name eingegeben, neuer Tag (alle wach) oder anderes Kind: neu zeichnen
  const unsubscribe = store.subscribe((state) => {
    if (state.view !== 'welcome') return;
    const { data } = state;
    const same =
      data.name === shown.data.name &&
      data.rest === shown.data.rest &&
      state.children === shown.children &&
      state.childId === shown.childId;
    shown = state;
    if (!same) show();
  });
  return {
    el: view,
    dispose: () => {
      release();
      unsubscribe();
    },
  };
}
