import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaults, type AppData } from '../src/storage';
import {
  createStore,
  createStore as createStoreAt,
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
  data.settings = { companion: 'mimi', language: 'en', durationMin: 3 };
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
  const base: AppState = { view: 'round', portrait: false, data: defaults(), round: null };

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
  const startState = (): AppState => ({
    view: 'start',
    portrait: false,
    data: defaults(),
    round: null,
  });

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
    expect(state.data.settings).toEqual({ companion: 'mots', language: 'fr', durationMin: 3 });
    expect(reduce(state, { type: 'play' }).view).toBe('round');
  });

  it('select ohne Änderung liefert denselben State', () => {
    const state = startState();
    expect(reduce(state, { type: 'select', settings: { durationMin: 3 } })).toBe(state);
  });

  it('select ändert die Daten nicht in-place', () => {
    const state = startState();
    const before = structuredClone(state.data);
    reduce(state, { type: 'select', settings: { companion: 'mimi' } });
    expect(state.data).toEqual(before);
  });

  it('select wirkt nur auf der Startansicht', () => {
    const state: AppState = { view: 'round', portrait: false, data: complete(), round: null };
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

describe('Lernrunde (B-21)', () => {
  const session = { history: ['apfel'], introduced: ['apfel'] };

  it('Play startet eine neue Runde ohne Wort', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    expect(store.getState().round).toEqual({
      session: { history: [], introduced: [] },
      wordId: null,
      revealed: false,
      expired: false,
    });
  });

  it('word setzt aktuelles Wort und Session', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    expect(store.getState().round).toEqual({
      session,
      wordId: 'apfel',
      revealed: false,
      expired: false,
    });
  });

  it('word wird außerhalb der Lernrunde ignoriert', () => {
    const store = createStore(complete());
    const before = store.getState();
    store.dispatch({ type: 'word', id: 'apfel', session });
    expect(store.getState()).toBe(before);
  });

  it('jede neue Runde beginnt mit leerer Session', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    store.dispatch({ type: 'finish' });
    store.dispatch({ type: 'home' });
    store.dispatch({ type: 'play' });
    expect(store.getState().round?.session.history).toEqual([]);
    expect(store.getState().round?.wordId).toBeNull();
  });

  it('Ausrichtung ändert das Wort nicht', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    store.dispatch({ type: 'orientation', portrait: true });
    store.dispatch({ type: 'orientation', portrait: false });
    expect(store.getState().round?.wordId).toBe('apfel');
  });
});

describe('Aufdecken (B-22)', () => {
  const session = { history: ['apfel'], introduced: ['apfel'] };
  const inRound = () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    return store;
  };

  it('reveal deckt das aktuelle Wort auf', () => {
    const store = inRound();
    store.dispatch({ type: 'reveal' });
    expect(store.getState().round?.revealed).toBe(true);
  });

  it('erneutes reveal ändert den State nicht', () => {
    const store = inRound();
    store.dispatch({ type: 'reveal' });
    const before = store.getState();
    store.dispatch({ type: 'reveal' });
    expect(store.getState()).toBe(before);
  });

  it('reveal ohne Wort oder außerhalb der Runde wird ignoriert', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'reveal' });
    expect(store.getState().round).toBeNull();
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'reveal' });
    expect(store.getState().round?.revealed).toBe(false);
  });

  it('ein neues Wort ist wieder verdeckt', () => {
    const store = inRound();
    store.dispatch({ type: 'reveal' });
    store.dispatch({ type: 'word', id: 'hund', session });
    expect(store.getState().round?.revealed).toBe(false);
  });
});

describe('Selbsteinschätzung (B-23)', () => {
  const AT = '2026-10-29T12:00:00.000Z';
  const session = { history: ['apfel'], introduced: ['apfel'] };
  const revealedRound = () => {
    const store = createStore(complete()); // Sprache: en
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    store.dispatch({ type: 'reveal' });
    return store;
  };

  it('„Wusste ich“ setzt Box 1 und seen 1 in der gewählten Sprache', () => {
    const store = revealedRound();
    store.dispatch({ type: 'rate', rating: 'known', at: AT });
    expect(store.getState().data.progress.en.apfel).toEqual({ box: 1, seen: 1, lastSeenAt: AT });
    expect(store.getState().data.progress.fr).toEqual({});
  });

  it('„Noch üben“ setzt Box 0', () => {
    const store = revealedRound();
    store.dispatch({ type: 'rate', rating: 'practice', at: AT });
    expect(store.getState().data.progress.en.apfel.box).toBe(0);
  });

  it('nach der Bewertung ist das Wort wieder verdeckt (kein doppeltes Bewerten)', () => {
    const store = revealedRound();
    store.dispatch({ type: 'rate', rating: 'known', at: AT });
    expect(store.getState().round?.revealed).toBe(false);
    const before = store.getState();
    store.dispatch({ type: 'rate', rating: 'known', at: AT });
    expect(store.getState()).toBe(before);
  });

  it('ohne Aufdecken wird nicht bewertet', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    const before = store.getState();
    store.dispatch({ type: 'rate', rating: 'known', at: AT });
    expect(store.getState()).toBe(before);
  });

  it('ändert die Daten nicht in-place', () => {
    const store = revealedRound();
    const data = store.getState().data;
    const snapshot = structuredClone(data);
    store.dispatch({ type: 'rate', rating: 'known', at: AT });
    expect(data).toEqual(snapshot);
    expect(store.getState().data).not.toBe(data);
  });
});

