import { AccountCurrency, AccountProvider, AccountStatus } from '../models/Account';

export interface AccountCreateDto {
  name: string;
  provider: AccountProvider;
  currency: AccountCurrency;
}

export interface AccountUpdateDto {
  name?: string;
  provider?: AccountProvider;
  currency?: AccountCurrency;
  status?: AccountStatus;
}
