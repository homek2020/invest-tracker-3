import { accountRepository } from '../data/repositories/account.repository';
import { balanceRepository } from '../data/repositories/balance.repository';
import { AccountCurrency } from '../domain/models/Account';
import { DashboardRange, ReturnMethod } from '../domain/models/Dashboard';
import { convertAmount, CurrencyRateCache } from '../utils/currencyConversion';
import { endOfMonthIso, formatPeriod } from '../utils/date';
import { round2 } from '../utils/number';

export interface DashboardPoint {
  period: string;
  inflow: number;
  totalEquity: number;
  netIncome: number;
  returnPct: number | null;
}

export interface DashboardSeries {
  currency: AccountCurrency;
  range: DashboardRange;
  from: string | null;
  to: string | null;
  returnMethod: ReturnMethod;
  points: DashboardPoint[];
}

/**
 * Returns the index of the first data point that should be included in the
 * requested range. The caller is responsible for fetching one extra "baseline"
 * point at (index - 1) so that netIncome and return calculations are relative
 * to the start of the range rather than to the beginning of all history.
 */
export function getRangeStartIndex(
  sorted: Array<{ year: number; month: number }>,
  range: DashboardRange
): number {
  if (range === 'all' || sorted.length === 0) return 0;

  if (range === 'ytd') {
    const latestYear = sorted[sorted.length - 1].year;
    const idx = sorted.findIndex((p) => p.year === latestYear);
    return idx >= 0 ? idx : 0;
  }

  // '1y' – last 12 calendar months
  return Math.max(sorted.length - 12, 0);
}

/**
 * Computes cumulative netIncome for each point.
 * netIncome = totalEquity – Σ(inflows from the beginning of the slice)
 * This is intentionally computed on the slice that already starts at the
 * baseline point, so the result is relative to whatever the slice starts at.
 */
export function computeNetIncome(
  points: Array<{ period: string; inflow: number; totalEquity: number }>
) {
  let cumulativeNetFlow = 0;
  return points.map((point) => {
    cumulativeNetFlow += point.inflow;
    const netIncome = point.totalEquity - cumulativeNetFlow;
    return { ...point, netIncome };
  });
}

/**
 * Computes per-point returnPct values.
 *
 * simple – period return adjusted for cash flows:
 *   r = (equity[i] – equity[i-1] – inflow[i]) / equity[i-1]
 *   Previously this was equity[i]/equity[i-1]-1 which over-stated returns
 *   whenever a deposit arrived in the same month.
 *
 * twr – time-weighted return, chained from the first point of the slice:
 *   periodR = (netIncome[i] – netIncome[i-1]) / equity[i-1]
 *   cumulative[i] = (1 + cumulative[i-1]) * (1 + periodR) – 1
 *   Because the slice is already aligned to the range boundary, chaining
 *   starts at 0, giving a proper period-scoped cumulative TWR.
 */
export function computeReturns(
  points: Array<{ inflow: number; totalEquity: number; netIncome: number }>,
  method: ReturnMethod
): Array<number | null> {
  const returns: Array<number | null> = [];

  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      returns.push(null);
      continue;
    }

    const prev = points[i - 1];
    const current = points[i];

    if (prev.totalEquity === 0) {
      returns.push(null);
      continue;
    }

    if (method === 'simple') {
      // Adjust for cash flows so that a deposit doesn't inflate the return.
      const periodIncome = current.totalEquity - prev.totalEquity - current.inflow;
      returns.push(round2((periodIncome / prev.totalEquity) * 100));
      continue;
    }

    if (method === 'twr') {
      // Sub-period return: growth net of new money divided by opening equity.
      const periodR = (current.netIncome - prev.netIncome) / prev.totalEquity;

      // Chain with the previous cumulative value (0 at the start of the slice).
      const prevCumPct = returns[i - 1];
      const prevCum = prevCumPct == null ? 0 : prevCumPct / 100;
      const cum = (1 + prevCum) * (1 + periodR) - 1;

      returns.push(round2(cum * 100));
      continue;
    }

    returns.push(null);
  }

  return returns;
}

/**
 * Slices the full sorted dataset to the requested range and produces
 * period-relative netIncome and returnPct values.
 *
 * Why two-pass:
 *   computeNetIncome accumulates flows from the beginning of whatever array
 *   you hand it.  If we slice first, the equity values at the start of the
 *   slice already "embed" all historical inflows that preceded the slice,
 *   so restarting the accumulator would give a wildly wrong netIncome.
 *
 *   Instead we:
 *     1. Run computeNetIncome on the FULL history to get correct cumulative
 *        values for every month.
 *     2. Identify the baseline point (the last month before the range).
 *     3. Subtract the baseline's netIncome from every visible point so the
 *        result is relative to the start of the range (not inception).
 *     4. Re-run computeReturns on the slice [baseline … end] so that TWR
 *        chaining starts fresh at 0 for the range.
 *     5. Drop the baseline before returning.
 */
