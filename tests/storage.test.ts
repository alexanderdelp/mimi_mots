// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasVocabulary, vocabularyIds } from '../src/data/vocabulary';
import { createStore as createRealStore } from '../src/state';
import { createStore } from './test-store';
import {
  LANGUAGES,
  NAME_MAX,
  STORAGE_KEY,
  activeChild,
  childData,
  childDefaults,
  cleanName,
  defaults,
  load,
  localDay,
  newChild,
  persistOnChange,
  sanitize,
  sanitizeChild,
  save,
  withActiveChildData,
  withWords,
  type AppData,
  type ChildData,
} from '../src/storage';
import { isUuid, newId, uuidFromBytes } from '../src/uuid';

const NOW = new Date('2026-11-01T09:00:00.000Z');
const LATER = new Date('2026-11-01T09:05:00.000Z');
const ID = '3f0c2a1e-7b4d-4c8e-9a6f-0123456789ab';
const ID2 = '9d8e7f6a-5b4c-4d3e-8f2a-abcdefabcdef';

/** Daten eines Kinds mit allem, was es gibt (seit B-97 mit Namen). */
const valid = (): ChildData => ({
  name: 'Lina',
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
  roundMin: 7,
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

/** Gespeicherter Stand (Version 2) mit einem Kind. */
const stored = (child: Partial<ChildData> = {}): AppData => ({
  version: 2,
  activeChildId: ID,
  children: [
    {
      id: ID,
      ...valid(),
      ...child,
      createdAt: '2026-10-29T08:00:00.000Z',
      updatedAt: '2026-10-31T08:00:00.000Z',
    },
  ],
});

describe('defaults', () => {
  it('Erststart: nur der Modus ist vorbelegt, kein Lernstand, kein Name', () => {
    expect(childDefaults()).toEqual({
      name: null,
      settings: { companion: null, language: null, mode: 'speak' },
      progress: { en: {}, fr: {}, ja: {}, it: {} },
      listenProgress: { en: {}, fr: {}, ja: {}, it: {} },
      rest: { sleeping: [], since: null },
      enabledLanguages: ['en', 'fr'],
      tutorialDone: false,
      listenTutorialDone: false,
      brakeNew: true,
      disabledWords: { en: [], fr: [], ja: [], it: [] },
      roundMin: 5,
    });
  });

  it('liefert jedes Mal ein neues Objekt', () => {
    const a = childDefaults();
    a.progress.fr.apfel = { box: 1, seen: 1, lastSeenAt: '2026-10-29T10:00:00.000Z' };
    expect(childDefaults().progress.fr).toEqual({});
  });

  it('AT-97.6: Erststart ist ein Kind ohne Namen mit UUID und ISO-Zeitstempeln', () => {
    const data = defaults(NOW);
    expect(data.version).toBe(2);
    expect(data.children).toHaveLength(1);
    const [child] = data.children;
    expect(isUuid(child.id)).toBe(true);
    expect(data.activeChildId).toBe(child.id);
    expect(child.createdAt).toBe('2026-11-01T09:00:00.000Z');
    expect(child.updatedAt).toBe('2026-11-01T09:00:00.000Z');
    expect(childData(child)).toEqual(childDefaults());
    expect(defaults(NOW).activeChildId).not.toBe(child.id);
  });
});

describe('load/save (B-97: Version 2, alle Daten je Kind)', () => {
  it('liefert den Erststart, wenn nichts gespeichert ist', () => {
    const data = load(localStorage, NOW);
    expect(childData(activeChild(data))).toEqual(childDefaults());
  });

  it('Roundtrip: Gespeichertes wird unverändert geladen', () => {
    expect(save(stored())).toBe(true);
    expect(load()).toEqual(stored());
  });

  it('speichert unter genau einem Schlüssel', () => {
    save(stored());
    expect(Object.keys(localStorage)).toEqual([STORAGE_KEY]);
    expect(STORAGE_KEY).toBe('mimi-mots:v2');
  });

  it.each([
    ['kaputtes JSON', '{"version":2,'],
    ['leerer String', ''],
    ['null', 'null'],
    ['Zahl', '42'],
    ['Array', '[1,2,3]'],
    ['String', '"hallo"'],
    ['Version 1', JSON.stringify({ version: 1 })],
    ['ohne Kinder', JSON.stringify({ version: 2, activeChildId: ID, children: [] })],
  ])('liefert den Erststart bei %s', (_, text) => {
    localStorage.setItem(STORAGE_KEY, text);
    expect(childData(activeChild(load()))).toEqual(childDefaults());
  });

  it('liefert den Erststart, wenn der Speicher wirft oder fehlt', () => {
    expect(childData(activeChild(load(throwingStorage)))).toEqual(childDefaults());
    expect(childData(activeChild(load(null)))).toEqual(childDefaults());
  });

  it('save meldet false, wenn der Speicher wirft oder fehlt', () => {
    expect(save(stored(), throwingStorage)).toBe(false);
    expect(save(stored(), null)).toBe(false);
  });
});

describe('Daten älterer Versionen (AT-97.6)', () => {
  it('werden nicht übernommen: Erststart, der alte Schlüssel bleibt unangetastet', () => {
    const old = JSON.stringify({ version: 1, settings: { companion: 'mots' }, roundMin: 7 });
    localStorage.setItem('mimi-mots:v1', old);
    expect(childData(activeChild(load()))).toEqual(childDefaults());
    save(load());
    expect(localStorage.getItem('mimi-mots:v1')).toBe(old);
  });
});

describe('sanitize (Version 2, AT-97.7)', () => {
  it('lässt gültige Daten unverändert', () => {
    expect(sanitize(stored(), NOW)).toEqual(stored());
  });

  it.each([undefined, 1, 3, '2'])('verwirft Daten mit Version %s', (version) => {
    expect(sanitize({ ...stored(), version }, NOW)).toBeNull();
  });

  it('ungültige id → neue UUID, ungültige Zeitstempel → jetzt', () => {
    const raw = stored();
    Object.assign(raw.children[0], { id: 'kind-1', createdAt: 'gestern', updatedAt: 5 });
    const data = sanitize({ ...raw, activeChildId: 'kind-1' }, NOW)!;
    const [child] = data.children;
    expect(isUuid(child.id)).toBe(true);
    expect(data.activeChildId).toBe(child.id);
    expect(child.createdAt).toBe(NOW.toISOString());
    expect(child.updatedAt).toBe(NOW.toISOString());
  });

  it('unbekanntes activeChildId → erstes Kind; doppelte ids → nur das erste', () => {
    const raw = stored();
    raw.children.push({ ...raw.children[0], name: 'Tom' }, { ...raw.children[0], id: ID2 });
    const data = sanitize({ ...raw, activeChildId: 'weg' }, NOW)!;
    expect(data.children.map((c) => [c.id, c.name])).toEqual([
      [ID, 'Lina'],
      [ID2, 'Lina'],
    ]);
    expect(data.activeChildId).toBe(ID);
  });

  it('aktives Kind per id, ids klein geschrieben', () => {
    const raw = stored();
    raw.children.push({ ...raw.children[0], id: ID2.toUpperCase(), name: 'Tom' });
    const data = sanitize({ ...raw, activeChildId: ID2.toUpperCase() }, NOW)!;
    expect(activeChild(data).name).toBe('Tom');
    expect(data.activeChildId).toBe(ID2);
  });

  it('Kinder, die keine Objekte sind, fallen weg; ohne Kind → null', () => {
    const raw = { ...stored(), children: [3, null, ...stored().children] };
    expect(sanitize(raw, NOW)!.children).toHaveLength(1);
    expect(sanitize({ ...stored(), children: [3] }, NOW)).toBeNull();
    expect(sanitize({ ...stored(), children: 'x' }, NOW)).toBeNull();
  });

  it('die Daten jedes Kinds werden geprüft wie bisher', () => {
    const data = sanitize(stored({ roundMin: 99, name: '   ' }), NOW)!;
    expect(activeChild(data).roundMin).toBe(5);
    expect(activeChild(data).name).toBeNull();
  });
});

describe('Name (B-97)', () => {
  it.each([
    ['Lina', 'Lina'],
    ['  Lina  ', 'Lina'],
    ['Lina   Marie', 'Lina Marie'],
    ['Li\nna', 'Li na'],
    ['Maximilian-Josefine', 'Maximilian-Josef'],
    ['Zoë', 'Zoë'],
    ['', null],
    ['   ', null],
    [42, null],
    [null, null],
  ])('cleanName(%j) → %j', (raw, name) => {
    expect(cleanName(raw)).toBe(name);
  });

  it('höchstens 16 Zeichen, Emoji zählen als ein Zeichen', () => {
    expect(NAME_MAX).toBe(16);
    expect(cleanName('🐱'.repeat(20))).toBe('🐱'.repeat(16));
  });
});

describe('UUID (B-97)', () => {
  it('randomUUID, wenn vorhanden', () => {
    expect(
      newId({ randomUUID: () => ID as `${string}-${string}-${string}-${string}-${string}` }),
    ).toBe(ID);
  });

  it('ohne randomUUID (kein sicherer Kontext) über getRandomValues', () => {
    const getRandomValues = vi.fn(<T extends ArrayBufferView | null>(a: T) => {
      (a as unknown as Uint8Array).fill(0xff);
      return a;
    });
    const id = newId({ getRandomValues } as unknown as Crypto);
    expect(getRandomValues).toHaveBeenCalled();
    expect(id).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(isUuid(id)).toBe(true);
  });

  it('ganz ohne crypto über Math.random – trotzdem eine gültige UUID v4', () => {
    const id = newId(undefined);
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe('4');
    expect('89ab').toContain(id[19]);
  });

  it('setzt Version- und Variant-Bits', () => {
    expect(uuidFromBytes(new Uint8Array(16))).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('isUuid', () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid('kind-1')).toBe(false);
    expect(isUuid(3)).toBe(false);
  });
});

describe('withActiveChildData (B-97)', () => {
  it('ersetzt die Daten des aktiven Kinds und setzt updatedAt, id und createdAt bleiben', () => {
    const next = withActiveChildData(stored(), { ...valid(), roundMin: 9 }, LATER);
    const child = activeChild(next);
    expect(child.roundMin).toBe(9);
    expect(child.id).toBe(ID);
    expect(child.createdAt).toBe('2026-10-29T08:00:00.000Z');
    expect(child.updatedAt).toBe(LATER.toISOString());
  });

  it('andere Kinder bleiben unverändert', () => {
    const other = { ...newChild(NOW), name: 'Tom' };
    const data = { ...stored(), children: [...stored().children, other] };
    const next = withActiveChildData(data, valid(), LATER);
    expect(next.children[1]).toBe(other);
  });
});

describe('sanitizeChild', () => {
  it('lässt gültige Daten unverändert', () => {
    expect(sanitizeChild(valid())).toEqual(valid());
  });

  it('kein Objekt → Standard', () => {
    expect(sanitizeChild(null)).toEqual(childDefaults());
    expect(sanitizeChild([1])).toEqual(childDefaults());
  });

  it('ersetzt ungültige Einstellungen einzeln durch Defaults', () => {
    const data = sanitizeChild({
      ...valid(),
      settings: { companion: 'hund', language: 'fr', mode: 'schreiben' },
    });
    expect(data.settings).toEqual({ companion: null, language: 'fr', mode: 'speak' });
  });

  it('AT-89.1: akzeptiert Hören als Modus, alte Dauer wird ignoriert', () => {
    const data = sanitizeChild({ ...valid(), settings: { ...valid().settings, mode: 'listen' } });
    expect(data.settings.mode).toBe('listen');
    const old = sanitizeChild({
      ...valid(),
      settings: { companion: 'mimi', language: 'fr', durationMin: 7 },
    });
    expect(old.settings).toEqual({ companion: 'mimi', language: 'fr', mode: 'speak' });
  });

  it('akzeptiert null als „noch nicht gewählt“', () => {
    const data = sanitizeChild({
      ...valid(),
      settings: { companion: null, language: null, mode: null },
    });
    expect(data.settings).toEqual({ companion: null, language: null, mode: null });
  });

  it('nutzt Default-Einstellungen, wenn settings fehlt', () => {
    const rest: Partial<ChildData> = valid();
    delete rest.settings;
    expect(sanitizeChild(rest).settings).toEqual(childDefaults().settings);
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
    expect(sanitizeChild(raw).progress).toEqual(valid().progress);
  });

  it('ignoriert unbekannte Sprachen und Felder', () => {
    const raw = { ...valid(), extra: true, progress: { ...valid().progress, de: { x: {} } } };
    expect(sanitizeChild(raw)).toEqual(valid());
  });

  it('nutzt leeren Lernstand, wenn progress kein Objekt ist', () => {
    expect(sanitizeChild({ ...valid(), progress: [] }).progress).toEqual({
      en: {},
      fr: {},
      ja: {},
      it: {},
    });
  });
});

describe('Schlaf (B-65, seit B-89 ohne verbrauchte Dauern)', () => {
  it('Erststart: alle wach', () => {
    expect(childDefaults().rest).toEqual({ sleeping: [], since: null });
  });

  it('ältere Daten ohne rest: alle wach', () => {
    const old: Partial<ChildData> = valid();
    delete old.rest;
    expect(sanitizeChild(old).rest).toEqual({ sleeping: [], since: null });
    expect(sanitizeChild(old).progress).toEqual(valid().progress);
  });

  it('verwirft Unbekanntes und Doppeltes, sortiert fest; alte verbrauchte Dauern fallen weg', () => {
    const data = sanitizeChild({
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
    expect(sanitizeChild({ ...valid(), rest }).rest).toEqual({ sleeping: [], since: null });
  });
});

describe('Hörrunde (B-89)', () => {
  it('AT-89.5: alte Daten ohne listenProgress → leerer Hör-Lernstand, Sprechen bleibt', () => {
    const old: Partial<ChildData> = valid();
    delete old.listenProgress;
    const data = sanitizeChild(old);
    expect(data.listenProgress).toEqual({ en: {}, fr: {}, ja: {}, it: {} });
    expect(data.progress).toEqual(valid().progress);
  });

  it('AT-89.5: Hör-Lernstand wird geprüft wie der Sprech-Lernstand', () => {
    const raw = {
      ...valid(),
      listenProgress: { fr: { hund: { box: 9 }, katze: valid().listenProgress.fr.hund } },
    };
    expect(sanitizeChild(raw).listenProgress.fr).toEqual({ katze: valid().listenProgress.fr.hund });
  });

  it('AT-89.6: Tutorial der Hörrunde nur mit echtem true gesehen', () => {
    expect(sanitizeChild({ ...valid(), listenTutorialDone: true }).listenTutorialDone).toBe(true);
    expect(sanitizeChild({ ...valid(), listenTutorialDone: 'ja' }).listenTutorialDone).toBe(false);
  });
});

describe('localDay (B-65)', () => {
  it('lokales Datum mit führenden Nullen', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('Aktive Sprachen (B-73)', () => {
  it('AT-73.1: Standard Englisch und Französisch, auch für alte Daten ohne Feld', () => {
    const old: Partial<ChildData> = valid();
    delete old.enabledLanguages;
    expect(sanitizeChild(old).enabledLanguages).toEqual(['en', 'fr']);
  });

  it('verwirft Unbekanntes und Doppeltes; leer → Standard', () => {
    expect(
      sanitizeChild({ ...valid(), enabledLanguages: ['it', 'de', 'it', 'fr'] }).enabledLanguages,
    ).toEqual(['fr', 'it']);
    expect(sanitizeChild({ ...valid(), enabledLanguages: [] }).enabledLanguages).toEqual([
      'en',
      'fr',
    ]);
    expect(sanitizeChild({ ...valid(), enabledLanguages: 'ja' }).enabledLanguages).toEqual([
      'en',
      'fr',
    ]);
  });
});

describe('Tutorial (B-74)', () => {
  it('nur ein echtes true zählt als gesehen; alte Daten ohne Feld → Tutorial kommt', () => {
    const old: Partial<ChildData> = valid();
    delete old.tutorialDone;
    expect(sanitizeChild(old).tutorialDone).toBe(false);
    expect(sanitizeChild({ ...valid(), tutorialDone: 'ja' }).tutorialDone).toBe(false);
    expect(sanitizeChild(valid()).tutorialDone).toBe(true);
  });
});

describe('Nur Sprachen mit Wörtern (B-86)', () => {
  const empty = LANGUAGES.find((l) => !hasVocabulary(l));

  it.skipIf(!empty)(
    'AT-86.1: Sprachen ohne Wörter fallen weg; bleibt nichts, gilt der Standard',
    () => {
      expect(withWords(['fr', empty!])).toEqual(['fr']);
      expect(withWords([empty!])).toEqual(['en', 'fr']);
      expect(sanitizeChild({ ...valid(), enabledLanguages: [empty] }).enabledLanguages).toEqual([
        'en',
        'fr',
      ]);
    },
  );

  it('AT-86.1: Standard beim Erststart nur mit Wörtern', () => {
    for (const l of childDefaults().enabledLanguages) expect(hasVocabulary(l), l).toBe(true);
  });
});

describe('Bremse für neue Wörter (B-82)', () => {
  it('AT-82.2: Standard an; nur ein echtes false schaltet sie aus', () => {
    const old: Partial<ChildData> = valid();
    delete old.brakeNew;
    expect(sanitizeChild(old).brakeNew).toBe(true);
    expect(sanitizeChild({ ...valid(), brakeNew: 'nein' }).brakeNew).toBe(true);
    expect(sanitizeChild(valid()).brakeNew).toBe(false);
  });
});

describe('Ausgeschaltete Wörter (B-88)', () => {
  it('AT-88.5: alte Daten ohne disabledWords → alle Wörter an', () => {
    const old: Partial<ChildData> = valid();
    delete old.disabledWords;
    expect(sanitizeChild(old).disabledWords).toEqual({ en: [], fr: [], ja: [], it: [] });
    expect(sanitizeChild({ ...valid(), disabledWords: 'hund' }).disabledWords.en).toEqual([]);
  });

  it('AT-88.5: unbekannte Wörter fallen weg, Reihenfolge wie im Wortschatz, ohne Doppelte', () => {
    const raw = { ...valid(), disabledWords: { en: ['katze', 'gibtsnicht', 'hund', 'katze', 3] } };
    expect(sanitizeChild(raw).disabledWords).toEqual({
      en: ['katze', 'hund'],
      fr: [],
      ja: [],
      it: [],
    });
  });

  it('AT-88.5: sind alle Wörter einer Sprache aus, sind alle wieder an', () => {
    const all = vocabularyIds('fr');
    const raw = { ...valid(), disabledWords: { en: ['hund'], fr: all } };
    expect(sanitizeChild(raw).disabledWords).toMatchObject({ en: ['hund'], fr: [] });
    const fewer = { ...valid(), disabledWords: { fr: all.slice(1) } };
    expect(sanitizeChild(fewer).disabledWords.fr).toEqual(all.slice(1));
  });
});

describe('persistOnChange (B-12, seit B-97 je Kind)', () => {
  const setup = (data: AppData = stored({ name: 'Lina' })) => {
    const store = createStore(childData(activeChild(data)));
    return { store, data };
  };

  it('speichert bei geänderter Auswahl in localStorage, im aktiven Kind mit updatedAt', () => {
    const { store, data } = setup();
    persistOnChange(store, data, save, () => LATER);
    store.dispatch({ type: 'select', settings: { companion: 'mimi' } });
    const child = activeChild(load());
    expect(child.settings.companion).toBe('mimi');
    expect(child.id).toBe(ID);
    expect(child.updatedAt).toBe(LATER.toISOString());
    expect(child.progress).toEqual(valid().progress);
  });

  it('speichert nicht bei Ansichts- oder Ausrichtungswechsel', () => {
    const { store, data } = setup(
      stored({
        settings: { companion: 'mimi', language: 'en', mode: 'speak' },
        rest: { sleeping: [], since: null },
      }),
    );
    const write = vi.fn(() => true);
    persistOnChange(store, data, write);
    store.dispatch({ type: 'play' });
    store.dispatch({ type: 'orientation', portrait: true });
    expect(write).not.toHaveBeenCalled();
  });

  it('speichert nicht, wenn die Auswahl gleich bleibt', () => {
    const { store, data } = setup();
    const write = vi.fn(() => true);
    persistOnChange(store, data, write);
    store.dispatch({ type: 'select', settings: { mode: 'speak' } });
    expect(write).not.toHaveBeenCalled();
  });

  it('AT-97.6: Erststart – nach der Namenseingabe steht das Kind unter v2', () => {
    const data = load(localStorage, NOW);
    const store = createRealStore(childData(activeChild(data)), false, () => new Date(2026, 9, 29));
    persistOnChange(store, data, save, () => LATER);
    store.dispatch({ type: 'name', name: 'Lina' });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved).toEqual({
      version: 2,
      activeChildId: data.activeChildId,
      children: [
        {
          id: data.activeChildId,
          ...childDefaults(),
          name: 'Lina',
          createdAt: NOW.toISOString(),
          updatedAt: LATER.toISOString(),
        },
      ],
    });
  });

  it('läuft ohne Fehler weiter, wenn Speichern fehlschlägt', () => {
    const { store, data } = setup();
    persistOnChange(store, data, () => false);
    expect(() => store.dispatch({ type: 'select', settings: { language: 'en' } })).not.toThrow();
    expect(store.getState().data.settings.language).toBe('en');
  });

  it('liefert eine Abmeldefunktion', () => {
    const { store, data } = setup();
    const write = vi.fn(() => true);
    persistOnChange(store, data, write)();
    store.dispatch({ type: 'select', settings: { companion: 'mimi' } });
    expect(write).not.toHaveBeenCalled();
  });
});

describe('Rundendauer (B-93)', () => {
  it('AT-93.2: fehlend oder ungültig → 5 Minuten, sonst 3 bis 10 ganze Minuten', () => {
    const old: Partial<ChildData> = valid();
    delete old.roundMin;
    expect(sanitizeChild(old).roundMin).toBe(5);
    expect(sanitizeChild(valid()).roundMin).toBe(7);
    for (const bad of [2, 11, 0, -5, 4.5, '6', null, NaN, Infinity]) {
      expect(sanitizeChild({ ...valid(), roundMin: bad }).roundMin).toBe(5);
    }
    for (const ok of [3, 5, 10])
      expect(sanitizeChild({ ...valid(), roundMin: ok }).roundMin).toBe(ok);
  });
});
