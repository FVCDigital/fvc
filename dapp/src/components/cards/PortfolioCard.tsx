import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import DemoTour from '@/components/portfolio/DemoTour';
import { DEMO_TOUR_BEATS, DEMO_TOUR_SECONDS, DemoTourAction } from '@/constants/demoTourBeats';
import {
  DEMO_CONTROLS,
  DEMO_LOANS,
  FixtureLoan,
  formatGbp,
  formatRate,
  formatUsdc,
  outstandingGbp,
  owedGbp,
  repaymentsByMonth,
  settlementLabel,
  settlementsFor,
  shortHash,
} from '@/constants/portfolioFixtures';

type ThemeMode = 'cutmap' | 'lendscape';

interface PortfolioCardProps {
  /** Standalone page for recording: no dapp chrome, Record button shown. */
  presentation?: boolean;
}

const FEED_FIELDS = ['GBP collected', 'USDC sent', 'Your reference', 'Transaction id', 'Date'];

function statusTone(status: FixtureLoan['status'], light: boolean): string {
  if (status === 'Active') {
    return light
      ? 'bg-[#EEF0FC] text-[#6A70E4] border-[#6A70E4]/40'
      : 'text-[#C7CAFF] border-[rgba(106,112,228,0.45)] bg-[rgba(106,112,228,0.12)]';
  }
  if (status === 'Repaid') {
    return light
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'text-emerald-400 border-emerald-400/35 bg-emerald-400/10';
  }
  if (status === 'Defaulted') {
    return light
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'text-amber-300 border-amber-300/35 bg-amber-300/10';
  }
  return light
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'text-red-300 border-red-300/35 bg-red-300/10';
}

function percent(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Math.min(100, Number((part * 100n) / whole));
}

