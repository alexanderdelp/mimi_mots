import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, defaults, load, sanitize, save, type AppData } from '../src/storage';

const valid = (): AppData => ({
  version: 1,
  settings: { companion: 'mots', language: 'fr', durationMin: 5 },
  progress: {
    fr: { apfel: { box: 2, seen: 5, lastSeenAt: '2026-10-29T10:00:00.000Z' } },
    en: { hund: { box: 0, seen: 1, lastSeenAt: '2026-10-28T09:30:00.000Z' } },
  },
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
      settings: { companion: null, language: null, durationMin: 5 },
      progress: { en: {}, fr: {} },
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
      settings: { companion: 'hund', language: 'fr', durationMin: 7 },
    });
    expect(data.settings).toEqual({ companion: null, language: 'fr', durationMin: 5 });
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
    expect(sanitize({ ...valid(), progress: [] }).progress).toEqual({ en: {}, fr: {} });
  });
});
