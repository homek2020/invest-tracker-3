/**
 * Unit tests for the pure calculation functions in dashboard.service.
 *
 * Covers:
 *  - computeNetIncome
 *  - computeReturns (simple + twr)
 *  - getRangeStartIndex
 *  - end-to-end: correct period-relative netIncome and returnPct for 1y / ytd
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNetIncome,
  computeReturns,
  getRangeStartIndex,
} from '../src/services/dashboard.service';

// ---------------------------------------------------------------------------
// computeNetIncome
// ---------------------------------------------------------------------------

test('computeNetIncome: single point – netIncome equals equity minus its own inflow', () => {
  const result = computeNetIncome([{ period: '2024-01', inflow: 100, totalEquity: 100 }]);
  assert.equal(result[0].netIncome, 0);
});

test('computeNetIncome: pure growth, no additional inflows', () => {
  const points = [
    { period: '2024-01', inflow: 1000, totalEquity: 1000 },
    { period: '2024-02', inflow: 0,    totalEquity: 1100 },
    { period: '2024-03', inflow: 0,    totalEquity: 1200 },
  ];
  const result = computeNetIncome(points);
  assert.equal(result[0].netIncome, 0);    // 1000 - 1000
  assert.equal(result[1].netIncome, 100);  // 1100 - 1000
  assert.equal(result[2].netIncome, 200);  // 1200 - 1000
});

test('computeNetIncome: deposit in month 2 does not inflate netIncome', () => {
  const points = [
    { period: '2024-01', inflow: 1000, totalEquity: 1000 },
    { period: '2024-02', inflow: 500,  totalEquity: 1600 }, // deposited 500, grew 100
    { period: '2024-03', inflow: 0,    totalEquity: 1700 }, // grew another 100
  ];
  const result = computeNetIncome(points);
  assert.equal(result[0].netIncome, 0);    // 1000 - 1000
  assert.equal(result[1].netIncome, 100);  // 1600 - 1500
  assert.equal(result[2].netIncome, 200);  // 1700 - 1500
});

test('computeNetIncome: withdrawal reduces cumulative netFlow', () => {
  const points = [
    { period: '2024-01', inflow: 1000,  totalEquity: 1000 },
    { period: '2024-02', inflow: -200,  totalEquity: 830 }, // withdrew 200, lost 30
    { period: '2024-03', inflow: 0,     totalEquity: 830 },
  ];
  const result = computeNetIncome(points);
  assert.equal(result[0].netIncome, 0);    // 1000 - 1000
  assert.equal(result[1].netIncome, 30);   // 830 - (1000-200) = 830 - 800 = 30
  assert.equal(result[2].netIncome, 30);   // 830 - 800
});

// ---------------------------------------------------------------------------
// computeReturns – simple method
// ---------------------------------------------------------------------------

test('computeReturns simple: first point is always null', () => {
  const points = [{ inflow: 1000, totalEquity: 1000, netIncome: 0 }];
  const result = computeReturns(points, 'simple');
  assert.equal(result[0], null);
});

test('computeReturns simple: 10% pure growth, no cash flow', () => {
  const points = [
    { inflow: 1000, totalEquity: 1000, netIncome: 0 },
    { inflow: 0,    totalEquity: 1100, netIncome: 100 },
  ];
  const result = computeReturns(points, 'simple');
  assert.equal(result[1], 10); // (1100-1000-0)/1000 * 100
});

test('computeReturns simple: deposit in same month does NOT inflate return', () => {
  // Bug that was fixed: old code returned (1600-1000)/1000 = 60%, correct is 10%
  const points = [
    { inflow: 1000, totalEquity: 1000, netIncome: 0 },
    { inflow: 500,  totalEquity: 1600, netIncome: 100 }, // 500 deposit + 100 growth
  ];
  const result = computeReturns(points, 'simple');
  // periodIncome = 1600 - 1000 - 500 = 100; return = 100/1000 = 10%
  assert.equal(result[1], 10);
});

test('computeReturns simple: withdrawal does not deflate return', () => {
  const points = [
    { inflow: 1000,  totalEquity: 1000, netIncome: 0 },
    { inflow: -200,  totalEquity: 830,  netIncome: 30 }, // withdrew 200, gained 30
  ];
  const result = computeReturns(points, 'simple');
  // periodIncome = 830 - 1000 - (-200) = 30; return = 30/1000 = 3%
  assert.equal(result[1], 3);
});

test('computeReturns simple: null when previous equity is zero', () => {
  const points = [
    { inflow: 0, totalEquity: 0, netIncome: 0 },
    { inflow: 1000, totalEquity: 1000, netIncome: 0 },
  ];
  const result = computeReturns(points, 'simple');
  assert.equal(result[1], null);
});

// ---------------------------------------------------------------------------
// computeReturns – twr method
// ---------------------------------------------------------------------------

test('computeReturns twr: 10% pure growth chains correctly', () => {
  const points = [
    { inflow: 1000, totalEquity: 1000, netIncome: 0 },
    { inflow: 0,    totalEquity: 1100, netIncome: 100 },
    { inflow: 0,    totalEquity: 1210, netIncome: 210 },
  ];
  const result = computeReturns(points, 'twr');
  assert.equal(result[0], null);
  assert.equal(result[1], 10);   // (100-0)/1000 = 10%
  // (1+0.10)*(1+0.10)-1 = 0.21 = 21%
  assert.equal(result[2], 21);
});

test('computeReturns twr: deposit is excluded from sub-period return', () => {
  // Month 1: invest 1000, equity 1000
  // Month 2: deposit 500, equity 1600 (actual gain = 100 = 10%)
  // Month 3: no flow, equity 1760 (gain = 160 on 1600 = 10%)
  const withIncome = computeNetIncome([
    { period: '2024-01', inflow: 1000, totalEquity: 1000 },
    { period: '2024-02', inflow: 500,  totalEquity: 1600 },
    { period: '2024-03', inflow: 0,    totalEquity: 1760 },
  ]);
  const result = computeReturns(withIncome, 'twr');
  assert.equal(result[0], null);
  assert.equal(result[1], 10);  // (100-0)/1000 = 10%
  // (1+0.10)*(1+0.10)-1 = 21%
  assert.equal(result[2], 21);
});

test('computeReturns twr: chaining resets at start of slice (range boundary)', () => {
  // Simulate: full history has high early returns, but the slice we pass in
  // only covers the last 2 months. computeReturns should NOT know about the
  // earlier returns – it chains from 0.
  const points = [
    { inflow: 2000, totalEquity: 2000, netIncome: 0   }, // baseline (first of slice)
    { inflow: 0,    totalEquity: 2100, netIncome: 100 }, // +5%
    { inflow: 0,    totalEquity: 2205, netIncome: 205 }, // +5%
  ];
  const result = computeReturns(points, 'twr');
  assert.equal(result[0], null);
  assert.equal(result[1], 5);
  assert.equal(result[2], 10.25); // (1.05)^2 - 1 = 10.25
});

// ---------------------------------------------------------------------------
// getRangeStartIndex
// ---------------------------------------------------------------------------

const makeMonths = (specs: Array<[number, number]>) =>
  specs.map(([year, month]) => ({ year, month }));

test('getRangeStartIndex: all returns 0', () => {
  const sorted = makeMonths([[2023, 1], [2023, 6], [2024, 1]]);
  assert.equal(getRangeStartIndex(sorted, 'all'), 0);
});

test('getRangeStartIndex: empty array returns 0', () => {
  assert.equal(getRangeStartIndex([], '1y'), 0);
  assert.equal(getRangeStartIndex([], 'ytd'), 0);
});

test('getRangeStartIndex: 1y on 15 months returns index 3', () => {
  const sorted = makeMonths(
    Array.from({ length: 15 }, (_, i) => [2023 + Math.floor(i / 12), (i % 12) + 1] as [number, number])
  );
  assert.equal(getRangeStartIndex(sorted, '1y'), 3); // 15 - 12 = 3
});

test('getRangeStartIndex: 1y when fewer than 12 months available returns 0', () => {
  const sorted = makeMonths([[2024, 1], [2024, 5]]);
  assert.equal(getRangeStartIndex(sorted, '1y'), 0);
});

test('getRangeStartIndex: ytd returns index of first month in latest year', () => {
  const sorted = makeMonths([
    [2023, 10], [2023, 11], [2023, 12],
    [2024, 1],  [2024, 2],  [2024, 3],
  ]);
  assert.equal(getRangeStartIndex(sorted, 'ytd'), 3); // index of 2024-01
});

test('getRangeStartIndex: ytd when all data is in the same year returns 0', () => {
  const sorted = makeMonths([[2024, 1], [2024, 6]]);
  assert.equal(getRangeStartIndex(sorted, 'ytd'), 0);
});

// ---------------------------------------------------------------------------
// End-to-end: period-relative netIncome and returnPct for ranged views
// ---------------------------------------------------------------------------

/**
 * Helper that replicates the applyRangeAndCompute logic from the service
 * using only the exported pure functions, so we can test the combined
 * behaviour without hitting the database.
 */
