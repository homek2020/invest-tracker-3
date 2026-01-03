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

function buildRange(points: Array<{ period: string }>, range: DashboardRange): { startIndex: number } {
  if (points.length === 0) return { startIndex: 0 };

  if (range === 'all') return { startIndex: 0 };

  if (range === 'ytd') {
    const latest = points[points.length - 1];
    const latestYear = Number(latest.period.slice(0, 4));
    const startIndex = points.findIndex((p) => Number(p.period.slice(0, 4)) === latestYear);
    return { startIndex: Math.max(startIndex, 0) };
  }

  // 1y
  return { startIndex: Math.max(points.length - 12, 0) };
}

function computeNetIncome(
  points: Array<{ period: string; inflow: number; totalEquity: number }>,
  baselineNetFlow = 0
) {
  let cumulativeNetFlow = baselineNetFlow;
  return points.map((point) => {
    cumulativeNetFlow += point.inflow;
    const netIncome = point.totalEquity - cumulativeNetFlow;
    return { ...point, netIncome };
  });
}

function computeReturns(
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

    if (method === 'simple') {
      if (prev.totalEquity === 0) {
        returns.push(null);
        continue;
      }
      const r = current.totalEquity / prev.totalEquity - 1; // decimal
      returns.push(round2(r * 100));
      continue;
    }

    if (method === 'twr') {
      if (prev.totalEquity === 0) {
        returns.push(null);
        continue;
      }

      // period return (decimal). Оставляю твою идею через netIncome delta.
      // Если netIncome = equity - invested, то delta(netIncome)/prevEquity ~= TWR period return.
      const periodR = (current.netIncome - prev.netIncome) / prev.totalEquity;

      // предыдущая кумулятивная (в decimal), если нет то 0
      const prevCumPct = returns[i - 1];
      const prevCum = prevCumPct == null ? 0 : prevCumPct / 100;

      // chaining: (1+prevCum)*(1+periodR)-1
      const cum = (1 + prevCum) * (1 + periodR) - 1;

      returns.push(round2(cum * 100));
      continue;
    }

    // на всякий случай
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

  const basePoints = sorted.map((item) => ({
    period: formatPeriod(item.year, item.month),
    inflow: item.inflow,
    totalEquity: item.totalEquity,
  }));

  const withPerformanceAll = computeNetIncome(basePoints);
  const { startIndex } = buildRange(withPerformanceAll, range);
  const baselineIndex = Math.max(startIndex - 1, -1);
  const baselineNetFlow =
    baselineIndex >= 0
      ? withPerformanceAll[baselineIndex].totalEquity - withPerformanceAll[baselineIndex].netIncome
      : 0;
  const rangedBasePoints = basePoints.slice(startIndex);
  const withPerformance = computeNetIncome(rangedBasePoints, baselineNetFlow);
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
