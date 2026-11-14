// @vitest-environment jsdom
// B-90: mehrere Kinder – Reducer (wählen, anlegen, umbenennen, löschen) und Speichern je Kind.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canAddChild,
  childrenOf,
  createStore,
  nameProblem,
  nameTaken,
  type AppEvent,
  type Store,
} from '../src/state';
import {
  MAX_CHILDREN,
  STORAGE_KEY,
  childDefaults,
  load,
  persistOnChange,
  save,
  type AppData,
  type Child,
  type ChildData,
} from '../src/storage';
import { newId } from '../src/uuid';

const A = '3f0c2a1e-7b4d-4c8e-9a6f-0123456789ab';
const B = '9d8e7f6a-5b4c-4d3e-8f2a-abcdefabcdef';
const C = '11111111-2222-4333-8444-555555555555';
const AT = '2026-10-29T08:00:00.000Z';
const NOW = new Date(2026, 9, 30, 10, 0);
const LATER = new Date('2026-11-01T09:05:00.000Z');

const child = (id: string, name: string | null, data: Partial<ChildData> = {}): Child => ({
  id,
  ...childDefaults(),
  name,
  tutorialDone: true,
  ...data,
  createdAt: AT,
  updatedAt: AT,
});

const family = (children: Child[], active = children[0].id): AppData => ({
  version: 2,
  activeChildId: active,
  children,
});

const lina = () =>
  child(A, 'Lina', {
    settings: { companion: 'mots', language: 'fr', mode: 'speak' },
    progress: { en: {}, fr: { apfel: { box: 2, seen: 3, lastSeenAt: AT } }, ja: {} },
  });
const max = () =>
  child(B, 'Max', {
    settings: { companion: 'mimi', language: 'en', mode: 'speak' },
    rest: { sleeping: ['mimi', 'mots'], since: '2026-10-30' },
  });

const open = (data: AppData) => createStore(data, false, () => NOW);
const admin = (store: Store) => {
  store.dispatch({ type: 'admin' });
  expect(store.getState().view).toBe('admin');
};
const add = (name: string, id = newId()): AppEvent => ({ type: 'addChild', id, name, at: AT });

describe('Namen (B-90)', () => {
  it('gleiche Namen ohne Groß-/Kleinschreibung, das Kind selbst zählt nicht', () => {
    const kids = [lina(), max()];
    expect(nameTaken(kids, 'LINA')).toBe(true);
    expect(nameTaken(kids, 'Lina', A)).toBe(false);
    expect(nameTaken(kids, 'Ole')).toBe(false);
    expect(nameProblem(kids, '  ')).toBe('empty');
    expect(nameProblem(kids, ' max ')).toBe('taken');
    expect(nameProblem(kids, 'Ole')).toBeNull();
  });

  it('weitere Kinder bis MAX_CHILDREN, nur wenn alle einen Namen haben', () => {
    expect(MAX_CHILDREN).toBe(4);
    expect(canAddChild([lina()])).toBe(true);
    expect(canAddChild([child(A, null)])).toBe(false);
    const four = [A, B, C, newId()].map((id, i) => child(id, `K${i}`));
    expect(canAddChild(four)).toBe(false);
  });
});

