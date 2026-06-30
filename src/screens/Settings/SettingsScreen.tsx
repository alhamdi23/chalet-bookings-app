import { useRef, useState } from 'react';
import { useAppStore } from '../../store/AppStore';
import { cloudEnabled } from '../../data/firestoreSync';
import { useAuth } from '../../auth/AuthProvider';
import { formatDisplayDate } from '../../utils/dates';
import {
  DEFAULT_APP_NAME,
  resolveLogoSrc,
} from '../../data/settings';

/** Read an image file and return a square-ish PNG data URL capped at maxSize px. */
function fileToResizedDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process the image.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function SettingsScreen() {
  const { settings, updateSettings, runSync, syncing, syncMessage } = useAppStore();
  const { user, logOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const handleLogoFile = async (file: File | undefined) => {
    setLogoError(null);
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file (PNG, JPG or SVG).');
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      updateSettings({ ...settings, logoDataUrl: dataUrl });
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Could not load that image.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {syncMessage && <div className="banner">{syncMessage}</div>}

      <div className="card" style={{ maxWidth: 640, marginBottom: 16 }}>
        <h3 className="chart-title">Branding</h3>
        <p className="kpi-sub" style={{ marginBottom: 16 }}>
          Set the name and logo shown across the app. These are saved on this device.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <img
            src={resolveLogoSrc(settings)}
            alt={settings.appName}
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              border: '1px solid var(--border)',
              objectFit: 'cover',
              background: 'var(--surface-2)',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              className="btn btn-sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Logo
            </button>
            <button
              className="btn btn-sm btn-ghost"
              type="button"
              disabled={!settings.logoDataUrl}
              onClick={() => {
                setLogoError(null);
                updateSettings({ ...settings, logoDataUrl: null });
              }}
            >
              Use Default
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                void handleLogoFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>
        </div>

        {logoError && (
          <div className="banner banner-error" style={{ marginBottom: 14 }}>
            {logoError}
          </div>
        )}

        <div className="field full">
          <label htmlFor="appName">App Name</label>
          <input
            id="appName"
            type="text"
            value={settings.appName}
            placeholder={DEFAULT_APP_NAME}
            onChange={(event) =>
              updateSettings({ ...settings, appName: event.target.value })
            }
          />
        </div>
      </div>

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
            Real-time cloud sync is <strong>active</strong>. The app opens
            instantly from data saved on this device, then loads the latest from
            the server in the background and keeps every device in sync — no
            button needed. It also works fully offline and syncs automatically
            when the connection returns. The status badge shows the current state.
          </p>
        ) : (
          <p className="kpi-sub" style={{ marginBottom: 16 }}>
            Cloud sync is <strong>not configured yet</strong>. The app still works
            and stores everything on this device. To sync across your PC and iPhone,
            add your Firebase config in <code>src/firebase/config.ts</code> and
            redeploy. Setup steps are in that file.
          </p>
        )}

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
