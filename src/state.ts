// App-State: aktuelle Ansicht als einfache Zustandsmaschine, plus gespeicherte Daten
// und ob das Gerät gerade im Hochformat ist (Overlay, Timer-Pause ab B-40/B-52).
import { createSession, type Session } from './scheduler';
import type { AppData, Settings } from './storage';

export type ViewName = 'start' | 'round' | 'end';

export type AppEvent =
  | { type: 'play' } // Start → Lernrunde (nur mit vollständiger Auswahl)
  | { type: 'finish' } // Lernrunde → Abschluss (Timer-Ende oder [×])
  | { type: 'home' } // Abschluss → Start
  | { type: 'select'; settings: Partial<Settings> } // Auswahl auf der Startansicht
  | { type: 'word'; id: string; session: Session } // nächstes Wort der Lernrunde
  | { type: 'reveal' } // Fremdwort aufdecken (Tipp auf Flagge)
  | { type: 'orientation'; portrait: boolean };

/** Begleiter, Sprache und Dauer sind gewählt. */
export function isComplete(settings: Settings): boolean {
  return settings.companion !== null && settings.language !== null && settings.durationMin !== null;
}

/** Lernrunde: Scheduler-Session, aktuelles Wort (null, bis das erste gewählt ist) und
 *  ob das Fremdwort schon aufgedeckt wurde. */
export interface RoundState {
  session: Session;
  wordId: string | null;
  revealed: boolean;
}

export interface AppState {
  view: ViewName;
  portrait: boolean;
  data: AppData;
  round: RoundState | null;
}

/** Erlaubte Ansichtswechsel; alles andere wird ignoriert. */
const TRANSITIONS: Record<ViewName, Partial<Record<AppEvent['type'], ViewName>>> = {
  start: { play: 'round' },
  round: { finish: 'end' },
  end: { home: 'start' },
};

export function nextView(view: ViewName, event: AppEvent): ViewName {
  return TRANSITIONS[view][event.type] ?? view;
}

export function reduce(state: AppState, event: AppEvent): AppState {
  if (event.type === 'orientation') {
    return event.portrait === state.portrait ? state : { ...state, portrait: event.portrait };
  }
  if (event.type === 'select') {
    if (state.view !== 'start') return state;
    const settings = { ...state.data.settings, ...event.settings };
    const changed = (Object.keys(settings) as (keyof Settings)[]).some(
      (k) => settings[k] !== state.data.settings[k],
    );
    return changed ? { ...state, data: { ...state.data, settings } } : state;
  }
  if (event.type === 'word') {
    if (state.view !== 'round') return state;
    return { ...state, round: { session: event.session, wordId: event.id, revealed: false } };
  }
  if (event.type === 'reveal') {
    if (state.view !== 'round' || !state.round?.wordId || state.round.revealed) return state;
    return { ...state, round: { ...state.round, revealed: true } };
  }
  if (event.type === 'play' && !isComplete(state.data.settings)) return state;
  const view = nextView(state.view, event);
  if (view === state.view) return state;
  // Jede Lernrunde beginnt mit einer neuen Scheduler-Session.
  const round =
    view === 'round' ? { session: createSession(), wordId: null, revealed: false } : state.round;
  return { ...state, view, round };
}

export type Listener = (state: AppState, previous: AppState) => void;

export interface Store {
  getState(): AppState;
  dispatch(event: AppEvent): void;
  subscribe(listener: Listener): () => void;
}

export function createStore(data: AppData, portrait = false): Store {
  let state: AppState = { view: 'start', portrait, data, round: null };
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    dispatch(event) {
      const previous = state;
      state = reduce(state, event);
      if (state !== previous) listeners.forEach((l) => l(state, previous));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
