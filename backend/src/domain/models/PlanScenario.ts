import { AccountCurrency } from './Account';

export interface PlanScenario {
  id: string;
  userId: string;
  name: string;
  currency: AccountCurrency | string;
  startYear: number;
  startMonth: number;
  initialAmount: number;
  annualReturnPct: number;
  monthlyInflow: number;
  endMonth?: number;
  endYear?: number;
  createdAt: Date;
  updatedAt: Date;
}
