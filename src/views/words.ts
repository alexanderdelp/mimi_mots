// „Meine Wörter“ (B-107): Das Kind sieht seine Wörter nach Stufe – nur ansehen, nichts einstellen.
// Erreichbar über den Buch-Button auf Start- und Schlafseite, zurück über den Haus-Button.
// Leitprinzip 1: keine Beschriftung der Stufen, keine Zahlen; jede Zeile trägt nur 1–5 lila
// Punkte. Wörter ohne Lernstand („Neu“) und ausgeschaltete Wörter fehlen.
import { createAppHeader } from '../components/app-header';
import { createChoiceGroup } from '../components/choice-tile';
import { icon, roundButton } from '../components/icons';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { MODE_INFO } from '../data/modes';
import type { Language, Word } from '../data/words';
import { activeWords, playableLanguages, progressKey, type Store } from '../state';
import { MAX_BOX, MODES, type ChildData, type Mode } from '../storage';
import type { ViewHandle } from './view';

/** Stufen von oben nach unten: 0 (zuletzt geübt) bis MAX_BOX. */
const BOXES = Array.from({ length: MAX_BOX + 1 }, (_, i) => i);

/** Emoji-Größe: so groß wie möglich, so klein wie nötig, damit alles ohne Scrollen passt. */
const SIZES = [72, 64, 56, 48, 40, 34, 28, 24, 20];

/** Eingeschaltete Wörter mit Lernstand im Modus, nach Stufe (B-107). */
export function learnedWords(data: ChildData, language: Language, mode: Mode): Word[][] {
  const entries = data[progressKey(mode)][language];
  const words = activeWords(data, language).filter((w) => entries[w.id]);
  return BOXES.map((box) => words.filter((w) => entries[w.id].box === box));
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/** Neutrale Kennzeichnung der Zeile: box + 1 Punkte, alle gleich lila. */
function dots(box: number): HTMLElement {
  const marker = el('span', 'words__dots');
  marker.setAttribute('aria-hidden', 'true');
  for (let i = 0; i <= box; i++) marker.append(el('span', 'words__dot'));
  return marker;
}

export function renderWords(store: Store): ViewHandle {
  const data = store.getState().data;
  const playable = playableLanguages(data);
  const chosen = data.settings.language;
  let language: Language = chosen && playable.includes(chosen) ? chosen : playable[0];
  let mode: Mode = data.settings.mode ?? 'speak';

  const view = el('main', 'view view--words');
  view.dataset.view = 'words';

  const home = roundButton('Zurück', 'home', 'home-button words__home');
  home.addEventListener('click', () => store.dispatch({ type: 'home' }));

  // Nur für diese Ansicht: die Wahl ändert die Startseite nicht
  const modes = createChoiceGroup<Mode>(
    'Wie',
    MODES.map((m) => ({
      value: m,
      label: MODE_INFO[m].name,
      content: [icon(MODE_INFO[m].icon, 'mode-icon')],
    })),
    mode,
    (value) => {
      mode = value;
      render();
    },
  );
  modes.el.classList.add('words__modes');

  const languages = createChoiceGroup<Language>(
    'Sprache',
    playable.map((l) => ({
      value: l,
      label: LANGUAGE_INFO[l].name,
      content: [
        Object.assign(el('img', 'words__flag'), { src: flagUrl(l), alt: '', draggable: false }),
      ],
    })),
    language,
    (value) => {
      language = value;
      render();
    },
  );
  languages.el.classList.add('words__languages');

  const toolbar = el('div', 'words__toolbar');
  toolbar.append(modes.el, languages.el);

  const shelf = el('div', 'words__shelf');
  shelf.setAttribute('role', 'list');

  /** Emoji verkleinern, bis nichts mehr überläuft (viele Wörter in einer Stufe). */
  const fit = () => {
    for (const size of SIZES) {
      shelf.style.setProperty('--word-size', `${size}px`);
      if (shelf.scrollHeight <= shelf.clientHeight + 1) return;
    }
  };

  const render = () => {
    const rows = learnedWords(store.getState().data, language, mode);
    shelf.replaceChildren(
      ...rows.map((words, box) => {
        const row = el('section', 'words__row');
        row.dataset.box = String(box);
        row.setAttribute('role', 'listitem');
        const list = el('div', 'words__list');
        for (const w of words) {
          const item = el('span', 'words__word');
          item.textContent = w.emoji;
          item.dataset.wordId = w.id;
          item.setAttribute('role', 'img');
          item.setAttribute('aria-label', w.de);
          list.append(item);
        }
        row.append(dots(box), list);
        return row;
      }),
    );
    fit();
  };

  const body = el('div', 'words__body');
  body.append(toolbar, shelf);
  view.append(createAppHeader({ start: home, name: data.name }), body);

  // erst im Dokument lässt sich messen; bei Größenwechsel (Drehen, iPhone) neu einpassen
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => fit());
  observer?.observe(shelf);
  render();
  return { el: view, dispose: () => observer?.disconnect() };
}