describe('Store mit mehreren Kindern (B-90)', () => {
  it('ein Kind: wie bisher Begrüßung bzw. Schlafseite; mehrere: immer Begrüßung', () => {
    expect(open(family([lina()])).getState().view).toBe('welcome');
    expect(open(family([max()])).getState().view).toBe('sleep');
    const store = open(family([max(), lina()]));
    expect(store.getState().view).toBe('welcome');
    expect(store.getState().childId).toBe(B);
  });

  it('Kind wählen auf der Begrüßung: Daten des Kinds, weiter zu Start bzw. Schlafseite', () => {
    const store = open(family([lina(), max()]));
    store.dispatch({ type: 'pickChild', id: B });
    expect(store.getState()).toMatchObject({ view: 'sleep', childId: B });
    expect(store.getState().data.name).toBe('Max');
    store.dispatch({ type: 'welcome' });
    expect(store.getState().view).toBe('welcome');
    store.dispatch({ type: 'pickChild', id: A });
    expect(store.getState()).toMatchObject({ view: 'start', childId: A });
    expect(store.getState().data.settings.language).toBe('fr');
  });

  it('unbekanntes Kind und „welcome“ mit nur einem Kind bewirken nichts', () => {
    const store = open(family([lina()]));
    const before = store.getState();
    store.dispatch({ type: 'pickChild', id: B });
    expect(store.getState()).toBe(before);
    store.dispatch({ type: 'enter' });
    const start = store.getState();
    store.dispatch({ type: 'welcome' });
    expect(store.getState()).toBe(start);
  });

  it('Wechsel behält den Stand des bisherigen Kinds', () => {
    const store = open(family([lina(), child(B, 'Max')]));
    store.dispatch({ type: 'pickChild', id: A });
    store.dispatch({ type: 'select', settings: { language: 'en' } });
    store.dispatch({ type: 'welcome' });
    store.dispatch({ type: 'pickChild', id: B });
    expect(store.getState().data.settings.language).toBeNull();
    const all = childrenOf(store.getState());
    expect(all.find((c) => c.id === A)!.settings.language).toBe('en');
  });

  it('Kind anlegen nur im Elternbereich, mit gültiger id und freiem Namen', () => {
    const store = open(family([lina()]));
    store.dispatch(add('Max', B));
    expect(store.getState().children).toHaveLength(1); // auf der Begrüßung nicht
    admin(store);
    store.dispatch(add(' lina '));
    store.dispatch(add('   '));
    store.dispatch(add('Max', 'keine-uuid'));
    expect(store.getState().children).toHaveLength(1);
    store.dispatch(add('  Max  ', B));
    const kids = store.getState().children;
    expect(kids.map((c) => c.name)).toEqual(['Lina', 'Max']);
    expect(kids[1]).toMatchObject({ id: B, createdAt: AT, updatedAt: AT, tutorialDone: false });
    expect(store.getState().childId).toBe(A); // das gewählte bleibt
    store.dispatch(add('Ole', B)); // gleiche id
    expect(store.getState().children).toHaveLength(2);
    store.dispatch(add('Ole', C));
    store.dispatch(add('Ida'));
    store.dispatch(add('Zoe'));
    expect(store.getState().children).toHaveLength(MAX_CHILDREN);
  });

  it('umbenennen: aktives Kind über `data`, andere in `children`; Doppelte abgelehnt', () => {
    const store = open(family([lina(), max()]));
    admin(store);
    store.dispatch({ type: 'renameChild', id: B, name: 'LINA' });
    store.dispatch({ type: 'renameChild', id: B, name: ' ' });
    expect(childrenOf(store.getState()).map((c) => c.name)).toEqual(['Lina', 'Max']);
    store.dispatch({ type: 'renameChild', id: B, name: 'Moritz' });
    store.dispatch({ type: 'renameChild', id: A, name: 'lina' }); // nur Schreibweise
    expect(store.getState().data.name).toBe('lina');
    expect(childrenOf(store.getState()).map((c) => c.name)).toEqual(['lina', 'Moritz']);
  });

  it('löschen: nicht das letzte; das aktive → ein anderes wird aktiv', () => {
    const store = open(family([lina(), max(), child(C, 'Ole')]));
    admin(store);
    store.dispatch({ type: 'deleteChild', id: B });
    expect(store.getState().children.map((c) => c.id)).toEqual([A, C]);
    store.dispatch({ type: 'deleteChild', id: A });
    expect(store.getState()).toMatchObject({ childId: C });
    expect(store.getState().data.name).toBe('Ole');
    store.dispatch({ type: 'deleteChild', id: C });
    expect(store.getState().children).toHaveLength(1);
  });

  it('Elternbereich: Kind wählen; verlassen nach Wechsel → Begrüßung', () => {
    const store = open(family([lina(), child(B, 'Max')]));
    store.dispatch({ type: 'pickChild', id: A });
    admin(store);
    store.dispatch({ type: 'toggleBrake' });
    store.dispatch({ type: 'pickChild', id: B });
    expect(store.getState().data.brakeNew).toBe(true);
    store.dispatch({ type: 'toggleBrake' });
    store.dispatch({ type: 'leave' });
    expect(store.getState().view).toBe('welcome');
    const [a, b] = childrenOf(store.getState());
    expect([a.brakeNew, b.brakeNew]).toEqual([false, false]);
    // ohne Wechsel zurück zum Start wie bisher
    store.dispatch({ type: 'pickChild', id: B });
    admin(store);
    store.dispatch({ type: 'leave' });
    expect(store.getState().view).toBe('start');
  });
});

describe('Speichern mit mehreren Kindern (B-90)', () => {
  beforeEach(() => localStorage.clear());

  it('ein Stand von 0.9.x (ein Kind) lädt unverändert', () => {
    const data = family([lina()]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    expect(load(localStorage, NOW)).toEqual(data);
  });

  it('nur das geänderte Kind bekommt ein neues updatedAt; Wechsel allein ändert keins', () => {
    const data = family([lina(), child(B, 'Max')]);
    save(data, localStorage);
    const store = open(data);
    persistOnChange(store, data, save, () => LATER);
    store.dispatch({ type: 'pickChild', id: B });
    let saved = load(localStorage, NOW);
    expect(saved.activeChildId).toBe(B);
    expect(saved.children.map((c) => c.updatedAt)).toEqual([AT, AT]);
    store.dispatch({ type: 'select', settings: { language: 'fr' } });
    saved = load(localStorage, NOW);
    expect(saved.children.map((c) => c.updatedAt)).toEqual([AT, LATER.toISOString()]);
    expect(saved.children[0]).toEqual(lina());
  });

  it('anlegen, umbenennen und löschen landen im Speicher', () => {
    const data = family([lina()]);
    const store = open(data);
    const write = vi.fn(save);
    persistOnChange(store, data, write, () => LATER);
    admin(store);
    expect(write).not.toHaveBeenCalled();
    store.dispatch(add('Max', B));
    expect(load(localStorage, NOW).children.map((c) => c.name)).toEqual(['Lina', 'Max']);
    expect(load(localStorage, NOW).children[1].createdAt).toBe(AT);
    store.dispatch({ type: 'renameChild', id: B, name: 'Moritz' });
    const renamed = load(localStorage, NOW).children[1];
    expect(renamed).toMatchObject({ name: 'Moritz', updatedAt: LATER.toISOString() });
    store.dispatch({ type: 'deleteChild', id: A });
    const saved = load(localStorage, NOW);
    expect(saved.children.map((c) => c.id)).toEqual([B]);
    expect(saved.activeChildId).toBe(B);
  });
});
