import { balanceRepository } from '../data/repositories/balance.repository';
import { accountRepository } from '../data/repositories/account.repository';
import { BalanceBatchDto } from '../domain/dto/balance.dto';
import { AccountBalance } from '../domain/models/AccountBalance';
import { PeriodSummary } from '../domain/models/PeriodSummary';

function validateValue(value: number, field: string) {
  if (value < 0) {
    throw new Error(`${field} must be non-negative`);
  }
  const rounded = Math.round(value * 100) / 100;
  if (rounded !== value) {
    throw new Error(`${field} must have at most two decimals`);
  }
}

export async function upsertBatch(userId: string, payload: BalanceBatchDto): Promise<AccountBalance[]> {
  const accounts = await accountRepository.findAllByUser(userId);
  const allowedIds = new Set(accounts.map((a) => a.id));
  const accountIds = accounts.map((a) => a.id);
  const periodClosed = await balanceRepository.isPeriodClosed(accountIds, payload.periodYear, payload.periodMonth);
  if (periodClosed) {
    throw new Error('PERIOD_CLOSED');
  }
  const results: AccountBalance[] = [];
  for (const item of payload.balances) {
    if (!allowedIds.has(item.accountId)) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    validateValue(item.amount, 'amount');
    validateValue(item.netFlow, 'netFlow');
    const existing = await balanceRepository.findByAccountAndPeriod(item.accountId, payload.periodYear, payload.periodMonth);
    if (existing?.isClosed) {
      throw new Error('PERIOD_CLOSED');
    }
    const balance = await balanceRepository.upsert({
      accountId: item.accountId,
      amount: item.amount,
      netFlow: item.netFlow,
      periodYear: payload.periodYear,
      periodMonth: payload.periodMonth,
      isClosed: existing?.isClosed ?? false,
    });
    results.push(balance);
  }
  return results;
}

export async function getBalances(userId: string, year: number, month: number): Promise<AccountBalance[]> {
  const accounts = await accountRepository.findAllByUser(userId);
  return balanceRepository.findAllForUser(accounts.map((a) => a.id), year, month);
}

export async function listPeriods(userId: string): Promise<PeriodSummary[]> {
  const accounts = await accountRepository.findAllByUser(userId);
  const periods = await balanceRepository.findPeriods(accounts.map((a) => a.id));
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const withBalances: PeriodSummary[] = periods.map((p) => ({ ...p, hasBalances: true }));
  const existsCurrent = withBalances.some((p) => p.periodYear === currentYear && p.periodMonth === currentMonth);
  if (!existsCurrent) {
    withBalances.push({ periodYear: currentYear, periodMonth: currentMonth, isClosed: false, hasBalances: false });
  }

  return withBalances.sort((a, b) => {
    if (a.periodYear === b.periodYear) {
      return b.periodMonth - a.periodMonth;
    }
    return b.periodYear - a.periodYear;
  });
}

export async function closeMonth(userId: string, year: number, month: number): Promise<void> {
  const accounts = await accountRepository.findAllByUser(userId);
  const accountIds = accounts.map((a) => a.id);
  const balances = await balanceRepository.findAllForUser(accountIds, year, month);
  if (balances.length === 0) {
    throw new Error('NO_BALANCES_FOR_PERIOD');
  }

  const alreadyClosed = balances.every((b) => b.isClosed);
  if (alreadyClosed) {
    throw new Error('PERIOD_ALREADY_CLOSED');
  }

  await balanceRepository.closePeriod(accountIds, year, month);
}
