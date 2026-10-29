import { describe, expect, it, vi } from 'vitest';
import { createChoiceGroup, createChoiceTile } from '../src/components/choice-tile';

const span = (text: string) => Object.assign(document.createElement('span'), { textContent: text });

describe('createChoiceTile', () => {
  it('ist ein Button mit aria-pressed=false, wenn nicht ausgewählt', () => {
    const tile = createChoiceTile({ content: [span('Mimi')] });
    expect(tile.el.tagName).toBe('BUTTON');
    expect(tile.el.type).toBe('button');
    expect(tile.el.getAttribute('aria-pressed')).toBe('false');
    expect(tile.selected).toBe(false);
    expect(tile.el.textContent).toBe('Mimi');
  });

  it('übernimmt Startzustand und Label', () => {
    const tile = createChoiceTile({ content: [], label: 'Englisch', selected: true });
    expect(tile.el.getAttribute('aria-pressed')).toBe('true');
    expect(tile.el.getAttribute('aria-label')).toBe('Englisch');
  });

  it('setSelected ändert nur den Zustand, nicht das Element', () => {
    const tile = createChoiceTile({ content: [span('x')] });
    const before = tile.el.outerHTML.replace('aria-pressed="false"', '');
    tile.setSelected(true);
    expect(tile.selected).toBe(true);
    expect(tile.el.getAttribute('aria-pressed')).toBe('true');
    expect(tile.el.outerHTML.replace('aria-pressed="true"', '')).toBe(before);
  });

  it('ruft onSelect beim Tipp auf', () => {
    const onSelect = vi.fn();
    const tile = createChoiceTile({ content: [], onSelect });
    tile.el.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('createChoiceGroup', () => {
  const options = [
    { value: 'mimi', content: [span('Mimi')] },
    { value: 'mots', content: [span('Mots')] },
  ] as const;

  const pressed = (el: HTMLElement) =>
    [...el.querySelectorAll('button')].map((b) => b.getAttribute('aria-pressed'));

  it('zeigt Überschrift und eine Kachel pro Option', () => {
    const group = createChoiceGroup('Wer begleitet dich?', options, null, () => {});
    expect(group.el.querySelector('h2')!.textContent).toBe('Wer begleitet dich?');
    expect(group.el.getAttribute('aria-labelledby')).toBe(group.el.querySelector('h2')!.id);
    expect(group.el.querySelectorAll('button')).toHaveLength(2);
  });

  it('ohne Startwert ist nichts ausgewählt', () => {
    const group = createChoiceGroup('t', options, null, () => {});
    expect(group.value).toBeNull();
    expect(pressed(group.el)).toEqual(['false', 'false']);
  });

  it('mit Startwert ist genau diese Kachel ausgewählt', () => {
    const group = createChoiceGroup('t', options, 'mots', () => {});
    expect(pressed(group.el)).toEqual(['false', 'true']);
  });

  it('Tipp wählt genau eine Kachel aus und meldet den Wert', () => {
    const onChange = vi.fn();
    const group = createChoiceGroup('t', options, null, onChange);
    group.tiles.get('mimi')!.el.click();
    expect(pressed(group.el)).toEqual(['true', 'false']);
    group.tiles.get('mots')!.el.click();
    expect(pressed(group.el)).toEqual(['false', 'true']);
    expect(group.value).toBe('mots');
    expect(onChange.mock.calls).toEqual([['mimi'], ['mots']]);
  });

  it('erneuter Tipp auf die ausgewählte Kachel ändert nichts', () => {
    const onChange = vi.fn();
    const group = createChoiceGroup('t', options, 'mimi', onChange);
    group.tiles.get('mimi')!.el.click();
    expect(pressed(group.el)).toEqual(['true', 'false']);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Gruppen haben eindeutige Überschriften-IDs', () => {
    const a = createChoiceGroup('a', options, null, () => {});
    const b = createChoiceGroup('b', options, null, () => {});
    expect(a.el.querySelector('h2')!.id).not.toBe(b.el.querySelector('h2')!.id);
  });
});

describe('deaktivierte Kachel (B-26)', () => {
  it('ist deaktiviert und löst nichts aus', () => {
    const onSelect = vi.fn();
    const tile = createChoiceTile({
      content: [],
      label: 'Japanisch (bald)',
      disabled: true,
      onSelect,
    });
    expect(tile.el.disabled).toBe(true);
    tile.el.dispatchEvent(new MouseEvent('click'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('wird in einer Gruppe nie ausgewählt', () => {
    const onChange = vi.fn();
    const group = createChoiceGroup(
      'In welcher Sprache?',
      [
        { value: 'en', content: [] },
        { value: 'ja', content: [], disabled: true },
      ],
      null,
      onChange,
    );
    group.tiles.get('ja')!.el.dispatchEvent(new MouseEvent('click'));
    expect(group.value).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(group.tiles.get('ja')!.el.getAttribute('aria-pressed')).toBe('false');
  });
});
