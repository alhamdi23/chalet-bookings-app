import { useAppStore, type ConnectionStatus } from '../store/AppStore';

/** Visual config for each connection state: dot colour + short label. */
const STATUS_META: Record<
  ConnectionStatus,
  { label: string; title: string; tone: string }
> = {
  local: {
    label: 'On this device',
    title: 'Cloud sync is not configured. Data is saved on this device only.',
    tone: 'muted',
  },
  offline: {
    label: 'Offline',
    title: 'No connection. Changes are saved locally and will sync when you are back online.',
    tone: 'offline',
  },
  connecting: {
    label: 'Connecting…',
    title: 'Showing your saved data while connecting to the server.',
    tone: 'connecting',
  },
  syncing: {
    label: 'Syncing…',
    title: 'Connected. Sending your latest changes to the server.',
    tone: 'syncing',
  },
  live: {
    label: 'Up to date',
    title: 'Connected and fully in sync with the server.',
    tone: 'live',
  },
};

/**
 * Small online/offline + sync indicator. Renders nothing meaningful beyond a
 * coloured dot and a short label; the full explanation is in the tooltip.
 */
export default function SyncStatusBadge() {
  const { connectionStatus, pendingWrites } = useAppStore();
  const meta = STATUS_META[connectionStatus];

  // When offline but with queued changes, hint that work is saved and pending.
  const label =
    connectionStatus === 'offline' && pendingWrites
      ? 'Offline · pending'
      : meta.label;

  return (
    <div className={`sync-badge sync-badge-${meta.tone}`} title={meta.title}>
      <span className="sync-badge-dot" aria-hidden="true" />
      <span className="sync-badge-label">{label}</span>
    </div>
  );
}
