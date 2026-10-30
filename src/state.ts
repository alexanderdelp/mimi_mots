// App-State: aktuelle Ansicht als einfache Zustandsmaschine, plus gespeicherte Daten
// und ob das Gerät gerade im Hochformat ist (Overlay, Timer-Pause ab B-40/B-52).
import { COMPANIONS } from './components/avatar';
import { applyRating, createSession, type Rating, type Session } from './scheduler';
import type { Language } from './data/words';
import { DURATIONS, LANGUAGES, localDay, type AppData, type Settings } from './storage';

export type ViewName = 'start' | 'round' | 'end' | 'sleep' | 'admin';

export type AppEvent =
  | { type: 'play' } // Start → Lernrunde (nur mit vollständiger Auswahl)
  | { type: 'finish' } // Lernrunde → Abschluss (Timer-Ende oder [×])
  | { type: 'home' } // Abschluss → Start (bzw. Schlafseite, wenn beide Begleiter schlafen)
  | { type: 'admin' } // Start/Schlafseite → Elternbereich (verstecktes Halten des Icons, B-69)
  | { type: 'leave' } // Elternbereich → Start bzw. Schlafseite
  | { type: 'wake' } // Elternbereich: alle wach und alle Dauern frei (B-65/B-69)
  | { type: 'resetProgress'; language: Language } // Elternbereich: Lernstand einer Sprache leeren
  | { type: 'toggleLanguage'; language: Language } // Elternbereich: Sprache an/aus (B-73)
  | { type: 'tutorialDone' } // Lernrunde: Tutorial abgeschlossen (B-74)
  | { type: 'resetTutorial' } // Elternbereich: Tutorial kommt in der nächsten Runde wieder
  | { type: 'day' } // App wieder sichtbar: an einem neuen Tag wachen alle auf (B-65)
  | { type: 'select'; settings: Partial<Settings> } // Auswahl auf der Startansicht
  | { type: 'word'; id: string; session: Session } // nächstes Wort der Lernrunde
  | { type: 'reveal' } // Fremdwort aufdecken (Tipp auf Flagge)
  | { type: 'rate'; rating: Rating; at: string } // Selbsteinschätzung (ISO-Zeitpunkt)
  | { type: 'expire' } // Session-Timer abgelaufen (Runde läuft bis zur nächsten Bewertung weiter)
  | { type: 'orientation'; portrait: boolean };

/** Begleiter, Sprache und Dauer sind gewählt. */
export function isComplete(settings: Settings): boolean {
  return settings.companion !== null && settings.language !== null && settings.durationMin !== null;
}

/** Schlafseite statt Start: kein Begleiter wach oder keine Dauer mehr frei (B-65). */
export function allAsleep(data: AppData): boolean {
  return (
    data.rest.sleeping.length === COMPANIONS.length ||
    data.rest.usedDurations.length === DURATIONS.length
  );
}

/** Auswahl passend zu Schlaf, Verbrauch und aktiven Sprachen (B-65/B-73): Nicht mehr Wählbares
 *  fällt weg, ist nur noch eine Möglichkeit frei, wird sie vorausgewählt. */
export function withRestSettings(data: AppData): AppData {
  const pick = <T>(all: readonly T[], gone: readonly T[], current: T | null): T | null => {
    const free = all.filter((v) => !gone.includes(v));
    if (free.length === 0) return current; // Schlafseite: Auswahl für nach dem Aufwecken merken
    if (free.length === 1) return free[0];
    return current !== null && free.includes(current) ? current : null;
  };
  const { settings, rest } = data;
  const companion = pick(COMPANIONS, rest.sleeping, settings.companion);
  const durationMin = pick(DURATIONS, rest.usedDurations, settings.durationMin);
  const off = LANGUAGES.filter((l) => !data.enabledLanguages.includes(l));
  const language = pick(LANGUAGES, off, settings.language);
  if (
    companion === settings.companion &&
    durationMin === settings.durationMin &&
    language === settings.language
  ) {
    return data;
  }
  return { ...data, settings: { ...settings, companion, durationMin, language } };
}

const AWAKE = { sleeping: [], usedDurations: [], since: null };

/** Eingeschlafen an einem früheren Tag (oder ohne Datum) – dann wachen alle auf. */
function isStale(data: AppData, today: string): boolean {
  const { sleeping, usedDurations, since } = data.rest;
  return (sleeping.length > 0 || usedDurations.length > 0) && (since === null || since < today);
}

/** An einem neuen Tag sind alle wach und alle Dauern frei. */
function wakeIfNewDay(data: AppData, today: string): AppData {
  return isStale(data, today) ? { ...data, rest: AWAKE } : data;
}