function applyRange(
  sorted: Array<{ year: number; month: number; inflow: number; totalEquity: number }>,
  range: import('../src/domain/models/Dashboard').DashboardRange,
  method: import('../src/domain/models/Dashboard').ReturnMethod
) {
  const { formatPeriod } = require('../src/utils/date') as typeof import('../src/utils/date');
  const { round2 } = require('../src/utils/number') as typeof import('../src/utils/number');

  if (sorted.length === 0) return [];

  // Pass 1: full-history netIncome
  const allRaw = sorted.map((item) => ({
    period: formatPeriod(item.year, item.month),
    inflow: item.inflow,
    totalEquity: item.totalEquity,
  }));
  const allWithIncome = computeNetIncome(allRaw);

  const rangeStartIdx = getRangeStartIndex(sorted, range);
  const baselineIdx = rangeStartIdx > 0 ? rangeStartIdx - 1 : 0;
  const baselineNetIncome = allWithIncome[baselineIdx].netIncome;

  // Pass 2: returns on the slice so TWR chains from 0
  const slice = allWithIncome.slice(baselineIdx);
  const returns = computeReturns(slice, method);

  const all = slice.map((item, idx) => ({
    period: item.period,
    inflow: round2(item.inflow),
    totalEquity: round2(item.totalEquity),
    netIncome: round2(item.netIncome - baselineNetIncome),
    returnPct: returns[idx],
  }));

  return rangeStartIdx > 0 ? all.slice(1) : all;
}

