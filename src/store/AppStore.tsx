import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppSettings,
  Booking,
  CostType,
  OperationCost,
} from '../types';
import * as repo from '../data/localRepo';
import { loadSettings, saveSettings } from '../data/settings';
import {
  cloudEnabled,
  manualSync,
  pushRecord,
  pushWeekdayPricing,
  subscribeAll,
  subscribeWeekdayPricing,
} from '../data/firestoreSync';
import { newId, nowIso } from '../utils/id';

const DEFAULT_COST_TYPE_NAMES = [
  'Water Bill',
  'Electricity Bill',
  'House Keeper',
  'Maintenance',
  'Internet',
];

type NewBooking = Omit<Booking, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>;
type NewCost = Omit<OperationCost, 'id' | 'createdAt' | 'updatedAt' | 'deleted'>;

interface AppStoreValue {
  bookings: Booking[];
  costs: OperationCost[];
  costTypes: CostType[];
  settings: AppSettings;
  syncing: boolean;
  syncMessage: string | null;

  addBooking: (data: NewBooking) => void;
  updateBooking: (id: string, data: NewBooking) => void;
  deleteBooking: (id: string) => void;

  addCost: (data: NewCost) => void;
  updateCost: (id: string, data: NewCost) => void;
  deleteCost: (id: string) => void;

  addCostType: (name: string) => void;
  setCostTypeActive: (id: string, active: boolean) => void;
  deleteCostType: (id: string) => void;

