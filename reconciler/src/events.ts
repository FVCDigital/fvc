import type { Deposit, DepositState, Entry, PartnerMessage, RecordedRepayment } from "./types.ts";

/**
 * Everything the reconciler learns or decides. State is rebuilt from these alone.
 * `inputKey` identifies one raw delivery (delivery ID, body hash, time received), so each is handled once.
 */
export type Event =
  | { type: "RunStarted"; runId: string; configHash: string; version: string }
  | { type: "DeliveryRejected"; inputKey: string; deliveryId: string | null; bodyHash: string; reason: string; burnsId: boolean }
  | { type: "DeliveryRetried"; inputKey: string; deliveryId: string; bodyHash: string }
  | { type: "DeliveryIgnored"; inputKey: string; deliveryId: string; bodyHash: string; reason: string }
  | { type: "MessageAccepted"; inputKey: string; deliveryId: string; bodyHash: string; contentHash: string; message: PartnerMessage }
  | { type: "MessageRepeated"; inputKey: string; deliveryId: string; bodyHash: string; partnerTxId: string }
  | {
      type: "MessageConflict";
      inputKey: string;
      deliveryId: string;
      bodyHash: string;
      partnerTxId: string;
      existingContentHash: string;
      contentHash: string;
      message: PartnerMessage;
    }
  | { type: "MessageExpired"; partnerTxId: string }
  | { type: "DepositConfirmed"; deposit: Deposit }
  | { type: "CursorAdvanced"; blockNumber: number; blockHash: string }
  | {
      type: "Classified";
      depositId: string;
      from: DepositState | null;
      to: DepositState;
      reason: string;
      partnerTxId: string | null;
      detail: Record<string, string>;
    }
  | { type: "EntryCreated"; entry: Entry }
  | { type: "EntryCancelled"; settlementRef: string; reason: string }
  | { type: "EntryBlocked"; settlementRef: string; reason: string }
  | { type: "BatchWritten"; batchId: string; files: string[]; sha256: string; refs: string[] }
  | { type: "BatchVoided"; batchId: string; reason: string; settlementRef: string }
  | { type: "RecordedOnChain"; record: RecordedRepayment }
  | { type: "CheckCompleted"; ok: boolean; diffs: string[] }
  | { type: "ReportWritten"; file: string; sha256: string }
  | { type: "Alert"; kind: string; detail: string };
