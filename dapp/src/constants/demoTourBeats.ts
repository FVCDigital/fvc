export type DemoTourAction = 'select-loan-1' | 'select-loan-2';

export interface DemoTourBeat {
  id: string;
  label: string;
  targetId: string;
  durationMs: number;
  caption: string;
  action?: DemoTourAction;
}

/** Muted walkthrough for the payments partner's team. */
export const DEMO_TOUR_BEATS: DemoTourBeat[] = [
  {
    id: 'header',
    label: 'Our side',
    targetId: 'header',
    durationMs: 6000,
    caption: "This is FVC's side only. Each row is one funded company.",
    action: 'select-loan-1',
  },
  {
    id: 'summary',
    label: 'Totals',
    targetId: 'summary',
    durationMs: 8000,
    caption: 'Drawn, outstanding, and collateral we hold after GBP is settled to USDC.',
  },
  {
    id: 'chart',
    label: 'Repayments',
    targetId: 'chart',
    durationMs: 9000,
    caption: 'GBP repaid each month. Every bar is money you collected and settled to us.',
  },
  {
    id: 'loan-list',
    label: 'One company',
    targetId: 'loan-1',
    durationMs: 9000,
    caption: 'Open a company: status, how much was paid out, how much is left.',
  },
  {
    id: 'collateral',
    label: 'Collateral',
    targetId: 'collateral',
    durationMs: 11000,
    caption:
      'Collateral: the SME pays GBP through you. You settle USDC. We hold it until they repay.',
  },
  {
    id: 'partner-feed',
    label: 'Your feed',
    targetId: 'partner-feed',
    durationMs: 13000,
    caption:
      'Your feed lands here. Per payment we need: GBP collected, USDC sent, your reference, the transaction id. That is how each payment is matched to the right loan.',
  },
  {
    id: 'destinations',
    label: 'Approved addresses',
    targetId: 'destinations',
    durationMs: 13000,
    caption:
      'Security: money can only leave to approved addresses, your deposit address and our Safe. A typo or a stolen key cannot send it anywhere else.',
  },
  {
    id: 'limits',
    label: 'Limits',
    targetId: 'limits',
    durationMs: 13000,
    caption:
      'Security backstop: even if signing keys were stolen, only a capped amount could leave per loan, per payout and per day.',
  },
  {
    id: 'checks',
    label: 'Checks and pause',
    targetId: 'checks',
    durationMs: 14000,
    caption:
      'Changes wait 48 hours in public, so nobody can rush one through. The rate check catches typos like pounds entered as pence. Two signers can pause everything.',
  },
  {
    id: 'repaid',
    label: 'Repaid',
    targetId: 'loan-2',
    durationMs: 10000,
    caption: 'When they repay in full, we release collateral back through you to their bank.',
    action: 'select-loan-2',
  },
  {
    id: 'close',
    label: 'Next step',
    targetId: 'partner-feed',
    durationMs: 10000,
    caption:
      'Test network first, external audit before mainnet. Next: agree this feed format with your team.',
  },
];

export const DEMO_TOUR_SECONDS = Math.round(
  DEMO_TOUR_BEATS.reduce((total, beat) => total + beat.durationMs, 0) / 1000
);

/** `?capture=1`: autoplay with every control hidden, for the background recorder script. */
export function isCaptureMode(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('capture') === '1';
}

/**
 * `?capture=1&slow=4`: run every timer, fade and scroll 4 times slower so the recorder can grab
 * 60 distinct frames per second of final video, then speed the video back up.
 */
export function tourTimeScale(): number {
  if (!isCaptureMode()) return 1;
  const slow = Number(new URLSearchParams(window.location.search).get('slow'));
  return Number.isFinite(slow) && slow >= 1 ? slow : 1;
}

export function shouldAutoplayTour(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('tour') === '1' || isCaptureMode();
}
