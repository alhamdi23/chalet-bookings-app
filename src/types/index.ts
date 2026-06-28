export type BookingStatus =
  | 'Confirmed'
  | 'PendingPayment'
  | 'Cancelled'
  | 'Rescheduled'
  | 'Blocked';

export type BookingType = 'MorningHalfDay' | 'NightHalfDay' | 'OvernightStay';

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  /** Type of stay (half-day or overnight) */
  bookingType: BookingType;
  /** ISO date string yyyy-MM-dd (the night the guest arrives) */
  checkInDate: string;
  /** ISO date string yyyy-MM-dd (the morning the guest leaves) */
  checkOutDate: string;
  /** Base booking price in OMR */
  price: number;
  /** Refundable insurance / deposit in OMR */
  insurancePrice: number;
  /** Free-form occasion / feature tags (e.g. Birthday, With Breakfast) */
  tags: string[];
  note: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface CostType {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface OperationCost {
  id: string;
  costTypeId: string;
  amount: number;
  /** ISO date string yyyy-MM-dd */
  date: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface AppSettings {
  /** Run a full pull/push once when the app opens (if online) */
  autoSync: boolean;
  lastSyncedAt: string | null;
  /** Display name shown in the sidebar, login screen and titles */
  appName: string;
  /** Custom logo as a data URL; null falls back to the bundled brand logo */
  logoDataUrl: string | null;
}

/** A record that carries a soft-delete flag and updatedAt for sync merging */
export interface Syncable {
  id: string;
  updatedAt: string;
  deleted: boolean;
}

export const BOOKING_STATUSES: BookingStatus[] = [
  'Confirmed',
  'PendingPayment',
  'Cancelled',
  'Rescheduled',
  'Blocked',
];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  Confirmed: 'Confirmed',
  PendingPayment: 'Pending Payment',
  Cancelled: 'Cancelled',
  Rescheduled: 'Rescheduled',
  Blocked: 'Blocked',
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  Confirmed: '#16a34a',
  PendingPayment: '#d97706',
  Cancelled: '#dc2626',
  Rescheduled: '#7c3aed',
  Blocked: '#475569',
};

export const BOOKING_TYPES: BookingType[] = [
  'MorningHalfDay',
  'NightHalfDay',
  'OvernightStay',
];

export const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  MorningHalfDay: 'Morning Half Day',
  NightHalfDay: 'Night Half Day',
  OvernightStay: 'Overnight Stay',
};

/** True for same-day booking types (check-out equals check-in). */
export function isHalfDay(type: BookingType): boolean {
  return type === 'MorningHalfDay' || type === 'NightHalfDay';
}

/** Default selectable occasion / feature tags. */
export const DEFAULT_TAGS: string[] = [
  'Birthday',
  'Graduation Event',
  'Wedding',
  'Anniversary',
  'Family Gathering',
  'Corporate Event',
  'With Breakfast',
  'With Dinner',
  'Late Checkout',
];

/** Default insurance / deposit amount (OMR) for a new booking. */
export const DEFAULT_INSURANCE_OMR = 30;
