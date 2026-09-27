export type LineChartPoint = { label: string; value: number | null; rawLabel: string };

export const VIEWBOX_HEIGHT = 120;
export const VIEWBOX_WIDTH_FULL = 420;
export const VIEWBOX_WIDTH_HALF = 320;
export const CHART_HEIGHT_FULL = 320;
export const CHART_HEIGHT_HALF = 240;
export const AXIS_LEFT = 28;
export const AXIS_RIGHT = 8;
export const AXIS_BOTTOM = 16;
export const AXIS_TOP = 8;

export function getMinMax(values: (number | null)[]) {
  const nums = values.filter((v): v is number => v !== null && !Number.isNaN(v));
  if (nums.length === 0) return { min: 0, max: 0 };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.1, 1);
    return { min: min - padding, max: max + padding };
  }
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

export function buildTicks(min: number, max: number, steps = 5): number[] {
  if (steps < 2) return [min, max];
  const range = max - min;
  if (range === 0) return [min, max];
  const roughStep = range / (steps - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep) || 1)));
  const norm = roughStep / mag;
  const niceStep = norm < 1.5 ? mag : norm < 3.5 ? 2 * mag : norm < 7.5 ? 5 * mag : 10 * mag;
  const lo = Math.ceil(min / niceStep) * niceStep;
  const hi = Math.floor(max / niceStep) * niceStep;
  const ticks: number[] = [];
  const eps = niceStep * 1e-9;
  for (let t = lo; t <= hi + eps; t += niceStep) {
    ticks.push(parseFloat(t.toPrecision(10)));
  }
  return ticks.length >= 2 ? ticks : [min, max];
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
