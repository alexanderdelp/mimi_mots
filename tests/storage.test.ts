import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasVocabulary, vocabularyIds } from '../src/data/vocabulary';
import { createStore } from '../src/state';
import {
  LANGUAGES,
  STORAGE_KEY,
  defaults,
  load,
  localDay,
  persistOnChange,
  sanitize,
  save,
  withWords,
  type AppData,
} from '../src/storage';

const valid = (): AppData => ({
  version: 1,
  settings: { companion: 'mots', language: 'fr', mode: 'speak' },
  progress: {
    fr: { apfel: { box: 2, seen: 5, lastSeenAt: '2026-10-29T10:00:00.000Z' } },
    en: { hund: { box: 0, seen: 1, lastSeenAt: '2026-10-28T09:30:00.000Z' } },
    ja: { katze: { box: 1, seen: 2, lastSeenAt: '2026-10-30T08:00:00.000Z' } },
    it: { hase: { box: 4, seen: 7, lastSeenAt: '2026-10-30T09:00:00.000Z' } },
  },
  listenProgress: {
    fr: { hund: { box: 1, seen: 1, lastSeenAt: '2026-10-30T10:00:00.000Z' } },
    en: {},
    ja: {},
    it: {},
  },
  rest: { sleeping: ['mimi'], since: '2026-10-29' },
  enabledLanguages: ['en', 'it'],
  tutorialDone: true,
  listenTutorialDone: false,
  brakeNew: false,
  disabledWords: { en: ['hund'], fr: [], ja: [], it: [] },
});

/** Storage, dessen Zugriffe immer werfen (z. B. voller Speicher, privater Modus). */
const throwingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
} as unknown as Storage;

beforeEach(() => localStorage.clear());

describe('defaults', () => {
  it('Erststart: nur der Modus ist vorbelegt, kein Lernstand', () => {
    expect(defaults()).toEqual({
      version: 1,
      settings: { companion: null, language: null, mode: 'speak' },
      progress: { en: {}, fr: {}, ja: {}, it: {} },
      listenProgress: { en: {}, fr: {}, ja: {}, it: {} },
      rest: { sleeping: [], since: null },
      enabledLanguages: ['en', 'fr'],
      tutorialDone: false,
      listenTutorialDone: false,
      brakeNew: true,
      disabledWords: { en: [], fr: [], ja: [], it: [] },
    });
  });

  it('liefert jedes Mal ein neues Objekt', () => {
    const a = defaults();
    a.progress.fr.apfel = { box: 1, seen: 1, lastSeenAt: '2026-10-29T10:00:00.000Z' };
    expect(defaults().progress.fr).toEqual({});
  });
});

describe('load/save', () => {
  it('liefert Defaults, wenn nichts gespeichert ist', () => {
    expect(load()).toEqual(defaults());
  });

  it('Roundtrip: Gespeichertes wird unverändert geladen', () => {
    expect(save(valid())).toBe(true);
    expect(load()).toEqual(valid());
  });

  it('speichert unter genau einem Schlüssel', () => {
    save(valid());
    expect(Object.keys(localStorage)).toEqual([STORAGE_KEY]);
    expect(STORAGE_KEY).toBe('mimi-mots:v1');
  });

  it.each([
    ['kaputtes JSON', '{"version":1,'],
    ['leerer String', ''],
    ['null', 'null'],
    ['Zahl', '42'],
    ['Array', '[1,2,3]'],
    ['String', '"hallo"'],
  ])('liefert Defaults bei %s', (_, text) => {
    localStorage.setItem(STORAGE_KEY, text);
    expect(load()).toEqual(defaults());
  });

  it('liefert Defaults, wenn der Speicher wirft', () => {
    expect(load(throwingStorage)).toEqual(defaults());
  });

  it('liefert Defaults ohne Speicher', () => {
    expect(load(null)).toEqual(defaults());
  });

  it('save meldet false, wenn der Speicher wirft oder fehlt', () => {
    expect(save(valid(), throwingStorage)).toBe(false);
    expect(save(valid(), null)).toBe(false);
  });
});

