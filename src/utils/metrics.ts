import type { Booking, BookingStatus, CostType, OperationCost } from '../types';
import { isoRange, isWithinIso, nightsBetween } from './dates';
import { parseISO, format } from 'date-fns';

const REVENUE_STATUSES: BookingStatus[] = ['Confirmed', 'PendingPayment', 'Rescheduled'];
const OCCUPYING_STATUSES: BookingStatus[] = [
  'Confirmed',
  'PendingPayment',
  'Rescheduled',
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DashboardMetrics {
  bookedNights: number;
  totalNights: number;
  occupancyPct: number;
  revenue: number;
  insuranceHeld: number;
  totalCosts: number;
  netProfit: number;
  bookingCount: number;
  statusCounts: { status: BookingStatus; label: string; value: number }[];
  weekdayCounts: { weekday: string; nights: number }[];
  trend: { period: string; revenue: number; costs: number }[];
  costBreakdown: { name: string; value: number }[];
}

/** Nights of a booking that fall within [from, to]. */
function nightsInRange(booking: Booking, from: string, to: string): number {
  if (nightsBetween(booking.checkInDate, booking.checkOutDate) === 0) {
    // Single-day entry (e.g. block) — count if the day is in range.
    return isWithinIso(booking.checkInDate, from, to) ? 1 : 0;
  }
  let count = 0;
  const lastNightExclusive = booking.checkOutDate;
  for (const day of isoRange(booking.checkInDate, lastNightExclusive)) {
    if (day === lastNightExclusive) {
      continue; // check-out morning is not a night
    }
    if (isWithinIso(day, from, to)) {
      count += 1;
    }
  }
  return count;
}

export function computeMetrics(
  bookings: Booking[],
  costs: OperationCost[],
  costTypes: CostType[],
  from: string,
  to: string,
): DashboardMetrics {
  const totalNights = isoRange(from, to).length;

  let bookedNights = 0;
  let revenue = 0;
  let insuranceHeld = 0;
  let bookingCount = 0;

  const statusMap = new Map<BookingStatus, number>();
  const weekdayNights = new Array(7).fill(0);

  for (const booking of bookings) {
    const inRangeCheckIn = isWithinIso(booking.checkInDate, from, to);

    if (inRangeCheckIn) {
      statusMap.set(booking.status, (statusMap.get(booking.status) ?? 0) + 1);
      if (booking.status !== 'Blocked') {
        bookingCount += 1;
      }
    }

    if (OCCUPYING_STATUSES.includes(booking.status)) {
      const nights = nightsInRange(booking, from, to);
      bookedNights += nights;

      // weekday distribution of occupied nights
      if (nights > 0) {
        for (const day of isoRange(booking.checkInDate, booking.checkOutDate)) {
          if (day === booking.checkOutDate) {
            continue;
          }
          if (isWithinIso(day, from, to)) {
            weekdayNights[parseISO(day).getDay()] += 1;
          }
        }
      }
    }

    if (REVENUE_STATUSES.includes(booking.status) && inRangeCheckIn) {
      revenue += booking.price;
      insuranceHeld += booking.insurancePrice;
    }
  }

  const costsInRange = costs.filter((cost) => isWithinIso(cost.date, from, to));
  const totalCosts = costsInRange.reduce((sum, cost) => sum + cost.amount, 0);

  const typeNameById = new Map(costTypes.map((type) => [type.id, type.name]));
  const costByType = new Map<string, number>();
  for (const cost of costsInRange) {
    const name = typeNameById.get(cost.costTypeId) ?? 'Unknown';
    costByType.set(name, (costByType.get(name) ?? 0) + cost.amount);
  }

  // Monthly trend of revenue vs costs
  const trendMap = new Map<string, { revenue: number; costs: number }>();
  const ensure = (period: string) => {
    if (!trendMap.has(period)) {
      trendMap.set(period, { revenue: 0, costs: 0 });
    }
    return trendMap.get(period)!;
  };
  for (const booking of bookings) {
    if (REVENUE_STATUSES.includes(booking.status) && isWithinIso(booking.checkInDate, from, to)) {
      const period = format(parseISO(booking.checkInDate), 'MMM yyyy');
      ensure(period).revenue += booking.price;
    }
  }
  for (const cost of costsInRange) {
    const period = format(parseISO(cost.date), 'MMM yyyy');
    ensure(period).costs += cost.amount;
  }
  const trend = Array.from(trendMap.entries())
    .map(([period, value]) => ({ period, ...value }))
    .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());

  const statusCounts = (Array.from(statusMap.entries()) as [BookingStatus, number][])
    .map(([status, value]) => ({ status, label: status, value }))
    .sort((a, b) => b.value - a.value);

  const weekdayCounts = WEEKDAY_NAMES.map((weekday, index) => ({
    weekday,
    nights: weekdayNights[index],
  }));

  const costBreakdown = Array.from(costByType.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    bookedNights,
    totalNights,
    occupancyPct: totalNights > 0 ? (bookedNights / totalNights) * 100 : 0,
    revenue,
    insuranceHeld,
    totalCosts,
    netProfit: revenue - totalCosts,
    bookingCount,
    statusCounts,
    weekdayCounts,
    trend,
    costBreakdown,
  };
}
