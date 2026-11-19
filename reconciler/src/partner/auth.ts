import { createHmac, timingSafeEqual } from "node:crypto";
import type { RawDelivery } from "../types.ts";

export interface HmacScheme {
  signatureHeader: string;
  timestampHeader: string;
  deliveryIdHeader: string;
}

export type AuthResult =
  | { ok: true; deliveryId: string; timestamp: number }
  | { ok: false; deliveryId: string | null; reason: string };

export function hmacSignature(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/**
 * Checks an HMAC-SHA256 signature over `timestamp.body`, in constant time, and that the timestamp
 * is within `maxSkewSeconds` of `now`. Replays inside the window are caught by delivery ID later.
 */
export function verifyHmac(
  delivery: RawDelivery,
  scheme: HmacScheme,
  secret: string,
  now: Date,
  maxSkewSeconds: number
): AuthResult {
  const headers = Object.fromEntries(Object.entries(delivery.headers).map(([k, v]) => [k.toLowerCase(), v]));
  const deliveryId = headers[scheme.deliveryIdHeader] ?? null;
  const signature = headers[scheme.signatureHeader];
  const tsText = headers[scheme.timestampHeader];
  if (!deliveryId || !/^[A-Za-z0-9_.:-]{1,128}$/.test(deliveryId)) return { ok: false, deliveryId: null, reason: "MISSING_DELIVERY_ID" };
  if (!signature || !/^[0-9a-f]{64}$/.test(signature)) return { ok: false, deliveryId, reason: "MISSING_SIGNATURE" };
  if (!tsText || !/^\d{1,12}$/.test(tsText)) return { ok: false, deliveryId, reason: "MISSING_TIMESTAMP" };
  const timestamp = Number(tsText);
  const expected = Buffer.from(hmacSignature(secret, timestamp, delivery.body), "hex");
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return { ok: false, deliveryId, reason: "BAD_SIGNATURE" };
  if (Math.abs(now.getTime() / 1000 - timestamp) > maxSkewSeconds) return { ok: false, deliveryId, reason: "STALE_TIMESTAMP" };
  return { ok: true, deliveryId, timestamp };
}
