import { api } from './client';

export type DashboardRange = 'all' | '1y' | 'ytd';
export type ReturnMethod = 'simple' | 'twr' | 'mwr';

export interface DashboardPointDto {
  period: string;
  inflow: number;
  equityWithNetFlow: number;
  equityWithoutNetFlow: number;
  netIncome: number;
  returnPct: number | null;
}

export interface DashboardSeriesResponse {
  success: boolean;
  message?: string;
  data?: {
    currency: string;
    range: DashboardRange;
    returnMethod: ReturnMethod;
    from: string | null;
    to: string | null;
    points: DashboardPointDto[];
  };
}

export async function fetchDashboardSeries(currency: string, range: DashboardRange, returnMethod: ReturnMethod) {
  const response = await api.get<DashboardSeriesResponse>('/dashboard/series', {
    params: { currency, range, return_method: returnMethod },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message ?? 'Не удалось загрузить данные');
  }
  return response.data.data;
}
