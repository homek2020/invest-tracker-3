export enum AccountProvider {
  Finam = 'Finam',
  TradeRepublic = 'TradeRepublic',
  BYBIT = 'BYBIT',
  BCS = 'BCS',
  IBKR = 'IBKR',
  Tinkoff = 'Tinkoff',
}

export enum AccountCurrency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR',
}

export enum AccountStatus {
  Active = 'active',
  Archived = 'archived',
}

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
