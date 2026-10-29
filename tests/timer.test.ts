import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSessionTimer, type Clock } from '../src/timer';

const MIN = 60_000;

/** Uhr auf Basis der Vitest-Fake-Timer. */
const fakeClock: Clock = {
  now: () => Date.now(),
  setInterval: (cb, ms) => setInterval(cb, ms) as unknown as number,
  clearInterval: (id) => clearInterval(id),
};

describe('createSessionTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const make = (durationMs = 5 * MIN) => {
    const onExpire = vi.fn();
    const onTick = vi.fn();
    const timer = createSessionTimer({ durationMs, onExpire, onTick, clock: fakeClock });
    return { timer, onExpire, onTick };
  };

  it('läuft erst nach start()', () => {
    const { timer } = make();
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(5 * MIN);
    expect(timer.running).toBe(false);
    timer.start();
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(4 * MIN);
  });

  it('meldet genau einmal den Ablauf', () => {
    const { timer, onExpire } = make();
    timer.start();
    vi.advanceTimersByTime(5 * MIN - 1000);
    expect(onExpire).not.toHaveBeenCalled();
    expect(timer.expired).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(timer.expired).toBe(true);
    expect(timer.remainingMs()).toBe(0);
    vi.advanceTimersByTime(10 * MIN);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(timer.running).toBe(false);
  });

  it('pausiert und setzt fort, ohne Zeit zu verlieren', () => {
    const { timer } = make();
    timer.start();
    vi.advanceTimersByTime(MIN);
    timer.pause('hidden');
    vi.advanceTimersByTime(10 * MIN);
    expect(timer.remainingMs()).toBe(4 * MIN);
    expect(timer.running).toBe(false);
    timer.resume('hidden');
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(3 * MIN);
  });

  it('läuft erst weiter, wenn alle Pausengründe weg sind', () => {
    const { timer } = make();
    timer.start();
    timer.pause('hidden');
    timer.pause('portrait');
    timer.resume('hidden');
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(5 * MIN);
    timer.resume('portrait');
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(4 * MIN);
  });

  it('Pause vor dem Start verhindert den Start, bis sie endet', () => {
    const { timer } = make();
    timer.pause('portrait');
    timer.start();
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(5 * MIN);
    timer.resume('portrait');
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(4 * MIN);
  });

  it('meldet die Restzeit regelmäßig (≥ 1× pro Sekunde)', () => {
    const { timer, onTick } = make();
    timer.start();
    onTick.mockClear();
    vi.advanceTimersByTime(3000);
    expect(onTick.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(onTick.mock.calls.at(-1)![0]).toBe(5 * MIN - 3000);
  });

  it('start() ist idempotent', () => {
    const { timer } = make();
    timer.start();
    vi.advanceTimersByTime(MIN);
    timer.start();
    vi.advanceTimersByTime(MIN);
    expect(timer.remainingMs()).toBe(3 * MIN);
  });

  it('dispose hält an und räumt den Intervall-Timer weg', () => {
    const { timer, onTick, onExpire } = make();
    timer.start();
    timer.dispose();
    onTick.mockClear();
    vi.advanceTimersByTime(10 * MIN);
    expect(onTick).not.toHaveBeenCalled();
    expect(onExpire).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
