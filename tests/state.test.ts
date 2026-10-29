import { describe, expect, it, vi } from 'vitest';
import { defaults } from '../src/storage';
import {
  createStore,
  isComplete,
  nextView,
  reduce,
  type AppEvent,
  type AppState,
  type ViewName,
} from '../src/state';

/** Daten mit vollständiger Auswahl, damit Play erlaubt ist. */
const complete = () => {
  const data = defaults();
  data.settings = { companion: 'mimi', language: 'en', durationMin: 5 };
  return data;
};

const VIEWS: ViewName[] = ['start', 'round', 'end'];
const EVENTS: AppEvent[] = [{ type: 'play' }, { type: 'finish' }, { type: 'home' }];

describe('nextView', () => {
  it.each([
    ['start', 'play', 'round'],
    ['round', 'finish', 'end'],
    ['end', 'home', 'start'],
  ] as const)('%s + %s → %s', (from, type, to) => {
    expect(nextView(from, { type })).toBe(to);
  });

  it('ignoriert alle anderen Übergänge', () => {
    const allowed = new Set(['start:play', 'round:finish', 'end:home']);
    for (const view of VIEWS) {
      for (const event of EVENTS) {
        if (!allowed.has(`${view}:${event.type}`)) expect(nextView(view, event)).toBe(view);
      }
    }
  });

  it('Ausrichtung wechselt nie die Ansicht', () => {
    for (const view of VIEWS) {
      expect(nextView(view, { type: 'orientation', portrait: true })).toBe(view);
    }
  });
});

describe('reduce', () => {
  const base = { view: 'round' as const, portrait: false, data: defaults() };

  it('setzt portrait, ohne Ansicht oder Daten zu ändern', () => {
    const next = reduce(base, { type: 'orientation', portrait: true });
    expect(next).toEqual({ ...base, portrait: true });
    expect(next.data).toBe(base.data);
  });

  it('gibt bei unveränderlichem Ereignis denselben State zurück', () => {
    expect(reduce(base, { type: 'play' })).toBe(base);
    expect(reduce(base, { type: 'orientation', portrait: false })).toBe(base);
  });
});

describe('createStore', () => {
  it('startet immer in der Startansicht', () => {
    expect(createStore(defaults()).getState().view).toBe('start');
  });

  it('übernimmt die anfängliche Ausrichtung', () => {
    expect(createStore(defaults(), true).getState().portrait).toBe(true);
  });

  it('benachrichtigt bei Änderungen mit neuem und altem State', () => {
    const store = createStore(complete());
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'play' });
    expect(listener).toHaveBeenCalledTimes(1);
    const [state, previous] = listener.mock.calls[0];
    expect(previous.view).toBe('start');
    expect(state.view).toBe('round');
  });

  it('benachrichtigt nicht bei ignorierten Ereignissen', () => {
    const store = createStore(defaults());
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: 'home' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribe liefert eine Abmeldefunktion', () => {
    const store = createStore(complete());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.dispatch({ type: 'play' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('kompletter Ablauf: start → round → end → start', () => {
    const store = createStore(complete());
    const seen = [store.getState().view];
    for (const type of ['play', 'finish', 'home'] as const) {
      store.dispatch({ type });
      seen.push(store.getState().view);
    }
    expect(seen).toEqual(['start', 'round', 'end', 'start']);
  });
});

describe('Auswahl (B-11)', () => {
  const startState = (): AppState => ({ view: 'start', portrait: false, data: defaults() });

  it('isComplete braucht Begleiter, Sprache und Dauer', () => {
    expect(isComplete(defaults().settings)).toBe(false);
    expect(isComplete(complete().settings)).toBe(true);
    expect(isComplete({ ...complete().settings, language: null })).toBe(false);
    expect(isComplete({ ...complete().settings, durationMin: null })).toBe(false);
  });

  it('Play ohne vollständige Auswahl wird ignoriert', () => {
    const state = startState();
    expect(reduce(state, { type: 'play' })).toBe(state);
  });

  it('select übernimmt einzelne Einstellungen, andere bleiben', () => {
    let state = startState();
    state = reduce(state, { type: 'select', settings: { companion: 'mots' } });
    state = reduce(state, { type: 'select', settings: { language: 'fr' } });
    expect(state.data.settings).toEqual({ companion: 'mots', language: 'fr', durationMin: 5 });
    expect(reduce(state, { type: 'play' }).view).toBe('round');
  });

  it('select ohne Änderung liefert denselben State', () => {
    const state = startState();
    expect(reduce(state, { type: 'select', settings: { durationMin: 5 } })).toBe(state);
  });

  it('select ändert die Daten nicht in-place', () => {
    const state = startState();
    const before = structuredClone(state.data);
    reduce(state, { type: 'select', settings: { companion: 'mimi' } });
    expect(state.data).toEqual(before);
  });

  it('select wirkt nur auf der Startansicht', () => {
    const state: AppState = { view: 'round', portrait: false, data: complete() };
    expect(reduce(state, { type: 'select', settings: { companion: 'mots' } })).toBe(state);
  });

  it('Store: Auswahl treffen, dann spielen', () => {
    const store = createStore(defaults());
    store.dispatch({ type: 'play' });
    expect(store.getState().view).toBe('start');
    store.dispatch({ type: 'select', settings: { companion: 'mimi', language: 'en' } });
    store.dispatch({ type: 'play' });
    expect(store.getState().view).toBe('round');
  });
});
