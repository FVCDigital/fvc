import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getAddress } from "ethers";
import { parseDecimal } from "./money.ts";
import type { Address, PaymentMethod, Rate } from "./types.ts";

export interface TokenSetting {
  symbol: string;
  address: Address;
  decimals: number;
  /** USDT rejects changing a non-zero allowance, so the batch sets it to 0 first. */
  approveResetFirst: boolean;
  /** Deposits below this with no message are collapsed into one report line. */
  dustThreshold: bigint;
}

export interface ReferenceRate {
  currency: string;
  token: string;
  /** "YYYY-MM-DD", or "*" for any day. */
  date: string;
  rate: Rate;
}

export type ConfirmationPolicy = { mode: "finalized" } | { mode: "depth"; blocks: number };

export interface Config {
  chainId: number;
  safe: Address;
  registry: Address;
  startBlock: number;
  confirmation: ConfirmationPolicy;
  chunkSize: number;
  tokens: TokenSetting[];
  partnerSenders: Address[];
  currencies: Record<string, { minorDigits: number }>;
  tolerance: { internalBps: number; roundingUnits: bigint; marketBps: number };
  requireReferenceRate: boolean;
  referenceRates: ReferenceRate[];
  creditBasis: "net" | "gross";
  holdHours: Record<PaymentMethod, number>;
  messageWaitHours: number;
  partialWaitHours: number;
  depositWaitHours: number;
  bouncedPayoutPolicy: "report" | "record_as_repayment";
  maxClockSkewSeconds: number;
  explorerTxUrl: string;
  paths: { data: string; inbox: string; out: string; loanBook: string };
}

const METHODS: PaymentMethod[] = ["bank_transfer", "direct_debit", "card"];

function fail(path: string, why: string): never {
  throw new Error(`config ${path}: ${why}`);
}

function int(v: unknown, path: string, min = 0): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < min) fail(path, `must be an integer >= ${min}`);
  return v;
}

function str(v: unknown, path: string): string {
  if (typeof v !== "string" || v.length === 0) fail(path, "must be a non-empty string");
  return v;
}

function addr(v: unknown, path: string): Address {
  try {
    return getAddress(str(v, path)).toLowerCase();
  } catch {
    fail(path, "must be an address");
  }
}

function big(v: unknown, path: string): bigint {
  if (typeof v !== "string" || !/^\d+$/.test(v)) fail(path, "must be a string of digits");
  return BigInt(v);
}

function bool(v: unknown, path: string): boolean {
  if (typeof v !== "boolean") fail(path, "must be true or false");
  return v;
}

function oneOf<T extends string>(v: unknown, path: string, options: readonly T[]): T {
  if (typeof v !== "string" || !options.includes(v as T)) fail(path, `must be one of ${options.join(", ")}`);
  return v as T;
}

export function parseConfig(raw: unknown): Config {
  if (typeof raw !== "object" || raw === null) fail("", "must be an object");
  const r = raw as Record<string, any>;

  const tokens = (Array.isArray(r.tokens) ? r.tokens : fail("tokens", "must be a list")).map((t: any, i: number) => ({
    symbol: str(t.symbol, `tokens[${i}].symbol`),
    address: addr(t.address, `tokens[${i}].address`),
    decimals: int(t.decimals, `tokens[${i}].decimals`),
    approveResetFirst: bool(t.approveResetFirst, `tokens[${i}].approveResetFirst`),
    dustThreshold: big(t.dustThreshold, `tokens[${i}].dustThreshold`),
  }));
  if (tokens.length === 0) fail("tokens", "must list at least one token");
  if (new Set(tokens.map((t: TokenSetting) => t.address)).size !== tokens.length) fail("tokens", "duplicate address");
  if (new Set(tokens.map((t: TokenSetting) => t.symbol)).size !== tokens.length) fail("tokens", "duplicate symbol");

  const confirmation: ConfirmationPolicy =
    r.confirmation?.mode === "finalized"
      ? { mode: "finalized" }
      : r.confirmation?.mode === "depth"
        ? { mode: "depth", blocks: int(r.confirmation.blocks, "confirmation.blocks", 1) }
        : fail("confirmation.mode", "must be finalized or depth");

  const currencies: Record<string, { minorDigits: number }> = {};
  for (const [code, c] of Object.entries(r.currencies ?? fail("currencies", "required"))) {
    if (!/^[A-Z]{3}$/.test(code)) fail(`currencies.${code}`, "must be an ISO 4217 code");
    currencies[code] = { minorDigits: int((c as any).minorDigits, `currencies.${code}.minorDigits`) };
  }

  const holdHours = {} as Record<PaymentMethod, number>;
  for (const m of METHODS) holdHours[m] = int(r.holdHours?.[m], `holdHours.${m}`);

  const referenceRates = (r.referenceRates ?? []).map((x: any, i: number) => {
    const date = str(x.date, `referenceRates[${i}].date`);
    if (date !== "*" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`referenceRates[${i}].date`, "must be YYYY-MM-DD or *");
    return {
      currency: str(x.currency, `referenceRates[${i}].currency`),
      token: str(x.token, `referenceRates[${i}].token`),
      date,
      rate: parseDecimal(str(x.rate, `referenceRates[${i}].rate`)),
    };
  });

  return {
    chainId: int(r.chainId, "chainId", 1),
    safe: addr(r.safe, "safe"),
    registry: addr(r.registry, "registry"),
    startBlock: int(r.startBlock, "startBlock"),
    confirmation,
    chunkSize: int(r.chunkSize, "chunkSize", 1),
    tokens,
    partnerSenders: (r.partnerSenders ?? []).map((a: unknown, i: number) => addr(a, `partnerSenders[${i}]`)),
    currencies,
    tolerance: {
      internalBps: int(r.tolerance?.internalBps, "tolerance.internalBps"),
      roundingUnits: big(r.tolerance?.roundingUnits, "tolerance.roundingUnits"),
      marketBps: int(r.tolerance?.marketBps, "tolerance.marketBps"),
    },
    requireReferenceRate: bool(r.requireReferenceRate, "requireReferenceRate"),
    referenceRates,
    creditBasis: oneOf(r.creditBasis, "creditBasis", ["net", "gross"] as const),
    holdHours,
    messageWaitHours: int(r.messageWaitHours, "messageWaitHours"),
    partialWaitHours: int(r.partialWaitHours, "partialWaitHours"),
    depositWaitHours: int(r.depositWaitHours, "depositWaitHours"),
    bouncedPayoutPolicy: oneOf(r.bouncedPayoutPolicy, "bouncedPayoutPolicy", ["report", "record_as_repayment"] as const),
    maxClockSkewSeconds: int(r.maxClockSkewSeconds, "maxClockSkewSeconds", 1),
    explorerTxUrl: str(r.explorerTxUrl, "explorerTxUrl"),
    paths: {
      data: str(r.paths?.data, "paths.data"),
      inbox: str(r.paths?.inbox, "paths.inbox"),
      out: str(r.paths?.out, "paths.out"),
      loanBook: str(r.paths?.loanBook, "paths.loanBook"),
    },
  };
}

export function loadConfig(file: string): { config: Config; hash: string } {
  const text = readFileSync(file, "utf8");
  return { config: parseConfig(JSON.parse(text)), hash: createHash("sha256").update(text).digest("hex") };
}

export function tokenByAddress(config: Config, address: Address): TokenSetting | undefined {
  return config.tokens.find((t) => t.address === address);
}

export function tokenBySymbol(config: Config, symbol: string): TokenSetting | undefined {
  return config.tokens.find((t) => t.symbol === symbol);
}
