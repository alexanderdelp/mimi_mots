// B-97: Seit es die Begrüßung gibt, beginnt der Store dort (bzw. auf der Schlafseite). Die
// meisten Tests prüfen, was danach passiert – dieser Store hat schon einen Namen und ist von
// der Begrüßung zur Auswahl weitergegangen (wie „Weiter“). Begrüßungs-Tests nutzen den echten.
import { createStore as createRealStore, type Store } from '../src/state';
import { activeChild, type AppData, type ChildData } from '../src/storage';

export const NAME = 'Lina';

/** B-90: Felder des App-States für Tests mit einem Kind, die nur `data` ansehen. */
export const ONE_CHILD = { children: [], childId: '' };

export function createStore(
  data: ChildData | AppData,
  portrait = false,
  now: () => Date = () => new Date(),
): Store {
  const named = (d: ChildData): ChildData => (d.name === null ? { ...d, name: NAME } : d);
  const stored =
    'children' in data
      ? {
          ...data,
          children: data.children.map((c) => (c === activeChild(data) ? { ...c, ...named(c) } : c)),
        }
      : named(data);
  const store = createRealStore(stored, portrait, now);
  store.dispatch({ type: 'enter' });
  return store;
}
