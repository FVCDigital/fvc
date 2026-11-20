import type { Event } from "./events.ts";
import type { LogRecord } from "./log.ts";
import type { Deposit, DepositState, Entry, EntryStatus, PartnerMessage, RecordedRepayment } from "./types.ts";

/** Allowed changes of a deposit's state (spec section 4). `null` is "not classified yet". */
export const TRANSITIONS: Record<string, readonly DepositState[]> = {
  null: ["awaiting_message", "wrong_currency"],
  awaiting_message: ["matched", "partial", "underpayment", "overpayment", "duplicate", "disputed", "unmatched"],
  unmatched: ["matched", "partial", "underpayment", "overpayment", "duplicate", "disputed", "unmatched"],
  partial: ["matched", "underpayment", "overpayment", "disputed", "partial"],
  matched: ["disputed"],
  underpayment: ["disputed"],
  overpayment: ["disputed"],
  duplicate: ["disputed"],
  wrong_currency: [],
  disputed: [],
};

export interface DepositRecord {
  deposit: Deposit;
  state: DepositState | null;
  reason: string;
  partnerTxId: string | null;
  detail: Record<string, string>;
  confirmedAt: string;
  changedAt: string;
}

export interface MessageRecord {
  message: PartnerMessage;
  contentHash: string;
  receivedAt: string;
  conflicted: boolean;
  expired: boolean;
  /** When a deposit was first linked; drives the partial wait. */
  firstLinkedAt: string | null;
}

export interface EntryRecord {
  entry: Entry;
  status: EntryStatus;
  batchId: string | null;
  blockedReason: string | null;
  cancelledReason: string | null;
}

export interface BatchRecord {
  batchId: string;
  files: string[];
  sha256: string;
  refs: string[];
  writtenAt: string;
  voided: string | null;
}

export interface RejectedDelivery {
  deliveryId: string | null;
  reason: string;
  at: string;
}

export interface ConflictRecord {
  partnerTxId: string;
  deliveryId: string;
  message: PartnerMessage;
  at: string;
}

export interface State {
  /** Raw deliveries already handled. */
  seenInputs: Set<string>;
  /** deliveryId -> body hash, for authenticated deliveries only. */
  deliveries: Map<string, string>;
  conflicts: ConflictRecord[];
  rejected: RejectedDelivery[];
  messages: Map<string, MessageRecord>;
  deposits: Map<string, DepositRecord>;
  /** depositId -> partnerTxId of the message that claimed it first. */
  claims: Map<string, string>;
  cursor: { blockNumber: number; blockHash: string } | null;
  entries: Map<string, EntryRecord>;
  batches: Map<string, BatchRecord>;
  recorded: Map<string, RecordedRepayment>;
  alerts: { kind: string; detail: string; at: string }[];
  lastCheck: { ok: boolean; diffs: string[]; at: string } | null;
}

export function emptyState(): State {
  return {
    seenInputs: new Set(),
    deliveries: new Map(),
    conflicts: [],
    rejected: [],
    messages: new Map(),
    deposits: new Map(),
    claims: new Map(),
    cursor: null,
    entries: new Map(),
    batches: new Map(),
    recorded: new Map(),
    alerts: [],
    lastCheck: null,
  };
}

