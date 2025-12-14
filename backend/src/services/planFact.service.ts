import { accountRepository } from '../data/repositories/account.repository';
import { balanceRepository } from '../data/repositories/balance.repository';
import { planScenarioRepository } from '../data/repositories/planScenario.repository';
import { AccountCurrency } from '../domain/models/Account';
import { PlanScenarioInput } from '../domain/models/PlanScenario';
import { convertAmount, CurrencyRateCache } from '../utils/currencyConversion';

export interface PlanFactPoint {
  period: string;
  fact: number | null;
  plan: number | null;
}

export interface PlanFactSeries {
  currency: AccountCurrency;
  points: PlanFactPoint[];
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${`${month}`.padStart(2, '0')}`;
}

function endOfMonthIso(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  const next = new Date(Date.UTC(year, month - 1, 1));
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function isPastOrCurrentMonth(year: number, month: number, reference: Date): boolean {
  return year < reference.getUTCFullYear() || (year === reference.getUTCFullYear() && month <= reference.getUTCMonth() + 1);
}

function parseEndDate(endDate: string): { year: number; month: number } {
  const parsed = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid endDate');
  }
  return { year: parsed.getUTCFullYear(), month: parsed.getUTCMonth() + 1 };
}

async function resolveScenario(userId: string, scenarioOrId: PlanScenarioInput | string): Promise<PlanScenarioInput> {
  if (typeof scenarioOrId !== 'string') {
    return scenarioOrId;
  }
  const scenario = await planScenarioRepository.findById(scenarioOrId, userId);
  if (!scenario) {
    throw new Error('Scenario not found');
  }
  return scenario;
}

export async function getPlanFactSeries(
  userId: string,
  scenarioOrId: PlanScenarioInput | string
): Promise<PlanFactSeries> {
  const scenario = await resolveScenario(userId, scenarioOrId);
  const { currency, annualYield, monthlyInflow, endDate } = scenario;

  const accounts = await accountRepository.findAllByUser(userId);
  const accountCurrencies = new Map(accounts.map((account) => [account.id, account.currency]));
  const balances = await balanceRepository.findAllForUserAllPeriods(accounts.map((a) => a.id));

  const cache: CurrencyRateCache = new Map();
  const grouped = new Map<string, { year: number; month: number; amount: number }>();
  const today = new Date();

  for (const balance of balances) {
    if (!isPastOrCurrentMonth(balance.periodYear, balance.periodMonth, today)) {
      continue;
    }
    const currencyFromAccount = accountCurrencies.get(balance.accountId);
    if (!currencyFromAccount) {
      continue;
    }
    const date = endOfMonthIso(balance.periodYear, balance.periodMonth);
    const convertedAmount = await convertAmount(date, balance.amount, currencyFromAccount, currency, cache);
    const key = formatPeriod(balance.periodYear, balance.periodMonth);
    const current = grouped.get(key) ?? { year: balance.periodYear, month: balance.periodMonth, amount: 0 };
    grouped.set(key, { year: balance.periodYear, month: balance.periodMonth, amount: current.amount + convertedAmount });
  }

  const actualPoints = Array.from(grouped.values()).sort((a, b) => {
    if (a.year === b.year) return a.month - b.month;
    return a.year - b.year;
  });

  const points: PlanFactPoint[] = actualPoints.map((item) => ({
    period: formatPeriod(item.year, item.month),
    fact: round2(item.amount),
    plan: null,
  }));

  const lastActual = actualPoints[actualPoints.length - 1];
  const startBalance = lastActual ? lastActual.amount : 0;
  const startMonth = lastActual ? nextMonth(lastActual.year, lastActual.month) : nextMonth(today.getUTCFullYear(), today.getUTCMonth() + 1);
  const { year: endYear, month: endMonth } = parseEndDate(endDate);

  let cursorYear = startMonth.year;
  let cursorMonth = startMonth.month;
  let previousBalance = startBalance;

  while (cursorYear < endYear || (cursorYear === endYear && cursorMonth <= endMonth)) {
    const delta = previousBalance * (annualYield / 12) + monthlyInflow;
    const nextBalance = previousBalance + delta;
    points.push({
      period: formatPeriod(cursorYear, cursorMonth),
      fact: null,
      plan: round2(nextBalance),
    });
    previousBalance = nextBalance;
    const next = nextMonth(cursorYear, cursorMonth);
    cursorYear = next.year;
    cursorMonth = next.month;
  }

  points.sort((a, b) => (a.period > b.period ? 1 : a.period < b.period ? -1 : 0));

  return {
    currency,
    points,
  };
}
