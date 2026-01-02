import type { PeriodInfo } from './types';

export function formatPeriodLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function formatToThousands(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return (numeric / 1000).toFixed(2);
}

export function formatSignedThousands(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return '—';
  return `${(value! / 1000).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  })}K`;
}

export function formatPercent(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) return '—';
  return `${value!.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'always',
  })}%`;
}

export function toUnits(value: string) {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric)) return 0;
  return Number((numeric * 1000).toFixed(2));
}

export function getDefaultPeriod(months: PeriodInfo[], current: { year: number; month: number }) {
  const sorted = [...months].sort((a, b) => {
    if (a.periodYear === b.periodYear) {
      return b.periodMonth - a.periodMonth;
    }
    return b.periodYear - a.periodYear;
  });

  const currentOption = sorted.find(
    (item) => item.periodYear === current.year && item.periodMonth === current.month && item.hasBalances
  );
  if (currentOption) {
    return { year: current.year, month: current.month };
  }

  const lastOpen = sorted.find((item) => !item.isClosed && item.hasBalances);
  if (lastOpen) {
    return { year: lastOpen.periodYear, month: lastOpen.periodMonth };
  }

  return { year: current.year, month: current.month };
}

export function periodKey(year: number, month: number) {
  return `${year}-${month}`;
}

export function getNextPeriod(period: { year: number; month: number }) {
  const nextMonth = period.month === 12 ? 1 : period.month + 1;
  const nextYear = period.month === 12 ? period.year + 1 : period.year;
  return { year: nextYear, month: nextMonth };
}
