const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

function parseMonth(value: string): { year: number; month: number } {
  const match = MONTH_PATTERN.exec(value);
  if (!match) throw new RangeError("Invalid month value.");

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new RangeError("Invalid month value.");

  return { year, month };
}

export function isMonthValue(value: string): boolean {
  try {
    parseMonth(value);
    return true;
  } catch {
    return false;
  }
}

export function dateToMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function monthToStartDate(value: string): Date {
  const { year, month } = parseMonth(value);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, 1);
  return date;
}

export function monthToEndDate(value: string): Date {
  const { year, month } = parseMonth(value);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month, 0);
  return date;
}
