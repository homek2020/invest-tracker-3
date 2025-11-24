import { accountRepository } from '../data/repositories/account.repository';
import { AccountCreateDto, AccountUpdateDto } from '../domain/dto/account.dto';
import { Account, AccountProvider, AccountStatus } from '../domain/models/Account';

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
