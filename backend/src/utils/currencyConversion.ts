import { AccountCurrency } from '../domain/models/Account';
import { currencyRateRepository } from '../data/repositories/currencyRate.repository';
import { CurrencyRate } from '../domain/models/CurrencyRate';

export type CurrencyRateLookup = {
  findByDate: (
    date: string,
    baseCurrency: AccountCurrency,
    targetCurrency: AccountCurrency
  ) => Promise<CurrencyRate | null>;
  findLatestOnOrBefore: (
    date: string,
    baseCurrency: AccountCurrency,
    targetCurrency: AccountCurrency
  ) => Promise<CurrencyRate | null>;
  findLatest: () => Promise<CurrencyRate | null>;
};

function toCurrencyKey(date: string, from: AccountCurrency, to: AccountCurrency): string {
  return `${date}:${from}->${to}`;
}

export async function fetchRate(
  date: string,
  from: AccountCurrency,
  to: AccountCurrency,
  repository: CurrencyRateLookup = currencyRateRepository
): Promise<number> {
  if (from === to) return 1;

  const direct = await repository.findByDate(date, from, to);
  if (direct) {
    return direct.rate;
  }

  const inverse = await repository.findByDate(date, to, from);
  if (inverse) {
    return 1 / inverse.rate;
  }

  const latestDirect = await repository.findLatestOnOrBefore(date, from, to);
  if (latestDirect) {
    return latestDirect.rate;
  }

  const latestInverse = await repository.findLatestOnOrBefore(date, to, from);
  if (latestInverse) {
    return 1 / latestInverse.rate;
  }

  const anyRates = await repository.findLatest();
  if (!anyRates) {
    throw new Error('Currency rates are not available');
  }

  throw new Error(`Missing currency rate for ${from}/${to} at ${date}`);
}

export async function convertAmount(
  date: string,
  amount: number,
  from: AccountCurrency,
  to: AccountCurrency,
  cache: Map<string, number>,
  repository: CurrencyRateLookup = currencyRateRepository
): Promise<number> {
  if (from === to) return amount;
  const cacheKey = toCurrencyKey(date, from, to);
  let rate = cache.get(cacheKey);
  if (!rate) {
    rate = await fetchRate(date, from, to, repository);
    cache.set(cacheKey, rate);
  }
  return amount * rate;
}

export type CurrencyRateCache = Map<string, number>;
