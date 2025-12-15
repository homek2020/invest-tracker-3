import { AccountCurrency } from '../domain/models/Account';
import { currencyRateRepository } from '../data/repositories/currencyRate.repository';

function toCurrencyKey(date: string, from: AccountCurrency, to: AccountCurrency): string {
  return `${date}:${from}->${to}`;
}

async function fetchRate(date: string, from: AccountCurrency, to: AccountCurrency): Promise<number> {
  if (from === to) return 1;

  const direct = await currencyRateRepository.findByDate(date, from, to);
  if (direct) {
    return direct.rate;
  }

  const inverse = await currencyRateRepository.findByDate(date, to, from);
  if (inverse) {
    return 1 / inverse.rate;
  }

  const latestDirect = await currencyRateRepository.findLatestOnOrBefore(date, from, to);
  if (latestDirect) {
    return latestDirect.rate;
  }

  const latestInverse = await currencyRateRepository.findLatestOnOrBefore(date, to, from);
  if (latestInverse) {
    return 1 / latestInverse.rate;
  }

  throw new Error(`Missing currency rate for ${from}/${to} at ${date}`);
}

export async function convertAmount(
  date: string,
  amount: number,
  from: AccountCurrency,
  to: AccountCurrency,
  cache: Map<string, number>
): Promise<number> {
  if (from === to) return amount;
  const cacheKey = toCurrencyKey(date, from, to);
  let rate = cache.get(cacheKey);
  if (!rate) {
    rate = await fetchRate(date, from, to);
    cache.set(cacheKey, rate);
  }
  return amount * rate;
}

export type CurrencyRateCache = Map<string, number>;
