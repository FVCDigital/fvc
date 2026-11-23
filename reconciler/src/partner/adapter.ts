import type { Config } from "../config.ts";
import { tokenBySymbol } from "../config.ts";
import { toUnits, parseDecimal } from "../money.ts";
import type { PartnerMessage, PaymentMethod, RawDelivery, ReversalReason, TransferPointer } from "../types.ts";
import { verifyHmac, type AuthResult, type HmacScheme } from "./auth.ts";

/**
 * The only partner-specific code. A real partner gets its own adapter implementing this; nothing
 * else in the reconciler changes.
 */
export interface PartnerAdapter {
  readonly name: string;
  authenticate(delivery: RawDelivery, secret: string, maxSkewSeconds: number): AuthResult;
  /** Returns null for event types the reconciler does not use. Throws `MalformedMessage` on bad input. */
  parse(body: string, config: Config): PartnerMessage | null;
}

export class MalformedMessage extends Error {}

const METHODS: readonly PaymentMethod[] = ["bank_transfer", "direct_debit", "card"];
const REASONS: readonly ReversalReason[] = ["chargeback", "direct_debit_return", "clawback"];
const ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const TX = /^0x[0-9a-f]{64}$/;

function need(cond: unknown, why: string): asserts cond {
  if (!cond) throw new MalformedMessage(why);
}

function text(v: unknown, field: string, pattern?: RegExp): string {
  need(typeof v === "string" && v.length > 0 && v.length <= 256, `${field} missing`);
  if (pattern) need(pattern.test(v as string), `${field} malformed`);
  return v as string;
}

function isoTime(v: unknown, field: string): string {
  const s = text(v, field);
  need(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s) && !Number.isNaN(Date.parse(s)), `${field} is not an ISO time in UTC`);
  return s;
}

function money(v: unknown, field: string, digits: number): bigint {
  const s = text(v, field);
  try {
    return toUnits(s, digits);
  } catch (e) {
    throw new MalformedMessage(`${field}: ${(e as Error).message}`);
  }
}

function transfers(v: unknown): TransferPointer[] {
  need(Array.isArray(v) && v.length > 0 && v.length <= 20, "crypto.transfers must list 1 to 20 transfers");
  const out = (v as any[]).map((t, i) => {
    const txHash = text(t?.tx_hash, `crypto.transfers[${i}].tx_hash`).toLowerCase();
    need(TX.test(txHash), `crypto.transfers[${i}].tx_hash malformed`);
    const li = t?.log_index;
    need(li === undefined || li === null || (Number.isSafeInteger(li) && li >= 0), `crypto.transfers[${i}].log_index malformed`);
    return { txHash, logIndex: li ?? null };
  });
  const keys = out.map((t) => `${t.txHash}:${t.logIndex}`);
  need(new Set(keys).size === keys.length, "crypto.transfers repeats a transfer");
  return out;
}

/**
 * Adapter for the mock partner's wire format ("mock-v0"): JSON events signed with HMAC-SHA256
 * over `timestamp.body`, in the shape most ramp providers use. Replace with the real format when
 * the partner shares it.
 */
export class MockPartnerAdapter implements PartnerAdapter {
  readonly name = "mock-v0";
  static readonly scheme: HmacScheme = {
    signatureHeader: "x-partner-signature",
    timestampHeader: "x-partner-timestamp",
    deliveryIdHeader: "x-partner-delivery-id",
  };

  authenticate(delivery: RawDelivery, secret: string, maxSkewSeconds: number): AuthResult {
    const receivedAt = new Date(delivery.receivedAt);
    if (Number.isNaN(receivedAt.getTime())) return { ok: false, deliveryId: null, reason: "BAD_RECEIVED_AT" };
    return verifyHmac(delivery, MockPartnerAdapter.scheme, secret, receivedAt, maxSkewSeconds);
  }

