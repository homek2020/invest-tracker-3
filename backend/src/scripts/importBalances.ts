import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectMongo } from '../data/connection';
import { importBalancesFromCsv } from '../data-migrators/balances';

async function runImportBalancesCLI() {
  const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
  const filePath = fileArg ? fileArg.split('=')[1] : process.argv[2];

  if (!filePath) {
    console.error('Usage: ts-node src/scripts/importBalances.ts --file=path/to/file.csv');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  await connectMongo();

  const processed = await importBalancesFromCsv(resolved);
  await mongoose.disconnect();
  console.log(`Imported ${processed} balance entries from ${resolved}`);
}

runImportBalancesCLI().catch((error) => {
  console.error('Failed to import balances from CSV', error);
  mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
