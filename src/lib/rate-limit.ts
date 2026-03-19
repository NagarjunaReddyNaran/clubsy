/**
 * Rate limiter with Upstash Redis support.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, uses Redis
 * sliding window via @upstash/ratelimit (install: npm install @upstash/ratelimit @upstash/redis).
 * Falls back to in-memory sliding window for local dev / single-instance deployments.
 *
 * NOTE: In-memory store resets on restart and does not work across multiple instances.
 */

interface RateLimitResult {
  success: boolean;
  retryAfter: number; // seconds until retry is allowed (0 when success)
}

// ── In-memory fallback ──────────────────────────────────────────────────────
const store = new Map<string, number[]>();

function inMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    return { success: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  store.set(key, [...recent, now]);
  return { success: true, retryAfter: 0 };
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Upstash path — only active when env vars are present
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      // Dynamic require — packages are optional; install when ready to use Redis
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const { Ratelimit } = require("@upstash/ratelimit") as any;
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
      const { Redis } = require("@upstash/redis") as any;

      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
        prefix: "clubsy:rl",
      });

      const result = await rl.limit(key);
      return {
        success: result.success,
        retryAfter: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
      };
    } catch {
      // Upstash packages not installed — fall through to in-memory
    }
  }

  return inMemoryRateLimit(key, limit, windowMs);
}
