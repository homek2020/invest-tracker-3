import fs from 'fs';
import path from 'path';
import { accountRepository } from '../data/repositories/account.repository';
import { balanceRepository } from '../data/repositories/balance.repository';
import { userRepository } from '../data/repositories/user.repository';

interface BalanceCsvRow {
  year: number;
  month: number;
  email: string;
  accountName: string;
  amount: number | null;
  netFlow: number | null;
}

function normalizeNumber(raw: string): number | null {
  const normalized = raw.replace(',', '.').trim();
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseInteger(raw: string): number | null {
  const value = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function parseBalanceLine(line: string): BalanceCsvRow | null {
  const parts = line.split(/[,;]/).map((part) => part.trim());
  if (parts.length < 6) {
    return null;
  }

  const [yearRaw, monthRaw, emailRaw, accountNameRaw, amountRaw, netFlowRaw] = parts;
  const year = parseInteger(yearRaw);
  const month = parseInteger(monthRaw);
  const amount = normalizeNumber(amountRaw);
  const netFlow = normalizeNumber(netFlowRaw);

  if (!year || !month || !emailRaw || !accountNameRaw) {
    return null;
  }

  return {
    year,
    month,
    email: emailRaw,
    accountName: accountNameRaw,
    amount,
    netFlow,
  };
}

async function resolveUserId(email: string, cache: Map<string, string | null>): Promise<string | null> {
  if (cache.has(email)) {
    return cache.get(email) ?? null;
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    console.warn(`User not found for email: ${email}`);
    cache.set(email, null);
    return null;
  }

  cache.set(email, user.id);
  return user.id;
}

async function resolveAccountId(
  userId: string,
  accountName: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  const key = `${userId}::${accountName}`;
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const account = await accountRepository.findByNameForUser(userId, accountName);
  if (!account) {
    console.warn(`Account "${accountName}" was not found for user ${userId}`);
    cache.set(key, null);
    return null;
  }

  cache.set(key, account.id);
  return account.id;
}

export async function importBalancesFromCsv(filePath: string): Promise<number> {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const lines = fs.readFileSync(resolved, 'utf-8').split(/\r?\n/).filter((line) => line.trim());
  let processed = 0;

  const userCache = new Map<string, string | null>();
  const accountCache = new Map<string, string | null>();

  for (const [index, line] of lines.entries()) {
    const parsed = parseBalanceLine(line);
    if (!parsed) {
      console.warn(`Skipping malformed line ${index + 1}: ${line}`);
      continue;
    }

    const userId = await resolveUserId(parsed.email, userCache);
    if (!userId) {
      continue;
    }

    const accountId = await resolveAccountId(userId, parsed.accountName, accountCache);
    if (!accountId) {
      continue;
    }

    if (parsed.amount === null || parsed.netFlow === null) {
      console.warn(`Amount or NetFlow is missing for line ${index + 1}`);
      continue;
    }

    const amount = parsed.amount as number;
    const netFlow = parsed.netFlow as number;

    await balanceRepository.upsert({
      accountId,
      periodYear: parsed.year,
      periodMonth: parsed.month,
      amount,
      netFlow,
      isClosed: false,
    });

    processed += 1;
  }

  return processed;
}
