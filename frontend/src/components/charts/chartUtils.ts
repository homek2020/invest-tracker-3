export type LineChartPoint = { label: string; value: number; rawLabel: string };

export const VIEWBOX_HEIGHT = 120;
export const VIEWBOX_WIDTH_FULL = 420;
export const VIEWBOX_WIDTH_HALF = 320;
export const CHART_HEIGHT_FULL = 320;
export const CHART_HEIGHT_HALF = 240;
export const AXIS_LEFT = 28;
export const AXIS_RIGHT = 8;
export const AXIS_BOTTOM = 16;
export const AXIS_TOP = 8;

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
