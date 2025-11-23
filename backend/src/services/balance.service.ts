import { balanceRepository } from '../data/repositories/balance.repository';
import { accountRepository } from '../data/repositories/account.repository';
import { BalanceBatchDto } from '../domain/dto/balance.dto';
import { AccountBalance } from '../domain/models/AccountBalance';

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
      isClosed: false,
    });
    results.push(balance);
  }
  return results;
}

export async function getBalances(userId: string, year: number, month: number): Promise<AccountBalance[]> {
  const accounts = await accountRepository.findAllByUser(userId);
  return balanceRepository.findAllForUser(accounts.map((a) => a.id), year, month);
}

export async function closeMonth(
  userId: string,
  periodYear: number,
  periodMonth: number
): Promise<{ closedPeriod: { periodYear: number; periodMonth: number }; nextPeriod: { periodYear: number; periodMonth: number } }>
{
  const accounts = await accountRepository.findAllByUser(userId);
  const nextDate = new Date(periodYear, periodMonth, 1);
  const nextPeriod = { periodYear: nextDate.getFullYear(), periodMonth: nextDate.getMonth() + 1 };

  for (const account of accounts) {
    const existing = await balanceRepository.findByAccountAndPeriod(account.id, periodYear, periodMonth);
    if (existing?.isClosed) {
      throw new Error('PERIOD_ALREADY_CLOSED');
    }
    const amount = existing?.amount ?? 0;
    const netFlow = existing?.netFlow ?? 0;
    await balanceRepository.upsert({
      accountId: account.id,
      amount,
      netFlow,
      periodYear,
      periodMonth,
      isClosed: true,
    });

    const nextBalance = await balanceRepository.findByAccountAndPeriod(
      account.id,
      nextPeriod.periodYear,
      nextPeriod.periodMonth
    );
    if (!nextBalance) {
      await balanceRepository.upsert({
        accountId: account.id,
        amount,
        netFlow: 0,
        periodYear: nextPeriod.periodYear,
        periodMonth: nextPeriod.periodMonth,
        isClosed: false,
      });
    }
  }

  return { closedPeriod: { periodYear, periodMonth }, nextPeriod };
}

export async function listPeriods(
  userId: string
): Promise<{ periodYear: number; periodMonth: number; isClosed: boolean }[]> {
  const accounts = await accountRepository.findAllByUser(userId);
  const periods = await balanceRepository.listPeriodsForUser(accounts.map((a) => a.id));
  if (periods.length > 0) {
    return periods;
  }
  const now = new Date();
  return [
    {
      periodYear: now.getFullYear(),
      periodMonth: now.getMonth() + 1,
      isClosed: false,
    },
  ];
}
