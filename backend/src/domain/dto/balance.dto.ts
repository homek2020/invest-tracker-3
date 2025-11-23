export interface BalanceBatchItemDto {
  accountId: string;
  amount: number;
  netFlow: number;
}

export interface BalanceBatchDto {
  periodYear: number;
  periodMonth: number;
  balances: BalanceBatchItemDto[];
}
