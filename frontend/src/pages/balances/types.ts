export interface Account {
  id: string;
  name: string;
  provider: string;
  currency: string;
  status: string;
  updatedAt: string;
}

export interface PeriodInfo {
  periodYear: number;
  periodMonth: number;
  isClosed: boolean;
  hasBalances: boolean;
}

export interface BalanceRow {
  accountId: string;
  accountName: string;
  currency: string;
  provider: string;
  amount: string;
  netFlow: string;
  previousAmount: string;
  hasPrevious: boolean;
  missingBalance: boolean;
}
