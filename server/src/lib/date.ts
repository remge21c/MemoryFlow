export function dayCount(startDate: string, endDate: string): number {
  const s = new Date(startDate + 'T00:00:00Z').getTime();
  const e = new Date(endDate + 'T00:00:00Z').getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 1;
  return Math.floor((e - s) / 86_400_000) + 1;
}

export function dateForDay(startDate: string, dayIndex: number): string {
  const s = new Date(startDate + 'T00:00:00Z').getTime();
  return new Date(s + (dayIndex - 1) * 86_400_000).toISOString().slice(0, 10);
}
