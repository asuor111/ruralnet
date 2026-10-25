// Lightweight in-memory rate limiting for API protection.
// Sliding window per key (usually the caller IP). Sufficient for a research
// tool; a reverse proxy should add stricter rules in production.

const buckets = new Map<string, number[]>();

/** Returns true when the caller has exceeded the limit (call is blocked). */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}

/** Best-effort caller key from a request's forwarded-for/IP header. */
export function callerKey(xForwardedFor: string | null | undefined): string {
  if (xForwardedFor && xForwardedFor.trim().length > 0) {
    return `ip:${xForwardedFor.split(',')[0].trim()}`;
  }
  return 'ip:local';
}

export function clearRateLimits(): void {
  buckets.clear();
}