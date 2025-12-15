import { AccountCurrency } from './Account';

export interface PlanScenario {
  id: string;
  userId: string;
  annualYield: number;
  monthlyInflow: number;
  endDate: string; // YYYY-MM-DD
  currency: AccountCurrency;
  name?: string;
}

export type PlanScenarioInput = Omit<PlanScenario, 'id' | 'userId' | 'name'> & {
  id?: string;
  name?: string;
};
