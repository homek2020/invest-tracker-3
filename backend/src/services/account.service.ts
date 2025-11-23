import { accountRepository } from '../data/repositories/account.repository';
import { AccountCreateDto, AccountUpdateDto } from '../domain/dto/account.dto';
import { Account } from '../domain/models/Account';

export async function listAccounts(userId: string): Promise<Account[]> {
  return accountRepository.findAllByUser(userId);
}

export async function createAccount(userId: string, dto: AccountCreateDto): Promise<Account> {
  if (!dto.name.trim()) {
    throw new Error('Name is required');
  }
  return accountRepository.create(userId, { ...dto, status: 'active' } as Account);
}

export async function updateAccount(accountId: string, dto: AccountUpdateDto): Promise<Account | null> {
  return accountRepository.update(accountId, dto as Account);
}

export async function deleteAccount(accountId: string): Promise<void> {
  await accountRepository.delete(accountId);
}
