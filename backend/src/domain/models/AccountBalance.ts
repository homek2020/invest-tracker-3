export interface AccountBalance {
  id: string;
  accountId: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  netFlow: number;
  isClosed: boolean;
  updatedAt: Date;
}
