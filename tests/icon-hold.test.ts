// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_HOLD_MS, createAppHeader, onIconHold } from '../src/components/app-header';
import { LONG_PRESS_MS } from '../src/components/long-press';

describe('Elternbereich halten (B-113)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('öffnet erst nach 1 s, [×] bleibt bei 600 ms', () => {
    expect(ADMIN_HOLD_MS).toBe(1000);
    expect(LONG_PRESS_MS).toBe(600);
    const header = createAppHeader();
    const action = vi.fn();
    onIconHold(header, action);
    const icon = header.querySelector<HTMLElement>('.app-header__icon')!;
    icon.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(999);
    expect(action).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(action).toHaveBeenCalledTimes(1);
  });
});
