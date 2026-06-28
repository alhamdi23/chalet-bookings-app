import type { AppSettings } from '../types';

const SETTINGS_KEY = 'chalet:settings';

/** Default brand name shown until the user changes it in Settings. */
export const DEFAULT_APP_NAME = 'Ola Chalet';

/** Bundled brand logo used when no custom logo has been uploaded. */
export const DEFAULT_LOGO_SRC = `${import.meta.env.BASE_URL}brand-logo.svg`;

const DEFAULT_SETTINGS: AppSettings = {
  autoSync: true,
  lastSyncedAt: null,
  appName: DEFAULT_APP_NAME,
  logoDataUrl: null,
};

/** Resolve the logo image source: custom upload if present, else the brand logo. */
export function resolveLogoSrc(settings: AppSettings): string {
  return settings.logoDataUrl ?? DEFAULT_LOGO_SRC;
}

/** Resolve the display name, falling back to the brand default when blank. */
export function resolveAppName(settings: AppSettings): string {
  return settings.appName.trim() || DEFAULT_APP_NAME;
}

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
