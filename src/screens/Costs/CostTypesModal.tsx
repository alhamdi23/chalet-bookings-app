import { useState } from 'react';
import Modal from '../../components/Modal';
import type { CostType } from '../../types';

interface CostTypesModalProps {
  costTypes: CostType[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onRemove: (id: string) => void;
}

export default function CostTypesModal({
  costTypes,
  onClose,
  onAdd,
  onToggle,
  onRemove,
}: CostTypesModalProps) {
  const [name, setName] = useState('');

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim()) {
      onAdd(name);
      setName('');
    }
  };

  return (
    <Modal title="Manage Cost Types" onClose={onClose}>
      <form onSubmit={handleAdd} className="filters" style={{ marginBottom: 16 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="newType">New cost type</label>
          <input
            id="newType"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Gardener"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {costTypes.map((type) => (
            <tr key={type.id}>
              <td>{type.name}</td>
              <td style={{ textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    gap: 8,
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    className={`btn btn-sm${type.active ? '' : ' btn-ghost'}`}
                    onClick={() => onToggle(type.id, !type.active)}
                  >
                    {type.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove cost type "${type.name}"? Existing costs that use it are kept.`,
                        )
                      ) {
                        onRemove(type.id);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="modal-footer">
        <div className="spacer" />
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
