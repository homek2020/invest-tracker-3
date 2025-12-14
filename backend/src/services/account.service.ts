import { accountRepository } from '../data/repositories/account.repository';
import { AccountCreateDto, AccountUpdateDto } from '../domain/dto/account.dto';
import { Account, AccountProvider, AccountStatus } from '../domain/models/Account';
import { AccountAnalytics } from '../domain/models/AccountAnalytics';
import { balanceRepository } from '../data/repositories/balance.repository';

export async function listAccounts(userId: string): Promise<Account[]> {
  return accountRepository.findAllByUser(userId);
}

export async function createAccount(userId: string, dto: AccountCreateDto): Promise<Account> {
  return accountRepository.create(userId, { ...dto, status: AccountStatus.Active } as Account);
}

export async function updateAccount(userId: string, accountId: string, dto: AccountUpdateDto): Promise<Account | null> {
  return accountRepository.updateForUser(accountId, userId, dto as Account);
}

export async function deleteAccount(userId: string, accountId: string): Promise<boolean> {
  return accountRepository.deleteForUser(accountId, userId);
}

function formatPeriod(year: number, month: number): string {
  return `${year}-${`${month}`.padStart(2, '0')}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getAccountAnalytics(userId: string, accountId: string): Promise<AccountAnalytics | null> {
  const account = await accountRepository.findByIdForUser(accountId, userId);
  if (!account) {
    return null;
  }

  const balances = await balanceRepository.findAllForUserAllPeriods([account.id]);

  if (balances.length === 0) {
    const createdDate = account.createdAt instanceof Date ? account.createdAt : new Date(account.createdAt);
    const fallbackPeriod = formatPeriod(createdDate.getUTCFullYear(), createdDate.getUTCMonth() + 1);

    return {
      account,
      currency: account.currency,
      status: account.status,
      totalEquity: 0,
      totalInflow: 0,
      firstPeriod: fallbackPeriod,
      lastPeriod: account.status === AccountStatus.Active ? null : fallbackPeriod,
      points: [],
    };
  }

  let cumulativeInflow = 0;
  const points = balances.map((balance) => {
    cumulativeInflow += balance.netFlow;
    return {
      period: formatPeriod(balance.periodYear, balance.periodMonth),
      equity: round2(balance.amount),
      inflow: round2(balance.netFlow),
      totalInflow: round2(cumulativeInflow),
    };
  });

  const lastBalance = balances[balances.length - 1];

  return {
    account,
    currency: account.currency,
    status: account.status,
    totalEquity: round2(lastBalance.amount),
    totalInflow: round2(cumulativeInflow),
    firstPeriod: formatPeriod(balances[0].periodYear, balances[0].periodMonth),
    lastPeriod:
      account.status === AccountStatus.Active
        ? null
        : formatPeriod(lastBalance.periodYear, lastBalance.periodMonth),
    points,
  };
}
