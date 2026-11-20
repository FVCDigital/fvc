import type { Config } from "./config.ts";
import type { Event } from "./events.ts";
import { canonical, sha256 } from "./log.ts";
import { MalformedMessage, type PartnerAdapter } from "./partner/adapter.ts";
import type { State } from "./state.ts";
import type { RawDelivery } from "./types.ts";

export type Emit = (event: Event) => void;

/**
 * Authenticates, de-duplicates and parses every delivery not handled before. Each raw delivery
 * produces exactly one event. Nothing here touches deposits or loans.
 */
export function processDeliveries(
  state: State,
  deliveries: readonly RawDelivery[],
  adapter: PartnerAdapter,
  config: Config,
  secret: string,
  emit: Emit
): void {
  for (const d of deliveries) {
    const bodyHash = sha256(d.body);
    const auth = adapter.authenticate(d, secret, config.maxClockSkewSeconds);
    // Headers are part of the key, so an unsigned or forged copy never shares a key with the genuine delivery.
    const headers = Object.fromEntries(Object.entries(d.headers).map(([k, v]) => [k.toLowerCase(), v]));
    const inputKey = sha256(canonical({ headers, bodyHash, receivedAt: d.receivedAt }));
    if (state.seenInputs.has(inputKey)) continue;

    // A failed authentication never uses up a delivery ID, so a forger cannot block a genuine one.
    if (!auth.ok) {
      emit({ type: "DeliveryRejected", inputKey, deliveryId: auth.deliveryId, bodyHash, reason: auth.reason, burnsId: false });
      continue;
    }
    const seen = state.deliveries.get(auth.deliveryId);
    if (seen !== undefined) {
      if (seen === bodyHash) emit({ type: "DeliveryRetried", inputKey, deliveryId: auth.deliveryId, bodyHash });
      else emit({ type: "DeliveryRejected", inputKey, deliveryId: auth.deliveryId, bodyHash, reason: "REPLAY_CONFLICT", burnsId: false });
      continue;
    }

    let message;
    try {
      message = adapter.parse(d.body, config);
    } catch (e) {
      if (!(e instanceof MalformedMessage)) throw e;
      emit({ type: "DeliveryRejected", inputKey, deliveryId: auth.deliveryId, bodyHash, reason: `MALFORMED: ${e.message}`, burnsId: true });
      continue;
    }
    if (message === null) {
      emit({ type: "DeliveryIgnored", inputKey, deliveryId: auth.deliveryId, bodyHash, reason: "EVENT_TYPE_NOT_USED" });
      continue;
    }

    const contentHash = sha256(canonical(message));
    const existing = state.messages.get(message.partnerTxId);
    if (!existing) {
      emit({ type: "MessageAccepted", inputKey, deliveryId: auth.deliveryId, bodyHash, contentHash, message });
    } else if (existing.contentHash === contentHash) {
      emit({ type: "MessageRepeated", inputKey, deliveryId: auth.deliveryId, bodyHash, partnerTxId: message.partnerTxId });
    } else {
      emit({
        type: "MessageConflict",
        inputKey,
        deliveryId: auth.deliveryId,
        bodyHash,
        partnerTxId: message.partnerTxId,
        existingContentHash: existing.contentHash,
        contentHash,
        message,
      });
    }
  }
}
