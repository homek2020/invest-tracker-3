import { api } from './client';

export interface BalanceResponse {
  id: string;
  accountId: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  netFlow: number;
  isClosed: boolean;
  updatedAt: string;
}

export interface BalancePeriod {
  periodYear: number;
  periodMonth: number;
  isClosed: boolean;
}

export interface BalanceBatchItemPayload {
  accountId: string;
  amount: number;
  netFlow: number;
}

export async function fetchBalances(periodYear: number, periodMonth: number): Promise<BalanceResponse[]> {
  const response = await api.get<{ success: boolean; balances: BalanceResponse[] }>('/balances', {
    params: { period_year: periodYear, period_month: periodMonth },
  });
  return response.data.balances;
}

export async function saveBalances(periodYear: number, periodMonth: number, balances: BalanceBatchItemPayload[]): Promise<void> {
  await api.post('/balances/batch', {
    periodYear,
    periodMonth,
    balances,
  });
}

export async function closeMonth(periodYear: number, periodMonth: number): Promise<{
  closedPeriod: { periodYear: number; periodMonth: number };
  nextPeriod: { periodYear: number; periodMonth: number };
}> {
  const response = await api.post('/balances/close', { periodYear, periodMonth });
  return response.data;
}

export async function fetchPeriods(): Promise<BalancePeriod[]> {
  const response = await api.get<{ success: boolean; periods: BalancePeriod[] }>('/balances/periods');
  return response.data.periods;
}
