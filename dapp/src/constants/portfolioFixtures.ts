/**
 * Fixture data for the Portfolio demo (partner / internal walkthrough).
 * Amounts match the contract model: GBP in pence, USDC 6 decimals, every token amount inside the
 * 1.10 to 1.50 USD per GBP band, every facility and payout inside the pilot limits.
 */

export type LoanStatus = 'Active' | 'Defaulted' | 'Repaid' | 'WrittenOff';

export interface FixtureTranche {
  id: number;
  gbpPence: bigint;
  usdc: bigint;
  payoutRef: string;
  at: string;
}

export interface FixtureRepayment {
  id: number;
  gbpPence: bigint;
  usdc: bigint;
  settlementRef: string;
  at: string;
}

export interface FixtureSettlement {
  id: string;
  kind: 'collateral' | 'disbursement' | 'repayment' | 'collateral_release';
  gbpPence: bigint;
  usdc: bigint;
  reference: string;
  at: string;
}

export interface FixtureLoan {
  id: number;
  label: string;
  status: LoanStatus;
  facilityGbpPence: bigint;
  feeGbpPence: bigint;
  disbursedGbpPence: bigint;
  repaidGbpPence: bigint;
  collateralGbpPence: bigint;
  collateralUsdc: bigint;
  collateralHeld: boolean;
  collateralDepositedAt: string;
  collateralReleasedAt?: string;
  lastRepaymentAt: string;
  agreementHash: string;
  tranches: FixtureTranche[];
  repayments: FixtureRepayment[];
}

/** USD per GBP in basis points: 12700 means 1.27 USD per GBP. */
const DEMO_RATE_BPS = 12_700n;

function gbp(pounds: number): bigint {
  return BigInt(pounds) * 100n;
}

/** Token amount (6 decimals) for a GBP amount in pence at `rateBps`. */
export function usdcFor(gbpPence: bigint, rateBps: bigint = DEMO_RATE_BPS): bigint {
  return gbpPence * rateBps;
}

function tranche(id: number, pounds: number, payoutRef: string, at: string): FixtureTranche {
  return { id, gbpPence: gbp(pounds), usdc: usdcFor(gbp(pounds)), payoutRef, at };
}

function repayment(id: number, pounds: number, settlementRef: string, at: string): FixtureRepayment {
  return { id, gbpPence: gbp(pounds), usdc: usdcFor(gbp(pounds)), settlementRef, at };
}

