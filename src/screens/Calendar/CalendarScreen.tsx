import { useMemo, useState } from 'react';
import {
  STATUS_COLORS,
  STATUS_LABELS,
  BOOKING_STATUSES,
  DEFAULT_INSURANCE_OMR,
  type Booking,
} from '../../types';
import { useAppStore } from '../../store/AppStore';
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
import DayBookingsModal from './DayBookingsModal';
import BookingForm, { type BookingFormData } from './BookingForm';

const MAX_CHIPS = 3;

type EditState =
  | { mode: 'new'; day: string }
  | { mode: 'block'; day: string }
  | { mode: 'edit'; booking: Booking };

function emptyBooking(day: string): BookingFormData {
  return {
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    bookingType: 'OvernightStay',
    checkInDate: day,
    checkOutDate: toIsoDate(addDays(new Date(day), 1)),
    price: 0,
    insurancePrice: DEFAULT_INSURANCE_OMR,
    tags: [],
    note: '',
    status: 'Confirmed',
  };
}

function blockBooking(day: string): BookingFormData {
  return {
    ...emptyBooking(day),
    checkOutDate: day,
    insurancePrice: 0,
    status: 'Blocked',
  };
}

export default function CalendarScreen() {
  const { bookings, addBooking, updateBooking, deleteBooking } = useAppStore();
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const days = useMemo(() => monthGridDays(viewMonth), [viewMonth]);
  const today = todayIso();
  const currentMonth = viewMonth.getMonth();

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const day of days) {
      const iso = toIsoDate(day);
      const matches = bookings.filter((booking) =>
        dayIsInBooking(iso, booking.checkInDate, booking.checkOutDate),
      );
      if (matches.length > 0) {
        map.set(iso, matches);
      }
    }
    return map;
  }, [days, bookings]);

  const selectedDayBookings = selectedDay
    ? bookingsByDay.get(selectedDay) ?? []
    : [];

  const goToToday = () => setViewMonth(startOfMonth(new Date()));
  const goPrev = () =>
    setViewMonth((prev) => startOfMonth(addDays(startOfMonth(prev), -1)));
  const goNext = () =>
    setViewMonth((prev) => startOfMonth(addDays(addDays(startOfMonth(prev), 32), 0)));

  const onMonthInput = (value: string) => {
    if (value) {
      setViewMonth(startOfMonth(new Date(`${value}-01T00:00:00`)));
    }
  };

  const handleSubmit = (data: BookingFormData) => {
    if (editState?.mode === 'edit') {
      updateBooking(editState.booking.id, data);
    } else {
      addBooking(data);
    }
    setEditState(null);
  };

  const handleDelete = () => {
    if (editState?.mode === 'edit') {
      deleteBooking(editState.booking.id);
      setEditState(null);
    }
  };

  const monthValue = `${viewMonth.getFullYear()}-${String(
    viewMonth.getMonth() + 1,
  ).padStart(2, '0')}`;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bookings Calendar</h1>
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
          <button className="btn btn-sm" onClick={goToToday}>
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

      <div className="calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}

        {days.map((day) => {
          const iso = toIsoDate(day);
          const dayBookings = bookingsByDay.get(iso) ?? [];
          const isOutside = day.getMonth() !== currentMonth;
          const isToday = iso === today;
          return (
            <button
              key={iso}
              className={`calendar-day${isOutside ? ' outside' : ''}${
                isToday ? ' today' : ''
              }`}
              onClick={() => setSelectedDay(iso)}
            >
              <span className="calendar-day-number">{day.getDate()}</span>
              {dayBookings.slice(0, MAX_CHIPS).map((booking) => (
                <span
                  key={booking.id}
                  className="chip"
                  style={{ background: STATUS_COLORS[booking.status] }}
                  title={`${
                    booking.status === 'Blocked'
                      ? booking.note || 'Blocked'
                      : booking.customerName
                  } — ${STATUS_LABELS[booking.status]}`}
                >
                  {booking.status === 'Blocked'
                    ? '🚧 ' + (booking.note || 'Blocked')
                    : booking.customerName || 'Guest'}
                </span>
              ))}
              {dayBookings.length > MAX_CHIPS && (
                <span className="chip more">+{dayBookings.length - MAX_CHIPS} more</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="legend">
        {BOOKING_STATUSES.map((status) => (
          <div key={status} className="legend-item">
            <span
              className="legend-swatch"
              style={{ background: STATUS_COLORS[status] }}
            />
            {STATUS_LABELS[status]}
          </div>
        ))}
      </div>

      {selectedDay && !editState && (
        <DayBookingsModal
          dayIso={selectedDay}
          bookings={selectedDayBookings}
          onClose={() => setSelectedDay(null)}
          onAdd={() => setEditState({ mode: 'new', day: selectedDay })}
          onBlock={() => setEditState({ mode: 'block', day: selectedDay })}
          onEdit={(booking) => setEditState({ mode: 'edit', booking })}
        />
      )}

      {editState && (
        <BookingForm
          title={
            editState.mode === 'edit'
              ? 'Edit Booking'
              : editState.mode === 'block'
                ? 'Block Day'
                : 'New Booking'
          }
          initial={
            editState.mode === 'edit'
              ? editState.booking
              : editState.mode === 'block'
                ? blockBooking(editState.day)
                : emptyBooking(editState.day)
          }
          onSubmit={handleSubmit}
          onClose={() => setEditState(null)}
          onDelete={editState.mode === 'edit' ? handleDelete : undefined}
        />
      )}
    </div>
  );
}
