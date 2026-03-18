const store = new Map<string, number[]>();

export function rateLimit(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (store.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    return {
      success: false,
      retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000),
    };
  }
  store.set(ip, [...recent, now]);
  return { success: true, retryAfter: 0 };
}
// NOTE: resets on restart; use Redis/Upstash for multi-instance production
