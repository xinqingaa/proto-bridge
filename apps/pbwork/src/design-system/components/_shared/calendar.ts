/** Date-only arithmetic in UTC; current time is always supplied by the caller. */
export function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}
export const isoDay = (date: Date) => date.toISOString().slice(0, 10);
export function shiftDay(value: string, count: number) {
  const date = parseDay(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + count);
  return isoDay(date);
}
export function monthDays(month: string): Array<Array<string | null>> {
  const first = parseDay(`${month}-01`);
  if (!first) return [];
  const days: Array<string | null> = Array.from(
    { length: (first.getUTCDay() + 6) % 7 },
    () => null,
  );
  const cursor = new Date(first);
  while (cursor.getUTCMonth() === first.getUTCMonth()) {
    days.push(isoDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  while (days.length % 7) days.push(null);
  return Array.from({ length: days.length / 7 }, (_, index) =>
    days.slice(index * 7, index * 7 + 7),
  );
}
export function shiftMonth(month: string, count: number) {
  const first = parseDay(`${month}-01`);
  if (!first) return null;
  first.setUTCMonth(first.getUTCMonth() + count);
  return first.toISOString().slice(0, 7);
}
export function heatmapWeeks(input: Array<{ date: string; value: number }>) {
  const values = new Map(
    input
      .filter((item) => parseDay(item.date))
      .map((item) => [item.date, item.value]),
  );
  const dates = [...values.keys()].sort();
  if (!dates.length) return [];
  const start = parseDay(dates[0]!)!;
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const limit = shiftDay(dates[0]!, 365)!;
  const last =
    dates[dates.length - 1]! < limit ? dates[dates.length - 1]! : limit;
  const end = parseDay(last)!;
  end.setUTCDate(end.getUTCDate() + ((7 - end.getUTCDay()) % 7));
  const weeks: Array<Array<{ date: string; value: number | null }>> = [];
  for (let count = 0; isoDay(start) <= isoDay(end); count++) {
    if (count % 7 === 0) weeks.push([]);
    const day = isoDay(start),
      raw = values.get(day);
    weeks[weeks.length - 1]!.push({
      date: day,
      value:
        day > last || raw === undefined
          ? null
          : Number.isFinite(raw)
            ? Math.max(0, raw)
            : 0,
    });
    start.setUTCDate(start.getUTCDate() + 1);
  }
  return weeks;
}