describe('sanitize', () => {
  it('lässt gültige Daten unverändert', () => {
    expect(sanitize(valid())).toEqual(valid());
  });

  it.each([undefined, 0, 2, '1'])('verwirft Daten mit Version %s', (version) => {
    expect(sanitize({ ...valid(), version })).toEqual(defaults());
  });

  it('ersetzt ungültige Einstellungen einzeln durch Defaults', () => {
    const data = sanitize({
      ...valid(),
      settings: { companion: 'hund', language: 'fr', mode: 'schreiben' },
    });
    expect(data.settings).toEqual({ companion: null, language: 'fr', mode: 'speak' });
  });

  it('AT-89.1: akzeptiert Hören als Modus, alte Dauer wird ignoriert', () => {
    const data = sanitize({ ...valid(), settings: { ...valid().settings, mode: 'listen' } });
    expect(data.settings.mode).toBe('listen');
    const old = sanitize({
      ...valid(),
      settings: { companion: 'mimi', language: 'fr', durationMin: 7 },
    });
    expect(old.settings).toEqual({ companion: 'mimi', language: 'fr', mode: 'speak' });
  });

  it('akzeptiert null als „noch nicht gewählt“', () => {
    const data = sanitize({
      ...valid(),
      settings: { companion: null, language: null, mode: null },
    });
    expect(data.settings).toEqual({ companion: null, language: null, mode: null });
  });

  it('nutzt Default-Einstellungen, wenn settings fehlt', () => {
    const rest: Partial<AppData> = valid();
    delete rest.settings;
    expect(sanitize(rest).settings).toEqual(defaults().settings);
  });

  it.each([
    ['Box zu groß', { box: 5, seen: 1, lastSeenAt: '2026-10-29T10:00:00Z' }],
    ['Box negativ', { box: -1, seen: 1, lastSeenAt: '2026-10-29T10:00:00Z' }],
    ['Box keine Ganzzahl', { box: 1.5, seen: 1, lastSeenAt: '2026-10-29T10:00:00Z' }],
    ['Box als String', { box: '2', seen: 1, lastSeenAt: '2026-10-29T10:00:00Z' }],
    ['seen negativ', { box: 1, seen: -3, lastSeenAt: '2026-10-29T10:00:00Z' }],
    ['Datum ungültig', { box: 1, seen: 1, lastSeenAt: 'gestern' }],
    ['Datum fehlt', { box: 1, seen: 1 }],
    ['kein Objekt', 3],
  ])('verwirft Lernstand-Eintrag: %s, behält gültige', (_, broken) => {
    const raw = valid();
    (raw.progress.fr as Record<string, unknown>).kaputt = broken;
    expect(sanitize(raw).progress).toEqual(valid().progress);
  });

  it('ignoriert unbekannte Sprachen und Felder', () => {
    const raw = { ...valid(), extra: true, progress: { ...valid().progress, de: { x: {} } } };
    expect(sanitize(raw)).toEqual(valid());
  });

  it('nutzt leeren Lernstand, wenn progress kein Objekt ist', () => {
    expect(sanitize({ ...valid(), progress: [] }).progress).toEqual({
      en: {},
      fr: {},
      ja: {},
      it: {},
    });
  });
});

describe('Schlaf (B-65, seit B-89 ohne verbrauchte Dauern)', () => {
  it('Erststart: alle wach', () => {
    expect(defaults().rest).toEqual({ sleeping: [], since: null });
  });

  it('ältere Daten ohne rest: alle wach', () => {
    const old: Partial<AppData> = valid();
    delete old.rest;
    expect(sanitize(old).rest).toEqual({ sleeping: [], since: null });
    expect(sanitize(old).progress).toEqual(valid().progress);
  });

  it('verwirft Unbekanntes und Doppeltes, sortiert fest; alte verbrauchte Dauern fallen weg', () => {
    const data = sanitize({
      ...valid(),
      rest: {
        sleeping: ['mots', 'hund', 'mimi', 'mots'],
        usedDurations: [7, 3],
        since: '30.10.2026',
      },
    });
    expect(data.rest).toEqual({ sleeping: ['mimi', 'mots'], since: null });
  });

  it.each([null, 'x', { sleeping: 'mimi' }])('ungültiges rest %j → leer', (rest) => {
    expect(sanitize({ ...valid(), rest }).rest).toEqual({ sleeping: [], since: null });
  });
});

