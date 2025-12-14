import { api } from './client';

export type AccountCurrency = 'RUB' | 'USD' | 'EUR';

export interface PlanFactPointDto {
  period: string;
  fact: number | null;
  plan: number | null;
}

export interface PlanFactSeriesResponse {
  success: boolean;
  data: {
    currency: AccountCurrency;
    points: PlanFactPointDto[];
  };
}

export interface PlanScenarioParams {
  annualYield: number;
  monthlyInflow: number;
  endDate: string;
  currency: AccountCurrency;
  startDate?: string;
}

export async function fetchPlanFactSeriesById(id: string) {
  const response = await api.get<PlanFactSeriesResponse>(`/plan-scenarios/${id}/series`);
  return response.data.data;
}

export async function fetchPlanFactSeries(params: PlanScenarioParams) {
  const response = await api.get<PlanFactSeriesResponse>('/plan-scenarios/series', {
    params: {
      annual_yield: params.annualYield,
      monthly_inflow: params.monthlyInflow,
      end_date: params.endDate,
      start_date: params.startDate,
      currency: params.currency,
    },
  });
  return response.data.data;
}
