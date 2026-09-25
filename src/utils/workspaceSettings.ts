import { CardMarginSettings, ImageAdjustments, PrintSettings, CropBox } from '../types';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface WorkspacePersistentState {
  selectedPresetId: string;
  marginSettings: CardMarginSettings;
  imageAdjustments: ImageAdjustments;
  printSettings: PrintSettings;
  saveDpi: number;
  isDualSided: boolean;
  lockAspectRatio: boolean;
  autoSaveEnabled: boolean;
  savedBatchPassword?: string;
  frontBox?: CropBox;
  backBox?: CropBox;
  lastUpdated?: number;
  neverAutoRestore?: boolean;
}

const WORKSPACE_STORAGE_KEY = 'sayonika_workspace_settings_v3';
const BACKUP_STORAGE_KEY = 'sayonika_workspace_settings_backup';
const SYSTEM_CONFIG_COLLECTION = 'system_config';
const WORKSPACE_CONFIG_DOC = 'workspace_settings';

export const DEFAULT_MARGIN_SETTINGS: CardMarginSettings = {
  marginMm: 0,
  bleedMm: 0,
  cornerRadiusMm: 3.18, // Standard ISO CR-80 3.18mm
  borderWidthPx: 0,
  borderColor: '#000000',
  showCutMarks: true,
};

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  sharpness: 20, // 20% sharpening default for crisp Xerox output
  saturation: 100,
  grayscale: false,
  rotation: 0,
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  layout: 'pvc_tray',
  dpi: 600,
  fitScale: 100,
  showCardLabels: true,
  shopHeader: 'Biswas Xerox & Cyber Point',
  contactNumber: 'biswasxerox40@gmail.com',
  showWatermark: false,
  cardGapMm: 4,
};

/**
 * Load permanently stored workspace settings.
 * If user made adjustments yesterday, last week, or months ago, they are preserved forever.
 * AUTOMATIC DAILY/SCHEDULED RESTORE (e.g. 12:30 PM) IS STRICTLY PREVENTED.
 */
export function getSavedWorkspaceSettings(): Partial<WorkspacePersistentState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
    
    // Check backup storage key
    const backupRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (backupRaw) {
      const backupParsed = JSON.parse(backupRaw);
      if (backupParsed && typeof backupParsed === 'object') {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, backupRaw);
        return backupParsed;
      }
    }
    return {};
  } catch (err) {
    console.warn('Failed to parse saved workspace settings, will use defaults:', err);
    return {};
  }
}

/**
 * Persist user's current workspace settings forever in localStorage (with double backup)
 * and optionally sync to Firestore system_config/workspace_settings so they persist indefinitely.
 */
export function saveWorkspaceSettings(updates: Partial<WorkspacePersistentState>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedWorkspaceSettings();
    const updated: WorkspacePersistentState = {
      selectedPresetId: updates.selectedPresetId ?? current.selectedPresetId ?? 'custom_generic_card',
      marginSettings: { ...DEFAULT_MARGIN_SETTINGS, ...(current.marginSettings || {}), ...(updates.marginSettings || {}) },
      imageAdjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, ...(current.imageAdjustments || {}), ...(updates.imageAdjustments || {}) },
      printSettings: { ...DEFAULT_PRINT_SETTINGS, ...(current.printSettings || {}), ...(updates.printSettings || {}) },
      saveDpi: updates.saveDpi ?? current.saveDpi ?? 600,
      isDualSided: updates.isDualSided ?? current.isDualSided ?? true,
      lockAspectRatio: updates.lockAspectRatio ?? current.lockAspectRatio ?? true,
      autoSaveEnabled: updates.autoSaveEnabled ?? current.autoSaveEnabled ?? true,
      savedBatchPassword: updates.savedBatchPassword !== undefined ? updates.savedBatchPassword : current.savedBatchPassword,
      frontBox: updates.frontBox ?? current.frontBox,
      backBox: updates.backBox ?? current.backBox,
      lastUpdated: Date.now(),
      neverAutoRestore: true,
    };

    const serialized = JSON.stringify(updated);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, serialized);
    localStorage.setItem(BACKUP_STORAGE_KEY, serialized);

    // Debounced asynchronous cloud backup to Firestore
    syncWorkspaceSettingsToCloud(updated);
  } catch (err) {
    console.error('Failed to save workspace settings:', err);
  }
}

let syncTimeout: any = null;
function syncWorkspaceSettingsToCloud(settings: WorkspacePersistentState): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, WORKSPACE_CONFIG_DOC);
      await setDoc(docRef, {
        ...settings,
        id: WORKSPACE_CONFIG_DOC,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err) {
      // Offline or connecting, local storage already safe
    }
  }, 1000);
}

/**
 * Subscribe to cloud-synchronized workspace settings.
 * Ensures that changes made by the admin/operator are shared and kept forever.
 */
export function subscribeToCloudWorkspaceSettings(callback: (settings: Partial<WorkspacePersistentState>) => void): () => void {
  try {
    const docRef = doc(db, SYSTEM_CONFIG_COLLECTION, WORKSPACE_CONFIG_DOC);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const cloudData = snap.data() as Partial<WorkspacePersistentState>;
        const local = getSavedWorkspaceSettings();
        // Only apply cloud settings if cloud is newer or local is empty
        const localTime = Number(local.lastUpdated) || 0;
        const cloudTime = Number(cloudData.lastUpdated) || 0;
        if (cloudTime > localTime) {
          saveWorkspaceSettings(cloudData);
          callback(cloudData);
        }
      }
    }, (err) => {
      console.warn('Workspace settings sync listener notice:', err);
    });
  } catch (err) {
    return () => {};
  }
}

/**
 * Reset workspace settings explicitly (Only when admin or user clicks explicit Reset to Defaults)
 */
export function resetWorkspaceSettingsToDefaults(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    localStorage.removeItem(BACKUP_STORAGE_KEY);
  } catch {}
}
