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
import { syncNow } from '../data/syncService';
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

  updateSettings: (settings: AppSettings) => void;
  runSync: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function seedCostTypesIfEmpty(): CostType[] {
  const existing = repo.listAll<CostType>('costTypes');
  if (existing.length > 0) {
    return repo.list<CostType>('costTypes');
  }
  for (const name of DEFAULT_COST_TYPE_NAMES) {
    repo.upsert<CostType>('costTypes', {
      id: newId(),
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
  }, [refresh]);

  const addBooking = useCallback(
    (data: NewBooking) => {
      repo.upsert<Booking>('bookings', {
        ...data,
        id: newId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deleted: false,
      });
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
      repo.upsert<Booking>('bookings', {
        ...existing,
        ...data,
        id,
        updatedAt: nowIso(),
      });
      refresh();
    },
    [refresh],
  );

  const deleteBooking = useCallback(
    (id: string) => {
      repo.softDelete<Booking>('bookings', id);
      refresh();
    },
    [refresh],
  );

  const addCost = useCallback(
    (data: NewCost) => {
      repo.upsert<OperationCost>('operationCosts', {
        ...data,
        id: newId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deleted: false,
      });
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
      repo.upsert<OperationCost>('operationCosts', {
        ...existing,
        ...data,
        id,
        updatedAt: nowIso(),
      });
      refresh();
    },
    [refresh],
  );

  const deleteCost = useCallback(
    (id: string) => {
      repo.softDelete<OperationCost>('operationCosts', id);
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
      repo.upsert<CostType>('costTypes', {
        id: newId(),
        name: trimmed,
        active: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deleted: false,
      });
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
      repo.upsert<CostType>('costTypes', { ...existing, active, updatedAt: nowIso() });
      refresh();
    },
    [refresh],
  );

  const updateSettings = useCallback((next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncNow(settings);
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

  // Auto-sync on load when configured and online.
  useEffect(() => {
    if (settings.autoSync && settings.syncUrl && navigator.onLine) {
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
