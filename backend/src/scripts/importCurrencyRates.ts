import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectMongo } from '../data/connection';
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

async function run() {
  const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
  const filePath = fileArg ? fileArg.split('=')[1] : process.argv[2];

  if (!filePath) {
    console.error('Usage: ts-node src/scripts/importCurrencyRates.ts --file=path/to/file.csv');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  await connectMongo();

  const content = fs.readFileSync(resolved, 'utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
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

  await mongoose.disconnect();
  console.log(`Imported ${processed} rate entries from ${resolved}`);
}

run().catch((error) => {
  console.error('Failed to import currency rates from CSV', error);
  mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
