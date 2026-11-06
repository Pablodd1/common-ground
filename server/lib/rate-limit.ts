// Best-effort fixed-window rate limiter for the auth endpoints.
//
// Honest about its limits: on serverless each function instance keeps its own
// map, so the effective allowance is "limit × warm instances", and a cold
// instance forgets history. That is still enough to blunt a credential-stuffing
// burst from one IP (which Vercel routes to few instances), and Supabase's own
// per-email GoTrue limits run behind this as the authoritative backstop.
// If this app ever moves to a single long-lived server, the map becomes exact.
type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();
const MAX_ENTRIES = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  // Opportunistic sweep: keeps the map bounded without a timer, and on
  // serverless (no idle timers between requests) a timer would never fire.
  if (buckets.size > MAX_ENTRIES) {
    for (const [k, w] of buckets) {
      if (w.resetAt <= now) buckets.delete(k);
    }
    // Still oversized (attack with distinct keys): drop everything rather
    // than grow without bound; legitimate keys re-warm immediately.
    if (buckets.size > MAX_ENTRIES) buckets.clear();
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  if (current.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Test-only: forget a key so a suite can exercise the limit repeatedly. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
