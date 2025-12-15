import assert from 'node:assert/strict';
import test from 'node:test';

import { AccountCurrency } from '../src/domain/models/Account';
import { CurrencyRate } from '../src/domain/models/CurrencyRate';
import { convertAmount, CurrencyRateLookup, fetchRate } from '../src/utils/currencyConversion';

const baseRate: CurrencyRate = {
  id: 'latest',
  date: '2024-05-01',
  baseCurrency: AccountCurrency.USD,
  targetCurrency: AccountCurrency.RUB,
  rate: 90,
  source: 'test',
  fetchedAt: new Date(),
};

test('uses the latest available rate for future dates', async () => {
  const lookups: CurrencyRateLookup = {
    findByDate: async () => null,
    findLatestOnOrBefore: async (date: string, base: AccountCurrency, target: AccountCurrency) => {
      if (base === AccountCurrency.USD && target === AccountCurrency.RUB) {
        return { ...baseRate, date };
      }
      return null;
    },
    findLatest: async () => baseRate,
  };

  const cache = new Map<string, number>();
  const converted = await convertAmount(
    '2025-12-31',
    200,
    AccountCurrency.USD,
    AccountCurrency.RUB,
    cache,
    lookups
  );

  assert.equal(converted, 200 * baseRate.rate);
  assert.equal(cache.get('2025-12-31:USD->RUB'), baseRate.rate);
});

test('throws clear error when no currency rates are stored', async () => {
  const emptyLookup: CurrencyRateLookup = {
    findByDate: async () => null,
    findLatestOnOrBefore: async () => null,
    findLatest: async () => null,
  };

  await assert.rejects(fetchRate('2024-01-01', AccountCurrency.USD, AccountCurrency.RUB, emptyLookup), {
    message: 'Currency rates are not available',
  });
});