test('e2e: "all" range – netIncome and return are cumulative from inception', () => {
  const sorted = [
    { year: 2023, month: 1, inflow: 1000, totalEquity: 1000 },
    { year: 2023, month: 2, inflow: 0,    totalEquity: 1100 },
    { year: 2023, month: 3, inflow: 0,    totalEquity: 1210 },
  ];
  const points = applyRange(sorted, 'all', 'twr');
  assert.equal(points.length, 3);
  assert.equal(points[0].netIncome, 0);
  assert.equal(points[2].netIncome, 210);
  assert.equal(points[2].returnPct, 21); // 10% chained twice
});

test('e2e: "1y" range – netIncome resets to 0 at range start, not all-time value', () => {
  // 14 months of history: first 2 months have big returns, next 12 are flat
  const sorted = [
    { year: 2023, month: 1, inflow: 1000, totalEquity: 1000 },
    { year: 2023, month: 2, inflow: 0,    totalEquity: 2000 }, // +100% historic gain
    // last 12 months: only small monthly flows and flat equity
    ...Array.from({ length: 12 }, (_, i) => ({
      year: 2023 + Math.floor((i + 2) / 12),
      month: ((i + 2) % 12) + 1,
      inflow: 100,
      totalEquity: 2000 + (i + 1) * 100, // equity grows only by inflow
    })),
  ];
  const points = applyRange(sorted, '1y', 'twr');
  assert.equal(points.length, 12);

  // netIncome at first visible point should be relative to range start (≈ 0 for flat equity)
  // At range start: equity = 2100 (month 3), inflow that month = 100
  // netIncome[0] = equity - inflow = 2100 - 100 = 2000... but baseline equity is 2000
  // period income = equity[0] - baseline_equity - inflow[0] = 2100 - 2000 - 100 = 0
  assert.equal(points[0].netIncome, 0);

  // All TWR returns should be ~0% because equity only grows by inflows
  for (const p of points) {
    if (p.returnPct !== null) {
      assert.ok(Math.abs(p.returnPct) < 0.01, `Expected ~0% return but got ${p.returnPct}`);
    }
  }
});

