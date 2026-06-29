import { useMemo, useState } from 'react';
import type { Booking, BookingStatus, WeekdayPrice } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { resolveAppName, resolveLogoSrc } from '../../data/settings';
import { parseAmount } from '../../utils/currency';
import {
  addDays,
  dayIsInBooking,
  formatMonthTitle,
  monthGridDays,
  startOfMonth,
  toIsoDate,
  todayIso,
  WEEKDAY_LABELS,
} from '../../utils/dates';
import {
  downloadCalendarImage,
  shareCalendarImage,
  type CalendarImageDay,
} from '../../utils/exportCalendarImage';

/** Statuses that make a day unavailable for guests. */
const OCCUPYING_STATUSES: BookingStatus[] = [
  'Confirmed',
  'PendingPayment',
  'Rescheduled',
  'Blocked',
];

/** getDay() indices in the same column order as WEEKDAY_LABELS (Sat → Fri). */
const WEEKDAY_GETDAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

export default function AvailabilityScreen() {
  const { bookings, settings, updateSettings } = useAppStore();
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [showPrices, setShowPrices] = useState(true);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => monthGridDays(viewMonth), [viewMonth]);
  const today = todayIso();
  const currentMonth = viewMonth.getMonth();
  const pricing = settings.weekdayPricing;

  const isBooked = useMemo(() => {
    const occupying = bookings.filter((b: Booking) =>
      OCCUPYING_STATUSES.includes(b.status),
    );
    return (iso: string) =>
      occupying.some((b) => dayIsInBooking(iso, b.checkInDate, b.checkOutDate));
  }, [bookings]);

  const imageDays = useMemo<CalendarImageDay[]>(
    () =>
      days.map((day) => {
        const iso = toIsoDate(day);
        const inMonth = day.getMonth() === currentMonth;
        const booked = inMonth && isBooked(iso);
        const wd = pricing[day.getDay()] ?? { price: 0, discount: 0 };
        return {
          iso,
          dayNumber: day.getDate(),
          inMonth,
          status: booked ? 'booked' : 'available',
          price: wd.price,
          discount: wd.discount,
        };
      }),
    [days, currentMonth, isBooked, pricing],
  );

  const goPrev = () =>
    setViewMonth((prev) => startOfMonth(addDays(startOfMonth(prev), -1)));
  const goNext = () =>
    setViewMonth((prev) => startOfMonth(addDays(addDays(startOfMonth(prev), 32), 0)));
  const goToday = () => setViewMonth(startOfMonth(new Date()));
  const onMonthInput = (value: string) => {
    if (value) {
      setViewMonth(startOfMonth(new Date(`${value}-01T00:00:00`)));
    }
  };

  const setWeekdayPrice = (getDayIndex: number, patch: Partial<WeekdayPrice>) => {
    const next = pricing.map((entry, index) =>
      index === getDayIndex ? { ...entry, ...patch } : entry,
    );
    updateSettings({ ...settings, weekdayPricing: next });
  };

  const buildOptions = (withPrices: boolean) => ({
    title: resolveAppName(settings),
    monthLabel: formatMonthTitle(viewMonth),
    weekdayLabels: WEEKDAY_LABELS,
    days: imageDays,
    showPrices: withPrices,
    logoSrc: resolveLogoSrc(settings),
  });

  const fileBase = `availability-${viewMonth.getFullYear()}-${String(
    viewMonth.getMonth() + 1,
  ).padStart(2, '0')}`;

  const handleDownload = async (withPrices: boolean) => {
    setBusy(true);
    try {
      await downloadCalendarImage(
        withPrices ? fileBase : `${fileBase}-no-price`,
        buildOptions(withPrices),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async (withPrices: boolean) => {
    setBusy(true);
    try {
      const shared = await shareCalendarImage(
        withPrices ? fileBase : `${fileBase}-no-price`,
        buildOptions(withPrices),
      );
      if (!shared) {
        await downloadCalendarImage(
          withPrices ? fileBase : `${fileBase}-no-price`,
          buildOptions(withPrices),
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const monthValue = `${viewMonth.getFullYear()}-${String(
    viewMonth.getMonth() + 1,
  ).padStart(2, '0')}`;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Availability</h1>
      </div>

      <div className="banner">
        A clean, guest-friendly view of which days are open. Set a price per
        weekday (it repeats across the month) and export a photo to share — guest
        names and booking details are never shown.
      </div>

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button className="btn btn-sm calendar-nav-btn" onClick={goPrev} aria-label="Previous month">
            ‹
          </button>
          <span className="calendar-month-title">{formatMonthTitle(viewMonth)}</span>
          <button className="btn btn-sm calendar-nav-btn" onClick={goNext} aria-label="Next month">
            ›
          </button>
        </div>
        <div className="calendar-actions">
          <button className="btn btn-sm" onClick={goToday}>
            Today
          </button>
          <input
            className="btn btn-sm calendar-month-input"
            type="month"
            value={monthValue}
            onChange={(event) => onMonthInput(event.target.value)}
          />
        </div>
      </div>

      <div className="avail-layout">
        {/* ---- Weekday pricing editor ---- */}
        <section className="avail-pricing chart-card">
          <h3 className="chart-title">Weekday pricing</h3>
          <p className="avail-pricing-hint">
            Saved automatically. A discount price (when lower) is shown as an
            offer.
          </p>
          <div className="avail-price-head">
            <span>Day</span>
            <span>Price</span>
            <span>Discount</span>
          </div>
          {WEEKDAY_GETDAY_ORDER.map((getDayIndex, i) => {
            const entry = pricing[getDayIndex] ?? { price: 0, discount: 0 };
            return (
              <div className="avail-price-row" key={getDayIndex}>
                <span className="avail-price-day">{WEEKDAY_LABELS[i]}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={entry.price || ''}
                  placeholder="0"
                  onChange={(e) =>
                    setWeekdayPrice(getDayIndex, { price: parseAmount(e.target.value) })
                  }
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={entry.discount || ''}
                  placeholder="—"
                  onChange={(e) =>
                    setWeekdayPrice(getDayIndex, { discount: parseAmount(e.target.value) })
                  }
                />
              </div>
            );
          })}

          <label className="avail-toggle">
            <input
              type="checkbox"
              checked={showPrices}
              onChange={(e) => setShowPrices(e.target.checked)}
            />
            Show prices on the calendar
          </label>

          <div className="avail-export-buttons">
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() => handleShare(showPrices)}
            >
              ⇪ Share photo
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => handleDownload(showPrices)}
            >
              ⬇ Download photo
            </button>
            <button
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => handleDownload(false)}
            >
              Download without prices
            </button>
          </div>
        </section>

        {/* ---- Calendar preview (read-only) ---- */}
        <section className="avail-preview chart-card">
          <div className="avail-preview-head">
            <div>
              <div className="avail-preview-title">{resolveAppName(settings)}</div>
              <div className="avail-preview-month">{formatMonthTitle(viewMonth)}</div>
            </div>
            <span className="avail-tag">Availability</span>
          </div>

          <div className="avail-grid">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="avail-weekday">
                {label}
              </div>
            ))}

            {imageDays.map((day) => {
              if (!day.inMonth) {
                return <div key={day.iso} className="avail-day outside" />;
              }
              const hasOffer =
                day.discount > 0 && day.discount < day.price && day.price > 0;
              return (
                <div
                  key={day.iso}
                  className={`avail-day ${day.status}${
                    day.iso === today ? ' today' : ''
                  }`}
                >
                  <div className="avail-day-top">
                    <span className="avail-day-number">{day.dayNumber}</span>
                    <span className="avail-day-status">
                      {day.status === 'available' ? 'Available' : 'Booked'}
                    </span>
                  </div>
                  {showPrices && day.status === 'available' && day.price > 0 && (
                    <div className="avail-day-price">
                      {hasOffer ? (
                        <>
                          <span className="avail-price-old">
                            {day.price.toFixed(2)}
                          </span>
                          <span className="avail-price-offer">
                            {day.discount.toFixed(2)} OMR
                          </span>
                        </>
                      ) : (
                        <span className="avail-price-reg">
                          {day.price.toFixed(2)} OMR
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="avail-legend">
            <span className="avail-legend-item">
              <span className="avail-swatch available" /> Available
            </span>
            <span className="avail-legend-item">
              <span className="avail-swatch booked" /> Booked
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
