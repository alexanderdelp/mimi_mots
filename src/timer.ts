// Session-Timer (anforderungen.md §3.4): läuft ab dem ersten Wort, pausiert, solange die App
// im Hintergrund oder im Hochformat ist, und meldet einmalig „abgelaufen“.

export interface Clock {
  now(): number;
  setInterval(callback: () => void, ms: number): number;
  clearInterval(id: number): void;
}

const defaultClock: Clock = {
  now: () => performance.now(),
  setInterval: (callback, ms) => window.setInterval(callback, ms),
  clearInterval: (id) => window.clearInterval(id),
};

/** Gründe für eine Pause; der Timer läuft nur, wenn keiner aktiv ist. */
export type PauseReason = 'hidden' | 'portrait';

export interface SessionTimerOptions {
  durationMs: number;
  /** Wird regelmäßig mit der Restzeit aufgerufen (für das Zifferblatt). */
  onTick?: (remainingMs: number) => void;
  /** Wird genau einmal aufgerufen, wenn die Zeit abgelaufen ist. */
  onExpire?: () => void;
  clock?: Clock;
  tickMs?: number;
}

export interface SessionTimer {
  readonly durationMs: number;
  readonly started: boolean;
  readonly running: boolean;
  readonly expired: boolean;
  remainingMs(): number;
  start(): void;
  pause(reason: PauseReason): void;
  resume(reason: PauseReason): void;
  dispose(): void;
}

export function createSessionTimer(options: SessionTimerOptions): SessionTimer {
  const { durationMs, onTick, onExpire, clock = defaultClock, tickMs = 250 } = options;
  const reasons = new Set<PauseReason>();
  let started = false;
  let expired = false;
  let elapsedBefore = 0; // Laufzeit vor der aktuellen Phase
  let runningSince: number | null = null;
  let interval: number | null = null;

  const elapsed = () => elapsedBefore + (runningSince === null ? 0 : clock.now() - runningSince);
  const remainingMs = () => Math.max(0, durationMs - elapsed());

  const stopInterval = () => {
    if (interval !== null) clock.clearInterval(interval);
    interval = null;
  };

  const tick = () => {
    const remaining = remainingMs();
    onTick?.(remaining);
    if (remaining <= 0 && !expired) {
      expired = true;
      elapsedBefore = durationMs;
      runningSince = null;
      stopInterval();
      onExpire?.();
    }
  };

  /** Startet oder stoppt die Uhr passend zu Startzustand, Pausen und Ablauf. */
  const update = () => {
    const shouldRun = started && !expired && reasons.size === 0;
    if (shouldRun && runningSince === null) {
      runningSince = clock.now();
      interval = clock.setInterval(tick, tickMs);
      tick();
    } else if (!shouldRun && runningSince !== null) {
      elapsedBefore = elapsed();
      runningSince = null;
      stopInterval();
      onTick?.(remainingMs());
    }
  };

  return {
    durationMs,
    get started() {
      return started;
    },
    get running() {
      return runningSince !== null;
    },
    get expired() {
      return expired;
    },
    remainingMs,
    start() {
      if (started) return;
      started = true;
      update();
    },
    pause(reason) {
      reasons.add(reason);
      update();
    },
    resume(reason) {
      reasons.delete(reason);
      update();
    },
    dispose() {
      stopInterval();
      if (runningSince !== null) elapsedBefore = elapsed();
      runningSince = null;
      reasons.add('hidden');
    },
  };
}
