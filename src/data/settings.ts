import type { AppSettings, WeekdayPrice } from '../types';

const SETTINGS_KEY = 'chalet:settings';

/** Default brand name shown until the user changes it in Settings. */
export const DEFAULT_APP_NAME = 'Ola Chalet';

/** Bundled brand logo used when no custom logo has been uploaded. */
export const DEFAULT_LOGO_SRC = `${import.meta.env.BASE_URL}brand-logo.svg`;

/** Seven empty weekday prices (index by JS getDay(): 0=Sun … 6=Sat). */
export function emptyWeekdayPricing(): WeekdayPrice[] {
  return Array.from({ length: 7 }, () => ({ price: 0, discount: 0 }));
}

/** Ensure weekdayPricing is always a 7-length array of valid entries. */
function normalizeWeekdayPricing(value: unknown): WeekdayPrice[] {
  const base = emptyWeekdayPricing();
  if (Array.isArray(value)) {
    for (let i = 0; i < 7; i += 1) {
      const entry = value[i] as Partial<WeekdayPrice> | undefined;
      if (entry) {
        base[i] = {
          price: Number(entry.price) || 0,
          discount: Number(entry.discount) || 0,
        };
      }
    }
  }
  return base;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoSync: true,
  lastSyncedAt: null,
  appName: DEFAULT_APP_NAME,
  logoDataUrl: null,
  weekdayPricing: emptyWeekdayPricing(),
  weekdayPricingUpdatedAt: '',
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
      return { ...DEFAULT_SETTINGS, weekdayPricing: emptyWeekdayPricing() };
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      weekdayPricing: normalizeWeekdayPricing(parsed.weekdayPricing),
      weekdayPricingUpdatedAt: parsed.weekdayPricingUpdatedAt ?? '',
    };
  } catch {
    return { ...DEFAULT_SETTINGS, weekdayPricing: emptyWeekdayPricing() };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
