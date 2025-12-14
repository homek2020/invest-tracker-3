import { api } from './client';

export interface PlanFactPointDto {
  period: string;
  fact: number | null;
  plan: number | null;
}

export interface PlanFactSeriesResponse {
  success: boolean;
  message?: string;
  data?: {
    currency: string;
    points: PlanFactPointDto[];
  };
}

function ensurePlanFactData(response: PlanFactSeriesResponse) {
  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Не удалось загрузить данные');
  }
  return response.data;
}

export async function fetchPlanFactSeriesById(id: string) {
  const response = await api.get<PlanFactSeriesResponse>(`/plan-scenarios/${id}/series`);
  return ensurePlanFactData(response.data);
}

export async function fetchPlanFactSeriesAdhoc(params: {
  annualYield: number;
  monthlyInflow: number;
  endDate: string;
  currency: string;
}) {
  const response = await api.get<PlanFactSeriesResponse>('/plan-scenarios/series', {
    params: {
      annual_yield: params.annualYield,
      monthly_inflow: params.monthlyInflow,
      end_date: params.endDate,
      currency: params.currency,
    },
  });
  return ensurePlanFactData(response.data);
}
