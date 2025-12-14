import { AccountCurrency } from './Account';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  settings?: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

export type ReportingPeriod = 'all' | '1y' | 'ytd';

export interface UserSettings {
  theme?: 'light' | 'dark';
  reportingCurrency?: AccountCurrency;
  reportingPeriod?: ReportingPeriod;
}
