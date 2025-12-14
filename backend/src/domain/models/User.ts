import { AccountCurrency } from './Account';
import { DashboardRange } from './Dashboard';

export type ReportingPeriod = DashboardRange;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  settings?: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  displayCurrency?: string;
  theme?: 'light' | 'dark';
  reportingCurrency?: AccountCurrency;
  reportingPeriod?: ReportingPeriod;
}
