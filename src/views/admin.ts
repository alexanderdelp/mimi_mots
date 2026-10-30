// Elternbereich (B-69): erreichbar nur über verstecktes Halten des App-Icons auf Start- und
// Schlafseite. Begleiter aufwecken, Lernstand je Sprache nach Stufe ansehen und zurücksetzen.
// Keine Avatare; sonst dieselben Bausteine wie überall (Kopfleiste, Kacheln, runde Buttons).
import { createAppHeader } from '../components/app-header';
import { createChoiceGroup } from '../components/choice-tile';
import { roundButton } from '../components/icons';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { WORDS, type Language } from '../data/words';
import type { Store } from '../state';
import { LANGUAGES, MAX_BOX, type Progress } from '../storage';
import type { ViewHandle } from './view';

/** Zeilen der Übersicht: noch nie dran (null), dann Stufe 0 (noch üben) bis 4 (sicher). */
const LEVELS: readonly (number | null)[] = [
  null,
  ...Array.from({ length: MAX_BOX + 1 }, (_, i) => i),
];

function levelLabel(level: number | null): [string, string] {
  if (level === null) return ['Neu', 'noch nicht dran'];
  if (level === 0) return ['Stufe 0', 'noch üben'];
  if (level === MAX_BOX) return [`Stufe ${level}`, 'sicher'];
  return [`Stufe ${level}`, ''];
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Textbutton im Elternbereich: weiß mit Rahmen, wie die Kacheln (einheitlich, ohne Füllung). */
function textButton(label: string): HTMLButtonElement {
  const button = el('button', 'text-button text-button--secondary', label);
  button.type = 'button';
  return button;
}

/** Wörter einer Sprache nach Stufe; Wörter ohne Lernstand sind „Neu“. */
export function wordsByLevel(progress: Progress, language: Language) {
  const entries = progress[language];
  return new Map(
    LEVELS.map((level) => [level, WORDS.filter((w) => (entries[w.id]?.box ?? null) === level)]),
  );
}

export function renderAdmin(store: Store): ViewHandle {
  let language: Language = store.getState().data.settings.language ?? 'en';
  let confirming = false;

  const view = el('main', 'view view--admin');
  view.dataset.view = 'admin';

  const home = roundButton('Zurück', 'home', 'home-button admin__home');
  home.addEventListener('click', () => store.dispatch({ type: 'leave' }));

  const languages = createChoiceGroup<Language>(
    'Lernstand',
    LANGUAGES.map((l) => ({
      value: l,
      label: LANGUAGE_INFO[l].name,
      content: [
        Object.assign(el('img', 'admin__flag'), { src: flagUrl(l), alt: '', draggable: false }),
      ],
    })),
    language,
    (value) => {
      language = value;
      confirming = false;
      render();
    },
  );
  languages.el.classList.add('admin__languages');

  const actions = el('div', 'admin__actions');
  const levels = el('div', 'admin__levels');
  // „Tiere aufwecken“ sitzt rechts in der Kopfleiste, damit unten Platz für die Sprachaktionen ist
  const wake = textButton('Tiere aufwecken');
  wake.classList.add('admin__wake');
  wake.addEventListener('click', () => store.dispatch({ type: 'wake' }));
  // B-74: Tutorial kommt in der nächsten Runde wieder; links neben dem Haus-Button
  const tutorial = textButton('Tutorial zurücksetzen');
  tutorial.classList.add('admin__tutorial');
  tutorial.addEventListener('click', () => store.dispatch({ type: 'resetTutorial' }));
  const left = el('div', 'admin__header-start');
  left.append(home, tutorial);

  const render = () => {
    const { data } = store.getState();
    const awake = data.rest.sleeping.length === 0 && data.rest.usedDurations.length === 0;
    const name = LANGUAGE_INFO[language].name;
    const enabled = data.enabledLanguages.includes(language);
    wake.disabled = awake;
    tutorial.disabled = !data.tutorialDone;
    // ausgeschaltete Sprachen bleiben wählbar (Lernstand ansehen, wieder einschalten), wirken aber blass
    languages.tiles.forEach((tile, l) => {
      tile.el.dataset.off = String(!data.enabledLanguages.includes(l));
    });

    if (confirming) {
      const question = el('p', 'admin__question', `${name}: Wirklich zurücksetzen?`);
      const yes = textButton('Ja, zurücksetzen');
      const no = textButton('Abbrechen');
      yes.addEventListener('click', () => {
        confirming = false;
        store.dispatch({ type: 'resetProgress', language });
      });
      no.addEventListener('click', () => {
        confirming = false;
        render();
      });
      actions.replaceChildren(question, yes, no);
    } else {
      const reset = textButton('Lernstand zurücksetzen');
      reset.disabled = Object.keys(data.progress[language]).length === 0; // nichts zurückzusetzen
      reset.addEventListener('click', () => {
        confirming = true;
        render();
      });
      // B-73: gewählte Sprache ein-/ausschalten; die letzte aktive bleibt an. Gleicher Text für
      // alle Sprachen, damit der Button beim Flaggenwechsel nicht springt.
      // Beide Beschriftungen liegen übereinander, die unpassende unsichtbar – so bleibt die
      // Breite immer die der längeren.
      const toggle = textButton('');
      toggle.classList.add('admin__toggle');
      for (const label of ['Sprache ausschalten', 'Sprache einschalten']) {
        const span = el('span', '', label);
        span.hidden = label !== (enabled ? 'Sprache ausschalten' : 'Sprache einschalten');
        toggle.append(span);
      }
      toggle.disabled = enabled && data.enabledLanguages.length === 1;
      toggle.addEventListener('click', () => store.dispatch({ type: 'toggleLanguage', language }));
      actions.replaceChildren(reset, toggle);
    }

    const groups = wordsByLevel(data.progress, language);
    levels.replaceChildren(
      ...LEVELS.map((level) => {
        const words = groups.get(level)!;
        const [title, hint] = levelLabel(level);
        const row = el('section', 'admin__level');
        row.dataset.level = level === null ? 'neu' : String(level);
        const label = el('div', 'admin__label');
        label.append(el('span', 'admin__title', `${title} · ${words.length}`));
        if (hint) label.append(el('span', 'admin__hint', hint));
        const chips = el('div', 'admin__words');
        chips.setAttribute('role', 'list');
        for (const w of words) {
          const chip = el('span', 'admin__word', w.emoji);
          chip.setAttribute('role', 'listitem');
          chip.dataset.wordId = w.id;
          chip.title = `${w.de} · ${w[language]}`;
          chip.setAttribute('aria-label', chip.title);
          chips.append(chip);
        }
        row.append(label, chips);
        return row;
      }),
    );
  };

  const toolbar = el('div', 'admin__toolbar');
  toolbar.append(languages.el, actions);

  const body = el('div', 'admin__body');
  body.append(toolbar, levels);
  view.append(createAppHeader({ start: left, end: wake }), body);
  render();

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.view === 'admin' && state.data !== previous.data) render();
  });
  return { el: view, dispose: unsubscribe };
}
