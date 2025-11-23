import { api } from './client';

export interface AccountResponse {
  id: string;
  name: string;
  provider: string;
  currency: string;
  status: 'active' | 'archived';
}

export async function fetchAccounts(): Promise<AccountResponse[]> {
  const response = await api.get<{ success: boolean; accounts: AccountResponse[] }>('/accounts');
  return response.data.accounts;
}
