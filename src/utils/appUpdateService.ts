import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface AppUpdateConfig {
  id: string;
  url: string;
  buttonLabel: string;
  badgeText: string;
  tooltipText: string;
  isEnabled: boolean;
  versionTag?: string;
  rgbGlowEnabled?: boolean;
  rgbGlowStyle?: 'rainbow' | 'cyberpunk' | 'neon-emerald' | 'fire';
  rgbGlowHalo?: boolean;
  updatedBy?: string;
  updatedAt?: number;
}

export const APP_UPDATE_CONFIG_DOC = 'app_update_link';
export const SYSTEM_CONFIG_COLLECTION = 'system_config';
const LOCAL_STORAGE_CACHE_KEY = 'sayonika_app_update_config_v1';

export const DEFAULT_APP_UPDATE_CONFIG: AppUpdateConfig = {
  id: APP_UPDATE_CONFIG_DOC,
  url: 'https://drive.google.com/file/d/1vYMt9gSex2T65hQS_x6cPC6SC5R6Ah-l/view?usp=drive_link',
  buttonLabel: 'Update App',
  badgeText: 'NEW',
  tooltipText: 'Download latest update / installer for PC (Google Drive)',
  isEnabled: true,
  versionTag: 'v2.4',
  rgbGlowEnabled: true,
  rgbGlowStyle: 'rainbow',
  rgbGlowHalo: false,
  updatedBy: 'Developer (Samit Biswas)',
  updatedAt: Date.now(),
};

/**
 * Retrieve cached configuration from local storage for instant rendering
 */
export function getLocalAppUpdateConfig(): AppUpdateConfig {
  if (typeof window === 'undefined') return DEFAULT_APP_UPDATE_CONFIG;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (!raw) return DEFAULT_APP_UPDATE_CONFIG;
    return { ...DEFAULT_APP_UPDATE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_APP_UPDATE_CONFIG;
  }
}

/**
 * Save configuration to local storage
 */
export function saveLocalAppUpdateConfig(cfg: AppUpdateConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(cfg));
  } catch {}
}

/**
 * Fetch current update link configuration once from Firestore
 */
export async function getAppUpdateConfig(): Promise<AppUpdateConfig> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, APP_UPDATE_CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { ...DEFAULT_APP_UPDATE_CONFIG, ...snap.data() } as AppUpdateConfig;
      saveLocalAppUpdateConfig(data);
      return data;
    }
    // Seed default if not exists
    await setDoc(docRef, DEFAULT_APP_UPDATE_CONFIG);
    saveLocalAppUpdateConfig(DEFAULT_APP_UPDATE_CONFIG);
    return DEFAULT_APP_UPDATE_CONFIG;
  } catch (err) {
    console.warn('Failed to load app update link config from Firestore, using cached/default:', err);
    return getLocalAppUpdateConfig();
  }
}

/**
 * Real-time listener for Firestore app update link configuration
 */
export function subscribeToAppUpdateConfig(
  onUpdate: (config: AppUpdateConfig) => void
): () => void {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, APP_UPDATE_CONFIG_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = { ...DEFAULT_APP_UPDATE_CONFIG, ...snap.data() } as AppUpdateConfig;
        saveLocalAppUpdateConfig(data);
        onUpdate(data);
      } else {
        // Auto-seed default
        setDoc(docRef, DEFAULT_APP_UPDATE_CONFIG).catch(() => {});
        saveLocalAppUpdateConfig(DEFAULT_APP_UPDATE_CONFIG);
        onUpdate(DEFAULT_APP_UPDATE_CONFIG);
      }
    }, (error) => {
      console.warn('App update link Firestore sync error:', error);
      onUpdate(getLocalAppUpdateConfig());
    });
  } catch (err) {
    console.error('Failed to subscribe to app update config:', err);
    return () => {};
  }
}

/**
 * Save updated app update link config to Firestore (Admin / Developer)
 */
export async function saveAppUpdateConfig(
  config: Partial<AppUpdateConfig>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, APP_UPDATE_CONFIG_DOC);
    const existing = await getDoc(docRef);
    const prevData = existing.exists() 
      ? (existing.data() as AppUpdateConfig) 
      : DEFAULT_APP_UPDATE_CONFIG;
    
    const merged: AppUpdateConfig = {
      ...prevData,
      ...config,
      id: APP_UPDATE_CONFIG_DOC,
      updatedBy: updatedBy || 'Admin',
      updatedAt: Date.now(),
    };

    await setDoc(docRef, merged);
    saveLocalAppUpdateConfig(merged);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error saving app update link to Firestore:', err);
    return { success: false, error: errorMsg || 'Failed to save app update link.' };
  }
}
