export interface CurrencyRate {
  id: string;
  date: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  source: string;
  fetchedAt: Date;
}