function sum(values: bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

const LOAN_1_TRANCHES = [
  tranche(1, 20_000, '0x7a41c9d2e8b3f6a0', '2026-08-04'),
  tranche(2, 15_000, '0x2be09f4c71d8a653', '2026-10-06'),
];
const LOAN_1_REPAYMENTS = [
  repayment(1, 2_000, '0xc3d81a5f09e2b764', '2026-09-01'),
  repayment(2, 2_500, '0x91f4e7a20c6b3d58', '2026-10-01'),
  repayment(3, 3_500, '0x5e2a8c1fd4b07963', '2026-11-02'),
];

const LOAN_2_TRANCHES = [tranche(1, 25_000, '0xd04b6e3a9f1c2758', '2026-03-02')];
const LOAN_2_REPAYMENTS = [
  repayment(1, 4_000, '0x38a9f1e6c2d05b47', '2026-04-01'),
  repayment(2, 5_000, '0xa71c3e8b4f9d2605', '2026-05-01'),
  repayment(3, 5_000, '0x6f2d9b0e1a8c4753', '2026-06-01'),
  repayment(4, 5_500, '0xe85b2c7a3d1f9046', '2026-07-01'),
  repayment(5, 5_500, '0x1c9e4a6f8b3d2570', '2026-08-03'),
];

export const DEMO_LOANS: FixtureLoan[] = [
  {
    id: 1,
    label: 'Sample facility (demo)',
    status: 'Active',
    facilityGbpPence: gbp(50_000),
    feeGbpPence: 0n,
    disbursedGbpPence: sum(LOAN_1_TRANCHES.map((item) => item.gbpPence)),
    repaidGbpPence: sum(LOAN_1_REPAYMENTS.map((item) => item.gbpPence)),
    collateralGbpPence: gbp(10_000),
    collateralUsdc: usdcFor(gbp(10_000)),
    collateralHeld: true,
    collateralDepositedAt: '2026-08-01',
    lastRepaymentAt: '2026-11-02',
    agreementHash: '0x8f3a2c1b9e7d6a5f4c3b2a1908f7e6d5c4b3a2918f7e6d5c4b3a2918070605',
    tranches: LOAN_1_TRANCHES,
    repayments: LOAN_1_REPAYMENTS,
  },
  {
    id: 2,
    label: 'Fully repaid example (demo)',
    status: 'Repaid',
    facilityGbpPence: gbp(25_000),
    feeGbpPence: 0n,
    disbursedGbpPence: sum(LOAN_2_TRANCHES.map((item) => item.gbpPence)),
    repaidGbpPence: sum(LOAN_2_REPAYMENTS.map((item) => item.gbpPence)),
    collateralGbpPence: gbp(5_000),
    collateralUsdc: usdcFor(gbp(5_000)),
    collateralHeld: false,
    collateralDepositedAt: '2026-02-26',
    collateralReleasedAt: '2026-08-04',
    lastRepaymentAt: '2026-08-03',
    agreementHash: '0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809',
    tranches: LOAN_2_TRANCHES,
    repayments: LOAN_2_REPAYMENTS,
  },
];

/** Every partner settlement for a loan, newest first. */
export function settlementsFor(loan: FixtureLoan): FixtureSettlement[] {
  const rows: FixtureSettlement[] = [
    {
      id: `${loan.id}-col`,
      kind: 'collateral',
      gbpPence: loan.collateralGbpPence,
      usdc: loan.collateralUsdc,
      reference: `0xc0${loan.agreementHash.slice(4, 18)}`,
      at: loan.collateralDepositedAt,
    },
    ...loan.tranches.map((item) => ({
      id: `${loan.id}-t${item.id}`,
      kind: 'disbursement' as const,
      gbpPence: item.gbpPence,
      usdc: item.usdc,
      reference: item.payoutRef,
      at: item.at,
    })),
    ...loan.repayments.map((item) => ({
      id: `${loan.id}-r${item.id}`,
      kind: 'repayment' as const,
      gbpPence: item.gbpPence,
      usdc: item.usdc,
      reference: item.settlementRef,
      at: item.at,
    })),
  ];
  if (loan.collateralReleasedAt) {
    rows.push({
      id: `${loan.id}-rel`,
      kind: 'collateral_release',
      gbpPence: loan.collateralGbpPence,
      usdc: loan.collateralUsdc,
      reference: `0xe1${loan.agreementHash.slice(4, 18)}`,
      at: loan.collateralReleasedAt,
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

export interface MonthTotal {
  month: string;
  label: string;
  gbpPence: bigint;
}

/** GBP repaid per calendar month across all loans, oldest first, gaps filled with zero. */
export function repaymentsByMonth(loans: FixtureLoan[]): MonthTotal[] {
  const totals = new Map<string, bigint>();
  const months: string[] = [];
  for (const loan of loans) {
    for (const item of [...loan.tranches, ...loan.repayments]) months.push(item.at.slice(0, 7));
    for (const item of loan.repayments) {
      const month = item.at.slice(0, 7);
      totals.set(month, (totals.get(month) ?? 0n) + item.gbpPence);
    }
  }
  months.sort();
  const result: MonthTotal[] = [];
  let [year, month] = months[0].split('-').map(Number);
  const last = months[months.length - 1];
  for (;;) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-GB', {
      month: 'short',
      timeZone: 'UTC',
    });
    result.push({ month: key, label, gbpPence: totals.get(key) ?? 0n });
    if (key === last) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

/** Contract v1 safety controls as designed in docs/specs/loan-registry-plan.md. Not deployed. */
export const DEMO_CONTROLS = {
  destinations: [
    { label: 'Payments partner deposit', address: '0x4c1e7b20d93fa6e85c11b2d09e47f3a8c26d9a2f' },
    { label: 'FVC treasury Safe (2 of 4)', address: '0x9d3f51a7c08e2b46d7f1e39ac5b20684f1c7e3b0' },
  ],
  maxFacilityGbpPence: gbp(50_000),
  maxPayoutUsdc: 32_000n * 1_000_000n,
  dailyOutUsdc: 65_000n * 1_000_000n,
  outTodayUsdc: usdcFor(gbp(3_500)),
  rateBandBps: { min: 11_000n, max: 15_000n },
  lastRateBps: DEMO_RATE_BPS,
  queued: [
    {
      what: 'Add payout address 0x6b08…e51d',
      runsIn: '47h 12m',
    },
  ],
  timelockHours: 48,
};

export function owedGbp(loan: FixtureLoan): bigint {
  return loan.disbursedGbpPence + loan.feeGbpPence;
}

export function outstandingGbp(loan: FixtureLoan): bigint {
  const owed = owedGbp(loan);
  return owed > loan.repaidGbpPence ? owed - loan.repaidGbpPence : 0n;
}

export function formatGbp(pence: bigint): string {
  const pounds = Number(pence) / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(pounds);
}

export function formatUsdc(amount: bigint): string {
  const value = Number(amount) / 1_000_000;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)} USDC`;
}

export function formatRate(bps: bigint): string {
  return (Number(bps) / 10_000).toFixed(2);
}

export function shortHash(hash: string): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function settlementLabel(kind: FixtureSettlement['kind']): string {
  switch (kind) {
    case 'collateral':
      return 'Collateral deposit';
    case 'disbursement':
      return 'Funding payout';
    case 'repayment':
      return 'Repayment settlement';
    case 'collateral_release':
      return 'Collateral release';
  }
}
