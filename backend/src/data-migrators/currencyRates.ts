import fs from 'fs';
import path from 'path';
import { currencyRateRepository } from '../data/repositories/currencyRate.repository';

function parseDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const dotParts = trimmed.split('.');
  if (dotParts.length === 3) {
    const [day, month, year] = dotParts.map(Number);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function parsePair(raw: string): { base: string; target: string } | null {
  const cleaned = raw.replace(/\s+/g, '').toUpperCase();
  if (!cleaned) return null;

  if (cleaned.includes('/')) {
    const [base, target] = cleaned.split('/');
    if (base && target) return { base, target };
  }

  if (cleaned.includes('-')) {
    const [base, target] = cleaned.split('-');
    if (base && target) return { base, target };
  }

  if (cleaned.length === 6) {
    return { base: cleaned.slice(0, 3), target: cleaned.slice(3) };
  }

  return null;
}

export async function importCurrencyRatesFromCsv(filePath: string): Promise<number> {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  let processed = 0;

  for (const line of lines) {
    const [dateRaw, pairRaw, rateRaw] = line.split(',');
    const parsedDate = parseDate(dateRaw ?? '');
    const pair = parsePair(pairRaw ?? '');
    const rate = Number((rateRaw ?? '').replace(',', '.'));

    if (!parsedDate || !pair || Number.isNaN(rate)) {
      console.warn(`Skipping malformed line: ${line}`);
      continue;
    }

    if (pair.base === pair.target) {
      console.warn(`Skipping self-referential pair on ${parsedDate}: ${pair.base}${pair.target}`);
      continue;
    }

    await currencyRateRepository.upsert({
      date: parsedDate,
      baseCurrency: pair.base,
      targetCurrency: pair.target,
      rate,
      source: 'csv-import',
      fetchedAt: new Date(),
    });
    processed += 1;
  }

  return processed;
}
