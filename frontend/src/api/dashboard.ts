import { api } from './client';

export type DashboardRange = 'all' | '1y' | 'ytd';

export interface DashboardPointDto {
  period: string;
  inflow: number;
  equityWithNetFlow: number;
  equityWithoutNetFlow: number;
  returnPct: number | null;
}

export interface DashboardSeriesResponse {
  success: boolean;
  data: {
    currency: string;
    range: DashboardRange;
    from: string | null;
    to: string | null;
    points: DashboardPointDto[];
  };
}

export async function fetchDashboardSeries(currency: string, range: DashboardRange) {
  const response = await api.get<DashboardSeriesResponse>('/dashboard/series', {
    params: { currency, range },
  });
  return response.data.data;
}
