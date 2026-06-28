import type { AppSettings } from '../types';

const SETTINGS_KEY = 'chalet:settings';

const DEFAULT_SETTINGS: AppSettings = {
  syncUrl: '',
  syncToken: '',
  autoSync: true,
  lastSyncedAt: null,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