describe('Zeitablauf (B-40)', () => {
  const session = { history: ['apfel'], introduced: ['apfel'] };
  const inRound = () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    return store;
  };

  it('expire markiert die Runde als abgelaufen, sonst ändert sich nichts', () => {
    const store = inRound();
    const before = store.getState();
    store.dispatch({ type: 'expire' });
    const after = store.getState();
    expect(after.round?.expired).toBe(true);
    expect(after.view).toBe('round');
    expect(after.round?.wordId).toBe(before.round?.wordId);
    expect(after.data).toBe(before.data);
  });

  it('expire bleibt beim nächsten Wort erhalten', () => {
    const store = inRound();
    store.dispatch({ type: 'expire' });
    store.dispatch({ type: 'word', id: 'hund', session });
    expect(store.getState().round?.expired).toBe(true);
  });

  it('expire außerhalb der Runde oder doppelt ändert nichts', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'expire' });
    expect(store.getState().round).toBeNull();
    const inside = inRound();
    inside.dispatch({ type: 'expire' });
    const before = inside.getState();
    inside.dispatch({ type: 'expire' });
    expect(inside.getState()).toBe(before);
  });

  it('eine neue Runde beginnt nicht abgelaufen', () => {
    const store = inRound();
    store.dispatch({ type: 'expire' });
    store.dispatch({ type: 'finish' });
    store.dispatch({ type: 'home' });
    store.dispatch({ type: 'play' });
    expect(store.getState().round?.expired).toBe(false);
  });
});

describe('Rundenende (B-42)', () => {
  const AT = '2026-10-29T12:00:00.000Z';
  const session = { history: ['apfel'], introduced: ['apfel'] };
  const revealed = (expired: boolean) => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    if (expired) store.dispatch({ type: 'expire' });
    store.dispatch({ type: 'reveal' });
    return store;
  };

  it('nach Ablauf führt die Bewertung zum Abschluss und speichert den Lernstand', () => {
    const store = revealed(true);
    store.dispatch({ type: 'rate', rating: 'known', at: AT });
    expect(store.getState().view).toBe('end');
    expect(store.getState().data.progress.en.apfel).toEqual({ box: 1, seen: 1, lastSeenAt: AT });
  });

  it('ohne Ablauf bleibt die Bewertung in der Runde', () => {
    const store = revealed(false);
    store.dispatch({ type: 'rate', rating: 'practice', at: AT });
    expect(store.getState().view).toBe('round');
  });

  it('nach Ablauf ohne Aufdecken bewirkt eine Bewertung nichts', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'apfel', session });
    store.dispatch({ type: 'expire' });
    const before = store.getState();
    store.dispatch({ type: 'rate', rating: 'known', at: AT });
    expect(store.getState()).toBe(before);
  });
});

