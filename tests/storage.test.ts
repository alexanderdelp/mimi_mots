import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/state';
import {
  STORAGE_KEY,
  defaults,
  load,
  localDay,
  persistOnChange,
  sanitize,
  save,
  type AppData,
} from '../src/storage';

const valid = (): AppData => ({
  version: 1,
  settings: { companion: 'mots', language: 'fr', durationMin: 3 },
  progress: {
    fr: { apfel: { box: 2, seen: 5, lastSeenAt: '2026-10-29T10:00:00.000Z' } },
    en: { hund: { box: 0, seen: 1, lastSeenAt: '2026-10-28T09:30:00.000Z' } },
    ja: { katze: { box: 1, seen: 2, lastSeenAt: '2026-10-30T08:00:00.000Z' } },
  },
  rest: { sleeping: [], usedDurations: [7], since: '2026-10-29' },
  enabledLanguages: ['en', 'ja'],
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
  it('Erststart: nur die Dauer ist vorbelegt, kein Lernstand', () => {
    expect(defaults()).toEqual({
      version: 1,
      settings: { companion: null, language: null, durationMin: 3 },
      progress: { en: {}, fr: {}, ja: {} },
      rest: { sleeping: [], usedDurations: [], since: null },
      enabledLanguages: ['en', 'fr'],
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
      settings: { companion: 'hund', language: 'fr', durationMin: 9 },
    });
    expect(data.settings).toEqual({ companion: null, language: 'fr', durationMin: 3 });
  });

  it('akzeptiert 7 Minuten als Dauer (B-27)', () => {
    const data = sanitize({ ...valid(), settings: { ...valid().settings, durationMin: 7 } });
    expect(data.settings.durationMin).toBe(7);
  });

  it.each([
    [5, 3],
    [10, 7],
  ])('übernimmt die alte Dauer %i als %i Minuten (B-27)', (old, now) => {
    const data = sanitize({ ...valid(), settings: { ...valid().settings, durationMin: old } });
    expect(data.settings.durationMin).toBe(now);
  });

  it('akzeptiert null als „noch nicht gewählt“', () => {
    const data = sanitize({
      ...valid(),
      settings: { companion: null, language: null, durationMin: null },
    });
    expect(data.settings).toEqual({ companion: null, language: null, durationMin: null });
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
    expect(sanitize({ ...valid(), progress: [] }).progress).toEqual({ en: {}, fr: {}, ja: {} });
  });
});

describe('Schlaf und verbrauchte Dauern (B-65)', () => {
  it('Erststart: alle wach, alle Dauern frei', () => {
    expect(defaults().rest).toEqual({ sleeping: [], usedDurations: [], since: null });
  });

  it('ältere Daten ohne rest: alle wach', () => {
    const old: Partial<AppData> = valid();
    delete old.rest;
    expect(sanitize(old).rest).toEqual({ sleeping: [], usedDurations: [], since: null });
    expect(sanitize(old).progress).toEqual(valid().progress);
  });

  it('verwirft Unbekanntes und Doppeltes, sortiert fest', () => {
    const data = sanitize({
      ...valid(),
      rest: {
        sleeping: ['mots', 'hund', 'mimi', 'mots'],
        usedDurations: [7, 5, 3, '3'],
        since: '30.10.2026',
      },
    });
    expect(data.rest).toEqual({ sleeping: ['mimi', 'mots'], usedDurations: [3, 7], since: null });
  });

  it.each([null, 'x', { sleeping: 'mimi', usedDurations: {} }])(
    'ungültiges rest %j → leer',
    (rest) => {
      expect(sanitize({ ...valid(), rest }).rest).toEqual({
        sleeping: [],
        usedDurations: [],
        since: null,
      });
    },
  );
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
      sanitize({ ...valid(), enabledLanguages: ['ja', 'de', 'ja', 'fr'] }).enabledLanguages,
    ).toEqual(['fr', 'ja']);
    expect(sanitize({ ...valid(), enabledLanguages: [] }).enabledLanguages).toEqual(['en', 'fr']);
    expect(sanitize({ ...valid(), enabledLanguages: 'ja' }).enabledLanguages).toEqual(['en', 'fr']);
  });
});

describe('persistOnChange (B-12)', () => {
  it('speichert bei geänderter Auswahl in localStorage', () => {
    const store = createStore(defaults());
    persistOnChange(store);
    store.dispatch({ type: 'select', settings: { companion: 'mots' } });
    expect(load().settings).toEqual({ companion: 'mots', language: null, durationMin: 3 });
  });

  it('speichert nicht bei Ansichts- oder Ausrichtungswechsel', () => {
    const data = defaults();
    data.settings = { companion: 'mimi', language: 'en', durationMin: 3 };
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
    store.dispatch({ type: 'select', settings: { durationMin: 3 } });
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
