// B-97: Seit es die Begrüßung gibt, beginnt der Store dort (bzw. auf der Schlafseite). Die
// meisten Tests prüfen, was danach passiert – dieser Store hat schon einen Namen und ist von
// der Begrüßung zur Auswahl weitergegangen (wie „Weiter“). Begrüßungs-Tests nutzen den echten.
import { createStore as createRealStore, type Store } from '../src/state';
import type { ChildData } from '../src/storage';

export const NAME = 'Lina';

export function createStore(
  data: ChildData,
  portrait = false,
  now: () => Date = () => new Date(),
): Store {
  const store = createRealStore(data.name === null ? { ...data, name: NAME } : data, portrait, now);
  store.dispatch({ type: 'enter' });
  return store;
}
