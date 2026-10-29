import { describe, expect, it, vi } from 'vitest';
import { defaults } from '../src/storage';
import { createStore, nextView, reduce, type AppEvent, type ViewName } from '../src/state';

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
    const store = createStore(defaults());
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
    const store = createStore(defaults());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.dispatch({ type: 'play' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('kompletter Ablauf: start → round → end → start', () => {
    const store = createStore(defaults());
    const seen = [store.getState().view];
    for (const type of ['play', 'finish', 'home'] as const) {
      store.dispatch({ type });
      seen.push(store.getState().view);
    }
    expect(seen).toEqual(['start', 'round', 'end', 'start']);
  });
});
