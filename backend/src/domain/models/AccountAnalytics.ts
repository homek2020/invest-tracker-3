import { Account, AccountCurrency, AccountStatus } from './Account';

export interface AccountAnalyticsPoint {
  period: string;
  equity: number;
  inflow: number;
  totalInflow: number;
}

export interface AccountAnalytics {
  account: Account;
  currency: AccountCurrency;
  status: AccountStatus;
  totalEquity: number;
  totalInflow: number;
  firstPeriod: string;
  lastPeriod: string | null;
  points: AccountAnalyticsPoint[];
}
