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

type ReturnPoint = { inflow: number; totalEquity: number; netIncome: number };

export function buildRange<T extends { period: string }>(points: T[], range: DashboardRange): T[] {
  if (points.length === 0) return points;

  if (range === 'all') return points;

  if (range === 'ytd') {
    const latest = points[points.length - 1];
    const latestYear = Number(latest.period.slice(0, 4));
    return points.filter((p) => Number(p.period.slice(0, 4)) === latestYear);
  }

  const startIndex = Math.max(points.length - 12, 0);
  return points.slice(startIndex);
}

export function computeNetIncome(points: Array<{ period: string; inflow: number; totalEquity: number }>) {
  let cumulativeNetFlow = 0;
  return points.map((point) => {
    cumulativeNetFlow += point.inflow;
    const netIncome = point.totalEquity - cumulativeNetFlow;
    return { ...point, netIncome };
  });
}

function netPresentValue(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((sum, cashFlow, index) => sum + cashFlow / (1 + rate) ** index, 0);
}

function solvePeriodicIrr(cashFlows: number[]): number | null {
  const hasPositive = cashFlows.some((flow) => flow > 0);
  const hasNegative = cashFlows.some((flow) => flow < 0);
  if (!hasPositive || !hasNegative) return null;

  let low = -0.999999;
  let high = 10;
  let lowValue = netPresentValue(cashFlows, low);
  let highValue = netPresentValue(cashFlows, high);

  for (let i = 0; i < 100 && Math.sign(lowValue) === Math.sign(highValue); i++) {
    high *= 2;
    highValue = netPresentValue(cashFlows, high);
  }

  if (Math.sign(lowValue) === Math.sign(highValue)) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const midValue = netPresentValue(cashFlows, mid);

    if (Math.abs(midValue) < 1e-7) return mid;

    if (Math.sign(midValue) === Math.sign(lowValue)) {
      low = mid;
      lowValue = midValue;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function computeMwr(points: ReturnPoint[], endIndex: number): number | null {
  const initialEquity = points[0].totalEquity;
  const finalEquity = points[endIndex].totalEquity;
  if (initialEquity === 0 || finalEquity === 0) return null;

  const cashFlows = [-initialEquity];
  for (let i = 1; i < endIndex; i++) {
    cashFlows.push(-points[i].inflow);
  }
  cashFlows.push(finalEquity - points[endIndex].inflow);

  const monthlyRate = solvePeriodicIrr(cashFlows);
  if (monthlyRate == null) return null;

  const cumulative = (1 + monthlyRate) ** endIndex - 1;
  return round2(cumulative * 100);
}

export function computeReturns(points: ReturnPoint[], method: ReturnMethod): Array<number | null> {
  const returns: Array<number | null> = [];

  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      returns.push(null);
      continue;
    }

    const prev = points[i - 1];
    const current = points[i];

    if (method === 'simple') {
      if (prev.totalEquity === 0) {
        returns.push(null);
        continue;
      }
      const r = current.totalEquity / prev.totalEquity - 1;
      returns.push(round2(r * 100));
      continue;
    }

    if (method === 'twr') {
      if (prev.totalEquity === 0) {
        returns.push(null);
        continue;
      }

      // Monthly netFlow has no intramonth timing, so this treats flows as end-of-period.
      const periodR = (current.netIncome - prev.netIncome) / prev.totalEquity;
      const prevCumPct = returns[i - 1];
      const prevCum = prevCumPct == null ? 0 : prevCumPct / 100;
      const cum = (1 + prevCum) * (1 + periodR) - 1;

      returns.push(round2(cum * 100));
      continue;
    }

    if (method === 'mwr') {
      returns.push(computeMwr(points, i));
      continue;
    }

    returns.push(null);
  }

  return returns;
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
    if (!currency) {
      continue;
    }
    const date = endOfMonthIso(balance.periodYear, balance.periodMonth);
    const convertedAmount = await convertAmount(date, balance.amount, currency, reportCurrency, cache);
    const convertedNetFlow = await convertAmount(date, balance.netFlow, currency, reportCurrency, cache);
    const key = formatPeriod(balance.periodYear, balance.periodMonth);
    const current = grouped.get(key) ?? { year: balance.periodYear, month: balance.periodMonth, inflow: 0, totalEquity: 0 };

    grouped.set(key, {
      year: balance.periodYear,
      month: balance.periodMonth,
      inflow: current.inflow + convertedNetFlow,
      totalEquity: current.totalEquity + convertedAmount,
    });
  }

  const sorted: Array<{ year: number; month: number; inflow: number; totalEquity: number }> = Array.from(grouped.values()).sort(
    (a, b) => {
      if (a.year === b.year) return a.month - b.month;
      return a.year - b.year;
    }
  );

  const allPoints = sorted.map((item) => ({
    period: formatPeriod(item.year, item.month),
    inflow: item.inflow,
    totalEquity: item.totalEquity,
  }));
  const rangedRawPoints = buildRange(allPoints, range);
  const withPerformance = computeNetIncome(rangedRawPoints);
  const returns = computeReturns(withPerformance, returnMethod);

  const points: DashboardPoint[] = withPerformance.map((item, idx) => ({
    period: item.period,
    inflow: round2(item.inflow),
    totalEquity: round2(item.totalEquity),
    netIncome: round2(item.netIncome),
    returnPct: returns[idx],
  }));

  const from = points.length > 0 ? points[0].period : null;
  const to = points.length > 0 ? points[points.length - 1].period : null;

  return {
    currency: reportCurrency,
    range,
    from,
    to,
    returnMethod,
    points,
  };
}

export async function getAccountSeries(
  userId: string,
  accountId: string,
  range: DashboardRange
): Promise<DashboardSeries | null> {
  const account = await accountRepository.findByIdForUser(accountId, userId);
  if (!account) {
    return null;
  }

  const balances = await balanceRepository.findAllForAccount(accountId);
  const withPerformance = computeNetIncome(
    balances.map((balance) => ({
      period: formatPeriod(balance.periodYear, balance.periodMonth),
      inflow: balance.netFlow,
      totalEquity: balance.amount,
    }))
  );

  const points: DashboardPoint[] = withPerformance.map((item) => ({
    period: item.period,
    inflow: round2(item.inflow),
    totalEquity: round2(item.totalEquity),
    netIncome: round2(item.netIncome),
    returnPct: null,
  }));

  const ranged = buildRange(points, range);

  return {
    currency: account.currency,
    range,
    from: ranged.length > 0 ? ranged[0].period : null,
    to: ranged.length > 0 ? ranged[ranged.length - 1].period : null,
    returnMethod: 'simple',
    points: ranged,
  };
}