export function apply(state: State, event: Event, at: string): void {
  switch (event.type) {
    case "RunStarted":
    case "ReportWritten":
      return;
    case "DeliveryRetried":
      state.seenInputs.add(event.inputKey);
      return;
    case "DeliveryIgnored":
    case "MessageRepeated":
      state.seenInputs.add(event.inputKey);
      state.deliveries.set(event.deliveryId, event.bodyHash);
      return;
    case "DeliveryRejected":
      state.seenInputs.add(event.inputKey);
      state.rejected.push({ deliveryId: event.deliveryId, reason: event.reason, at });
      if (event.burnsId && event.deliveryId !== null) state.deliveries.set(event.deliveryId, event.bodyHash);
      return;
    case "MessageAccepted":
      state.seenInputs.add(event.inputKey);
      state.deliveries.set(event.deliveryId, event.bodyHash);
      if (state.messages.has(event.message.partnerTxId)) throw new Error(`message ${event.message.partnerTxId} accepted twice`);
      state.messages.set(event.message.partnerTxId, {
        message: event.message,
        contentHash: event.contentHash,
        receivedAt: at,
        conflicted: false,
        expired: false,
        firstLinkedAt: null,
      });
      return;
    case "MessageConflict": {
      state.seenInputs.add(event.inputKey);
      state.deliveries.set(event.deliveryId, event.bodyHash);
      state.conflicts.push({ partnerTxId: event.partnerTxId, deliveryId: event.deliveryId, message: event.message, at });
      const m = state.messages.get(event.partnerTxId);
      if (m) m.conflicted = true;
      return;
    }
    case "MessageExpired": {
      const m = state.messages.get(event.partnerTxId);
      if (m) m.expired = true;
      return;
    }
    case "DepositConfirmed":
      if (state.deposits.has(event.deposit.id)) throw new Error(`deposit ${event.deposit.id} confirmed twice`);
      state.deposits.set(event.deposit.id, {
        deposit: event.deposit,
        state: null,
        reason: "",
        partnerTxId: null,
        detail: {},
        confirmedAt: at,
        changedAt: at,
      });
      return;
    case "CursorAdvanced":
      state.cursor = { blockNumber: event.blockNumber, blockHash: event.blockHash };
      return;
    case "Classified": {
      const d = state.deposits.get(event.depositId);
      if (!d) throw new Error(`classified unknown deposit ${event.depositId}`);
      if (d.state !== event.from) throw new Error(`deposit ${event.depositId} is ${d.state}, not ${event.from}`);
      if (!TRANSITIONS[String(event.from)].includes(event.to)) {
        throw new Error(`illegal transition ${event.from} -> ${event.to} for ${event.depositId}`);
      }
      d.state = event.to;
      d.reason = event.reason;
      d.detail = event.detail;
      d.changedAt = at;
      if (event.partnerTxId !== null) {
        d.partnerTxId = event.partnerTxId;
        if (!state.claims.has(event.depositId)) state.claims.set(event.depositId, event.partnerTxId);
        const m = state.messages.get(event.partnerTxId);
        if (m && m.firstLinkedAt === null) m.firstLinkedAt = at;
      }
      return;
    }
    case "EntryCreated": {
      const ref = event.entry.settlementRef;
      if (state.entries.has(ref)) throw new Error(`entry ${ref} created twice`);
      for (const other of state.entries.values()) {
        if (other.status === "cancelled") continue;
        if (other.entry.partnerTxId === event.entry.partnerTxId) throw new Error(`second entry for ${event.entry.partnerTxId}`);
        for (const id of event.entry.depositIds) {
          if (other.entry.depositIds.includes(id)) throw new Error(`deposit ${id} used by two entries`);
        }
      }
      state.entries.set(ref, { entry: event.entry, status: "pending", batchId: null, blockedReason: null, cancelledReason: null });
      return;
    }
    case "EntryCancelled": {
      const e = state.entries.get(event.settlementRef);
      if (!e) throw new Error(`cancel of unknown entry ${event.settlementRef}`);
      if (e.status === "recorded") throw new Error(`cannot cancel recorded entry ${event.settlementRef}`);
      e.status = "cancelled";
      e.cancelledReason = event.reason;
      e.batchId = null;
      return;
    }
    case "EntryBlocked": {
      const e = state.entries.get(event.settlementRef);
      if (e) e.blockedReason = event.reason;
      return;
    }
    case "BatchWritten":
      state.batches.set(event.batchId, {
        batchId: event.batchId,
        files: event.files,
        sha256: event.sha256,
        refs: event.refs,
        writtenAt: at,
        voided: null,
      });
      for (const ref of event.refs) {
        const e = state.entries.get(ref);
        if (!e || e.status !== "pending") throw new Error(`batch ${event.batchId} holds ${ref}, which is not pending`);
        e.status = "batched";
        e.batchId = event.batchId;
        e.blockedReason = null;
      }
      return;
    case "BatchVoided": {
      const b = state.batches.get(event.batchId);
      if (!b) throw new Error(`void of unknown batch ${event.batchId}`);
      b.voided = event.reason;
      for (const ref of b.refs) {
        const e = state.entries.get(ref);
        if (e && e.status === "batched" && e.batchId === event.batchId) {
          e.status = "pending";
          e.batchId = null;
        }
      }
      return;
    }
    case "RecordedOnChain": {
      state.recorded.set(event.record.settlementRef, event.record);
      const e = state.entries.get(event.record.settlementRef);
      if (e && e.status !== "cancelled") {
        e.status = "recorded";
        e.blockedReason = null;
      }
      return;
    }
    case "CheckCompleted":
      state.lastCheck = { ok: event.ok, diffs: event.diffs, at };
      return;
    case "Alert":
      state.alerts.push({ kind: event.kind, detail: event.detail, at });
      return;
  }
}

export function replay(records: readonly LogRecord[]): State {
  const state = emptyState();
  for (const r of records) apply(state, r.event, r.at);
  return state;
}

/** A batch that was written, not voided, and still holds at least one entry not yet recorded. */
export function liveBatches(state: State): BatchRecord[] {
  return [...state.batches.values()].filter(
    (b) => b.voided === null && b.refs.some((ref) => state.entries.get(ref)?.status === "batched")
  );
}