  parse(body: string, config: Config): PartnerMessage | null {
    let raw: any;
    try {
      raw = JSON.parse(body);
    } catch {
      throw new MalformedMessage("body is not JSON");
    }
    need(raw && typeof raw === "object", "body is not an object");
    const d = raw.data;
    need(d && typeof d === "object", "data missing");
    const network = (c: any) => need(c?.network === "ethereum", "crypto.network must be ethereum");

    switch (raw.type) {
      case "settlement.completed": {
        const currency = text(d.fiat?.currency, "fiat.currency", /^[A-Z]{3}$/);
        const cur = config.currencies[currency];
        need(cur, `fiat.currency ${currency} is not configured`);
        network(d.crypto);
        const symbol = text(d.crypto?.asset, "crypto.asset", /^[A-Za-z0-9.]{1,16}$/);
        const token = tokenBySymbol(config, symbol);
        const method = text(d.payment_method, "payment_method") as PaymentMethod;
        need(METHODS.includes(method), "payment_method unknown");
        const rateText = text(d.crypto?.rate, "crypto.rate");
        let rate;
        try {
          rate = parseDecimal(rateText);
        } catch {
          throw new MalformedMessage("crypto.rate malformed");
        }
        need(rate.units > 0n && rate.scale <= 18, "crypto.rate out of range");
        const fiatAmountMinor = money(d.fiat?.amount, "fiat.amount", cur.minorDigits);
        const feeMinor = money(d.fiat?.fee ?? "0", "fiat.fee", cur.minorDigits);
        need(fiatAmountMinor > 0n && feeMinor < fiatAmountMinor, "fiat amount must exceed the fee");
        return {
          kind: "settlement",
          partnerTxId: text(d.transaction_id, "transaction_id", ID),
          reference: text(d.payment_reference, "payment_reference", /^[A-Za-z0-9 _./-]{1,64}$/),
          paymentMethod: method,
          fiatCurrency: currency,
          fiatAmountMinor,
          feeMinor,
          token: token ? token.address : null,
          tokenSymbol: symbol,
          tokenAmount: money(d.crypto?.amount, "crypto.amount", token ? token.decimals : 18),
          rate,
          transfers: transfers(d.crypto?.transfers),
          settledAt: isoTime(d.settled_at, "settled_at"),
        };
      }
      case "settlement.reversed": {
        const currency = text(d.fiat?.currency, "fiat.currency", /^[A-Z]{3}$/);
        const cur = config.currencies[currency];
        need(cur, `fiat.currency ${currency} is not configured`);
        const reason = text(d.reason, "reason") as ReversalReason;
        need(REASONS.includes(reason), "reason unknown");
        return {
          kind: "reversal",
          partnerTxId: text(d.transaction_id, "transaction_id", ID),
          originalPartnerTxId: text(d.original_transaction_id, "original_transaction_id", ID),
          reason,
          fiatCurrency: currency,
          fiatAmountMinor: money(d.fiat?.amount, "fiat.amount", cur.minorDigits),
          occurredAt: isoTime(d.occurred_at, "occurred_at"),
        };
      }
      case "payout.returned": {
        network(d.crypto);
        const symbol = text(d.crypto?.asset, "crypto.asset", /^[A-Za-z0-9.]{1,16}$/);
        const token = tokenBySymbol(config, symbol);
        return {
          kind: "payout_return",
          partnerTxId: text(d.transaction_id, "transaction_id", ID),
          originalPayoutId: text(d.original_payout_id, "original_payout_id", ID),
          token: token ? token.address : null,
          tokenSymbol: symbol,
          tokenAmount: money(d.crypto?.amount, "crypto.amount", token ? token.decimals : 18),
          transfers: transfers(d.crypto?.transfers),
          occurredAt: isoTime(d.occurred_at, "occurred_at"),
        };
      }
      case "payout.completed":
        return null;
      default:
        throw new MalformedMessage(`unknown event type ${JSON.stringify(raw.type)}`);
    }
  }
}
