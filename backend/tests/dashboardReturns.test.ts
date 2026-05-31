import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRange, computeNetIncome, computeReturns } from '../src/services/dashboard.service';

test('computes MWR instead of returning nulls', () => {
  const points = computeNetIncome([
    { period: '2024-01', inflow: 0, totalEquity: 100 },
    { period: '2024-02', inflow: 0, totalEquity: 110 },
    { period: '2024-03', inflow: 0, totalEquity: 121 },
  ]);

  assert.deepEqual(computeReturns(points, 'mwr'), [null, 10, 21]);
});

test('MWR excludes the ending month net flow from investment return', () => {
  const points = computeNetIncome([
    { period: '2024-01', inflow: 0, totalEquity: 100 },
    { period: '2024-02', inflow: 50, totalEquity: 165 },
  ]);

  assert.deepEqual(computeReturns(points, 'mwr'), [null, 15]);
});

test('TWR is calculated from the selected range baseline', () => {
  const allPoints = [
    { period: '2023-12', inflow: 0, totalEquity: 100 },
    { period: '2024-01', inflow: 0, totalEquity: 200 },
    { period: '2024-02', inflow: 0, totalEquity: 220 },
  ];

  const rangedPoints = computeNetIncome(buildRange(allPoints, 'ytd'));

  assert.deepEqual(computeReturns(rangedPoints, 'twr'), [null, 10]);
});
