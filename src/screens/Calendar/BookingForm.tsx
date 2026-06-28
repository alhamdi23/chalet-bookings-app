import { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import DateField from '../../components/DateField';
import TagInput from '../../components/TagInput';
import {
  BOOKING_STATUSES,
  BOOKING_TYPES,
  BOOKING_TYPE_LABELS,
  DEFAULT_TAGS,
  STATUS_LABELS,
  isHalfDay,
  type Booking,
  type BookingStatus,
  type BookingType,
} from '../../types';
import { formatOmr, parseAmount } from '../../utils/currency';
import { addDays, nightsBetween, toIsoDate } from '../../utils/dates';

export type BookingFormData = Omit<
  Booking,
  'id' | 'createdAt' | 'updatedAt' | 'deleted'
>;

interface BookingFormProps {
  title: string;
  initial: BookingFormData;
  onSubmit: (data: BookingFormData) => void;
  onClose: () => void;
  onDelete?: () => void;
}

export default function BookingForm({
  title,
  initial,
  onSubmit,
  onClose,
  onDelete,
}: BookingFormProps) {
  const [form, setForm] = useState<BookingFormData>(initial);

  const totalPrice = useMemo(
    () => form.price + form.insurancePrice,
    [form.price, form.insurancePrice],
  );

  const nights = useMemo(
    () => nightsBetween(form.checkInDate, form.checkOutDate),
    [form.checkInDate, form.checkOutDate],
  );

  const update = <K extends keyof BookingFormData>(key: K, value: BookingFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (type: BookingType) => {
    setForm((prev) => {
      if (isHalfDay(type)) {
        // Half-day stays occupy a single day.
        return { ...prev, bookingType: type, checkOutDate: prev.checkInDate };
      }
      // Overnight needs at least one night.
      const checkOut =
        prev.checkOutDate > prev.checkInDate
          ? prev.checkOutDate
          : toIsoDate(addDays(new Date(prev.checkInDate), 1));
      return { ...prev, bookingType: type, checkOutDate: checkOut };
    });
  };

  const handleCheckInChange = (value: string) => {
    setForm((prev) => {
      if (isHalfDay(prev.bookingType)) {
        return { ...prev, checkInDate: value, checkOutDate: value };
      }
      const checkOut =
        prev.checkOutDate > value
          ? prev.checkOutDate
          : toIsoDate(addDays(new Date(value), 1));
      return { ...prev, checkInDate: value, checkOutDate: checkOut };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customerName.trim() && form.status !== 'Blocked') {
      return;
    }
    if (form.checkOutDate < form.checkInDate) {
      update('checkOutDate', form.checkInDate);
      return;
    }
    onSubmit(form);
  };

  const isBlocked = form.status === 'Blocked';
  const halfDay = isHalfDay(form.bookingType);

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={form.status}
              onChange={(event) =>
                update('status', event.target.value as BookingStatus)
              }
            >
              {BOOKING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {!isBlocked && (
            <>
              <div className="field full">
                <label htmlFor="bookingType">Booking Type</label>
                <select
                  id="bookingType"
                  value={form.bookingType}
                  onChange={(event) =>
                    handleTypeChange(event.target.value as BookingType)
                  }
                >
                  {BOOKING_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {BOOKING_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="customerName">Customer Name</label>
                <input
                  id="customerName"
                  value={form.customerName}
                  onChange={(event) => update('customerName', event.target.value)}
                  placeholder="Full name"
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="customerPhone">Phone</label>
                <input
                  id="customerPhone"
                  value={form.customerPhone}
                  onChange={(event) => update('customerPhone', event.target.value)}
                  placeholder="+968 ..."
                />
              </div>
              <div className="field full">
                <label htmlFor="customerEmail">Email</label>
                <input
                  id="customerEmail"
                  type="email"
                  value={form.customerEmail}
                  onChange={(event) => update('customerEmail', event.target.value)}
                  placeholder="optional"
                />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="checkIn">{halfDay && !isBlocked ? 'Date' : 'Check-in'}</label>
            <DateField
              id="checkIn"
              value={form.checkInDate}
              onChange={handleCheckInChange}
            />
          </div>
          {!(halfDay && !isBlocked) && (
            <div className="field">
              <label htmlFor="checkOut">Check-out</label>
              <DateField
                id="checkOut"
                value={form.checkOutDate}
                min={form.checkInDate}
                onChange={(value) => update('checkOutDate', value)}
              />
            </div>
          )}

          {!isBlocked && (
            <>
              <div className="field">
                <label htmlFor="price">Price (OMR)</label>
                <input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.price}
                  onChange={(event) => update('price', parseAmount(event.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor="insurance">Insurance / Deposit (OMR)</label>
                <input
                  id="insurance"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.insurancePrice}
                  onChange={(event) =>
                    update('insurancePrice', parseAmount(event.target.value))
                  }
                />
              </div>
            </>
          )}

          <div className="field full">
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              value={form.note}
              onChange={(event) => update('note', event.target.value)}
              placeholder={isBlocked ? 'Reason for blocking (e.g. maintenance)' : 'Optional note'}
            />
          </div>

          {!isBlocked && (
            <div className="field full">
              <label>Tags</label>
              <TagInput
                value={form.tags}
                suggestions={DEFAULT_TAGS}
                onChange={(tags) => update('tags', tags)}
              />
            </div>
          )}
        </div>

        {!isBlocked && (
          <div className="banner" style={{ marginTop: 16 }}>
            {halfDay ? BOOKING_TYPE_LABELS[form.bookingType] : `${nights} night${nights === 1 ? '' : 's'}`}{' '}
            · Total <strong>{formatOmr(totalPrice)}</strong> (price {formatOmr(form.price)} +
            insurance {formatOmr(form.insurancePrice)})
          </div>
        )}

        <div className="modal-footer">
          {onDelete ? (
            <button type="button" className="btn btn-danger" onClick={onDelete}>
              Delete
            </button>
          ) : (
            <span className="spacer" />
          )}
          <div className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
