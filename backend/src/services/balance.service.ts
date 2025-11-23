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