describe('Schlafende Begleiter (B-65)', () => {
  const TODAY = new Date(2026, 9, 30, 9, 0); // 30.10.2026, lokale Zeit
  let clock = TODAY;
  const now = () => clock;
  const rest = (
    sleeping: ('mimi' | 'mots')[],
    usedDurations: (3 | 7)[],
    since: string | null = '2026-10-30',
  ) => {
    const data = complete();
    data.rest = { sleeping, usedDurations, since };
    return data;
  };
  const createStore = (data: AppData) => createStoreAt(data, false, now);
  beforeEach(() => {
    clock = TODAY;
  });

  /** Spielt eine Runde mit der aktuellen Auswahl und beendet sie per [×]. */
  function playAndFinish(store: ReturnType<typeof createStore>) {
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'finish' });
  }

  it('Ende der Runde: Begleiter schläft, Dauer verbraucht, Abschluss zeigt ihn noch', () => {
    const store = createStore(complete());
    playAndFinish(store);
    const state = store.getState();
    expect(state.view).toBe('end');
    expect(state.data.rest).toEqual({
      sleeping: ['mimi'],
      usedDurations: [3],
      since: '2026-10-30',
    });
    expect(state.data.settings.companion).toBe('mimi');
  });

  it('Ende per Zeitablauf verbraucht ebenso', () => {
    const store = createStore(complete());
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'word', id: 'hund', session: store.getState().round!.session });
    store.dispatch({ type: 'expire' });
    store.dispatch({ type: 'reveal' });
    store.dispatch({ type: 'rate', rating: 'known', at: '2026-10-29T10:00:00.000Z' });
    expect(store.getState().view).toBe('end');
    expect(store.getState().data.rest).toEqual({
      sleeping: ['mimi'],
      usedDurations: [3],
      since: '2026-10-30',
    });
  });

  it('zurück zum Start: verbleibender Begleiter und Dauer vorausgewählt, Sprache bleibt', () => {
    const store = createStore(complete());
    playAndFinish(store);
    store.dispatch({ type: 'home' });
    expect(store.getState().view).toBe('start');
    expect(store.getState().data.settings).toEqual({
      companion: 'mots',
      language: 'en',
      durationMin: 7,
    });
  });

  it('schlafender Begleiter und verbrauchte Dauer sind nicht wählbar', () => {
    const store = createStore(rest(['mimi'], [3]));
    const before = store.getState();
    store.dispatch({ type: 'select', settings: { companion: 'mimi' } });
    store.dispatch({ type: 'select', settings: { durationMin: 3 } });
    expect(store.getState()).toBe(before);
  });

  it('Play mit schlafendem Begleiter wird ignoriert', () => {
    const state: AppState = {
      view: 'start',
      portrait: false,
      data: rest(['mimi'], []),
      round: null,
    };
    expect(reduce(state, { type: 'play' })).toBe(state);
  });

  it('nach dem zweiten Begleiter folgt die Schlafseite', () => {
    const store = createStore(complete());
    playAndFinish(store);
    store.dispatch({ type: 'home' });
    playAndFinish(store);
    expect(store.getState().data.rest).toEqual({
      sleeping: ['mimi', 'mots'],
      usedDurations: [3, 7],
      since: '2026-10-30',
    });
    store.dispatch({ type: 'home' });
    expect(store.getState().view).toBe('sleep');
  });

  it('App-Start mit beiden schlafend → Schlafseite', () => {
    expect(createStore(rest(['mimi', 'mots'], [3, 7])).getState().view).toBe('sleep');
  });

  it('App-Start mit einem schlafend → Start mit Vorauswahl', () => {
    const state = createStore(rest(['mimi'], [3])).getState();
    expect(state.view).toBe('start');
    expect(state.data.settings).toMatchObject({ companion: 'mots', durationMin: 7 });
  });

  it('wake weckt alle, gibt alle Dauern frei und behält die Auswahl', () => {
    const data = rest(['mimi', 'mots'], [3, 7]);
    data.settings = { companion: 'mots', language: 'fr', durationMin: 7 };
    const store = createStore(data);
    store.dispatch({ type: 'wake' });
    const state = store.getState();
    expect(state.view).toBe('start');
    expect(state.data.rest).toEqual({ sleeping: [], usedDurations: [], since: null });
    expect(state.data.settings).toEqual({ companion: 'mots', language: 'fr', durationMin: 7 });
  });

  it('wake wirkt nur auf der Schlafseite', () => {
    const store = createStore(rest(['mimi'], [3]));
    const before = store.getState();
    store.dispatch({ type: 'wake' });
    expect(store.getState()).toBe(before);
  });

  it('App-Start an einem späteren Tag: alle wach, Dauern frei, Startseite', () => {
    clock = new Date(2026, 9, 31, 7, 0);
    const state = createStore(rest(['mimi', 'mots'], [3, 7], '2026-10-30')).getState();
    expect(state.view).toBe('start');
    expect(state.data.rest).toEqual({ sleeping: [], usedDurations: [], since: null });
  });

  it('am selben Tag bleibt es beim Schlaf, auch kurz vor Mitternacht', () => {
    clock = new Date(2026, 9, 30, 23, 59);
    expect(createStore(rest(['mimi', 'mots'], [3, 7])).getState().view).toBe('sleep');
  });

  it('App bleibt offen: Tageswechsel weckt beim Zurückholen (day)', () => {
    const store = createStore(rest(['mimi', 'mots'], [3, 7]));
    store.dispatch({ type: 'day' });
    expect(store.getState().view).toBe('sleep');
    clock = new Date(2026, 9, 31, 0, 1);
    store.dispatch({ type: 'day' });
    expect(store.getState().view).toBe('start');
    expect(store.getState().data.rest.sleeping).toEqual([]);
  });

  it('Begleiter von gestern wacht auf, wenn heute der andere einschläft', () => {
    const store = createStore(rest(['mimi'], [3], '2026-10-30'));
    clock = new Date(2026, 9, 31, 8, 0);
    store.dispatch({ type: 'play' }); // Mots, 7 Minuten (vorausgewählt) – App war offen
    store.dispatch({ type: 'finish' });
    expect(store.getState().data.rest).toEqual({
      sleeping: ['mots'],
      usedDurations: [7],
      since: '2026-10-31',
    });
  });

  it('Schlaf ohne Datum gilt als alt', () => {
    expect(createStore(rest(['mimi', 'mots'], [3, 7], null)).getState().view).toBe('start');
  });
});
