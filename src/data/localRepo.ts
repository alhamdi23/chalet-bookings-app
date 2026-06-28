import type { Syncable } from '../types';
import { nowIso } from '../utils/id';

const PREFIX = 'chalet:';

export type CollectionKey = 'bookings' | 'operationCosts' | 'costTypes';

function read<T>(key: CollectionKey): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: CollectionKey, items: T[]): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(items));
}

/** Return all non-deleted records of a collection. */
export function list<T extends Syncable>(key: CollectionKey): T[] {
  return read<T>(key).filter((item) => !item.deleted);
}

/** Return every record including soft-deleted ones (used for sync). */
export function listAll<T extends Syncable>(key: CollectionKey): T[] {
  return read<T>(key);
}

/** Insert or replace a record (matched by id), stamping updatedAt. */
export function upsert<T extends Syncable>(key: CollectionKey, record: T): T {
  const items = read<T>(key);
  const stamped = { ...record, updatedAt: nowIso() };
  const index = items.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    items[index] = stamped;
  } else {
    items.push(stamped);
  }
  write(key, items);
  return stamped;
}

/** Soft-delete a record by id (keeps a tombstone for sync). */
export function softDelete<T extends Syncable>(key: CollectionKey, id: string): void {
  const items = read<T>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) {
    items[index] = { ...items[index], deleted: true, updatedAt: nowIso() };
    write(key, items);
  }
}

/**
 * Merge incoming records into a collection using last-write-wins by updatedAt.
 * Returns the merged set (including tombstones).
 */
export function mergeCollection<T extends Syncable>(
  key: CollectionKey,
  incoming: T[],
): T[] {
  const current = read<T>(key);
  const byId = new Map<string, T>();
  for (const item of current) {
    byId.set(item.id, item);
  }
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      byId.set(item.id, item);
    }
  }
  const merged = Array.from(byId.values());
  write(key, merged);
  return merged;
}
