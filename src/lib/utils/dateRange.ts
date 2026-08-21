/**
 * `<input type="date">` yields a bare "YYYY-MM-DD". Passing that to
 * `new Date()` parses it as UTC midnight, which makes an inclusive
 * `lte: dateTo` filter exclude the entire selected end day (and shifts
 * `dateFrom` in any timezone ahead of UTC). Appending an explicit wall-clock
 * time makes the string parse in the viewer's local timezone instead, so the
 * range covers the days the admin actually picked.
 */
export function startOfLocalDay(yyyyMmDd: string): string {
  return new Date(`${yyyyMmDd}T00:00:00`).toISOString();
}

export function endOfLocalDay(yyyyMmDd: string): string {
  return new Date(`${yyyyMmDd}T23:59:59.999`).toISOString();
}
