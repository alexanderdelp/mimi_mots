// App-State: aktuelle Ansicht als einfache Zustandsmaschine, plus gespeicherte Daten
// und ob das Gerät gerade im Hochformat ist (Overlay, Timer-Pause ab B-40/B-52).
import type { AppData } from './storage';

export type ViewName = 'start' | 'round' | 'end';

export type AppEvent =
  | { type: 'play' } // Start → Lernrunde
  | { type: 'finish' } // Lernrunde → Abschluss (Timer-Ende oder [×])
  | { type: 'home' } // Abschluss → Start
  | { type: 'orientation'; portrait: boolean };

export interface AppState {
  view: ViewName;
  portrait: boolean;
  data: AppData;
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
  const view = nextView(state.view, event);
  return view === state.view ? state : { ...state, view };
}

export type Listener = (state: AppState, previous: AppState) => void;

export interface Store {
  getState(): AppState;
  dispatch(event: AppEvent): void;
  subscribe(listener: Listener): () => void;
}

export function createStore(data: AppData, portrait = false): Store {
  let state: AppState = { view: 'start', portrait, data };
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
