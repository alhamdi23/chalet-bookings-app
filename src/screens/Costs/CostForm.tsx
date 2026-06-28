import { useState } from 'react';
import Modal from '../../components/Modal';
import DateField from '../../components/DateField';
import type { CostType, OperationCost } from '../../types';
import { parseAmount } from '../../utils/currency';
import { todayIso } from '../../utils/dates';

export type CostFormData = Omit<
  OperationCost,
  'id' | 'createdAt' | 'updatedAt' | 'deleted'
>;

interface CostFormProps {
  title: string;
  initial: CostFormData;
  costTypes: CostType[];
  onSubmit: (data: CostFormData) => void;
  onClose: () => void;
  onDelete?: () => void;
}

export function emptyCost(costTypeId: string): CostFormData {
  return {
    costTypeId,
    amount: 0,
    date: todayIso(),
    note: '',
  };
}

export default function CostForm({
  title,
  initial,
  costTypes,
  onSubmit,
  onClose,
  onDelete,
}: CostFormProps) {
  const [form, setForm] = useState<CostFormData>(initial);

  const update = <K extends keyof CostFormData>(key: K, value: CostFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.costTypeId || form.amount <= 0) {
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="costType">Cost Type</label>
            <select
              id="costType"
              value={form.costTypeId}
              onChange={(event) => update('costTypeId', event.target.value)}
            >
              {costTypes.length === 0 && <option value="">No cost types</option>}
              {costTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="amount">Amount (OMR)</label>
            <input
              id="amount"
              type="number"
              step="0.001"
              min="0"
              value={form.amount}
              onChange={(event) => update('amount', parseAmount(event.target.value))}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="date">Date</label>
            <DateField
              id="date"
              value={form.date}
              onChange={(value) => update('date', value)}
            />
          </div>
          <div className="field full">
            <label htmlFor="note">Note</label>
            <textarea
              id="note"
              value={form.note}
              onChange={(event) => update('note', event.target.value)}
              placeholder="Optional note"
            />
          </div>
        </div>

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