function applyRangeAndCompute(
  sorted: Array<{ year: number; month: number; inflow: number; totalEquity: number }>,
  range: DashboardRange,
  returnMethod: ReturnMethod
): DashboardPoint[] {
  if (sorted.length === 0) return [];

  // Pass 1 – full-history netIncome (gives correct cumulative values)
  const allRaw = sorted.map((item) => ({
    period: formatPeriod(item.year, item.month),
    inflow: item.inflow,
    totalEquity: item.totalEquity,
  }));
  const allWithIncome = computeNetIncome(allRaw);

  // Range boundary
  const rangeStartIdx = getRangeStartIndex(sorted, range);
  const baselineIdx = rangeStartIdx > 0 ? rangeStartIdx - 1 : 0;

  // The baseline's netIncome is the "zero" for the period we are displaying.
  const baselineNetIncome = allWithIncome[baselineIdx].netIncome;

  // Pass 2 – compute returns on the slice so TWR chains from 0 at range start.
  const slice = allWithIncome.slice(baselineIdx);
  const returns = computeReturns(slice, returnMethod);

  const allPoints: DashboardPoint[] = slice.map((item, idx) => ({
    period: item.period,
    inflow: round2(item.inflow),
    totalEquity: round2(item.totalEquity),
    // Subtract baseline so netIncome is relative to the range start.
    netIncome: round2(item.netIncome - baselineNetIncome),
    returnPct: returns[idx],
  }));

  // Drop the baseline point (it was only needed for computation context).
  return rangeStartIdx > 0 ? allPoints.slice(1) : allPoints;
}

export async function getDashboardSeries(
  userId: string,
  reportCurrency: AccountCurrency,
  range: DashboardRange,
  returnMethod: ReturnMethod
): Promise<DashboardSeries> {
  const accounts = await accountRepository.findAllByUser(userId);
  const accountCurrencies = new Map(accounts.map((account) => [account.id, account.currency]));
  const balances = await balanceRepository.findAllForUserAllPeriods(accounts.map((a) => a.id));

  const cache: CurrencyRateCache = new Map();
  const grouped = new Map<string, { year: number; month: number; inflow: number; totalEquity: number }>();

  for (const balance of balances) {
    const currency = accountCurrencies.get(balance.accountId);
    if (!currency) continue;

    const date = endOfMonthIso(balance.periodYear, balance.periodMonth);
    const convertedAmount = await convertAmount(date, balance.amount, currency, reportCurrency, cache);
    const convertedNetFlow = await convertAmount(date, balance.netFlow, currency, reportCurrency, cache);
    const key = formatPeriod(balance.periodYear, balance.periodMonth);
    const current = grouped.get(key) ?? {
      year: balance.periodYear,
      month: balance.periodMonth,
      inflow: 0,
      totalEquity: 0,
    };

    grouped.set(key, {
      year: balance.periodYear,
      month: balance.periodMonth,
      inflow: current.inflow + convertedNetFlow,
      totalEquity: current.totalEquity + convertedAmount,
    });
  }

  const sorted = Array.from(grouped.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );

  const points = applyRangeAndCompute(sorted, range, returnMethod);

  const from = points.length > 0 ? points[0].period : null;
  const to = points.length > 0 ? points[points.length - 1].period : null;

  return { currency: reportCurrency, range, from, to, returnMethod, points };
}

export async function getAccountSeries(
  userId: string,
  accountId: string,
  range: DashboardRange
): Promise<DashboardSeries | null> {
  const account = await accountRepository.findByIdForUser(accountId, userId);
  if (!account) return null;

  const balances = await balanceRepository.findAllForAccount(accountId);
  const sorted = balances.map((b) => ({
    year: b.periodYear,
    month: b.periodMonth,
    inflow: b.netFlow,
    totalEquity: b.amount,
  }));

  const points = applyRangeAndCompute(sorted, range, 'simple');

  return {
    currency: account.currency,
    range,
    from: points.length > 0 ? points[0].period : null,
    to: points.length > 0 ? points[points.length - 1].period : null,
    returnMethod: 'simple',
    points,
  };
}
