import { api } from './client';
import { DashboardRange, DashboardSeriesResponse } from './dashboard';

export type AccountStatus = 'active' | 'archived';
export type AccountProvider = 'Finam' | 'TradeRepublic' | 'BYBIT' | 'BCS' | 'IBKR' | 'Tinkoff';
export type AccountCurrency = 'RUB' | 'USD' | 'EUR';

export interface AccountDto {
  id: string;
  userId: string;
  name: string;
  provider: AccountProvider;
  currency: AccountCurrency;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

interface AccountsResponse {
  success: boolean;
  accounts: AccountDto[];
}

export async function fetchAccounts() {
  const response = await api.get<AccountsResponse>('/accounts');
  return response.data.accounts;
}

export async function fetchAccountSeries(accountId: string, range: DashboardRange = 'all') {
  const response = await api.get<DashboardSeriesResponse>(`/accounts/${accountId}/series`, {
    params: { range },
  });
  return response.data.data;
}
