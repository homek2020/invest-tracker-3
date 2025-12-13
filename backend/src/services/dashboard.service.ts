import { accountRepository } from '../data/repositories/account.repository';
import { balanceRepository } from '../data/repositories/balance.repository';
import { currencyRateRepository } from '../data/repositories/currencyRate.repository';
import { AccountCurrency } from '../domain/models/Account';

type DashboardRange = 'all' | '1y' | 'ytd';

export interface DashboardPoint {
  period: string;
  inflow: number;
  equityWithNetFlow: number;
  equityWithoutNetFlow: number;
  returnPct: number | null;
}

export interface DashboardSeries {
  currency: AccountCurrency;
  range: DashboardRange;
  from: string | null;
  to: string | null;
  points: DashboardPoint[];
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${`${month}`.padStart(2, '0')}`;
}

function endOfMonthIso(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

function toCurrencyKey(date: string, from: AccountCurrency, to: AccountCurrency): string {
  return `${date}:${from}->${to}`;
}

async function fetchRate(date: string, from: AccountCurrency, to: AccountCurrency): Promise<number> {
  if (from === to) return 1;

  const direct = await currencyRateRepository.findByDate(date, from, to);
  if (direct) {
    return direct.rate;
  }

  const inverse = await currencyRateRepository.findByDate(date, to, from);
  if (inverse) {
    return 1 / inverse.rate;
  }

  throw new Error(`Missing currency rate for ${from}/${to} at ${date}`);
}

async function convertAmount(
  date: string,
  amount: number,
  from: AccountCurrency,
  to: AccountCurrency,
  cache: Map<string, number>
): Promise<number> {
  if (from === to) return amount;
  const cacheKey = toCurrencyKey(date, from, to);
  let rate = cache.get(cacheKey);
  if (!rate) {
    rate = await fetchRate(date, from, to);
    cache.set(cacheKey, rate);
  }
  return amount * rate;
}

function buildRange(points: DashboardPoint[], range: DashboardRange): DashboardPoint[] {
  if (points.length === 0) return points;

  if (range === 'all') return points;

  if (range === 'ytd') {
    const latest = points[points.length - 1];
    const latestYear = Number(latest.period.slice(0, 4));
    return points.filter((p) => Number(p.period.slice(0, 4)) === latestYear);
  }

  // 1y
  const startIndex = Math.max(points.length - 12, 0);
  return points.slice(startIndex);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeEquityWithoutNetFlow(points: Array<{ period: string; inflow: number; equityWithNetFlow: number }>) {
  let cumulativeNetFlow = 0;
  return points.map((point) => {
    cumulativeNetFlow += point.inflow;
    const equityWithoutNetFlow = point.equityWithNetFlow - cumulativeNetFlow;
    return { ...point, equityWithoutNetFlow };
  });
}

function computeReturns(points: Array<{ equityWithNetFlow: number }>): Array<number | null> {
  const returns: Array<number | null> = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      returns.push(null);
      continue;
    }
    const prev = points[i - 1].equityWithNetFlow;
    if (prev === 0) {
      returns.push(null);
    } else {
      const change = points[i].equityWithNetFlow / prev - 1;
      returns.push(round2(change * 100));
    }
  }
  return returns;
}

export async function getDashboardSeries(
  userId: string,
  reportCurrency: AccountCurrency,
  range: DashboardRange
): Promise<DashboardSeries> {
  const accounts = await accountRepository.findAllByUser(userId);
  const accountCurrencies = new Map(accounts.map((account) => [account.id, account.currency]));
  const balances = await balanceRepository.findAllForUserAllPeriods(accounts.map((a) => a.id));

  const cache = new Map<string, number>();
  const grouped = new Map<string, { year: number; month: number; inflow: number; equityWithNetFlow: number }>();

  for (const balance of balances) {
    const currency = accountCurrencies.get(balance.accountId);
    if (!currency) {
      continue;
    }
    const date = endOfMonthIso(balance.periodYear, balance.periodMonth);
    const convertedAmount = await convertAmount(date, balance.amount, currency, reportCurrency, cache);
    const convertedNetFlow = await convertAmount(date, balance.netFlow, currency, reportCurrency, cache);
    const key = formatPeriod(balance.periodYear, balance.periodMonth);
    const current = grouped.get(key) ?? { year: balance.periodYear, month: balance.periodMonth, inflow: 0, equityWithNetFlow: 0 };

    grouped.set(key, {
      year: balance.periodYear,
      month: balance.periodMonth,
      inflow: current.inflow + convertedNetFlow,
      equityWithNetFlow: current.equityWithNetFlow + convertedAmount,
    });
  }

  const sorted: Array<{ year: number; month: number; inflow: number; equityWithNetFlow: number }> = Array.from(grouped.values()).sort(
    (a, b) => {
      if (a.year === b.year) return a.month - b.month;
      return a.year - b.year;
    }
  );

  const withPerformance = computeEquityWithoutNetFlow(sorted.map((item) => ({
    period: formatPeriod(item.year, item.month),
    inflow: item.inflow,
    equityWithNetFlow: item.equityWithNetFlow,
  })));

  const returns = computeReturns(withPerformance);

  const points: DashboardPoint[] = withPerformance.map((item, idx) => ({
    period: item.period,
    inflow: round2(item.inflow),
    equityWithNetFlow: round2(item.equityWithNetFlow),
    equityWithoutNetFlow: round2(item.equityWithoutNetFlow),
    returnPct: returns[idx],
  }));

  const ranged = buildRange(points, range);
  const from = ranged.length > 0 ? ranged[0].period : null;
  const to = ranged.length > 0 ? ranged[ranged.length - 1].period : null;

  return {
    currency: reportCurrency,
    range,
    from,
    to,
    points: ranged,
  };
}