describe('Hörrunde (B-89)', () => {
  it('AT-89.5: alte Daten ohne listenProgress → leerer Hör-Lernstand, Sprechen bleibt', () => {
    const old: Partial<AppData> = valid();
    delete old.listenProgress;
    const data = sanitize(old);
    expect(data.listenProgress).toEqual({ en: {}, fr: {}, ja: {}, it: {} });
    expect(data.progress).toEqual(valid().progress);
  });

  it('AT-89.5: Hör-Lernstand wird geprüft wie der Sprech-Lernstand', () => {
    const raw = {
      ...valid(),
      listenProgress: { fr: { hund: { box: 9 }, katze: valid().listenProgress.fr.hund } },
    };
    expect(sanitize(raw).listenProgress.fr).toEqual({ katze: valid().listenProgress.fr.hund });
  });

  it('AT-89.6: Tutorial der Hörrunde nur mit echtem true gesehen', () => {
    expect(sanitize({ ...valid(), listenTutorialDone: true }).listenTutorialDone).toBe(true);
    expect(sanitize({ ...valid(), listenTutorialDone: 'ja' }).listenTutorialDone).toBe(false);
  });
});

describe('localDay (B-65)', () => {
  it('lokales Datum mit führenden Nullen', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('Aktive Sprachen (B-73)', () => {
  it('AT-73.1: Standard Englisch und Französisch, auch für alte Daten ohne Feld', () => {
    const old: Partial<AppData> = valid();
    delete old.enabledLanguages;
    expect(sanitize(old).enabledLanguages).toEqual(['en', 'fr']);
  });

  it('verwirft Unbekanntes und Doppeltes; leer → Standard', () => {
    expect(
      sanitize({ ...valid(), enabledLanguages: ['it', 'de', 'it', 'fr'] }).enabledLanguages,
    ).toEqual(['fr', 'it']);
    expect(sanitize({ ...valid(), enabledLanguages: [] }).enabledLanguages).toEqual(['en', 'fr']);
    expect(sanitize({ ...valid(), enabledLanguages: 'ja' }).enabledLanguages).toEqual(['en', 'fr']);
  });
});

describe('Tutorial (B-74)', () => {
  it('nur ein echtes true zählt als gesehen; alte Daten ohne Feld → Tutorial kommt', () => {
    const old: Partial<AppData> = valid();
    delete old.tutorialDone;
    expect(sanitize(old).tutorialDone).toBe(false);
    expect(sanitize({ ...valid(), tutorialDone: 'ja' }).tutorialDone).toBe(false);
    expect(sanitize(valid()).tutorialDone).toBe(true);
  });
});

describe('Nur Sprachen mit Wörtern (B-86)', () => {
  const empty = LANGUAGES.find((l) => !hasVocabulary(l));

  it.skipIf(!empty)(
    'AT-86.1: Sprachen ohne Wörter fallen weg; bleibt nichts, gilt der Standard',
    () => {
      expect(withWords(['fr', empty!])).toEqual(['fr']);
      expect(withWords([empty!])).toEqual(['en', 'fr']);
      expect(sanitize({ ...valid(), enabledLanguages: [empty] }).enabledLanguages).toEqual([
        'en',
        'fr',
      ]);
    },
  );

  it('AT-86.1: Standard beim Erststart nur mit Wörtern', () => {
    for (const l of defaults().enabledLanguages) expect(hasVocabulary(l), l).toBe(true);
  });
});

describe('Bremse für neue Wörter (B-82)', () => {
  it('AT-82.2: Standard an; nur ein echtes false schaltet sie aus', () => {
    const old: Partial<AppData> = valid();
    delete old.brakeNew;
    expect(sanitize(old).brakeNew).toBe(true);
    expect(sanitize({ ...valid(), brakeNew: 'nein' }).brakeNew).toBe(true);
    expect(sanitize(valid()).brakeNew).toBe(false);
  });
});

describe('Ausgeschaltete Wörter (B-88)', () => {
  it('AT-88.5: alte Daten ohne disabledWords → alle Wörter an', () => {
    const old: Partial<AppData> = valid();
    delete old.disabledWords;
    expect(sanitize(old).disabledWords).toEqual({ en: [], fr: [], ja: [], it: [] });
    expect(sanitize({ ...valid(), disabledWords: 'hund' }).disabledWords.en).toEqual([]);
  });

  it('AT-88.5: unbekannte Wörter fallen weg, Reihenfolge wie im Wortschatz, ohne Doppelte', () => {
    const raw = { ...valid(), disabledWords: { en: ['katze', 'gibtsnicht', 'hund', 'katze', 3] } };
    expect(sanitize(raw).disabledWords).toEqual({ en: ['katze', 'hund'], fr: [], ja: [], it: [] });
  });

  it('AT-88.5: sind alle Wörter einer Sprache aus, sind alle wieder an', () => {
    const all = vocabularyIds('fr');
    const raw = { ...valid(), disabledWords: { en: ['hund'], fr: all } };
    expect(sanitize(raw).disabledWords).toMatchObject({ en: ['hund'], fr: [] });
    const fewer = { ...valid(), disabledWords: { fr: all.slice(1) } };
    expect(sanitize(fewer).disabledWords.fr).toEqual(all.slice(1));
  });
});

describe('persistOnChange (B-12)', () => {
  it('speichert bei geänderter Auswahl in localStorage', () => {
    const store = createStore(defaults());
    persistOnChange(store);
    store.dispatch({ type: 'select', settings: { companion: 'mots' } });
    expect(load().settings).toEqual({ companion: 'mots', language: null, mode: 'speak' });
  });

  it('speichert nicht bei Ansichts- oder Ausrichtungswechsel', () => {
    const data = defaults();
    data.settings = { companion: 'mimi', language: 'en', mode: 'speak' };
    const store = createStore(data);
    const write = vi.fn(() => true);
    persistOnChange(store, write);
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'orientation', portrait: true });
    expect(write).not.toHaveBeenCalled();
  });

  it('speichert nicht, wenn die Auswahl gleich bleibt', () => {
    const store = createStore(defaults());
    const write = vi.fn(() => true);
    persistOnChange(store, write);
    store.dispatch({ type: 'select', settings: { mode: 'speak' } });
    expect(write).not.toHaveBeenCalled();
  });

  it('behält den Lernstand beim Speichern der Auswahl', () => {
    save(valid());
    const store = createStore(load());
    persistOnChange(store);
    store.dispatch({ type: 'select', settings: { companion: 'mimi' } });
    expect(load().progress).toEqual(valid().progress);
    expect(load().settings.companion).toBe('mimi');
  });

  it('läuft ohne Fehler weiter, wenn Speichern fehlschlägt', () => {
    const store = createStore(defaults());
    persistOnChange(store, () => false);
    expect(() => store.dispatch({ type: 'select', settings: { language: 'fr' } })).not.toThrow();
    expect(store.getState().data.settings.language).toBe('fr');
  });

  it('liefert eine Abmeldefunktion', () => {
    const store = createStore(defaults());
    const write = vi.fn(() => true);
    persistOnChange(store, write)();
    store.dispatch({ type: 'select', settings: { companion: 'mots' } });
    expect(write).not.toHaveBeenCalled();
  });
});
