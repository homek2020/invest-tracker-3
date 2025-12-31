import { api } from './client';

export interface AccountDto {
  id: string;
  name: string;
  provider: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountAnalyticsPointDto {
  period: string;
  equity: number;
  inflow: number;
  totalInflow: number;
}

export interface AccountAnalyticsDto {
  account: AccountDto;
  currency: string;
  status: string;
  totalEquity: number;
  totalInflow: number;
  firstPeriod: string;
  lastPeriod: string | null;
  points: AccountAnalyticsPointDto[];
}

export async function fetchAccounts() {
  const { data } = await api.get<{ success: boolean; accounts: AccountDto[] }>('/accounts');
  return data.accounts ?? [];
}

export async function createAccount(payload: { name: string; provider: string; currency: string }) {
  const { data } = await api.post<{ success: boolean; account: AccountDto }>('/accounts', payload);
  return data.account;
}

export async function fetchAccountAnalytics(accountId: string) {
  const { data } = await api.get<{ success: boolean; data: AccountAnalyticsDto }>(`/accounts/${accountId}/analytics`);
  return data.data;
}
