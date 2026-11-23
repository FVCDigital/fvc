import { readFileSync } from "node:fs";
import type { Config } from "./config.ts";
import type { RateSource } from "./decide.ts";
import type { LoanBookEntry, Rate } from "./types.ts";

/** Reference rates from settings: an exact day first, then "*". */
export class StaticRateSource implements RateSource {
  private readonly config: Config;
  constructor(config: Config) {
    this.config = config;
  }
  reference(currency: string, tokenSymbol: string, at: string): Rate | null {
    const day = at.slice(0, 10);
    const rows = this.config.referenceRates.filter((r) => r.currency === currency && r.token === tokenSymbol);
    return (rows.find((r) => r.date === day) ?? rows.find((r) => r.date === "*"))?.rate ?? null;
  }
}

/**
 * The private loan book (R9): payment reference to loan ID and currency. Refuses a reference
 * listed twice or a loan ID listed under two references, so a reused reference can never be
 * matched to the wrong loan.
 */
export function parseLoanBook(raw: unknown): Map<string, LoanBookEntry> {
  if (!Array.isArray(raw)) throw new Error("loan book must be a list");
  const book = new Map<string, LoanBookEntry>();
  const loanIds = new Set<string>();
  for (const [i, row] of raw.entries()) {
    const reference = row?.reference;
    const loanId = row?.loanId;
    const currency = row?.currency;
    if (typeof reference !== "string" || !/^[A-Za-z0-9 _./-]{1,64}$/.test(reference)) throw new Error(`loan book [${i}]: bad reference`);
    if (typeof loanId !== "string" || !/^[1-9]\d*$/.test(loanId)) throw new Error(`loan book [${i}]: loanId must be a positive integer string`);
    if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) throw new Error(`loan book [${i}]: bad currency`);
    if (book.has(reference)) throw new Error(`loan book: reference ${reference} is listed twice`);
    if (loanIds.has(loanId)) throw new Error(`loan book: loan ${loanId} has two references`);
    book.set(reference, { reference, loanId: BigInt(loanId), currency });
    loanIds.add(loanId);
  }
  return book;
}

export function loadLoanBook(file: string): Map<string, LoanBookEntry> {
  return parseLoanBook(JSON.parse(readFileSync(file, "utf8")));
}
