export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value);
}

export function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
}
