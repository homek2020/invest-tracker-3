import { currencyRateRepository } from '../data/repositories/currencyRate.repository';
import { CurrencyRate } from '../domain/models/CurrencyRate';

const BASE_CURRENCIES = ['USD', 'EUR'];
const TARGET_CURRENCY = 'RUB';
const MIN_SYNC_DATE = new Date(Date.UTC(2016, 0, 1));
const MAX_SYNC_LOOKBACK_DAYS = 5;

interface CbrValute {
  CharCode: string;
  Nominal: number;
  Value: number;
}

interface CbrResponse {
  date: Date;
  valutes: Record<string, CbrValute>;
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

function formatCbrDate(date: Date): string {
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const year = `${date.getUTCFullYear()}`;
  return `${day}/${month}/${year}`;
}

function parseCbrXml(xml: string): CbrResponse {
  const dateMatch = xml.match(/Date="(\d{2})\.(\d{2})\.(\d{4})"/);
  if (!dateMatch) {
    throw new Error('CBR response missing date attribute');
  }
  const [, day, month, year] = dateMatch;
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  const valutes: Record<string, CbrValute> = {};
  const valuteRegex = /<Valute[^>]*>(.*?)<\/Valute>/gms;
  let match: RegExpExecArray | null;
  while ((match = valuteRegex.exec(xml))) {
    const block = match[1];
    const codeMatch = block.match(/<CharCode>([A-Z]{3})<\/CharCode>/);
    const nominalMatch = block.match(/<Nominal>(\d+)<\/Nominal>/);
    const valueMatch = block.match(/<Value>([\d,\.]+)<\/Value>/);
    if (!codeMatch || !nominalMatch || !valueMatch) {
      continue;
    }
    const code = codeMatch[1];
    const nominal = Number(nominalMatch[1]);
    const rawValue = valueMatch[1].replace(',', '.');
    const value = Number(rawValue);
    if (Number.isNaN(value) || Number.isNaN(nominal)) {
      continue;
    }
    valutes[code] = { CharCode: code, Nominal: nominal, Value: value };
  }

  return { date: parsedDate, valutes };
}

async function fetchCbrRates(targetDate: Date): Promise<CbrResponse> {
  let requestDate = addDays(targetDate, 1);
  const maxAttempts = 7;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = `https://cbr.ru/scripts/XML_daily.asp?date_req=${formatCbrDate(requestDate)}`;
    const response = await fetch(url);

    if (response.ok) {
      const payload = parseCbrXml(await response.text());
      return payload;
    }

    requestDate = addDays(requestDate, 1);
  }

  throw new Error(`No CBR rates found near ${formatISODate(targetDate)}`);
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
    const storeDate = formatISODate(cursor);
    const existing = await currencyRateRepository.findBetween(storeDate, storeDate);
    const hasAllPairs = [
      { base: 'USD', target: TARGET_CURRENCY },
      { base: 'EUR', target: TARGET_CURRENCY },
      { base: 'EUR', target: 'USD' },
    ].every(({ base, target }) => existing.some((rate) => rate.baseCurrency === base && rate.targetCurrency === target));

    if (hasAllPairs) {
      continue;
    }

    try {
      const cbrResponse = await fetchCbrRates(cursor);

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
          source: 'cbr.ru',
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
          source: 'derived:cbr.ru',
          fetchedAt: new Date(),
        });
      }

      await Promise.all(upserts.map((item) => currencyRateRepository.upsert(item)));
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

  await deriveAndStoreEurUsd(clampedStart, effectiveEnd);

  return currencyRateRepository.findBetween(clampedStart, effectiveEnd, baseCurrency);
}
