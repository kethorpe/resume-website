import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDoc, tableFromEnv } from "./dynamo";

export interface HitResult {
  /** How many hits this key has had in the current window, including this one. */
  count: number;
  /** Seconds until the current window ends. */
  retryAfter: number;
}

export interface RateLimiter {
  hit(key: string, windowSeconds: number): Promise<HitResult>;
}

// Fixed windows: simple and cheap. A determined sender could squeeze up to 2x the
// limit across a window boundary, which is fine for protecting a contact form.
function windowOf(windowSeconds: number, nowMs = Date.now()) {
  const nowSec = Math.floor(nowMs / 1000);
  const bucket = Math.floor(nowSec / windowSeconds);
  return {
    bucket,
    retryAfter: (bucket + 1) * windowSeconds - nowSec,
    // DynamoDB TTL deletes the counter after the window has safely ended.
    expiresAt: (bucket + 2) * windowSeconds,
  };
}

function memoryLimiter(): RateLimiter {
  const counts = new Map<string, number>();
  return {
    async hit(key, windowSeconds) {
      const w = windowOf(windowSeconds);
      const k = `${key}#${w.bucket}`;
      const count = (counts.get(k) ?? 0) + 1;
      counts.set(k, count);
      return { count, retryAfter: w.retryAfter };
    },
  };
}

function dynamoLimiter(table: string): RateLimiter {
  const doc = getDoc();
  return {
    async hit(key, windowSeconds) {
      const w = windowOf(windowSeconds);
      // ADD is an atomic increment, so concurrent requests can't both slip under the limit.
      const out = await doc.send(
        new UpdateCommand({
          TableName: table,
          Key: { pk: `${key}#${w.bucket}` },
          UpdateExpression: "SET expiresAt = if_not_exists(expiresAt, :exp) ADD hits :one",
          ExpressionAttributeValues: { ":exp": w.expiresAt, ":one": 1 },
          ReturnValues: "UPDATED_NEW",
        }),
      );
      return { count: Number(out.Attributes?.hits ?? 1), retryAfter: w.retryAfter };
    },
  };
}

let limiter: RateLimiter | undefined;
export function getRateLimiter(): RateLimiter {
  if (!limiter) {
    const table = tableFromEnv("RATE_LIMIT_TABLE");
    limiter = table ? dynamoLimiter(table) : memoryLimiter();
  }
  return limiter;
}
