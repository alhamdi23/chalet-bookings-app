import Modal from '../../components/Modal';
import {
  BOOKING_TYPE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  type Booking,
} from '../../types';
import { formatOmr } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dates';

interface DayBookingsModalProps {
  dayIso: string;
  bookings: Booking[];
  onClose: () => void;
  onAdd: () => void;
  onBlock: () => void;
  onEdit: (booking: Booking) => void;
}

export default function DayBookingsModal({
  dayIso,
  bookings,
  onClose,
  onAdd,
  onBlock,
  onEdit,
}: DayBookingsModalProps) {
  return (
    <Modal title={formatDisplayDate(dayIso)} onClose={onClose}>
      {bookings.length === 0 ? (
        <div className="empty-state">No bookings on this day yet.</div>
      ) : (
        <div>
          {bookings.map((booking) => (
            <button
              key={booking.id}
              className="booking-row"
              style={{ width: '100%', textAlign: 'left' }}
              onClick={() => onEdit(booking)}
            >
              <div className="booking-row-main">
                <span className="booking-row-name">
                  {booking.status === 'Blocked'
                    ? booking.note || 'Blocked'
                    : booking.customerName || 'Unnamed guest'}
                </span>
                <span className="booking-row-meta">
                  {booking.status !== 'Blocked' &&
                    `${BOOKING_TYPE_LABELS[booking.bookingType]} · `}
                  {formatDisplayDate(booking.checkInDate)} →{' '}
                  {formatDisplayDate(booking.checkOutDate)}
                  {booking.status !== 'Blocked' &&
                    ` · ${formatOmr(booking.price + booking.insurancePrice)}`}
                </span>
                {booking.tags.length > 0 && (
                  <span className="booking-row-tags">
                    {booking.tags.map((tag) => (
                      <span key={tag} className="tag-chip tag-chip-sm">
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              <span
                className="status-badge"
                style={{ background: STATUS_COLORS[booking.status] }}
              >
                {STATUS_LABELS[booking.status]}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onBlock}>
          🚧 Block Day
        </button>
        <div className="spacer" />
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          + Add Booking
        </button>
      </div>
    </Modal>
  );
}
