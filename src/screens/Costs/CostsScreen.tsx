import { useMemo, useState } from 'react';
import type { OperationCost } from '../../types';
import { useAppStore } from '../../store/AppStore';
import { formatOmr } from '../../utils/currency';
import { formatDisplayDate, isWithinIso, todayIso } from '../../utils/dates';
import { startOfMonth } from 'date-fns';
import { toIsoDate } from '../../utils/dates';
import DateField from '../../components/DateField';
import { exportExcel, type CellValue } from '../../utils/exportExcel';
import CostForm, { emptyCost, type CostFormData } from './CostForm';
import CostTypesModal from './CostTypesModal';

type EditState =
  | { mode: 'new' }
  | { mode: 'edit'; cost: OperationCost };

export default function CostsScreen() {
  const {
    costs,
    costTypes,
    addCost,
    updateCost,
    deleteCost,
    addCostType,
    setCostTypeActive,
  } = useAppStore();

  const [fromDate, setFromDate] = useState<string>(toIsoDate(startOfMonth(new Date())));
  const [toDate, setToDate] = useState<string>(todayIso());
  const [editState, setEditState] = useState<EditState | null>(null);
  const [managingTypes, setManagingTypes] = useState(false);

  const typeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of costTypes) {
      map.set(type.id, type.name);
    }
    return map;
  }, [costTypes]);

  const activeTypes = useMemo(
    () => costTypes.filter((type) => type.active),
    [costTypes],
  );

  const filtered = useMemo(
    () =>
      costs
        .filter((cost) => isWithinIso(cost.date, fromDate, toDate))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [costs, fromDate, toDate],
  );

  const total = useMemo(
    () => filtered.reduce((sum, cost) => sum + cost.amount, 0),
    [filtered],
  );

  const handleSubmit = (data: CostFormData) => {
    if (editState?.mode === 'edit') {
      updateCost(editState.cost.id, data);
    } else {
      addCost(data);
    }
    setEditState(null);
  };

  const handleDelete = () => {
    if (editState?.mode === 'edit') {
      deleteCost(editState.cost.id);
      setEditState(null);
    }
  };

  const handleExport = () => {
    const rows: CellValue[][] = filtered.map((cost) => [
      formatDisplayDate(cost.date),
      typeNameById.get(cost.costTypeId) ?? 'Unknown',
      cost.note,
      cost.amount,
    ]);
    rows.push(['', '', 'Total', total]);

    exportExcel(`operation-costs-${fromDate}_to_${toDate}`, [
      {
        name: 'Operation Costs',
        headers: ['Date', 'Type', 'Note', 'Amount (OMR)'],
        rows,
      },
    ]);
  };

  const defaultTypeId = activeTypes[0]?.id ?? '';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Operation Costs</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setManagingTypes(true)}>
            Cost Types
          </button>
          <button
            className="btn"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            ⬇ Export Excel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setEditState({ mode: 'new' })}
            disabled={activeTypes.length === 0}
          >
            + Add Cost
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="field">
          <label htmlFor="from">From</label>
          <DateField id="from" value={fromDate} onChange={setFromDate} />
        </div>
        <div className="field">
          <label htmlFor="to">To</label>
          <DateField id="to" value={toDate} onChange={setToDate} />
        </div>
        <div className="kpi-card" style={{ padding: '10px 18px' }}>
          <div className="kpi-label">Total in range</div>
          <div className="kpi-value" style={{ fontSize: 20 }}>
            {formatOmr(total)}
          </div>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">No costs recorded in this range.</div>
        ) : (
          <div className="table-scroll">
            <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Note</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cost) => (
                <tr key={cost.id}>
                  <td>{formatDisplayDate(cost.date)}</td>
                  <td>{typeNameById.get(cost.costTypeId) ?? 'Unknown'}</td>
                  <td>{cost.note}</td>
                  <td style={{ textAlign: 'right' }}>{formatOmr(cost.amount)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setEditState({ mode: 'edit', cost })}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {editState && (
        <CostForm
          title={editState.mode === 'edit' ? 'Edit Cost' : 'New Cost'}
          initial={editState.mode === 'edit' ? editState.cost : emptyCost(defaultTypeId)}
          costTypes={editState.mode === 'edit' ? costTypes : activeTypes}
          onSubmit={handleSubmit}
          onClose={() => setEditState(null)}
          onDelete={editState.mode === 'edit' ? handleDelete : undefined}
        />
      )}

      {managingTypes && (
        <CostTypesModal
          costTypes={costTypes}
          onClose={() => setManagingTypes(false)}
          onAdd={addCostType}
          onToggle={setCostTypeActive}
        />
      )}
    </div>
  );
}
