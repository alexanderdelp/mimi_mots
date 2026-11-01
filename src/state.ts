// App-State: aktuelle Ansicht als einfache Zustandsmaschine, plus gespeicherte Daten
// und ob das Gerät gerade im Hochformat ist (Overlay, Timer-Pause ab B-40/B-52).
import { COMPANIONS, type Companion } from './components/avatar';
import { applyRating, createSession, type Rating, type Session } from './scheduler';
import { hasVocabulary, vocabulary } from './data/vocabulary';
import type { Language, Word } from './data/words';
import {
  LANGUAGES,
  cleanName,
  isRoundMin,
  localDay,
  type ChildData,
  type Mode,
  type Settings,
} from './storage';

export type ViewName = 'welcome' | 'start' | 'round' | 'end' | 'sleep' | 'admin';

export type AppEvent =
  | { type: 'name'; name: string } // Begrüßung: Name des Kinds eingeben (B-97)
  | { type: 'enter' } // Begrüßung → Start (nur mit Namen, B-97)
  | { type: 'play' } // Start → Lernrunde (nur mit vollständiger Auswahl)
  | { type: 'finish' } // Lernrunde → Abschluss (Timer-Ende oder [×])
  | { type: 'home' } // Abschluss → Start (bzw. Schlafseite, wenn beide Begleiter schlafen)
  | { type: 'admin' } // Begrüßung/Start/Schlafseite → Elternbereich (Halten des Icons, B-69/B-97)
  | { type: 'leave' } // Elternbereich → zurück (Begrüßung oder Start) bzw. Schlafseite
  | { type: 'toggleSleep'; companion: Companion } // Elternbereich: Tier wecken/hinlegen (B-94)
  | { type: 'resetProgress'; language: Language; mode: Mode } // Elternbereich: Lernstand leeren
  | { type: 'toggleLanguage'; language: Language } // Elternbereich: Sprache an/aus (B-73)
  | { type: 'toggleWord'; language: Language; id: string } // Elternbereich: Wort an/aus (B-88)
  | { type: 'tutorialDone' } // Lernrunde: Tutorial abgeschlossen (B-74)
  | { type: 'resetTutorial'; mode: Mode } // Elternbereich: Tutorial des Modus kommt wieder
  | { type: 'toggleBrake' } // Elternbereich: Bremse für neue Wörter an/aus (B-82)
  | { type: 'roundMin'; minutes: number } // Elternbereich: Dauer einer Runde (B-93)
  | { type: 'day' } // App wieder sichtbar: an einem neuen Tag wachen alle auf (B-65)
  | { type: 'select'; settings: Partial<Settings> } // Auswahl auf der Startansicht
  | { type: 'word'; id: string; session: Session } // nächstes Wort der Lernrunde
  | { type: 'reveal' } // aufdecken (Lautsprecher, in der Hörrunde Auge)
  | { type: 'rate'; rating: Rating; at: string } // Selbsteinschätzung (ISO-Zeitpunkt)
  | { type: 'expire' } // Session-Timer abgelaufen (Runde läuft bis zur nächsten Bewertung weiter)
  | { type: 'orientation'; portrait: boolean };

/** Begleiter, Sprache und Modus sind gewählt. */
export function isComplete(settings: Settings): boolean {
  return settings.companion !== null && settings.language !== null && settings.mode !== null;
}

/** Schlafseite statt Start: kein Begleiter mehr wach (B-65). */
export function allAsleep(data: ChildData): boolean {
  return data.rest.sleeping.length === COMPANIONS.length;
}

/** B-89: Lernstand je Modus – Sprechen wie bisher in `progress`, Hören in `listenProgress`. */
export function progressKey(mode: Mode): 'progress' | 'listenProgress' {
  return mode === 'listen' ? 'listenProgress' : 'progress';
}

/** B-89: Tutorial je Modus. */
export function tutorialKey(mode: Mode): 'tutorialDone' | 'listenTutorialDone' {
  return mode === 'listen' ? 'listenTutorialDone' : 'tutorialDone';
}

/** Tutorial des gewählten Modus schon gesehen. */
export function tutorialSeen(data: ChildData): boolean {
  return data[tutorialKey(data.settings.mode ?? 'speak')];
}

/** Auf der Startseite wählbar: eingeschaltet (B-73) und mit Wortschatz (B-84). */
export function playableLanguages(data: ChildData): Language[] {
  return LANGUAGES.filter((l) => data.enabledLanguages.includes(l) && hasVocabulary(l));
}

