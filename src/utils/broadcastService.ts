import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export type BroadcastTheme = 'sunset' | 'emerald' | 'navy' | 'crimson' | 'purple' | 'dark';

export interface BroadcastPopupConfig {
  id: string;
  isEnabled: boolean;
  title: string;
  subtitle?: string;
  badgeText?: string;
  bengaliNotice?: string;
  bengaliSubtext?: string;
  message?: string;
  theme: BroadcastTheme;
  showDownloadButton: boolean;
  downloadButtonLabel?: string;
  downloadUrl?: string;
  showTelegramButton: boolean;
  telegramHandle?: string;
  telegramUrl?: string;
  showFacebookButton: boolean;
  facebookUrl?: string;
  showCustomButton?: boolean;
  customButtonLabel?: string;
  customButtonUrl?: string;
  footerDisclaimer?: string;
  autoPopupOnLogin?: boolean;
  version: number;
  updatedBy?: string;
  updatedAt?: number;
}

export const BROADCAST_CONFIG_DOC = 'broadcast_popup';
export const SYSTEM_CONFIG_COLLECTION = 'system_config';

export const DEFAULT_BROADCAST_CONFIG: BroadcastPopupConfig = {
  id: BROADCAST_CONFIG_DOC,
  isEnabled: false,
  title: '',
  subtitle: '',
  badgeText: '',
  bengaliNotice: '',
  bengaliSubtext: '',
  message: '',
  theme: 'navy',
  showDownloadButton: false,
  downloadButtonLabel: '',
  downloadUrl: '',
  showTelegramButton: false,
  telegramHandle: '',
  telegramUrl: '',
  showFacebookButton: false,
  facebookUrl: '',
  showCustomButton: false,
  customButtonLabel: '',
  customButtonUrl: '',
  footerDisclaimer: '',
  autoPopupOnLogin: false,
  version: 1,
  updatedBy: '',
  updatedAt: Date.now(),
};

/**
 * Check if a config contains the obsolete hardcoded default texts or links
 */
function isLegacyDefaultConfig(data: any): boolean {
  if (!data) return false;
  return (
    data.title === 'Sayonika PVC Utility' ||
    data.subtitle === 'Developed by- Samit Biswas' ||
    data.telegramHandle === '@SamitBiltu' ||
    (typeof data.telegramUrl === 'string' && data.telegramUrl.includes('SamitBiltu')) ||
    (typeof data.downloadUrl === 'string' && data.downloadUrl.includes('1cW1xEja00P3dNjnjJZynm_C4lQ60W3g6')) ||
    (typeof data.facebookUrl === 'string' && data.facebookUrl.includes('18F2Prv45C')) ||
    (typeof data.bengaliNotice === 'string' && data.bengaliNotice.includes('এই অ্যাপ টি ব্যাবহার করতে কোন'))
  );
}

/**
 * Fetch current broadcast popup config once
 */
export async function getBroadcastConfig(): Promise<BroadcastPopupConfig> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, BROADCAST_CONFIG_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (isLegacyDefaultConfig(data)) {
        // Automatically overwrite legacy hardcoded default texts and links in Firestore
        await setDoc(docRef, DEFAULT_BROADCAST_CONFIG);
        return DEFAULT_BROADCAST_CONFIG;
      }
      return { ...DEFAULT_BROADCAST_CONFIG, ...data } as BroadcastPopupConfig;
    }
    // Seed clean empty config if not exists
    await setDoc(docRef, DEFAULT_BROADCAST_CONFIG);
    return DEFAULT_BROADCAST_CONFIG;
  } catch (err) {
    console.warn('Failed to load broadcast config from Firestore, using default:', err);
    return DEFAULT_BROADCAST_CONFIG;
  }
}

/**
 * Real-time listener for Firestore broadcast popup config
 */
export function subscribeToBroadcastConfig(
  onUpdate: (config: BroadcastPopupConfig) => void
): () => void {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, BROADCAST_CONFIG_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const raw = snap.data();
        if (isLegacyDefaultConfig(raw)) {
          // Immediately purge old hardcoded defaults in Firestore
          setDoc(docRef, DEFAULT_BROADCAST_CONFIG).catch(() => {});
          onUpdate(DEFAULT_BROADCAST_CONFIG);
          return;
        }
        const data = { ...DEFAULT_BROADCAST_CONFIG, ...raw } as BroadcastPopupConfig;
        onUpdate(data);
      } else {
        // Auto-seed clean empty config
        setDoc(docRef, DEFAULT_BROADCAST_CONFIG).catch(() => {});
        onUpdate(DEFAULT_BROADCAST_CONFIG);
      }
    }, (error) => {
      console.warn('Broadcast config sync error:', error);
      onUpdate(DEFAULT_BROADCAST_CONFIG);
    });
  } catch (err) {
    console.error('Failed to subscribe to broadcast config:', err);
    return () => {};
  }
}

/**
 * Save updated broadcast popup config (Admin only)
 */
export async function saveBroadcastConfig(
  config: Partial<BroadcastPopupConfig>,
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, BROADCAST_CONFIG_DOC);
    const existing = await getDoc(docRef);
    let prevData = existing.exists() ? (existing.data() as BroadcastPopupConfig) : DEFAULT_BROADCAST_CONFIG;
    if (isLegacyDefaultConfig(prevData)) {
      prevData = DEFAULT_BROADCAST_CONFIG;
    }
    
    const newVersion = (prevData.version || 1) + 1;
    const merged: BroadcastPopupConfig = {
      ...DEFAULT_BROADCAST_CONFIG,
      ...prevData,
      ...config,
      id: BROADCAST_CONFIG_DOC,
      version: newVersion,
      updatedBy: updatedBy || 'Admin',
      updatedAt: Date.now(),
    };

    await setDoc(docRef, merged);
    return { success: true };
  } catch (err: any) {
    console.error('Error saving broadcast popup config:', err);
    return { success: false, error: err.message || 'Failed to save broadcast popup.' };
  }
}

/**
 * Clear all default texts and links in Firestore permanently
 */
export async function clearBroadcastConfigInFirestore(
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, BROADCAST_CONFIG_DOC);
    const existing = await getDoc(docRef);
    const prevVersion = existing.exists() ? ((existing.data() as BroadcastPopupConfig).version || 1) : 1;

    const cleared: BroadcastPopupConfig = {
      ...DEFAULT_BROADCAST_CONFIG,
      version: prevVersion + 1,
      updatedBy: updatedBy || 'Admin',
      updatedAt: Date.now(),
    };

    await setDoc(docRef, cleared);
    return { success: true };
  } catch (err: any) {
    console.error('Error clearing broadcast popup config:', err);
    return { success: false, error: err.message || 'Failed to clear broadcast popup in Firebase.' };
  }
}
