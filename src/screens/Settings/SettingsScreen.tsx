import { useAppStore } from '../../store/AppStore';
import { cloudEnabled } from '../../data/firestoreSync';
import { useAuth } from '../../auth/AuthProvider';
import { formatDisplayDate } from '../../utils/dates';

export default function SettingsScreen() {
  const { settings, updateSettings, runSync, syncing, syncMessage } = useAppStore();
  const { user, logOut } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {syncMessage && <div className="banner">{syncMessage}</div>}

      <div className="card" style={{ maxWidth: 640, marginBottom: 16 }}>
        <h3 className="chart-title">Account</h3>
        <p className="kpi-sub" style={{ marginBottom: 16 }}>
          Signed in as <strong>{user?.email ?? 'unknown'}</strong>.
        </p>
        <button className="btn" onClick={() => void logOut()}>
          Sign Out
        </button>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <h3 className="chart-title">Cloud Sync (Firebase)</h3>

        {cloudEnabled ? (
          <p className="kpi-sub" style={{ marginBottom: 16 }}>
            Real-time cloud sync is <strong>active</strong>. Bookings and costs sync
            automatically across all your devices — no button needed. The app also
            works offline and syncs when the connection returns.
          </p>
        ) : (
          <p className="kpi-sub" style={{ marginBottom: 16 }}>
            Cloud sync is <strong>not configured yet</strong>. The app still works
            and stores everything on this device. To sync across your PC and iPhone,
            add your Firebase config in <code>src/firebase/config.ts</code> and
            redeploy. Setup steps are in that file.
          </p>
        )}

        <div className="toggle-row" style={{ marginBottom: 18 }}>
          <input
            id="autoSync"
            type="checkbox"
            checked={settings.autoSync}
            onChange={(event) =>
              updateSettings({ ...settings, autoSync: event.target.checked })
            }
          />
          <label htmlFor="autoSync">Full sync when the app opens (if online)</label>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => void runSync()}
            disabled={syncing || !cloudEnabled}
          >
            {syncing ? 'Syncing…' : 'Force Sync Now'}
          </button>
          {!cloudEnabled && (
            <span className="kpi-sub">Add Firebase config to enable.</span>
          )}
        </div>

        {settings.lastSyncedAt && (
          <p className="kpi-sub" style={{ marginTop: 14 }}>
            Last full sync: {formatDisplayDate(settings.lastSyncedAt.slice(0, 10))}
          </p>
        )}
      </div>
    </div>
  );
}
