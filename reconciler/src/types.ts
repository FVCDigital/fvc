/** Lowercase 0x-prefixed hex address. */
export type Address = string;

export type DepositState =
  | "awaiting_message"
  | "matched"
  | "partial"
  | "underpayment"
  | "overpayment"
  | "unmatched"
  | "duplicate"
  | "wrong_currency"
  | "disputed";

export type PaymentMethod = "bank_transfer" | "direct_debit" | "card";
export type ReversalReason = "chargeback" | "direct_debit_return" | "clawback";

/** An ERC-20 Transfer to the Safe in a confirmed block. */
export interface Deposit {
  id: string;
  chainId: number;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash: string;
  token: Address;
  from: Address;
  amount: bigint;
}

/** An exact decimal: units / 10^scale. */
export interface Rate {
  units: bigint;
  scale: number;
}

/** A transfer the partner says carries a settlement. `logIndex` null means "the only transfer to the Safe in that tx". */
export interface TransferPointer {
  txHash: string;
  logIndex: number | null;
}

export interface SettlementMessage {
  kind: "settlement";
  partnerTxId: string;
  reference: string;
  paymentMethod: PaymentMethod;
  fiatCurrency: string;
  fiatAmountMinor: bigint;
  feeMinor: bigint;
  /** Null when the partner names an asset that is not configured. */
  token: Address | null;
  tokenSymbol: string;
  tokenAmount: bigint;
  rate: Rate;
  transfers: TransferPointer[];
  settledAt: string;
}

export interface ReversalMessage {
  kind: "reversal";
  partnerTxId: string;
  originalPartnerTxId: string;
  reason: ReversalReason;
  fiatCurrency: string;
  fiatAmountMinor: bigint;
  occurredAt: string;
}

export interface PayoutReturnMessage {
  kind: "payout_return";
  partnerTxId: string;
  originalPayoutId: string;
  token: Address | null;
  tokenSymbol: string;
  tokenAmount: bigint;
  transfers: TransferPointer[];
  occurredAt: string;
}

export type PartnerMessage = SettlementMessage | ReversalMessage | PayoutReturnMessage;

/** A delivery exactly as it arrived, before authentication. */
export interface RawDelivery {
  headers: Record<string, string>;
  body: string;
  receivedAt: string;
}

export interface LoanBookEntry {
  reference: string;
  loanId: bigint;
  currency: string;
}

/** Registry `Status`: Active 0, Repaid 1, Defaulted 2, WrittenOff 3. */
export type LoanStatus = 0 | 1 | 2 | 3;

export interface LoanView {
  loanId: bigint;
  status: LoanStatus;
  disbursedGbp: bigint;
  feeGbp: bigint;
  repaidGbp: bigint;
  outstandingGbp: bigint;
}

export interface TokenView {
  allowed: boolean;
  known: boolean;
  decimals: number;
  minRateBps: bigint;
  maxRateBps: bigint;
}

export interface RecordedRepayment {
  loanId: bigint;
  gbpAmount: bigint;
  token: Address;
  tokenAmount: bigint;
  settlementRef: string;
  txHash: string;
  blockNumber: number;
  logIndex: number;
}

export interface Tranche {
  loanId: bigint;
  gbpAmount: bigint;
  token: Address;
  tokenAmount: bigint;
  payoutRef: string;
}

export type EntryKind = "repayment" | "payout_return";
export type EntryStatus = "pending" | "batched" | "recorded" | "cancelled";

/** One recordable repayment, keyed by its settlement ref. */
export interface Entry {
  settlementRef: string;
  kind: EntryKind;
  partnerTxId: string;
  reference: string;
  loanId: bigint;
  gbpCredit: bigint;
  token: Address;
  tokenAmount: bigint;
  depositIds: string[];
  fiatCurrency: string;
  fiatAmountMinor: bigint;
  feeMinor: bigint;
  rate: Rate | null;
  eligibleAt: string;
}