  updateSettings: (settings: AppSettings) => void;
  runSync: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

/** Deterministic id so both devices seed the SAME default record (merges to one). */
function seedId(name: string): string {
  return 'seed-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function seedCostTypesIfEmpty(): CostType[] {
  const existing = repo.listAll<CostType>('costTypes');
  if (existing.length > 0) {
    return repo.list<CostType>('costTypes');
  }
  for (const name of DEFAULT_COST_TYPE_NAMES) {
    repo.upsert<CostType>('costTypes', {
      id: seedId(name),
      name,
      active: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deleted: false,
    });
  }
  return repo.list<CostType>('costTypes');
}

/** Backfill fields added in later versions so older records stay valid. */
function normalizeBooking(booking: Booking): Booking {
  return {
    ...booking,
    bookingType: booking.bookingType ?? 'OvernightStay',
    tags: Array.isArray(booking.tags) ? booking.tags : [],
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [costs, setCosts] = useState<OperationCost[]>([]);
  const [costTypes, setCostTypes] = useState<CostType[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setBookings(repo.list<Booking>('bookings').map(normalizeBooking));
    setCosts(repo.list<OperationCost>('operationCosts'));
    setCostTypes(repo.list<CostType>('costTypes'));
  }, []);

  useEffect(() => {
    seedCostTypesIfEmpty();
    refresh();
    // Real-time cloud subscription: merges remote changes into local cache and
    // refreshes the UI. Returns an unsubscribe handler.
    const unsubscribe = subscribeAll(refresh);
    // Shared weekday pricing: apply the remote value when it's newer than the
    // local copy (last-write-wins), so all users stay in sync.
    const unsubscribePricing = subscribeWeekdayPricing((remote) => {
      setSettings((prev) => {
        if (remote.updatedAt <= prev.weekdayPricingUpdatedAt) {
          return prev;
        }
        const next: AppSettings = {
          ...prev,
          weekdayPricing: remote.pricing,
          weekdayPricingUpdatedAt: remote.updatedAt,
        };
        saveSettings(next);
        return next;
      });
    });
    return () => {
      unsubscribe();
      unsubscribePricing();
    };
  }, [refresh]);

  const addBooking = useCallback(
    (data: NewBooking) => {
      const saved = repo.upsert<Booking>('bookings', {
        ...data,
        id: newId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deleted: false,
      });
      pushRecord('bookings', saved);
      refresh();
    },
    [refresh],
  );

  const updateBooking = useCallback(
    (id: string, data: NewBooking) => {
      const existing = repo
        .listAll<Booking>('bookings')
        .find((booking) => booking.id === id);
      if (!existing) {
        return;
      }
      const saved = repo.upsert<Booking>('bookings', {
        ...existing,
        ...data,
        id,
        updatedAt: nowIso(),
      });
      pushRecord('bookings', saved);
      refresh();
    },
    [refresh],
  );

  const deleteBooking = useCallback(
    (id: string) => {
      const removed = repo.softDelete<Booking>('bookings', id);
      if (removed) {
        pushRecord('bookings', removed);
      }
      refresh();
    },
    [refresh],
  );

  const addCost = useCallback(
    (data: NewCost) => {
      const saved = repo.upsert<OperationCost>('operationCosts', {
        ...data,
        id: newId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deleted: false,
      });
      pushRecord('operationCosts', saved);
      refresh();
    },
    [refresh],
  );

  const updateCost = useCallback(
    (id: string, data: NewCost) => {
      const existing = repo
        .listAll<OperationCost>('operationCosts')
        .find((cost) => cost.id === id);
      if (!existing) {
        return;
      }
      const saved = repo.upsert<OperationCost>('operationCosts', {
        ...existing,
        ...data,
        id,
        updatedAt: nowIso(),
      });
      pushRecord('operationCosts', saved);
      refresh();
    },
    [refresh],
  );

  const deleteCost = useCallback(
    (id: string) => {
      const removed = repo.softDelete<OperationCost>('operationCosts', id);
      if (removed) {
        pushRecord('operationCosts', removed);
      }
      refresh();
    },
    [refresh],
  );

  const addCostType = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }
      // Prevent duplicates: match an existing record (including soft-deleted
      // ones) by case-insensitive name. Reuse its id so we update in place
      // instead of creating a second entry with the same name.
      const existing = repo
        .listAll<CostType>('costTypes')
        .find(
          (type) => type.name.trim().toLowerCase() === trimmed.toLowerCase(),
        );
      if (existing && !existing.deleted && existing.active) {
        return;
      }
      const saved = repo.upsert<CostType>('costTypes', {
        id: existing?.id ?? newId(),
        name: trimmed,
        active: true,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        deleted: false,
      });
      pushRecord('costTypes', saved);
      refresh();
    },
    [refresh],
  );

  const setCostTypeActive = useCallback(
    (id: string, active: boolean) => {
      const existing = repo
        .listAll<CostType>('costTypes')
        .find((type) => type.id === id);
      if (!existing) {
        return;
      }
      const saved = repo.upsert<CostType>('costTypes', {
        ...existing,
        active,
        updatedAt: nowIso(),
      });
      pushRecord('costTypes', saved);
      refresh();
    },
    [refresh],
  );

  const deleteCostType = useCallback(
    (id: string) => {
      const removed = repo.softDelete<CostType>('costTypes', id);
      if (removed) {
        pushRecord('costTypes', removed);
      }
      refresh();
    },
    [refresh],
  );

  const updateSettings = useCallback((next: AppSettings) => {
    setSettings((prev) => {
      let toSave = next;
      // When the shared weekday pricing changes, stamp it and push to the cloud
      // so every signed-in user sees the same prices.
      if (
        JSON.stringify(prev.weekdayPricing) !== JSON.stringify(next.weekdayPricing)
      ) {
        const stamp = nowIso();
        toSave = { ...next, weekdayPricingUpdatedAt: stamp };
        pushWeekdayPricing({ pricing: toSave.weekdayPricing, updatedAt: stamp });
      }
      saveSettings(toSave);
      return toSave;
    });
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await manualSync();
      const next: AppSettings = { ...settings, lastSyncedAt: nowIso() };
      saveSettings(next);
      setSettings(next);
      refresh();
      setSyncMessage(`Synced. Pulled ${result.pulled}, pushed ${result.pushed} records.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed.';
      setSyncMessage(message);
    } finally {
      setSyncing(false);
    }
  }, [settings, refresh]);

  // Auto-sync once on load when cloud is configured and online. Real-time
  // listeners keep things in sync afterwards.
  useEffect(() => {
    if (settings.autoSync && cloudEnabled && navigator.onLine) {
      void runSync();
    }
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      bookings,
      costs,
      costTypes,
      settings,
      syncing,
      syncMessage,
      addBooking,
      updateBooking,
      deleteBooking,
      addCost,
      updateCost,
      deleteCost,
      addCostType,
      setCostTypeActive,
      deleteCostType,
      updateSettings,
      runSync,
    }),
    [
      bookings,
      costs,
      costTypes,
      settings,
      syncing,
      syncMessage,
      addBooking,
      updateBooking,
      deleteBooking,
      addCost,
      updateCost,
      deleteCost,
      addCostType,
      setCostTypeActive,
      deleteCostType,
      updateSettings,
      runSync,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
}
