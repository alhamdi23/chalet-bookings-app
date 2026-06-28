import { useState } from 'react';
import { useAppStore } from '../../store/AppStore';
import type { AppSettings } from '../../types';
import { formatDisplayDate } from '../../utils/dates';

export default function SettingsScreen() {
  const { settings, updateSettings, runSync, syncing, syncMessage } = useAppStore();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    updateSettings(draft);
    setSaved(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {syncMessage && <div className="banner">{syncMessage}</div>}

      <div className="card" style={{ maxWidth: 640 }}>
        <h3 className="chart-title">Google Sheets Sync</h3>
        <p className="kpi-sub" style={{ marginBottom: 16 }}>
          Deploy the included Apps Script as a Web App, then paste its URL and your
          chosen token below. Your data stays in your own Google account.
        </p>

        <div className="field full" style={{ marginBottom: 14 }}>
          <label htmlFor="syncUrl">Apps Script Web App URL</label>
          <input
            id="syncUrl"
            value={draft.syncUrl}
            onChange={(event) => update('syncUrl', event.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
          />
        </div>

        <div className="field full" style={{ marginBottom: 14 }}>
          <label htmlFor="syncToken">Shared Token</label>
          <input
            id="syncToken"
            value={draft.syncToken}
            onChange={(event) => update('syncToken', event.target.value)}
            placeholder="A secret word you also set in the script"
          />
        </div>

        <div className="toggle-row" style={{ marginBottom: 18 }}>
          <input
            id="autoSync"
            type="checkbox"
            checked={draft.autoSync}
            onChange={(event) => update('autoSync', event.target.checked)}
          />
          <label htmlFor="autoSync">Auto-sync when the app opens (if online)</label>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
          <button className="btn" onClick={() => void runSync()} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          {saved && <span className="kpi-sub">Saved.</span>}
        </div>

        {settings.lastSyncedAt && (
          <p className="kpi-sub" style={{ marginTop: 14 }}>
            Last synced: {formatDisplayDate(settings.lastSyncedAt.slice(0, 10))}
          </p>
        )}
      </div>
    </div>
  );
}
