export function formatPeriod(year: number, month: number): string {
  return `${year}-${`${month}`.padStart(2, '0')}`;
}

export function endOfMonthIso(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month, 0));
  return date.toISOString().slice(0, 10);
}

export function parseDateToYearMonth(date: string, fieldName = 'date'): { year: number; month: number } {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid dateformat`);
  }
  return { year: parsed.getUTCFullYear(), month: parsed.getUTCMonth() + 1 };
}