/** B-73/B-86: Einschalten nur mit Wörtern; Ausschalten nur, wenn danach noch eine spielbare
 *  Sprache an ist. */
export function canToggleLanguage(data: ChildData, language: Language): boolean {
  if (!data.enabledLanguages.includes(language)) return hasVocabulary(language);
  return playableLanguages(data).some((l) => l !== language);
}

/** B-88: Wörter der Lernrunde – der Wortschatz (B-84) ohne die im Elternbereich ausgeschalteten. */
export function activeWords(data: ChildData, language: Language): Word[] {
  const off = data.disabledWords[language];
  return vocabulary(language).filter((w) => !off.includes(w.id));
}

/** B-88: Einschalten geht immer; Ausschalten nur, wenn danach noch ein Wort der Sprache an ist. */
export function canToggleWord(data: ChildData, language: Language, id: string): boolean {
  if (!vocabulary(language).some((w) => w.id === id)) return false;
  if (data.disabledWords[language].includes(id)) return true;
  return activeWords(data, language).some((w) => w.id !== id);
}

/** Auswahl passend zu Schlaf und aktiven Sprachen (B-65/B-73): Nicht mehr Wählbares
 *  fällt weg, ist nur noch eine Möglichkeit frei, wird sie vorausgewählt. */
export function withRestSettings(data: ChildData): ChildData {
  const pick = <T>(all: readonly T[], gone: readonly T[], current: T | null): T | null => {
    const free = all.filter((v) => !gone.includes(v));
    if (free.length === 0) return current; // Schlafseite: Auswahl für nach dem Aufwecken merken
    if (free.length === 1) return free[0];
    return current !== null && free.includes(current) ? current : null;
  };
  const { settings, rest } = data;
  const companion = pick(COMPANIONS, rest.sleeping, settings.companion);
  const playable = playableLanguages(data);
  const off = LANGUAGES.filter((l) => !playable.includes(l));
  // ohne spielbare Sprache keine Auswahl merken – sonst wäre Play aktiv (B-86)
  const language = playable.length > 0 ? pick(LANGUAGES, off, settings.language) : null;
  if (companion === settings.companion && language === settings.language) return data;
  return { ...data, settings: { ...settings, companion, language } };
}

const AWAKE = { sleeping: [], since: null };

/** Eingeschlafen an einem früheren Tag (oder ohne Datum) – dann wachen alle auf. */
function isStale(data: ChildData, today: string): boolean {
  const { sleeping, since } = data.rest;
  return sleeping.length > 0 && (since === null || since < today);
}

/** An einem neuen Tag sind alle wach. */
function wakeIfNewDay(data: ChildData, today: string): ChildData {
  return isStale(data, today) ? { ...data, rest: AWAKE } : data;
}

/** Am Ende einer Runde schläft der Begleiter ein (B-65). */
function consume(data: ChildData, today: string): ChildData {
  const { companion } = data.settings;
  const { sleeping } = wakeIfNewDay(data, today).rest;
  return {
    ...data,
    rest: {
      sleeping: COMPANIONS.filter((c) => sleeping.includes(c) || c === companion),
      since: today,
    },
  };
}

/** B-94: ein Tier im Elternbereich wecken oder hinlegen. Zuerst gilt ein neuer Tag (alle wach),
 *  dann wird umgeschaltet; wer hingelegt wird, schläft bis morgen wie nach einer Runde. */
export function toggleSleep(data: ChildData, companion: Companion, today: string): ChildData {
  const { sleeping } = wakeIfNewDay(data, today).rest;
  const next = sleeping.includes(companion)
    ? sleeping.filter((c) => c !== companion)
    : COMPANIONS.filter((c) => sleeping.includes(c) || c === companion);
  const rest = next.length === 0 ? AWAKE : { sleeping: next, since: today };
  return { ...data, rest };
}

/** Auswahl vollständig, Sprache spielbar und gewählter Begleiter wach. */
function isAvailable(data: ChildData): boolean {
  return (
    isComplete(data.settings) &&
    playableLanguages(data).includes(data.settings.language!) &&
    !data.rest.sleeping.includes(data.settings.companion!)
  );
}

/** Lernrunde: Scheduler-Session, aktuelles Wort (null, bis das erste gewählt ist), ob das
 *  Fremdwort schon aufgedeckt wurde und ob die Zeit abgelaufen ist. */
export interface RoundState {
  session: Session;
  wordId: string | null;
  revealed: boolean;
  expired: boolean;
}

