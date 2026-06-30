import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { Syncable, WeekdayPrice } from '../types';
import { listAll, mergeCollection, type CollectionKey } from './localRepo';

const COLLECTIONS: CollectionKey[] = ['bookings', 'operationCosts', 'costTypes'];

/** Firestore location of the shared weekday pricing document. */
const APP_CONFIG = 'appConfig';
const WEEKDAY_PRICING_DOC = 'weekdayPricing';

/** Shape of the shared weekday pricing document stored in Firestore. */
export interface WeekdayPricingDoc {
  pricing: WeekdayPrice[];
  updatedAt: string;
}

/**
 * Snapshot of how the live listener is doing, derived from Firestore snapshot
 * metadata. `fromCache` is true when data is served from the offline cache (no
 * live server connection); `hasPendingWrites` is true while local writes are
 * still queued and have not been acknowledged by the server yet.
 */
export interface SyncSnapshotStatus {
  fromCache: boolean;
  hasPendingWrites: boolean;
}


/** True when a Firebase project has been configured in firebase/config.ts. */
export const cloudEnabled = isFirebaseConfigured;

/**
 * Push a single record to Firestore (fire-and-forget). The Firestore SDK queues
 * the write offline and sends it automatically when back online.
 */
export function pushRecord(key: CollectionKey, record: Syncable): void {
  if (!isFirebaseConfigured || !db) {
    return;
  }
  void setDoc(doc(db, key, record.id), { ...record });
}

/**
 * Push the shared weekday pricing to Firestore so every user sees the same
 * prices. Fire-and-forget; the SDK queues the write while offline.
 */
export function pushWeekdayPricing(payload: WeekdayPricingDoc): void {
  if (!isFirebaseConfigured || !db) {
    return;
  }
  void setDoc(doc(db, APP_CONFIG, WEEKDAY_PRICING_DOC), { ...payload });
}

/**
 * Subscribe to the shared weekday pricing document. `onChange` is invoked with
 * the remote value whenever it changes so the UI/local settings can update.
 * Returns an unsubscribe function.
 */
export function subscribeWeekdayPricing(
  onChange: (doc: WeekdayPricingDoc) => void,
): () => void {
  if (!isFirebaseConfigured || !db) {
    return () => undefined;
  }
  return onSnapshot(doc(db, APP_CONFIG, WEEKDAY_PRICING_DOC), (snapshot) => {
    const data = snapshot.data() as WeekdayPricingDoc | undefined;
    if (data && Array.isArray(data.pricing)) {
      onChange(data);
    }
  });
}

/** One-off fetch of the shared weekday pricing (used during manual sync). */
export async function fetchWeekdayPricing(): Promise<WeekdayPricingDoc | null> {
  if (!isFirebaseConfigured || !db) {
    return null;
  }
  const snapshot = await getDoc(doc(db, APP_CONFIG, WEEKDAY_PRICING_DOC));
  const data = snapshot.data() as WeekdayPricingDoc | undefined;
  return data && Array.isArray(data.pricing) ? data : null;
}


/**
 * Subscribe to real-time updates for all collections. On every change the
 * incoming records are merged into localStorage (last-write-wins by updatedAt)
 * and `onChange` is invoked so the UI refreshes. Returns an unsubscribe fn.
 *
 * `onStatus` (optional) is called with aggregate snapshot metadata so the UI
 * can show whether we are live, serving cached/offline data, or still flushing
 * pending local writes. We pass `includeMetadataChanges` so the callback fires
 * when only the connection state changes (e.g. cache -> live on reconnect).
 */
export function subscribeAll(
  onChange: () => void,
  onStatus?: (status: SyncSnapshotStatus) => void,
): () => void {
  if (!isFirebaseConfigured || !db) {
    return () => undefined;
  }
  // Track the latest metadata per collection so we can report an aggregate.
  const fromCacheByKey = new Map<CollectionKey, boolean>();
  const pendingByKey = new Map<CollectionKey, boolean>();

  const emitStatus = () => {
    if (!onStatus) {
      return;
    }
    const fromCache = Array.from(fromCacheByKey.values()).some(Boolean);
    const hasPendingWrites = Array.from(pendingByKey.values()).some(Boolean);
    onStatus({ fromCache, hasPendingWrites });
  };

  const unsubs = COLLECTIONS.map((key) =>
    onSnapshot(
      collection(db!, key),
      { includeMetadataChanges: true },
      (snapshot) => {
        const incoming = snapshot.docs.map((d) => d.data() as Syncable);
        mergeCollection<Syncable>(key, incoming);
        fromCacheByKey.set(key, snapshot.metadata.fromCache);
        pendingByKey.set(key, snapshot.metadata.hasPendingWrites);
        onChange();
        emitStatus();
      },
    ),
  );
  return () => unsubs.forEach((unsub) => unsub());
}

/**
 * Manual full sync: pull every remote record, merge locally, then push the
 * merged local state back. Mostly redundant with the real-time listener but
 * gives the user a "force sync" button and a success count.
 */
export async function manualSync(): Promise<{ pulled: number; pushed: number }> {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Cloud sync is not configured. Add your Firebase config in src/firebase/config.ts.');
  }
  let pulled = 0;
  let pushed = 0;
  for (const key of COLLECTIONS) {
    const snapshot = await getDocs(collection(db, key));
    const incoming = snapshot.docs.map((d) => d.data() as Syncable);
    pulled += incoming.length;
    mergeCollection<Syncable>(key, incoming);

    const local = listAll<Syncable>(key);
    if (local.length > 0) {
      const batch = writeBatch(db);
      for (const record of local) {
        batch.set(doc(db, key, record.id), { ...record });
        pushed += 1;
      }
      await batch.commit();
    }
  }
  return { pulled, pushed };
}
