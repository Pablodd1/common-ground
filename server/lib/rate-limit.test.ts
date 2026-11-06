import { describe, expect, it, vi } from "vitest";
import { consumeRateLimit, resetRateLimit } from "./rate-limit";

describe("consumeRateLimit", () => {
  it("allows up to the limit inside a window and then refuses with a retry hint", () => {
    resetRateLimit("t1");
    for (let i = 0; i < 3; i++) {
      expect(consumeRateLimit("t1", 3, 60_000).allowed).toBe(true);
    }
    const blocked = consumeRateLimit("t1", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("separates keys", () => {
    resetRateLimit("a");
    resetRateLimit("b");
    expect(consumeRateLimit("a", 1, 60_000).allowed).toBe(true);
    expect(consumeRateLimit("a", 1, 60_000).allowed).toBe(false);
    expect(consumeRateLimit("b", 1, 60_000).allowed).toBe(true);
  });

  it("grants a fresh window after expiry", () => {
    resetRateLimit("t2");
    vi.useFakeTimers();
    try {
      expect(consumeRateLimit("t2", 1, 1000).allowed).toBe(true);
      expect(consumeRateLimit("t2", 1, 1000).allowed).toBe(false);
      // A real 1ms window can elapse within one tick, so advance the clock
      // explicitly instead of relying on wall-time passing.
      vi.advanceTimersByTime(1001);
      expect(consumeRateLimit("t2", 1, 1000).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
