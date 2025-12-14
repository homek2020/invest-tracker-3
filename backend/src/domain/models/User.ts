import { AccountCurrency } from './Account';
import { DashboardRange } from './Dashboard';

export type ReportingPeriod = DashboardRange;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