export interface AppState {
  view: ViewName;
  portrait: boolean;
  data: ChildData;
  round: RoundState | null;
  /** B-99: von wo der Elternbereich geöffnet wurde – dorthin geht es zurück. */
  adminFrom?: 'welcome' | 'start' | 'sleep';
}

/** Erlaubte Ansichtswechsel; alles andere wird ignoriert. */
const TRANSITIONS: Record<ViewName, Partial<Record<AppEvent['type'], ViewName>>> = {
  welcome: { enter: 'start', admin: 'admin' },
  start: { play: 'round', admin: 'admin' },
  round: { finish: 'end' },
  end: { home: 'start' },
  sleep: { admin: 'admin' },
  admin: {},
};

export function nextView(view: ViewName, event: AppEvent): ViewName {
  return TRANSITIONS[view][event.type] ?? view;
}

/** `today`: lokales Datum (JJJJ-MM-TT) für Einschlafen und Aufwachen (B-65). */
export function reduce(
  state: AppState,
  event: AppEvent,
  today: string = localDay(new Date()),
): AppState {
  let next = step(state, event, today);
  // Wer die Abschlussseite erreicht, hat begleitet – egal ob per Zeitablauf oder [×].
  if (state.view === 'round' && next.view === 'end') {
    return { ...next, data: consume(next.data, today) };
  }
  // Auf Begrüßung, Start- und Schlafseite: an einem neuen Tag sind alle wieder wach. Von der
  // Schlafseite geht es dann zur Begrüßung wie bei einem neuen Öffnen am Morgen (B-97).
  if (['welcome', 'start', 'sleep'].includes(next.view) && isStale(next.data, today)) {
    const view = state.view === 'sleep' || next.view === 'welcome' ? 'welcome' : 'start';
    next = { ...next, view, data: withRestSettings(wakeIfNewDay(next.data, today)) };
  }
  // B-97: Ohne Namen führt kein Weg zum Start – erst fragt die Begrüßung nach dem Namen.
  if (next.view === 'start' && state.view !== 'start' && next.data.name === null) {
    next = { ...next, view: 'welcome' };
  }
  return next;
}

