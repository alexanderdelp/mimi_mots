// Elternbereich (B-69): erreichbar nur über verstecktes Halten des App-Icons auf Start- und
// Schlafseite. Zwei Reiter (B-83): „Sprachen“ – Lernstand je Modus (B-89) und Sprache nach Stufe ansehen,
// zurücksetzen, Sprache ein-/ausschalten, Wörter per Tipp auf ihr Emoji ein-/ausschalten (B-88); „Sonstiges“ – Tiere aufwecken, Tutorial zurücksetzen,
// Bremse für neue Wörter (B-82), Rundendauer (B-93). Keine Avatare; sonst dieselben Bausteine wie überall.
import { createAppHeader } from '../components/app-header';
import { createChoiceGroup, createChoiceTile } from '../components/choice-tile';
import { icon, roundButton } from '../components/icons';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { MODE_INFO } from '../data/modes';
import { vocabulary } from '../data/vocabulary';
import type { Language } from '../data/words';
import { canToggleLanguage, canToggleWord, progressKey, type Store } from '../state';
import {
  LANGUAGES,
  MAX_BOX,
  MODES,
  ROUND_MIN_HIGHEST,
  ROUND_MIN_LOWEST,
  type Mode,
  type Progress,
} from '../storage';
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

/** Wörter des Wortschatzes (B-84) nach Stufe; Wörter ohne Lernstand sind „Neu“. */
export function wordsByLevel(progress: Progress, language: Language) {
  const entries = progress[language];
  const words = vocabulary(language);
  return new Map(
    LEVELS.map((level) => [level, words.filter((w) => (entries[w.id]?.box ?? null) === level)]),
  );
}

type Tab = 'sprachen' | 'sonstiges';
const TABS: readonly [Tab, string][] = [
  ['sprachen', 'Sprachen'],
  ['sonstiges', 'Sonstiges'],
];

/** Zeile im Reiter „Sonstiges“: Titel und kurze Erklärung links, Button rechts. */
function settingRow(title: string, hint: string, button: HTMLElement): HTMLElement {
  const row = el('section', 'admin__setting');
  const label = el('div', 'admin__label');
  label.append(el('span', 'admin__title', title), el('span', 'admin__hint', hint));
  row.append(label, button);
  return row;
}

