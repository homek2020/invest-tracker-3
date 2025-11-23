export type AccountProvider = 'Finam' | 'TradeRepublic' | 'BYBIT' | 'BCS' | 'IBKR';
export type AccountCurrency = 'RUB' | 'USD' | 'EUR';
export type AccountStatus = 'active' | 'archived';

export interface Account {
  id: string;
  userId: string;
  name: string;
  provider: AccountProvider;
  currency: AccountCurrency;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}
