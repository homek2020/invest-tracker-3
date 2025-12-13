import { fetchCbrRates, CbrResponse } from '../clients/cbr.client';
import { currencyRateRepository } from '../data/repositories/currencyRate.repository';
import { CurrencyRate } from '../domain/models/CurrencyRate';

const BASE_CURRENCIES = ['USD', 'EUR'];
const TARGET_CURRENCY = 'RUB';
const MIN_SYNC_DATE = new Date(Date.UTC(2016, 0, 1));
const MAX_SYNC_LOOKBACK_DAYS = 5;
const MAX_REQUEST_RANGE_DAYS = 7;

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function toStartOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

function buildUpserts(storeDate: string, cbrResponse: CbrResponse, sourceLabel: string): Array<Omit<CurrencyRate, 'id'>> {
  const upserts: Array<Omit<CurrencyRate, 'id'>> = [];
  const usd = cbrResponse.valutes['USD'];
  const eur = cbrResponse.valutes['EUR'];

  for (const code of BASE_CURRENCIES) {
    const valute = cbrResponse.valutes[code];
    if (!valute) {
      continue;
    }

    const rateValue = valute.Value / valute.Nominal;
    upserts.push({
      date: storeDate,
      baseCurrency: code,
      targetCurrency: TARGET_CURRENCY,
      rate: rateValue,
      source: sourceLabel,
      fetchedAt: new Date(),
    });
  }

  if (usd && eur) {
    const usdRate = usd.Value / usd.Nominal;
    const eurRate = eur.Value / eur.Nominal;
    const eurUsdRate = eurRate / usdRate;
    upserts.push({
      date: storeDate,
      baseCurrency: 'EUR',
      targetCurrency: 'USD',
      rate: eurUsdRate,
      source: `derived:${sourceLabel}`,
      fetchedAt: new Date(),
    });
  }

  return upserts;
}

async function ensureRatesForDate(cursor: Date): Promise<void> {
  const storeDate = formatISODate(cursor);
  const existing = await currencyRateRepository.findBetween(storeDate, storeDate);
  const hasAllPairs = [
    { base: 'USD', target: TARGET_CURRENCY },
    { base: 'EUR', target: TARGET_CURRENCY },
    { base: 'EUR', target: 'USD' },
  ].every(({ base, target }) => existing.some((rate) => rate.baseCurrency === base && rate.targetCurrency === target));

  if (hasAllPairs) {
    return;
  }

  const cbrResponse = await fetchCbrRates(cursor);
  const upserts = buildUpserts(storeDate, cbrResponse, 'cbr.ru');
  await Promise.all(upserts.map((item) => currencyRateRepository.upsert(item)));
}

async function ensureRatesForRange(start: Date, end: Date): Promise<void> {
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    await ensureRatesForDate(cursor);
  }
}

async function deriveAndStoreEurUsd(startDate: string, endDate: string): Promise<void> {
  const rates = await currencyRateRepository.findBetween(startDate, endDate);
  const grouped = new Map<string, CurrencyRate[]>();

  for (const rate of rates) {
    const list = grouped.get(rate.date) ?? [];
    list.push(rate);
    grouped.set(rate.date, list);
  }

  const upserts: Array<Omit<CurrencyRate, 'id'>> = [];

  const EPSILON = 1e-9;

  for (const [date, entries] of grouped.entries()) {
    const eurRub = entries.find((item) => item.baseCurrency === 'EUR' && item.targetCurrency === 'RUB');
    const usdRub = entries.find((item) => item.baseCurrency === 'USD' && item.targetCurrency === 'RUB');

    if (!eurRub || !usdRub) {
      continue;
    }

    const derivedRate = eurRub.rate / usdRub.rate;
    const currentEurUsd = entries.find((item) => item.baseCurrency === 'EUR' && item.targetCurrency === 'USD');

    if (!currentEurUsd || Math.abs(currentEurUsd.rate - derivedRate) > EPSILON) {
      upserts.push({
        date,
        baseCurrency: 'EUR',
        targetCurrency: 'USD',
        rate: derivedRate,
        source: 'derived:stored',
        fetchedAt: new Date(),
      });
    }
  }

  if (upserts.length > 0) {
    await Promise.all(upserts.map((item) => currencyRateRepository.upsert(item)));
  }
}

export async function syncMissingCurrencyRates(): Promise<void> {
  const today = toStartOfUtcDay(new Date());
  const latest = await currencyRateRepository.findLatest();
  const latestDate = latest ? parseISODate(latest.date) : MIN_SYNC_DATE;
  const maxLookback = addDays(today, -MAX_SYNC_LOOKBACK_DAYS + 1);
  const startDate = toStartOfUtcDay(
    latestDate > maxLookback ? addDays(latestDate, 1) : maxLookback < MIN_SYNC_DATE ? MIN_SYNC_DATE : maxLookback
  );

  if (startDate > today) {
    return;
  }

  for (let cursor = startDate; cursor <= today; cursor = addDays(cursor, 1)) {
    try {
      await ensureRatesForDate(cursor);
    } catch (error) {
      console.error(`Currency rate sync failed for ${formatISODate(cursor)}`, error);
    }
  }
}

export async function getRates(
  startDate?: string,
  endDate?: string,
  baseCurrency?: string
): Promise<CurrencyRate[]> {
  const today = toStartOfUtcDay(new Date());
  const defaultStart = formatISODate(addDays(today, -(MAX_REQUEST_RANGE_DAYS - 1)));
  const effectiveStart = startDate ?? defaultStart;
  const clampedStart = parseISODate(effectiveStart) < MIN_SYNC_DATE ? formatISODate(MIN_SYNC_DATE) : effectiveStart;
  const effectiveEnd = endDate ?? formatISODate(today);

  const parsedStart = parseISODate(clampedStart);
  const parsedEnd = parseISODate(effectiveEnd);

  if (parsedStart > parsedEnd) {
    throw new Error('Invalid date interval');
  }

  if (daysBetweenInclusive(parsedStart, parsedEnd) > MAX_REQUEST_RANGE_DAYS) {
    throw new Error('Уменьшите интервал запроса');
  }

  await ensureRatesForRange(parsedStart, parsedEnd);
  await deriveAndStoreEurUsd(clampedStart, effectiveEnd);

  const results = await currencyRateRepository.findBetween(clampedStart, effectiveEnd, baseCurrency);
  return results.filter((rate) => rate.baseCurrency !== rate.targetCurrency);
}
