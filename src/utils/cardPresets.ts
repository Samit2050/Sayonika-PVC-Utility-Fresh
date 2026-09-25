import { PresetConfig, CR80_ASPECT_RATIO, CropBox } from '../types';
import { 
  getSavedTemplates, 
  findMatchingSavedTemplate, 
  customTemplateToPreset, 
  saveCustomTemplate, 
  deleteCustomTemplate, 
  clearAllCustomTemplates, 
  notifyPresetsUpdated, 
  presetConfigToSavedTemplate, 
  getDefaultStartingPresetId, 
  setDefaultStartingPresetId, 
  makeAllCurrentTemplatesPermanentAndDefault 
} from './templateManager';
import { deletePresetFromCloud } from './cloudPresetService';

export {
  getDefaultStartingPresetId,
  setDefaultStartingPresetId,
  makeAllCurrentTemplatesPermanentAndDefault
};

/**
 * Default Built-in Presets
 * All custom and default presets have been cleared for a fresh start as requested.
 * New templates can be created directly by user/admin or imported from JSON.
 */
export const CARD_PRESETS: PresetConfig[] = [];

/**
 * Match a file name against templates to auto-select the right crop coordinates
 */
export function detectDocTypeFromName(fileName: string): { docType: PresetConfig['category']; presetId: string } {
  // 1. Check user-saved custom auto-crop templates first!
  const matchedCustom = findMatchingSavedTemplate(fileName);
  if (matchedCustom) {
    return { 
      docType: matchedCustom.category, 
      presetId: `custom_tpl_${matchedCustom.id}` 
    };
  }

  // 2. Fallback to active default preset if available
  const combined = getCombinedPresets() || [];
  if (combined.length > 0) {
    return {
      docType: combined[0].category,
      presetId: combined[0].id
    };
  }

  // 3. Clean fallback
  return { docType: 'custom', presetId: DEFAULT_FALLBACK_PRESET.id };
}

// Storage keys
const PRESET_OVERRIDES_STORAGE_KEY = 'sayonika_preset_overrides';
const DELETED_OFFICIAL_PRESETS_KEY = 'sayonika_deleted_official_presets';

/**
 * Retrieve list of deleted official preset IDs
 */
export function getDeletedOfficialPresetIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_OFFICIAL_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load deleted presets from localStorage:', err);
    return [];
  }
}

/**
 * Save list of deleted official preset IDs
 */
