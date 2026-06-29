import { differenceInCalendarMonths, parseISO } from 'date-fns';
import type { Booking, BookingStatus, OperationCost } from '../types';
import { isHalfDay } from '../types';

/** Booking statuses that count as real, money-making bookings. */
const REVENUE_STATUSES: BookingStatus[] = ['Confirmed', 'PendingPayment', 'Rescheduled'];

/** Sensible fallbacks used only when there is no historical data yet. */
const FALLBACK = {
  projectCost: 75000,
  fullDayPerMonth: 15,
  fullDayPrice: 70,
  halfDayPerMonth: 10,
  halfDayPrice: 35,
  monthlyCost: 300,
};

/** The adjustable planning variables that drive the estimation. */
export interface EstimationInputs {
  /** One-off capital invested to build / buy the chalet (OMR). */
  projectCost: number;
  /** Average full-day (overnight) bookings per month. */
  fullDayPerMonth: number;
  /** Average price of a full-day booking (OMR). */
  fullDayPrice: number;
  /** Average half-day bookings per month. */
  halfDayPerMonth: number;
  /** Average price of a half-day booking (OMR). */
  halfDayPrice: number;
  /** Average monthly operating cost (bills, cleaning, maintenance…) (OMR). */
  monthlyCost: number;
}

/** Inputs plus a count of how many months of real data they were derived from. */
export interface EstimationDefaults extends EstimationInputs {
  monthsOfData: number;
}

/** The live calculated outcome of a set of inputs. */
export interface EstimationResult {
  fullDayRevenue: number;
  halfDayRevenue: number;
  monthlyRevenue: number;
  monthlyNet: number;
  annualRevenue: number;
  annualNet: number;
  /** Years to recover the project cost. Infinity when never profitable. */
  paybackYears: number;
  /** Annual return on investment, as a percentage of project cost. */
  roiPct: number;
  /** Cumulative profit vs. the invested amount, year by year. */
  projection: { year: number; cumulativeProfit: number; investment: number }[];
}

function round(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Number of calendar months that the supplied dates span (at least 1). */
function monthSpan(dates: string[]): number {
  if (dates.length === 0) {
    return 1;
  }
  let min = dates[0];
  let max = dates[0];
  for (const date of dates) {
    if (date < min) min = date;
    if (date > max) max = date;
  }
  return Math.max(1, differenceInCalendarMonths(parseISO(max), parseISO(min)) + 1);
}

/**
 * Derive the starting planning variables from the real bookings and costs the
 * admin has already recorded, so the estimate begins from actual averages.
 */
export function computeEstimationDefaults(
  bookings: Booking[],
  costs: OperationCost[],
): EstimationDefaults {
  const active = bookings.filter((b) => REVENUE_STATUSES.includes(b.status));
  const fullDay = active.filter((b) => b.bookingType === 'OvernightStay');
  const halfDay = active.filter((b) => isHalfDay(b.bookingType));

  const allDates = [...active.map((b) => b.checkInDate), ...costs.map((c) => c.date)];
  const months = monthSpan(allDates);

  const mean = (rows: Booking[]): number =>
    rows.length ? rows.reduce((sum, b) => sum + b.price, 0) / rows.length : 0;

  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);

  return {
    projectCost: FALLBACK.projectCost,
    fullDayPerMonth: fullDay.length ? round(fullDay.length / months, 1) : FALLBACK.fullDayPerMonth,
    fullDayPrice: fullDay.length ? round(mean(fullDay), 3) : FALLBACK.fullDayPrice,
    halfDayPerMonth: halfDay.length ? round(halfDay.length / months, 1) : FALLBACK.halfDayPerMonth,
    halfDayPrice: halfDay.length ? round(mean(halfDay), 3) : FALLBACK.halfDayPrice,
    monthlyCost: costs.length ? round(totalCosts / months, 3) : FALLBACK.monthlyCost,
    monthsOfData: months,
  };
}

/** Run the live break-even / ROI calculation for a set of inputs. */
export function computeEstimation(inputs: EstimationInputs): EstimationResult {
  const fullDayRevenue = inputs.fullDayPerMonth * inputs.fullDayPrice;
  const halfDayRevenue = inputs.halfDayPerMonth * inputs.halfDayPrice;
  const monthlyRevenue = fullDayRevenue + halfDayRevenue;
  const monthlyNet = monthlyRevenue - inputs.monthlyCost;
  const annualRevenue = monthlyRevenue * 12;
  const annualNet = monthlyNet * 12;

  const paybackYears = annualNet > 0 ? inputs.projectCost / annualNet : Infinity;
  const roiPct = inputs.projectCost > 0 ? (annualNet / inputs.projectCost) * 100 : 0;

  const years = Number.isFinite(paybackYears)
    ? Math.min(40, Math.max(6, Math.ceil(paybackYears) + 3))
    : 15;

  const projection = Array.from({ length: years + 1 }, (_, year) => ({
    year,
    cumulativeProfit: round(annualNet * year, 3),
    investment: inputs.projectCost,
  }));

  return {
    fullDayRevenue: round(fullDayRevenue, 3),
    halfDayRevenue: round(halfDayRevenue, 3),
    monthlyRevenue: round(monthlyRevenue, 3),
    monthlyNet: round(monthlyNet, 3),
    annualRevenue: round(annualRevenue, 3),
    annualNet: round(annualNet, 3),
    paybackYears,
    roiPct: round(roiPct, 1),
    projection,
  };
}
