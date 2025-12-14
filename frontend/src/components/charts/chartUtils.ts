export type LinePoint = { label: string; value: number | null; rawLabel: string };

export function formatPeriodLabel(period: string) {
  const [year, month] = period.split('-');
  return `${month}/${year.slice(2)}`;
}

export function buildLinePoints<T>(items: T[], selector: (item: T) => number | null | undefined, getRawLabel?: (item: T) => string): LinePoint[] {
  return items.map((item) => {
    const rawLabel = getRawLabel ? getRawLabel(item) : (item as any)?.period ?? '';
    return {
      label: formatPeriodLabel(String(rawLabel)),
      rawLabel: String(rawLabel),
      value: selector(item) ?? null,
    };
  });
}

export function getMinMax(values: number[]) {
  if (values.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    return { min: min - padding, max: max + padding };
  }
  return { min, max };
}

export function buildTicks(min: number, max: number, steps = 5): number[] {
  if (steps < 2) return [min, max];
  const range = max - min;
  if (range === 0) return [min, max];
  const step = range / (steps - 1);
  const ticks: number[] = [];
  for (let i = 0; i < steps; i++) {
    ticks.push(min + i * step);
  }
  return ticks;
}

export function formatTick(value: number) {
  const rounded = Math.round(value);
  const compact = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(rounded);

  return compact
    .replace('\u00a0тыс.', 'k')
    .replace(' тыс.', 'k')
    .replace('\u00a0млн', 'm')
    .replace(' млн', 'm');
}
