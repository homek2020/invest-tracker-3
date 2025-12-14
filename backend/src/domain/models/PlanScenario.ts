import { AccountCurrency } from './Account';

export interface PlanScenario {
  id: string;
  userId: string;
  initialAmount: number;
  annualYield: number;
  monthlyInflow: number;
  endDate: string; // YYYY-MM-DD
  currency: AccountCurrency;
  name?: string;
  startDate?: string; // YYYY-MM-DD
}

export type PlanScenarioInput = Omit<PlanScenario, 'id' | 'userId' | 'name'> & {
  id?: string;
  name?: string;
};
