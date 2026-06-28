import type { AppSettings, Booking, CostType, OperationCost } from '../types';
import { listAll, mergeCollection } from './localRepo';

export interface SyncPayload {
  bookings: Booking[];
  operationCosts: OperationCost[];
  costTypes: CostType[];
}

export interface SyncResult {
  pulled: number;
  pushed: number;
}

function collectLocal(): SyncPayload {
  return {
    bookings: listAll<Booking>('bookings'),
    operationCosts: listAll<OperationCost>('operationCosts'),
    costTypes: listAll<CostType>('costTypes'),
  };
}

/**
 * Pull remote records, merge into local (last-write-wins), then push the merged
 * set back so both sides converge. Uses text/plain to avoid a CORS preflight
 * against the Apps Script web app.
 */
export async function syncNow(settings: AppSettings): Promise<SyncResult> {
  if (!settings.syncUrl) {
    throw new Error('No sync URL configured. Add it in Settings.');
  }

  // 1. Pull
  const pullUrl = `${settings.syncUrl}?token=${encodeURIComponent(settings.syncToken)}`;
  const pullResponse = await fetch(pullUrl, { method: 'GET' });
  if (!pullResponse.ok) {
    throw new Error(`Pull failed (${pullResponse.status}). Check the URL and token.`);
  }
  const remote = (await pullResponse.json()) as Partial<SyncPayload> & { error?: string };
  if (remote.error) {
    throw new Error(`Server: ${remote.error}`);
  }

  let pulled = 0;
  if (remote.bookings) {
    pulled += remote.bookings.length;
    mergeCollection<Booking>('bookings', remote.bookings);
  }
  if (remote.operationCosts) {
    pulled += remote.operationCosts.length;
    mergeCollection<OperationCost>('operationCosts', remote.operationCosts);
  }
  if (remote.costTypes) {
    pulled += remote.costTypes.length;
    mergeCollection<CostType>('costTypes', remote.costTypes);
  }

  // 2. Push merged local state back
  const local = collectLocal();
  const pushResponse = await fetch(settings.syncUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: settings.syncToken, ...local }),
  });
  if (!pushResponse.ok) {
    throw new Error(`Push failed (${pushResponse.status}).`);
  }
  const pushJson = (await pushResponse.json()) as { error?: string };
  if (pushJson.error) {
    throw new Error(`Server: ${pushJson.error}`);
  }

  const pushed =
    local.bookings.length + local.operationCosts.length + local.costTypes.length;

  return { pulled, pushed };
}
