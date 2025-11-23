import { currencyRateRepository } from '../data/repositories/currencyRate.repository';
import { CurrencyRate } from '../domain/models/CurrencyRate';

const TRACKED_CURRENCIES = ['USD', 'EUR', 'RUB'];
const MIN_SYNC_DATE = new Date(Date.UTC(2016, 0, 1));

interface CbrValute {
  CharCode: string;
  Nominal: number;
  Value: number;
}

interface CbrResponse {
  Date: string;
  PreviousDate: string;
  Timestamp: string;
  Valute: Record<string, CbrValute>;
}

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

async function fetchCbrRates(targetDate: Date): Promise<CbrResponse> {
  let requestDate = addDays(targetDate, 1);
  const maxAttempts = 7;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const year = requestDate.getUTCFullYear();
    const month = `${requestDate.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${requestDate.getUTCDate()}`.padStart(2, '0');
    const url = `https://www.cbr-xml-daily.ru/archive/${year}/${month}/${day}/daily_json.js`;

    const response = await fetch(url);
    if (response.ok) {
      const payload = (await response.json()) as CbrResponse;
      return payload;
    }

    if (response.status === 404) {
      requestDate = addDays(requestDate, 1);
      continue;
    }

    throw new Error(`Failed to fetch CBR rates: ${response.statusText}`);
  }

  throw new Error(`No CBR rates found near ${formatISODate(targetDate)}`);
}

export async function syncMissingCurrencyRates(): Promise<void> {
  const latest = await currencyRateRepository.findLatest();
  const nextDate = latest ? addDays(parseISODate(latest.date), 1) : MIN_SYNC_DATE;
  const startDate = nextDate < MIN_SYNC_DATE ? MIN_SYNC_DATE : nextDate;
  const today = toStartOfUtcDay(new Date());

  if (startDate > today) {
    return;
  }

  for (let cursor = toStartOfUtcDay(startDate); cursor <= today; cursor = addDays(cursor, 1)) {
    try {
      const payload = await fetchCbrRates(cursor);
      const storeDate = formatISODate(cursor);

      for (const currency of TRACKED_CURRENCIES) {
        const valute = Object.values(payload.Valute).find((item) => item.CharCode === currency);
        const rateValue = currency === 'RUB' ? 1 : valute ? valute.Value / valute.Nominal : null;

        if (rateValue === null) {
          continue;
        }

        await currencyRateRepository.upsert({
          date: storeDate,
          baseCurrency: currency,
          targetCurrency: 'RUB',
          rate: rateValue,
          source: 'cbr.ru',
          fetchedAt: new Date(),
        });
      }
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
  const defaultStart = formatISODate(addDays(today, -30));
  const effectiveStart = startDate ?? defaultStart;
  const clampedStart = parseISODate(effectiveStart) < MIN_SYNC_DATE ? formatISODate(MIN_SYNC_DATE) : effectiveStart;
  const effectiveEnd = endDate ?? formatISODate(today);

  return currencyRateRepository.findBetween(clampedStart, effectiveEnd, baseCurrency);
}
