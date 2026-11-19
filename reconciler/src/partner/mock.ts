import type { PaymentMethod, RawDelivery, ReversalReason } from "../types.ts";
import { hmacSignature } from "./auth.ts";
import { MockPartnerAdapter } from "./adapter.ts";

export interface WireTransfer {
  tx_hash: string;
  log_index?: number | null;
}

export interface MockSettlement {
  transactionId: string;
  reference: string;
  method: PaymentMethod;
  currency: string;
  /** Decimal strings, as the partner would send them. */
  fiatAmount: string;
  fee: string;
  asset: string;
  cryptoAmount: string;
  rate: string;
  transfers: WireTransfer[];
  settledAt: string;
}

export interface MockReversal {
  transactionId: string;
  originalTransactionId: string;
  reason: ReversalReason;
  currency: string;
  fiatAmount: string;
  occurredAt: string;
}

export interface MockPayoutReturn {
  transactionId: string;
  originalPayoutId: string;
  asset: string;
  cryptoAmount: string;
  transfers: WireTransfer[];
  occurredAt: string;
}

export interface WireEvent {
  /** Delivery ID: the partner keeps it on retries and issues a new one when it re-emits the same event. */
  eventId: string;
  body: string;
}

export interface Chaos {
  /** Extra copies of a delivery with the same ID (network retries). */
  retries?: number;
  /** Re-emit each event once more under a new delivery ID (partner-side duplicates). */
  reEmit?: boolean;
  /** Shuffle delivery order with this seed. */
  shuffleSeed?: number;
  /** Hold everything until `outageEndsAt`, then deliver the backlog. */
  outageEndsAt?: string;
}

/** Deterministic PRNG so shuffled orders are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stand-in for the ramp partner's webhook feed, in the mock-v0 wire format. */
export class MockPartner {
  private readonly secret: string;
  private counter = 0;

  constructor(secret: string) {
    this.secret = secret;
  }

  private nextEventId(): string {
    this.counter += 1;
    return `evt_${this.counter.toString().padStart(6, "0")}`;
  }

  settlement(s: MockSettlement): WireEvent {
    return {
      eventId: this.nextEventId(),
      body: JSON.stringify({
        type: "settlement.completed",
        data: {
          transaction_id: s.transactionId,
          payment_reference: s.reference,
          payment_method: s.method,
          fiat: { currency: s.currency, amount: s.fiatAmount, fee: s.fee },
          crypto: { asset: s.asset, network: "ethereum", amount: s.cryptoAmount, rate: s.rate, transfers: s.transfers },
          settled_at: s.settledAt,
        },
      }),
    };
  }

  reversal(r: MockReversal): WireEvent {
    return {
      eventId: this.nextEventId(),
      body: JSON.stringify({
        type: "settlement.reversed",
        data: {
          transaction_id: r.transactionId,
          original_transaction_id: r.originalTransactionId,
          reason: r.reason,
          fiat: { currency: r.currency, amount: r.fiatAmount },
          occurred_at: r.occurredAt,
        },
      }),
    };
  }

  payoutReturn(p: MockPayoutReturn): WireEvent {
    return {
      eventId: this.nextEventId(),
      body: JSON.stringify({
        type: "payout.returned",
        data: {
          transaction_id: p.transactionId,
          original_payout_id: p.originalPayoutId,
          crypto: { asset: p.asset, network: "ethereum", amount: p.cryptoAmount, transfers: p.transfers },
          occurred_at: p.occurredAt,
        },
      }),
    };
  }

  /** Signs one delivery as the partner would at `sentAt`. */
  sign(event: WireEvent, sentAt: Date, receivedAt: Date = sentAt): RawDelivery {
    const timestamp = Math.floor(sentAt.getTime() / 1000);
    const s = MockPartnerAdapter.scheme;
    return {
      headers: {
        [s.deliveryIdHeader]: event.eventId,
        [s.timestampHeader]: String(timestamp),
        [s.signatureHeader]: hmacSignature(this.secret, timestamp, event.body),
        "content-type": "application/json",
      },
      body: event.body,
      receivedAt: receivedAt.toISOString(),
    };
  }

  /** Turns events into deliveries with realistic faults. */
  deliver(events: WireEvent[], at: Date, chaos: Chaos = {}): RawDelivery[] {
    let list: WireEvent[] = [...events];
    if (chaos.reEmit) list = list.flatMap((e) => [e, { eventId: this.nextEventId(), body: e.body }]);
    let deliveries = list.flatMap((e) => Array.from({ length: 1 + (chaos.retries ?? 0) }, () => e));
    if (chaos.shuffleSeed !== undefined) {
      const rand = mulberry32(chaos.shuffleSeed);
      for (let i = deliveries.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [deliveries[i], deliveries[j]] = [deliveries[j], deliveries[i]];
      }
    }
    const sentAt = chaos.outageEndsAt ? new Date(chaos.outageEndsAt) : at;
    return deliveries.map((e, i) => this.sign(e, new Date(sentAt.getTime() + i * 1000)));
  }
}
