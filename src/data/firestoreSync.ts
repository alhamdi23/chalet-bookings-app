import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { Syncable } from '../types';
import { listAll, mergeCollection, type CollectionKey } from './localRepo';

const COLLECTIONS: CollectionKey[] = ['bookings', 'operationCosts', 'costTypes'];

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
 * Subscribe to real-time updates for all collections. On every change the
 * incoming records are merged into localStorage (last-write-wins by updatedAt)
 * and `onChange` is invoked so the UI refreshes. Returns an unsubscribe fn.
 */
export function subscribeAll(onChange: () => void): () => void {
  if (!isFirebaseConfigured || !db) {
    return () => undefined;
  }
  const unsubs = COLLECTIONS.map((key) =>
    onSnapshot(collection(db!, key), (snapshot) => {
      const incoming = snapshot.docs.map((d) => d.data() as Syncable);
      mergeCollection<Syncable>(key, incoming);
      onChange();
    }),
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
