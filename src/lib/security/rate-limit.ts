import { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitRule {
  name: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// In-memory fixed-window limiter. Valid for the single standalone container
// this app runs in; a multi-instance deploy would need a shared store.
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweepExpired(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  rule: RateLimitRule,
  key: string,
  now: number = Date.now()
): RateLimitResult {
  sweepExpired(now);
  const bucketKey = `${rule.name}:${key}`;
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= rule.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}

// Behind a single reverse proxy the right-most X-Forwarded-For entry is the
// one the proxy appended, so it cannot be spoofed by the client.
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export const RATE_LIMITS = {
  login: { name: "login", limit: 10, windowMs: 15 * 60_000 },
  register: { name: "register", limit: 5, windowMs: 60 * 60_000 },
  sync: { name: "sync", limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

// Clients drop only the ids returned in `accepted`, so items beyond this cap
// stay in their offline queue and go out on the next flush.
export const MAX_SYNC_BATCH_ITEMS = 50;

// Upper bound for a public sync request body. A full batch of
// MAX_SYNC_BATCH_ITEMS surveys is well under this.
export const MAX_SYNC_BODY_BYTES = 1_000_000;

export type LimitedJsonResult =
  | { ok: true; body: unknown }
  | { ok: false; status: 413 | 400 };

// Reads a JSON body without accepting more than maxBytes: rejects early on a
// declared Content-Length and re-checks the actual size of the text received.
export async function readJsonWithLimit(
  req: NextRequest,
  maxBytes: number = MAX_SYNC_BODY_BYTES
): Promise<LimitedJsonResult> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413 };
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return { ok: false, status: 413 };
  }
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400 };
  }
}
