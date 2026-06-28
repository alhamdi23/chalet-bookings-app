import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export const ISO_DATE = 'yyyy-MM-dd';

/** Convert a Date to an ISO yyyy-MM-dd string (local). */
export function toIsoDate(date: Date): string {
  return format(date, ISO_DATE);
}

/** Parse an ISO yyyy-MM-dd string to a Date. */
export function fromIsoDate(value: string): Date {
  return parseISO(value);
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Number of nights between check-in and check-out (>= 0). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const diff = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  return diff > 0 ? diff : 0;
}

/**
 * Build the full grid of days for a month view, padded to whole weeks
 * (weeks start on Saturday to suit the region; change weekStartsOn to adjust).
 */
export function monthGridDays(monthDate: Date): Date[] {
  const weekStartsOn = 6; // Saturday
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

/** Weekday header labels aligned to a Saturday week start. */
export const WEEKDAY_LABELS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/**
 * Returns true if the given day falls within a booking's occupied nights.
 * A booking occupies [checkIn, checkOut) — the check-out day itself is free.
 * Single-day entries (checkIn === checkOut), e.g. blocked days, occupy that day.
 */
export function dayIsInBooking(day: string, checkIn: string, checkOut: string): boolean {
  const d = parseISO(day);
  const start = parseISO(checkIn);
  if (checkIn === checkOut) {
    return day === checkIn;
  }
  const lastNight = addDays(parseISO(checkOut), -1);
  return isWithinInterval(d, { start, end: lastNight });
}

/** Inclusive list of ISO dates between two ISO dates. */
export function isoRange(startIso: string, endIso: string): string[] {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (end < start) {
    return [];
  }
  return eachDayOfInterval({ start, end }).map(toIsoDate);
}

export function isWithinIso(day: string, startIso: string, endIso: string): boolean {
  return day >= startIso && day <= endIso;
}

export function formatDisplayDate(iso: string): string {
  return format(parseISO(iso), 'dd MMM yyyy');
}

export function formatMonthTitle(monthDate: Date): string {
  return format(monthDate, 'MMMM yyyy');
}

export { addDays, startOfMonth, format };