function step(state: AppState, event: AppEvent, today: string): AppState {
  if (event.type === 'orientation') {
    return event.portrait === state.portrait ? state : { ...state, portrait: event.portrait };
  }
  if (event.type === 'select') {
    if (state.view !== 'start') return state;
    const { companion } = event.settings;
    if (companion && state.data.rest.sleeping.includes(companion)) return state;
    const { language } = event.settings;
    if (language && !playableLanguages(state.data).includes(language)) return state;
    const settings = { ...state.data.settings, ...event.settings };
    const changed = (Object.keys(settings) as (keyof Settings)[]).some(
      (k) => settings[k] !== state.data.settings[k],
    );
    return changed ? { ...state, data: { ...state.data, settings } } : state;
  }
  if (event.type === 'word') {
    if (state.view !== 'round' || !state.round) return state;
    return {
      ...state,
      round: { ...state.round, session: event.session, wordId: event.id, revealed: false },
    };
  }
  if (event.type === 'reveal') {
    if (state.view !== 'round' || !state.round?.wordId || state.round.revealed) return state;
    return { ...state, round: { ...state.round, revealed: true } };
  }
  if (event.type === 'expire') {
    if (state.view !== 'round' || !state.round || state.round.expired) return state;
    return { ...state, round: { ...state.round, expired: true } };
  }
  if (event.type === 'rate') {
    // Nur für ein aufgedecktes Wort; danach ist es wieder verdeckt, bis das nächste kommt.
    const { language, mode } = state.data.settings;
    if (state.view !== 'round' || !state.round?.wordId || !state.round.revealed || !language) {
      return state;
    }
    const key = progressKey(mode ?? 'speak'); // B-89: Lernstand des Modus
    const progress = {
      ...state.data[key],
      [language]: applyRating(
        state.data[key][language],
        state.round.wordId,
        event.rating,
        new Date(event.at),
      ),
    };
    // Nach Ablauf der Zeit kommt statt des nächsten Worts der Abschluss (§3.4, B-42).
    return {
      ...state,
      view: state.round.expired ? 'end' : state.view,
      data: { ...state.data, [key]: progress },
      round: { ...state.round, revealed: false },
    };
  }
  if (event.type === 'name') {
    const name = cleanName(event.name);
    if (state.view !== 'welcome' || name === null || name === state.data.name) return state;
    return { ...state, data: { ...state.data, name } };
  }
  if (event.type === 'enter' && state.data.name === null) return state;
  if (event.type === 'play' && !isAvailable(state.data)) return state;
  // B-87: Abbruch im Tutorial – zurück zur Auswahl, niemand schläft ein, Tutorial bleibt offen
  if (event.type === 'finish' && state.view === 'round' && !tutorialSeen(state.data)) {
    return { ...state, view: 'start', round: null };
  }
  if (event.type === 'home' && state.view === 'end') {
    const data = withRestSettings(state.data);
    return { ...state, view: allAsleep(data) ? 'sleep' : 'start', data };
  }
  if (event.type === 'toggleSleep' && state.view === 'admin') {
    // Auswahl erst beim Verlassen anpassen (leave) – so bleibt sie über mehrere Tipps erhalten
    return { ...state, data: toggleSleep(state.data, event.companion, today) };
  }
  if (event.type === 'leave' && state.view === 'admin') {
    const data = withRestSettings(state.data);
    // B-99: zurück zur Begrüßung, wenn er von dort geöffnet wurde; schlafen beide → Schlafseite
    const back = state.adminFrom === 'welcome' ? 'welcome' : 'start';
    return { ...state, view: allAsleep(data) ? 'sleep' : back, data, adminFrom: undefined };
  }
  if (event.type === 'tutorialDone' && state.view === 'round' && !tutorialSeen(state.data)) {
    const key = tutorialKey(state.data.settings.mode ?? 'speak');
    return { ...state, data: { ...state.data, [key]: true } };
  }
  if (event.type === 'resetTutorial' && state.view === 'admin') {
    const key = tutorialKey(event.mode); // B-89: je Modus getrennt
    return state.data[key] ? { ...state, data: { ...state.data, [key]: false } } : state;
  }
  if (event.type === 'toggleBrake' && state.view === 'admin') {
    return { ...state, data: { ...state.data, brakeNew: !state.data.brakeNew } };
  }
  if (event.type === 'roundMin' && state.view === 'admin') {
    const { minutes } = event;
    if (!isRoundMin(minutes) || minutes === state.data.roundMin) return state;
    return { ...state, data: { ...state.data, roundMin: minutes } };
  }
  if (event.type === 'toggleLanguage' && state.view === 'admin') {
    if (!canToggleLanguage(state.data, event.language)) return state;
    const on = state.data.enabledLanguages;
    const enabled = on.includes(event.language)
      ? on.filter((l) => l !== event.language)
      : LANGUAGES.filter((l) => on.includes(l) || l === event.language);
    return { ...state, data: { ...state.data, enabledLanguages: enabled } };
  }
  if (event.type === 'toggleWord' && state.view === 'admin') {
    const { language, id } = event;
    if (!canToggleWord(state.data, language, id)) return state;
    const off = state.data.disabledWords[language];
    const next = off.includes(id)
      ? off.filter((w) => w !== id)
      : vocabulary(language)
          .map((w) => w.id)
          .filter((w) => off.includes(w) || w === id);
    const disabledWords = { ...state.data.disabledWords, [language]: next };
    return { ...state, data: { ...state.data, disabledWords } };
  }
  if (event.type === 'resetProgress' && state.view === 'admin') {
    const key = progressKey(event.mode);
    const progress = { ...state.data[key], [event.language]: {} };
    return { ...state, data: { ...state.data, [key]: progress } };
  }
  const view = nextView(state.view, event);
  if (view === state.view) return state;
  // Jede Lernrunde beginnt mit einer neuen Scheduler-Session.
  const round =
    view === 'round'
      ? { session: createSession(), wordId: null, revealed: false, expired: false }
      : state.round;
  if (view === 'admin') {
    return { ...state, view, round, adminFrom: state.view as AppState['adminFrom'] };
  }
  return { ...state, view, round };
}

export type Listener = (state: AppState, previous: AppState) => void;

export interface Store {
  getState(): AppState;
  dispatch(event: AppEvent): void;
  subscribe(listener: Listener): () => void;
}

/** `now` liefert die aktuelle Zeit (in Tests ersetzbar). */
export function createStore(
  stored: ChildData,
  portrait = false,
  now: () => Date = () => new Date(),
): Store {
  const data = withRestSettings(wakeIfNewDay(stored, localDay(now())));
  // B-97: beim Öffnen zuerst die Begrüßung – außer beide Tiere schlafen
  let state: AppState = {
    view: allAsleep(data) ? 'sleep' : 'welcome',
    portrait,
    data,
    round: null,
  };
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    dispatch(event) {
      const previous = state;
      state = reduce(state, event, localDay(now()));
      if (state !== previous) listeners.forEach((l) => l(state, previous));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