/** Am Ende einer Runde schläft der Begleiter ein, die Dauer ist verbraucht (B-65). */
function consume(data: AppData, today: string): AppData {
  const { companion, durationMin } = data.settings;
  const { sleeping, usedDurations } = wakeIfNewDay(data, today).rest;
  return {
    ...data,
    rest: {
      sleeping: COMPANIONS.filter((c) => sleeping.includes(c) || c === companion),
      usedDurations: DURATIONS.filter((d) => usedDurations.includes(d) || d === durationMin),
      since: today,
    },
  };
}

/** Gewählter Begleiter wach und gewählte Dauer frei. */
function isAvailable(data: AppData): boolean {
  const { companion, durationMin } = data.settings;
  return (
    isComplete(data.settings) &&
    data.enabledLanguages.includes(data.settings.language!) &&
    !data.rest.sleeping.includes(companion!) &&
    !data.rest.usedDurations.includes(durationMin!)
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
  data: AppData;
  round: RoundState | null;
}

/** Erlaubte Ansichtswechsel; alles andere wird ignoriert. */
const TRANSITIONS: Record<ViewName, Partial<Record<AppEvent['type'], ViewName>>> = {
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
  const next = step(state, event);
  // Wer die Abschlussseite erreicht, hat begleitet – egal ob per Zeitablauf oder [×].
  if (state.view === 'round' && next.view === 'end') {
    return { ...next, data: consume(next.data, today) };
  }
  // Auf Start- und Schlafseite: an einem neuen Tag sind alle wieder wach.
  if ((next.view === 'start' || next.view === 'sleep') && isStale(next.data, today)) {
    return { ...next, view: 'start', data: withRestSettings(wakeIfNewDay(next.data, today)) };
  }
  return next;
}

function step(state: AppState, event: AppEvent): AppState {
  if (event.type === 'orientation') {
    return event.portrait === state.portrait ? state : { ...state, portrait: event.portrait };
  }
  if (event.type === 'select') {
    if (state.view !== 'start') return state;
    const { companion, durationMin } = event.settings;
    if (companion && state.data.rest.sleeping.includes(companion)) return state;
    if (durationMin && state.data.rest.usedDurations.includes(durationMin)) return state;
    const { language } = event.settings;
    if (language && !state.data.enabledLanguages.includes(language)) return state;
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
    const language = state.data.settings.language;
    if (state.view !== 'round' || !state.round?.wordId || !state.round.revealed || !language) {
      return state;
    }
    const progress = {
      ...state.data.progress,
      [language]: applyRating(
        state.data.progress[language],
        state.round.wordId,
        event.rating,
        new Date(event.at),
      ),
    };
    // Nach Ablauf der Zeit kommt statt des nächsten Worts der Abschluss (§3.4, B-42).
    return {
      ...state,
      view: state.round.expired ? 'end' : state.view,
      data: { ...state.data, progress },
      round: { ...state.round, revealed: false },
    };
  }
  if (event.type === 'play' && !isAvailable(state.data)) return state;
  if (event.type === 'home' && state.view === 'end') {
    const data = withRestSettings(state.data);
    return { ...state, view: allAsleep(data) ? 'sleep' : 'start', data };
  }
  if (event.type === 'wake' && state.view === 'admin') {
    return { ...state, data: withRestSettings({ ...state.data, rest: AWAKE }) };
  }
  if (event.type === 'leave' && state.view === 'admin') {
    const data = withRestSettings(state.data);
    return { ...state, view: allAsleep(data) ? 'sleep' : 'start', data };
  }
  if (event.type === 'tutorialDone' && state.view === 'round' && !state.data.tutorialDone) {
    return { ...state, data: { ...state.data, tutorialDone: true } };
  }
  if (event.type === 'resetTutorial' && state.view === 'admin' && state.data.tutorialDone) {
    return { ...state, data: { ...state.data, tutorialDone: false } };
  }
  if (event.type === 'toggleLanguage' && state.view === 'admin') {
    const on = state.data.enabledLanguages;
    const enabled = on.includes(event.language)
      ? on.filter((l) => l !== event.language)
      : LANGUAGES.filter((l) => on.includes(l) || l === event.language);
    if (enabled.length === 0) return state; // mindestens eine Sprache bleibt aktiv
    return { ...state, data: { ...state.data, enabledLanguages: enabled } };
  }
  if (event.type === 'resetProgress' && state.view === 'admin') {
    const progress = { ...state.data.progress, [event.language]: {} };
    return { ...state, data: { ...state.data, progress } };
  }
  const view = nextView(state.view, event);
  if (view === state.view) return state;
  // Jede Lernrunde beginnt mit einer neuen Scheduler-Session.
  const round =
    view === 'round'
      ? { session: createSession(), wordId: null, revealed: false, expired: false }
      : state.round;
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
  stored: AppData,
  portrait = false,
  now: () => Date = () => new Date(),
): Store {
  const data = withRestSettings(wakeIfNewDay(stored, localDay(now())));
  let state: AppState = { view: allAsleep(data) ? 'sleep' : 'start', portrait, data, round: null };
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
