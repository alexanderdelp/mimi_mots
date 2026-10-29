// Auswahlkachel: gleich groß in beiden Zuständen; der Rahmen ist ein inset-Schatten,
// damit ein dickerer Rahmen das Layout nicht verschiebt.

export interface ChoiceTileOptions {
  /** Inhalt der Kachel, z. B. Bild + Name. */
  content: readonly Node[];
  /** Name für Screenreader, wenn der Inhalt keinen Text hat (z. B. nur Flagge). */
  label?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export interface ChoiceTile {
  readonly el: HTMLButtonElement;
  readonly selected: boolean;
  setSelected(selected: boolean): void;
}

export function createChoiceTile(options: ChoiceTileOptions): ChoiceTile {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'choice-tile';
  if (options.label) el.setAttribute('aria-label', options.label);
  el.append(...options.content);
  el.addEventListener('click', () => options.onSelect?.());

  let selected = false;
  const setSelected = (value: boolean) => {
    selected = value;
    el.setAttribute('aria-pressed', String(value));
  };
  setSelected(options.selected ?? false);

  return {
    el,
    get selected() {
      return selected;
    },
    setSelected,
  };
}

let groupCount = 0;

export interface ChoiceOption<T extends string> {
  value: T;
  content: readonly Node[];
  label?: string;
}

export interface ChoiceGroup<T extends string> {
  readonly el: HTMLElement;
  readonly value: T | null;
  readonly tiles: ReadonlyMap<T, ChoiceTile>;
}

/** Gruppe von Kacheln, von denen höchstens eine ausgewählt ist (wie Radiobuttons). */
export function createChoiceGroup<T extends string>(
  title: string,
  options: readonly ChoiceOption<T>[],
  initial: T | null,
  onChange: (value: T) => void,
): ChoiceGroup<T> {
  let value = initial;
  const tiles = new Map<T, ChoiceTile>();

  const select = (next: T) => {
    if (next === value) return;
    value = next;
    tiles.forEach((tile, v) => tile.setSelected(v === next));
    onChange(next);
  };

  for (const option of options) {
    tiles.set(
      option.value,
      createChoiceTile({
        content: option.content,
        label: option.label,
        selected: option.value === initial,
        onSelect: () => select(option.value),
      }),
    );
  }

  const el = document.createElement('section');
  el.className = 'choice-group';
  el.setAttribute('role', 'group');
  const heading = document.createElement('h2');
  heading.className = 'choice-group__title';
  heading.textContent = title;
  heading.id = `choice-group-${++groupCount}`;
  el.setAttribute('aria-labelledby', heading.id);
  const row = document.createElement('div');
  row.className = 'choice-group__tiles';
  row.append(...[...tiles.values()].map((t) => t.el));
  el.append(heading, row);

  return {
    el,
    get value() {
      return value;
    },
    tiles,
  };
}
