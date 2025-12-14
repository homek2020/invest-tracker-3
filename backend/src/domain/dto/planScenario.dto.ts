import { AccountCurrency } from '../models/Account';

export interface PlanScenarioDto {
  id: string;
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

export interface PlanScenarioCreateDto extends Omit<PlanScenarioDto, 'id' | 'createdAt' | 'updatedAt'> {}

export interface PlanScenarioUpdateDto extends Partial<PlanScenarioCreateDto> {}
