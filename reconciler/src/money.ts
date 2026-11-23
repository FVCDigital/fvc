import type { Rate } from "./types.ts";

export const pow10 = (n: number): bigint => 10n ** BigInt(n);

const DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/;

/** Parses a non-negative decimal string exactly. Throws on anything else (signs, exponents, spaces). */
export function parseDecimal(text: string): Rate {
  if (typeof text !== "string" || !DECIMAL.test(text)) throw new Error(`not a decimal: ${JSON.stringify(text)}`);
  const [whole, frac = ""] = text.split(".");
  return { units: BigInt(whole + frac), scale: frac.length };
}

/** Converts a decimal string to integer units with `decimals` places. Rejects more places than allowed. */
export function toUnits(text: string, decimals: number): bigint {
  const d = parseDecimal(text);
  if (d.scale > decimals) throw new Error(`${text} has more than ${decimals} decimal places`);
  return d.units * pow10(decimals - d.scale);
}

export function formatUnits(value: bigint, decimals: number): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const s = abs.toString().padStart(decimals + 1, "0");
  const out = decimals === 0 ? s : `${s.slice(0, -decimals)}.${s.slice(-decimals)}`;
  return neg ? `-${out}` : out;
}

export function formatRate(rate: Rate): string {
  return formatUnits(rate.units, rate.scale);
}

/** Token units the partner should send for `netMinor` of fiat at `rate` (token per fiat unit). Floors. */
export function expectedTokenAmount(netMinor: bigint, minorDigits: number, rate: Rate, tokenDecimals: number): bigint {
  return (netMinor * rate.units * pow10(tokenDecimals)) / (pow10(minorDigits) * pow10(rate.scale));
}

/** Fiat minor units (for example pence) that `tokenAmount` is worth at `rate`. Floors. */
export function fiatValueOfTokens(tokenAmount: bigint, rate: Rate, tokenDecimals: number, minorDigits: number): bigint {
  if (rate.units === 0n) throw new Error("zero rate");
  return (tokenAmount * pow10(rate.scale) * pow10(minorDigits)) / (rate.units * pow10(tokenDecimals));
}

/** True when |a - b| <= tolerance. */
export function withinAbs(a: bigint, b: bigint, tolerance: bigint): boolean {
  const diff = a > b ? a - b : b - a;
  return diff <= tolerance;
}

/** True when `rate` is within `bps` of `reference`, compared exactly by cross-multiplication. */
export function rateWithinBps(rate: Rate, reference: Rate, bps: number): boolean {
  const a = rate.units * pow10(reference.scale);
  const b = reference.units * pow10(rate.scale);
  const diff = a > b ? a - b : b - a;
  return diff * 10_000n <= BigInt(bps) * b;
}

/** The registry's `_checkRate`, reproduced exactly (LoanRegistry.sol, RATE_SCALE = 1e6). */
export function registryBandOk(
  gbpPence: bigint,
  tokenAmount: bigint,
  decimals: number,
  minRateBps: bigint,
  maxRateBps: bigint
): boolean {
  const scaledGbp = gbpPence * pow10(decimals);
  const scaledToken = tokenAmount * 1_000_000n;
  return scaledToken >= minRateBps * scaledGbp && scaledToken <= maxRateBps * scaledGbp;
}