export function setDeletedOfficialPresetIds(ids: string[]): void {
  try {
    localStorage.setItem(DELETED_OFFICIAL_PRESETS_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch (err) {
    console.error('Failed to save deleted presets to localStorage:', err);
  }
}

/**
 * Retrieve saved overrides for built-in presets
 */
export function getPresetOverrides(): Record<string, Partial<PresetConfig>> {
  try {
    const raw = localStorage.getItem(PRESET_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch (err) {
    console.error('Failed to load preset overrides from localStorage:', err);
    return {};
  }
}

/**
 * Save an override / template for ANY preset (custom templates mode)
 */
export function savePreset(preset: PresetConfig): PresetConfig {
  const tpl = presetConfigToSavedTemplate(preset);
  const saved = saveCustomTemplate(tpl, { 
    syncToCloud: preset.isGlobal !== false,
    user: {
      userId: preset.createdBy,
      name: preset.createdBy,
      role: preset.createdByRole
    }
  });
  return {
    ...customTemplateToPreset(saved),
    isCustom: true,
    isModified: true
  };
}

/**
 * Reset an official preset to its factory defaults (and un-delete if deleted)
 */
export function resetPresetToDefault(presetId: string): PresetConfig | undefined {
  const overrides = getPresetOverrides();
  if (overrides[presetId]) {
    delete overrides[presetId];
    localStorage.setItem(PRESET_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  }
  const deletedIds = getDeletedOfficialPresetIds();
  if (deletedIds.includes(presetId)) {
    setDeletedOfficialPresetIds(deletedIds.filter(id => id !== presetId));
  }
  return CARD_PRESETS.find(p => p.id === presetId);
}

/**
 * Delete ANY preset permanently (custom preset or official preset)
 */
export function deletePreset(presetId: string): { type: 'deleted' | 'not_found'; name: string } {
  const isCustom = presetId.startsWith('custom_tpl_') || getSavedTemplates().some(t => t.id === presetId || `custom_tpl_${t.id}` === presetId);
  
  if (isCustom) {
    const rawId = presetId.startsWith('custom_tpl_') ? presetId.replace('custom_tpl_', '') : presetId;
    const existing = getSavedTemplates().find(t => t.id === rawId || `custom_tpl_${t.id}` === presetId || t.id === presetId);
    const name = existing?.name || presetId;
    deleteCustomTemplate(presetId);
    deleteCustomTemplate(rawId);
    deletePresetFromCloud(rawId).catch(() => {});
    deletePresetFromCloud(presetId).catch(() => {});
    notifyPresetsUpdated();
    return { type: 'deleted', name };
  }

  // Official preset: add to deleted official presets list
  const base = CARD_PRESETS.find(p => p.id === presetId);
  const name = base?.name || presetId;
  const deletedIds = getDeletedOfficialPresetIds();
  if (!deletedIds.includes(presetId)) {
    setDeletedOfficialPresetIds([...deletedIds, presetId]);
  }

  // Clean up any override
  const overrides = getPresetOverrides();
  if (overrides[presetId]) {
    delete overrides[presetId];
    localStorage.setItem(PRESET_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  }

  deletePresetFromCloud(presetId).catch(() => {});

  notifyPresetsUpdated();
  return { type: 'deleted', name };
}

/**
 * Delete ALL official presets with one click
 */
export function deleteAllOfficialPresets(): { count: number } {
  const allOfficialIds = CARD_PRESETS.map(p => p.id);
  setDeletedOfficialPresetIds(allOfficialIds);
  localStorage.removeItem(PRESET_OVERRIDES_STORAGE_KEY);
  return { count: allOfficialIds.length };
}

/**
 * Delete ALL presets (both custom templates and official presets)
 */
export function deleteAllPresets(): { count: number } {
  const customRes = clearAllCustomTemplates();
  const officialRes = deleteAllOfficialPresets();
  notifyPresetsUpdated();
  return { count: customRes.count + officialRes.count };
}

/**
 * Reset / Restore all presets back to system defaults
 */
export function resetAllPresetsToDefaults(): { count: number } {
  localStorage.removeItem(DELETED_OFFICIAL_PRESETS_KEY);
  localStorage.removeItem(PRESET_OVERRIDES_STORAGE_KEY);
  localStorage.removeItem('sayonika_custom_templates');
  localStorage.removeItem('sayonika_permanent_default_templates');
  notifyPresetsUpdated();
  return { count: getCombinedPresets().length };
}

/**
 * Restore ALL official presets back to the workspace
 */
export function restoreAllOfficialPresets(): { count: number } {
  const deleted = getDeletedOfficialPresetIds();
  localStorage.removeItem(DELETED_OFFICIAL_PRESETS_KEY);
  return { count: deleted.length };
}

/**
 * Restore a single official preset
 */
export function restoreOfficialPreset(presetId: string): boolean {
  const deleted = getDeletedOfficialPresetIds();
  if (deleted.includes(presetId)) {
    setDeletedOfficialPresetIds(deleted.filter(id => id !== presetId));
    return true;
  }
  return false;
}

/**
 * Check if ALL official presets are currently deleted
 */
export function areAllOfficialPresetsDeleted(): boolean {
  const deletedIds = getDeletedOfficialPresetIds() || [];
  const officialList = Array.isArray(CARD_PRESETS) ? CARD_PRESETS : [];
  return officialList.length > 0 && officialList.every(p => deletedIds.includes(p.id));
}

/**
 * Check if a specific official preset is currently deleted
 */
export function isOfficialPresetDeleted(presetId: string): boolean {
  return getDeletedOfficialPresetIds().includes(presetId);
}

/**
 * Check if a preset has been customized by user
 */
export function isPresetModified(presetId: string): boolean {
  if (presetId.startsWith('custom_tpl_')) return true;
  const overrides = getPresetOverrides();
  return Boolean(overrides[presetId]);
}

/**
 * Fallback generic card definition when no custom presets have been added yet
 */
export const DEFAULT_FALLBACK_PRESET: PresetConfig = {
  id: 'custom_generic_card',
  name: 'Custom Identity Card (CR80)',
  category: 'custom',
  description: 'Standard PVC Card (85.6mm × 54mm)',
  aspectRatio: CR80_ASPECT_RATIO,
  dualSided: true,
  frontBox: { x: 5.0, y: 65.0, width: 44.0, height: 28.0 },
  backBox: { x: 51.0, y: 65.0, width: 44.0, height: 28.0 }
};

/**
 * Get all presets combining standard government cards and user-saved custom templates
 */
export function getCombinedPresets(): PresetConfig[] {
  try {
    const deletedIds = getDeletedOfficialPresetIds() || [];
    const overrides = getPresetOverrides() || {};

    // 1. Official active presets with user overrides
    const officialList = Array.isArray(CARD_PRESETS) ? CARD_PRESETS : [];
    const officialActive = officialList
      .filter(p => p && !deletedIds.includes(p.id))
      .map(p => ({
        ...p,
        ...(overrides[p.id] || {}),
        isModified: Boolean(overrides[p.id])
      }));

    // 2. User-saved custom presets / templates
    const savedList = getSavedTemplates();
    const saved = (Array.isArray(savedList) ? savedList : [])
      .filter(Boolean)
      .map(t => {
        const p = customTemplateToPreset(t);
        return {
          ...p,
          isCustom: true
        };
      });

    // Combine custom presets first, then official presets
    return [...saved, ...officialActive];
  } catch (err) {
    console.error('Error in getCombinedPresets:', err);
    return [];
  }
}

/**
 * Get the default starting preset ID (respects user-saved default)
 */
export function getDefaultPresetId(): string {
  const savedDefault = getDefaultStartingPresetId();
  const combined = getCombinedPresets() || [];

  if (savedDefault) {
    const exists = combined.some(p => p && (p.id === savedDefault || `custom_tpl_${p.id}` === savedDefault));
    if (exists) {
      return savedDefault;
    }
  }

  if (combined.length > 0) {
    return combined[0].id;
  }
  return DEFAULT_FALLBACK_PRESET.id;
}

/**
 * Resolve any preset ID (custom saved template or fallback)
 */
export function resolvePresetConfig(presetId?: string | null): PresetConfig {
  if (!presetId) {
    const combined = getCombinedPresets();
    return combined[0] || DEFAULT_FALLBACK_PRESET;
  }

  const rawId = presetId.startsWith('custom_tpl_') ? presetId.replace('custom_tpl_', '') : presetId;
  const saved = getSavedTemplates();
  const found = saved.find(t => t.id === rawId || `custom_tpl_${t.id}` === presetId || t.id === presetId);
  if (found) {
    return {
      ...customTemplateToPreset(found),
      isCustom: true
    };
  }

  const combined = getCombinedPresets();
  return combined.find(p => p.id === presetId || p.id === rawId) || combined[0] || DEFAULT_FALLBACK_PRESET;
}