test('e2e: "ytd" range – netIncome and return start fresh from January of latest year', () => {
  const sorted = [
    { year: 2023, month: 11, inflow: 1000, totalEquity: 1000 },
    { year: 2023, month: 12, inflow: 0,    totalEquity: 1200 }, // +200 all-time gain going into baseline
    { year: 2024, month: 1,  inflow: 0,    totalEquity: 1300 }, // +100 this year
    { year: 2024, month: 2,  inflow: 0,    totalEquity: 1430 }, // +130 this year
  ];
  const points = applyRange(sorted, 'ytd', 'twr');
  assert.equal(points.length, 2); // only 2024 months

  // netIncome should be relative to Dec-2023 (baseline equity = 1200)
  assert.equal(points[0].netIncome, 100);  // 1300 - 1200
  assert.equal(points[1].netIncome, 230);  // 1430 - 1200

  // First ytd return: (100-0)/1200 ≈ 8.33%
  assert.ok(Math.abs((points[0].returnPct ?? 0) - 8.33) < 0.01);

  // Chained TWR after two months
  const r1 = 100 / 1200;             // ~8.333%
  const r2 = (230 - 100) / 1300;     // 130/1300 = 10%
  const expectedCum = ((1 + r1) * (1 + r2) - 1) * 100;
  assert.ok(Math.abs((points[1].returnPct ?? 0) - expectedCum) < 0.01);
});

test('e2e: "ytd" range – regression: previously netIncome showed all-time value', () => {
  // Before the fix, switching to YTD would still show the cumulative netIncome
  // from inception (e.g. 200 below) instead of the period value (50).
  const sorted = [
    { year: 2023, month: 6,  inflow: 1000, totalEquity: 1000 },
    { year: 2023, month: 12, inflow: 0,    totalEquity: 1200 }, // all-time income = 200
    { year: 2024, month: 3,  inflow: 0,    totalEquity: 1250 }, // ytd income should be 50
  ];
  const points = applyRange(sorted, 'ytd', 'simple');
  assert.equal(points.length, 1);
  // Must be 50 (period income), NOT 250 (all-time income)
  assert.equal(points[0].netIncome, 50);
});

test('e2e: "1y" regression – simple return was inflated by deposits', () => {
  // Before the fix: simple return = equity[i]/equity[i-1] - 1
  // With a 500 deposit on a 1000 base, old code would return 60% instead of 10%.
  const sorted = [
    { year: 2023, month: 11, inflow: 1000, totalEquity: 1000 },
    { year: 2023, month: 12, inflow: 500,  totalEquity: 1600 }, // baseline for 1y slice
    { year: 2024, month: 1,  inflow: 500,  totalEquity: 2200 }, // deposit 500, grew 100
    ...Array.from({ length: 11 }, (_, i) => ({
      year: 2024,
      month: i + 2,
      inflow: 0,
      totalEquity: 2200,
    })),
  ];
  const points = applyRange(sorted, '1y', 'simple');
  // First real point is 2024-01; baseline is 2023-12 (equity = 1600)
  // periodIncome = 2200 - 1600 - 500 = 100; return = 100/1600 = 6.25%
  assert.equal(points[0].returnPct, 6.25);
});