const PortfolioCard: React.FC<PortfolioCardProps> = ({ presentation = false }) => {
  const [theme, setTheme] = useState<ThemeMode>('cutmap');
  const [selectedId, setSelectedId] = useState<number>(DEMO_LOANS[0].id);
  const [activeBeat, setActiveBeat] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const light = theme === 'lendscape';

  const muted = light ? 'text-gray-500' : 'text-[#8B8B93]';
  const panel = light ? 'bg-white border-gray-200' : 'bg-[#17171A] border-white/10';
  const inset = light ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/25';
  const track = light ? 'bg-gray-200' : 'bg-white/10';
  const eyebrow = cn('text-[10px] uppercase tracking-[0.14em] font-mono', muted);
  const brandPill = light
    ? 'border-[#6A70E4]/40 bg-[#EEF0FC] text-[#6A70E4]'
    : 'border-[rgba(106,112,228,0.45)] text-[#C7CAFF] bg-[rgba(106,112,228,0.12)]';
  const amberPill = light
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-amber-300/35 text-amber-300';
  const greenPill = light
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-emerald-400/35 text-emerald-400';

  const loan = useMemo(
    () => DEMO_LOANS.find((item) => item.id === selectedId) ?? DEMO_LOANS[0],
    [selectedId]
  );

  const summary = useMemo(() => {
    const drawn = DEMO_LOANS.reduce((total, item) => total + item.disbursedGbpPence, 0n);
    const outstanding = DEMO_LOANS.reduce((total, item) => total + outstandingGbp(item), 0n);
    const collateral = DEMO_LOANS.reduce(
      (total, item) => total + (item.collateralHeld ? item.collateralGbpPence : 0n),
      0n
    );
    return { drawn, outstanding, collateral };
  }, []);

  const months = useMemo(() => repaymentsByMonth(DEMO_LOANS), []);
  const maxMonth = months.reduce((max, item) => (item.gbpPence > max ? item.gbpPence : max), 0n);
  const settlements = useMemo(() => settlementsFor(loan).slice(0, 4), [loan]);
  const progress = percent(loan.repaidGbpPence, owedGbp(loan));

  const onTourAction = useCallback((action: DemoTourAction) => {
    if (action === 'select-loan-1') setSelectedId(1);
    if (action === 'select-loan-2') setSelectedId(2);
  }, []);

  const limits = [
    {
      label: 'Per loan',
      value: formatGbp(DEMO_CONTROLS.maxFacilityGbpPence),
      used: percent(loan.facilityGbpPence, DEMO_CONTROLS.maxFacilityGbpPence),
      hint: `This facility ${formatGbp(loan.facilityGbpPence)}`,
    },
    {
      label: 'Per payout',
      value: formatUsdc(DEMO_CONTROLS.maxPayoutUsdc),
      used: percent(
        loan.tranches.reduce((max, item) => (item.usdc > max ? item.usdc : max), 0n),
        DEMO_CONTROLS.maxPayoutUsdc
      ),
      hint: 'Largest tranche on this loan',
    },
    {
      label: 'Out per day',
      value: formatUsdc(DEMO_CONTROLS.dailyOutUsdc),
      used: percent(DEMO_CONTROLS.outTodayUsdc, DEMO_CONTROLS.dailyOutUsdc),
      hint: `${formatUsdc(DEMO_CONTROLS.outTodayUsdc)} out today`,
    },
  ];

  const board = (
    <div className={cn('w-full max-w-[1180px] mx-auto pb-28', light ? 'text-gray-900' : 'text-[#F5F5F5]')}>
      {/* Top bar */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4" data-tour-id="header">
        <div>
          {presentation ? (
            <div className={cn('flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em]', muted)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="FVC" className="h-5 w-5 rounded" />
              <span>FVC</span>
              <span>/</span>
              <span className={light ? 'text-gray-900' : 'text-[#F5F5F5]'}>Portfolio</span>
              <span>/</span>
              <span>Demo</span>
            </div>
          ) : (
            <div className={cn('text-[10px] uppercase tracking-[0.16em] font-mono', muted)}>
              Ops panel · not SME-facing
            </div>
          )}
          <h1 className="mt-2 text-2xl font-bold tracking-tight">What FVC tracks on each facility</h1>
          <p className={cn('mt-1 text-sm', muted)}>
            Payouts, repayments, collateral and partner settlements on one board. Demo data.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={cn(
              'flex rounded-lg border p-1 text-xs font-semibold',
              light ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/30',
              recording && 'invisible'
            )}
          >
            {(['cutmap', 'lendscape'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-colors',
                  theme === mode
                    ? 'bg-[#6A70E4] text-white'
                    : light
                      ? 'text-gray-600 hover:bg-gray-50'
                      : 'text-[#8B8B93] hover:bg-white/5'
                )}
              >
                {mode === 'cutmap' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
          {!presentation && !recording && (
            <a
              href="/demo/"
              target="_blank"
              rel="noreferrer"
              className={cn(
                'h-9 inline-flex items-center rounded-lg px-3 text-xs font-semibold border transition-colors',
                light
                  ? 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                  : 'border-white/10 text-white hover:bg-white/5'
              )}
            >
              Presentation mode
            </a>
          )}
          <DemoTour
            onAction={onTourAction}
            onBeatChange={setActiveBeat}
            onRecordingChange={setRecording}
            allowRecord={presentation}
            light={light}
          />
        </div>
      </div>

      {/* Board */}
      <div
        className={cn(
          'rounded-2xl border p-4 md:p-5 space-y-3',
          light
            ? 'bg-[#F7F8FA] border-gray-200'
            : 'border-white/10 bg-[#121214] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
        )}
        style={
          light
            ? undefined
            : {
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }
        }
      >
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5" data-tour-id="summary">
          {[
            { label: 'Drawn', value: formatGbp(summary.drawn), hint: 'GBP paid out' },
            { label: 'Outstanding', value: formatGbp(summary.outstanding), hint: 'Still owed' },
            { label: 'Collateral', value: formatGbp(summary.collateral), hint: 'Held as USDC' },
            { label: 'Partner feed', value: 'Simulated', hint: 'Plugs in when live', badge: true },
          ].map((kpi) => (
            <div key={kpi.label} className={cn('rounded-xl border p-3.5', panel)}>
              <div className={eyebrow}>{kpi.label}</div>
              {kpi.badge ? (
                <div className="mt-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider',
                      amberPill
                    )}
                  >
                    {kpi.value}
                  </span>
                </div>
              ) : (
                <div className="mt-2 text-2xl font-bold tracking-tight">{kpi.value}</div>
              )}
              <div className={cn('mt-1 text-[11px]', muted)}>{kpi.hint}</div>
            </div>
          ))}
        </div>

        {/* Facilities + chart | detail */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.85fr] gap-3">
          <div className={cn('rounded-xl border overflow-hidden flex flex-col', panel)}>
            <div data-tour-id="loan-list">
              <div
                className={cn(
                  'flex items-center justify-between px-4 py-3 border-b',
                  light ? 'border-gray-200' : 'border-white/10'
                )}
              >
                <div className={eyebrow}>Facilities</div>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase', brandPill)}>
                  {DEMO_LOANS.length} demo
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('text-left text-[10px] uppercase tracking-[0.1em] font-mono', muted)}>
                      <th className="px-4 py-2 font-medium">Loan</th>
                      <th className="px-4 py-2 font-medium">Drawn</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Repaid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DEMO_LOANS.map((item) => {
                      const selected = item.id === loan.id;
                      const pct = percent(item.repaidGbpPence, owedGbp(item));
                      return (
                        <tr
                          key={item.id}
                          data-tour-id={`loan-${item.id}`}
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            'cursor-pointer border-t transition-colors',
                            light ? 'border-gray-100' : 'border-white/10',
                            selected
                              ? light
                                ? 'bg-[#EEF0FC]'
                                : 'bg-[rgba(106,112,228,0.12)] shadow-[inset_3px_0_0_#6A70E4]'
                              : light
                                ? 'hover:bg-gray-50'
                                : 'hover:bg-white/[0.03]'
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold">{item.label}</div>
                            <div className={cn('text-[11px] font-mono mt-0.5', muted)}>
                              #{item.id} · facility {formatGbp(item.facilityGbpPence)}
                            </div>
                          </td>
                          <td className="px-4 py-3">{formatGbp(item.disbursedGbpPence)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                statusTone(item.status, light)
                              )}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={cn('h-1.5 w-16 rounded-full overflow-hidden', track)}>
                                <div className="h-full rounded-full bg-[#6A70E4]" style={{ width: `${pct}%` }} />
                              </div>
                              <span className={cn('text-[11px] font-mono', muted)}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              className={cn('mt-auto border-t px-4 pt-3 pb-4', light ? 'border-gray-200' : 'border-white/10')}
              data-tour-id="chart"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={eyebrow}>Repaid per month · GBP</div>
                <div className={cn('text-[11px] font-mono', muted)}>
                  {formatGbp(months.reduce((total, item) => total + item.gbpPence, 0n))} total
                </div>
              </div>
              <div className="flex items-end gap-2 h-32">
                {months.map((item) => {
                  const height = maxMonth === 0n ? 0 : Number((item.gbpPence * 100n) / maxMonth);
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                      <div className={cn('text-[10px] font-mono', muted)}>
                        {item.gbpPence > 0n ? `£${Number(item.gbpPence / 100n) / 1000}k` : ''}
                      </div>
                      <div
                        className={cn(
                          'w-full rounded-t-md',
                          item.gbpPence > 0n
                            ? light
                              ? 'bg-[#6A70E4]'
                              : 'bg-gradient-to-t from-[#6A70E4]/40 to-[#7A80F0]'
                            : track
                        )}
                        style={{ height: `${Math.max(height, 3)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-1.5">
                {months.map((item) => (
                  <div key={item.month} className={cn('flex-1 text-center text-[10px] font-mono', muted)}>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={cn('rounded-xl border p-4 space-y-4', panel)}>
            <div>
              <div className={eyebrow}>Selected · Loan #{loan.id}</div>
              <div className="mt-1 text-lg font-bold tracking-tight">
                Facility {formatGbp(loan.facilityGbpPence)}
              </div>
              <div className={cn('mt-1 text-xs', muted)}>
                Owed {formatGbp(owedGbp(loan))} · Agreement {shortHash(loan.agreementHash)}
              </div>
            </div>

            <div data-tour-id="collateral">
              <div className={cn('rounded-xl border p-3', inset)}>
                <div className="flex items-center justify-between">
                  <div className={eyebrow}>Collateral</div>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase',
                      loan.collateralHeld ? brandPill : greenPill
                    )}
                  >
                    {loan.collateralHeld ? 'Held' : 'Released'}
                  </span>
                </div>
                <div className="mt-1 text-xl font-bold">{formatGbp(loan.collateralGbpPence)}</div>
                <div className={cn('mt-1 text-xs', muted)}>
                  {loan.collateralHeld
                    ? `Held as ${formatUsdc(loan.collateralUsdc)} until repaid`
                    : `Returned via payments partner on ${loan.collateralReleasedAt}`}
                </div>
                <div className={cn('mt-3 h-1.5 rounded-full overflow-hidden', track)}>
                  <div className="h-full rounded-full bg-[#6A70E4]" style={{ width: `${progress}%` }} />
                </div>
                <div className={cn('mt-1 text-[11px]', muted)}>
                  Repaid {formatGbp(loan.repaidGbpPence)} of {formatGbp(owedGbp(loan))} · {progress}%
                </div>
              </div>
            </div>

            <div data-tour-id="partner-feed">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className={eyebrow}>Partner feed</div>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase', amberPill)}>
                  Not connected
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {FEED_FIELDS.map((field) => (
                  <span
                    key={field}
                    className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-mono', inset, muted)}
                  >
                    {field}
                  </span>
                ))}
              </div>
              <div className="space-y-1.5">
                {settlements.map((row) => (
                  <div
                    key={row.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs',
                      light ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/25'
                    )}
                  >
                    <div>
                      <div className="font-medium">{settlementLabel(row.kind)}</div>
                      <div className={cn('font-mono mt-0.5', muted)}>
                        {row.at} · {shortHash(row.reference)}
                      </div>
                    </div>
                    <div className="text-right font-semibold">
                      <div>{formatGbp(row.gbpPence)}</div>
                      <div className={cn('font-normal', muted)}>{formatUsdc(row.usdc)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Safety controls */}
        <div className={cn('rounded-xl border p-4', panel)}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className={eyebrow}>Safety controls · built into the contract</div>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase', amberPill)}>
              Design · test network first, audit before mainnet
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className={cn('rounded-xl border p-3', inset)} data-tour-id="destinations">
              <div className={eyebrow}>Approved addresses</div>
              <div className="mt-2 space-y-1.5">
                {DEMO_CONTROLS.destinations.map((item) => (
                  <div
                    key={item.address}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs',
                      light ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/25'
                    )}
                  >
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className={cn('font-mono mt-0.5', muted)}>{shortHash(item.address)}</div>
                    </div>
                    <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-mono uppercase', greenPill)}>
                      Approved
                    </span>
                  </div>
                ))}
              </div>
              <div className={cn('mt-2 text-[11px]', muted)}>
                Money can only leave to these. Adding one waits {DEMO_CONTROLS.timelockHours} hours.
              </div>
            </div>

            <div className={cn('rounded-xl border p-3', inset)} data-tour-id="limits">
              <div className={eyebrow}>Limits</div>
              <div className="mt-2 space-y-2.5">
                {limits.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{item.label}</span>
                      <span className="font-mono">{item.value}</span>
                    </div>
                    <div className={cn('mt-1 h-1.5 rounded-full overflow-hidden', track)}>
                      <div className="h-full rounded-full bg-[#6A70E4]" style={{ width: `${item.used}%` }} />
                    </div>
                    <div className={cn('mt-0.5 text-[10px] font-mono', muted)}>{item.hint}</div>
                  </div>
                ))}
              </div>
              <div className={cn('mt-2 text-[11px]', muted)}>
                Enforced even with valid signatures. Raising a limit waits {DEMO_CONTROLS.timelockHours} hours.
              </div>
            </div>

            <div className={cn('rounded-xl border p-3', inset)} data-tour-id="checks">
              <div className={eyebrow}>Checks and pause</div>
              <div className="mt-2 space-y-1.5 text-xs">
                {DEMO_CONTROLS.queued.map((item) => (
                  <div
                    key={item.what}
                    className={cn(
                      'rounded-lg border px-2.5 py-2',
                      light ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/25'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">Queued change</span>
                      <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-mono uppercase', amberPill)}>
                        Runs in {item.runsIn}
                      </span>
                    </div>
                    <div className={cn('font-mono mt-0.5', muted)}>{item.what} · can be cancelled</div>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span>GBP rate check</span>
                  <span className="font-mono">
                    {formatRate(DEMO_CONTROLS.rateBandBps.min)} to {formatRate(DEMO_CONTROLS.rateBandBps.max)} USD
                  </span>
                </div>
                <div className={cn('flex items-center justify-between gap-2 px-0.5', muted)}>
                  <span>Last recorded rate</span>
                  <span className="font-mono">{formatRate(DEMO_CONTROLS.lastRateBps)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span>Status</span>
                  <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-mono uppercase', greenPill)}>
                    Running
                  </span>
                </div>
              </div>
              <div className={cn('mt-2 text-[11px]', muted)}>
                Any 2 of 4 signers can pause. Unpausing waits {DEMO_CONTROLS.timelockHours} hours.
              </div>
            </div>
          </div>
        </div>

        {/* Tour map */}
        <div className={cn('rounded-xl border p-3', panel)} data-tour-id="tour-map">
          <div className={cn(eyebrow, 'mb-2')}>
            Tour · {DEMO_TOUR_BEATS.length} steps · about {DEMO_TOUR_SECONDS}s
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-11 gap-1.5">
            {DEMO_TOUR_BEATS.map((beat, index) => (
              <div
                key={beat.id}
                className={cn(
                  'rounded-lg border px-2 py-2 min-h-[52px] transition-colors duration-300',
                  index === activeBeat
                    ? 'border-[#6A70E4] bg-[rgba(106,112,228,0.15)]'
                    : index < (activeBeat ?? -1)
                      ? light
                        ? 'border-gray-200 bg-white opacity-60'
                        : 'border-white/10 bg-black/20 opacity-60'
                      : light
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-white/10 bg-black/20'
                )}
              >
                <div className={cn('text-[10px] font-mono', muted)}>{String(index + 1).padStart(2, '0')}</div>
                <div className="mt-1 text-[11px] leading-snug line-clamp-2">{beat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!presentation) return board;

  return (
    <div
      className={cn('min-h-screen px-4 md:px-8 pt-8', light ? 'bg-[#EEF0F4]' : 'bg-[#0A0A0C]')}
      style={
        light
          ? undefined
          : { backgroundImage: 'radial-gradient(ellipse at top, rgba(106,112,228,0.10), transparent 55%)' }
      }
    >
      {board}
    </div>
  );
};

export default PortfolioCard;