export function renderAdmin(store: Store): ViewHandle {
  let language: Language = store.getState().data.settings.language ?? 'en';
  let mode: Mode = store.getState().data.settings.mode ?? 'speak';
  let confirming = false;
  let tab: Tab = 'sprachen';

  const view = el('main', 'view view--admin');
  view.dataset.view = 'admin';

  // B-86: Zurück-Pfeil statt Haus – zurück zur Start- bzw. Schlafseite
  const home = roundButton('Zurück', 'back', 'home-button admin__home');
  home.addEventListener('click', () => store.dispatch({ type: 'leave' }));

  // B-89: Lernstand je Modus – gleiche Symbole wie auf der Startseite
  const modes = createChoiceGroup<Mode>(
    'Lernstand',
    MODES.map((m) => ({
      value: m,
      label: MODE_INFO[m].name,
      content: [icon(MODE_INFO[m].icon, 'mode-icon')],
    })),
    mode,
    (value) => {
      mode = value;
      confirming = false;
      render();
    },
  );
  modes.el.classList.add('admin__modes');

  const languages = createChoiceGroup<Language>(
    'Sprache',
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

  // Reiter (B-83) rechts in der Kopfleiste
  const tabList = el('div', 'admin__tabs');
  tabList.setAttribute('role', 'tablist');
  const tabButtons = new Map(
    TABS.map(([value, label]) => {
      const button = el('button', 'admin__tab', label);
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.id = `admin-tab-${value}`;
      button.addEventListener('click', () => {
        tab = value;
        confirming = false;
        render();
      });
      tabList.append(button);
      return [value, button] as const;
    }),
  );

  // Reiter „Sonstiges“
  const wake = textButton('Tiere aufwecken');
  wake.classList.add('admin__wake');
  wake.addEventListener('click', () => store.dispatch({ type: 'wake' }));
  // B-74: Tutorial kommt in der nächsten Runde wieder – je Modus getrennt (B-89)
  const tutorials = Object.fromEntries(
    MODES.map((m) => {
      const button = textButton(`${MODE_INFO[m].name} zurücksetzen`);
      button.classList.add('admin__tutorial');
      button.addEventListener('click', () => store.dispatch({ type: 'resetTutorial', mode: m }));
      return [m, button];
    }),
  ) as Record<Mode, HTMLButtonElement>;
  // B-82/B-86: Schalter als Auswahlkachel wie bei Begleiter und Sprache – an = lila gerahmt
  const brake = createChoiceTile({
    content: [el('span', 'admin__brake-label', 'Bremsen')],
    onSelect: () => store.dispatch({ type: 'toggleBrake' }),
  });
  brake.el.classList.add('admin__brake');
  // B-93: Rundendauer – runde Buttons „−“ und „+“, dazwischen die Dauer in fester Breite
  const shorter = roundButton('Kürzer', 'minus', 'admin__step');
  const longer = roundButton('Länger', 'plus', 'admin__step');
  const minutes = el('span', 'admin__minutes');
  for (const [button, delta] of [
    [shorter, -1],
    [longer, 1],
  ] as const) {
    button.addEventListener('click', () =>
      store.dispatch({ type: 'roundMin', minutes: store.getState().data.roundMin + delta }),
    );
  }
  const duration = el('div', 'admin__duration');
  duration.append(shorter, minutes, longer);
  const other = el('div', 'admin__other');
  other.append(
    settingRow('Rundendauer', 'Gilt fürs Sprechen und fürs Hören.', duration),
    settingRow('Schlafen', 'Mimi und Mots sind wieder wach.', wake),
    settingRow('Tutorial Sprechen', 'Kommt beim nächsten Sprechen wieder.', tutorials.speak),
    settingRow('Tutorial Hören', 'Kommt beim nächsten Hören wieder.', tutorials.listen),
    settingRow(
      'Neue Wörter bremsen',
      'Stehen 6 oder mehr Wörter auf „noch üben“, kommen keine neuen dazu.',
      brake.el,
    ),
  );

  const languagesPanel = el('div', 'admin__panel');
  const otherPanel = el('div', 'admin__panel');
  for (const [panel, value] of [
    [languagesPanel, 'sprachen'],
    [otherPanel, 'sonstiges'],
  ] as const) {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `admin-tab-${value}`);
  }

  const render = () => {
    const { data } = store.getState();
    tabButtons.forEach((button, value) => {
      button.setAttribute('aria-selected', String(value === tab));
    });
    languagesPanel.hidden = tab !== 'sprachen';
    otherPanel.hidden = tab !== 'sonstiges';

    wake.disabled = data.rest.sleeping.length === 0;
    tutorials.speak.disabled = !data.tutorialDone;
    tutorials.listen.disabled = !data.listenTutorialDone;
    brake.setSelected(data.brakeNew);
    minutes.textContent = `${data.roundMin} Min.`;
    shorter.disabled = data.roundMin <= ROUND_MIN_LOWEST;
    longer.disabled = data.roundMin >= ROUND_MIN_HIGHEST;

    const name = LANGUAGE_INFO[language].name;
    const progress = data[progressKey(mode)]; // B-89: Lernstand des gezeigten Modus
    const enabled = data.enabledLanguages.includes(language);
    // ausgeschaltete Sprachen bleiben wählbar (Lernstand ansehen, wieder einschalten), wirken aber blass
    languages.tiles.forEach((tile, l) => {
      tile.el.dataset.off = String(!data.enabledLanguages.includes(l));
    });

    // Sicherheitsabfrage (B-89): nimmt die ganze Leiste ein, die Frage nennt Sprache und Modus
    toolbar.dataset.confirming = String(confirming);
    if (confirming) {
      const question = el(
        'p',
        'admin__question',
        `${name}, ${MODE_INFO[mode].name}: Wirklich zurücksetzen?`,
      );
      const yes = textButton('Ja, zurücksetzen');
      const no = textButton('Abbrechen');
      yes.addEventListener('click', () => {
        confirming = false;
        store.dispatch({ type: 'resetProgress', language, mode });
      });
      no.addEventListener('click', () => {
        confirming = false;
        render();
      });
      actions.replaceChildren(question, yes, no);
    } else {
      const reset = textButton('Lernstand zurücksetzen');
      reset.disabled = Object.keys(progress[language]).length === 0; // nichts zurückzusetzen
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
      // B-86: ohne Wörter nicht einschaltbar, die letzte spielbare Sprache nicht ausschaltbar
      toggle.disabled = !canToggleLanguage(data, language);
      toggle.addEventListener('click', () => store.dispatch({ type: 'toggleLanguage', language }));
      actions.replaceChildren(reset, toggle);
    }

    const groups = wordsByLevel(progress, language);
    if (vocabulary(language).length === 0) {
      // B-84: ohne gewählte Aufnahmen erscheint die Sprache nicht auf der Startseite
      levels.replaceChildren(el('p', 'admin__empty', 'Noch keine Wörter vorhanden'));
      return;
    }
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
          // B-88: Tipp schaltet das Wort aus (blass) bzw. wieder ein; es bleibt an seinem Platz
          const item = el('span', 'admin__item');
          item.setAttribute('role', 'listitem');
          const chip = el('button', 'admin__word', w.emoji);
          chip.type = 'button';
          chip.dataset.wordId = w.id;
          chip.title = `${w.de} · ${w[language]}`;
          chip.setAttribute('aria-label', chip.title);
          chip.setAttribute('aria-pressed', String(!data.disabledWords[language].includes(w.id)));
          chip.disabled = !canToggleWord(data, language, w.id); // das letzte Wort bleibt an
          chip.addEventListener('click', () =>
            store.dispatch({ type: 'toggleWord', language, id: w.id }),
          );
          item.append(chip);
          chips.append(item);
        }
        row.append(label, chips);
        return row;
      }),
    );
  };

  const toolbar = el('div', 'admin__toolbar');
  toolbar.append(modes.el, languages.el, actions);

  languagesPanel.append(toolbar, levels);
  otherPanel.append(other);
  const body = el('div', 'admin__body');
  body.append(languagesPanel, otherPanel);
  view.append(createAppHeader({ start: home, end: tabList }), body);
  render();

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.view === 'admin' && state.data !== previous.data) render();
  });
  return { el: view, dispose: unsubscribe };
}
