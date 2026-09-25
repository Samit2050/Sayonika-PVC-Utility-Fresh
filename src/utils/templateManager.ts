import { CustomSavedTemplate, PresetConfig, CR80_ASPECT_RATIO, CropBox } from '../types';
import { savePresetToCloud, deletePresetFromCloud, isUserAdmin } from './cloudPresetService';

const STORAGE_KEY = 'sayonika_custom_templates';
const PERMANENT_DEFAULTS_KEY = 'sayonika_permanent_default_templates';
export const DEFAULT_PRESET_ID_KEY = 'sayonika_default_preset_id';
export const PRESETS_UPDATED_EVENT = 'sayonika_presets_updated';
export const DELETED_PRESETS_STORAGE_KEY = 'sayonika_deleted_preset_ids';

/**
 * Retrieve all explicitly deleted preset IDs to prevent cloud re-sync from resurrecting them
 */
export function getDeletedPresetIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_PRESETS_STORAGE_KEY);
    const customDeleted: string[] = raw ? JSON.parse(raw) : [];
    const rawOfficial = localStorage.getItem('sayonika_deleted_official_presets');
    const officialDeleted: string[] = rawOfficial ? JSON.parse(rawOfficial) : [];
    return Array.from(new Set([...customDeleted, ...officialDeleted]));
  } catch {
    return [];
  }
}

/**
 * Permanently mark a preset as deleted so it is never automatically restored
 */
export function recordDeletedPresetId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanId = id.replace(/^custom_tpl_/, '');
    const current = getDeletedPresetIds();
    current.push(cleanId);
    current.push(id);
    current.push(`custom_tpl_${cleanId}`);
    localStorage.setItem(DELETED_PRESETS_STORAGE_KEY, JSON.stringify(Array.from(new Set(current))));
  } catch {}
}

/**
 * Clear the deleted presets list (only on explicit user factory reset)
 */
export function clearDeletedPresetRecords(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DELETED_PRESETS_STORAGE_KEY);
  } catch {}
}

// Default starter custom templates list
const DEFAULT_TEMPLATES: CustomSavedTemplate[] = [];

/**
 * Dispatch an event when templates are added, modified, imported, or deleted
 */
export function notifyPresetsUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PRESETS_UPDATED_EVENT));
  }
}

/**
 * Retrieve all user-saved custom templates from LocalStorage with permanent fallback
 */
export function getSavedTemplates(): CustomSavedTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Check permanent default templates fallback
    const permRaw = localStorage.getItem(PERMANENT_DEFAULTS_KEY);
    if (permRaw) {
      const permParsed = JSON.parse(permRaw);
      if (Array.isArray(permParsed) && permParsed.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(permParsed));
        return permParsed;
      }
    }

    return [];
  } catch (err) {
    console.error('Failed to load saved templates from localStorage:', err);
    return [];
  }
}

/**
 * Get designated default starting preset ID
 */
export function getDefaultStartingPresetId(): string | null {
  try {
    return localStorage.getItem(DEFAULT_PRESET_ID_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Set designated default starting preset ID
 */
export function setDefaultStartingPresetId(presetId: string): void {
  try {
    localStorage.setItem(DEFAULT_PRESET_ID_KEY, presetId);
    notifyPresetsUpdated();
  } catch (err) {
    console.error('Failed to set default starting preset ID:', err);
  }
}

/**
 * Make all current saved custom templates permanent and default baseline
 */
export function makeAllCurrentTemplatesPermanentAndDefault(
  user?: { userId?: string; name?: string; role?: string } | null,
  activePresetId?: string
): { success: boolean; count: number; defaultId: string } {
  try {
    const templates = getSavedTemplates();
    // 1. Commit to standard storage and permanent default storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    localStorage.setItem(PERMANENT_DEFAULTS_KEY, JSON.stringify(templates));

    // 2. Set default preset ID if provided or pick the first available
    let defaultId = activePresetId || getDefaultStartingPresetId() || (templates.length > 0 ? (templates[0].id.startsWith('custom_tpl_') ? templates[0].id : `custom_tpl_${templates[0].id}`) : 'custom_generic_card');
    setDefaultStartingPresetId(defaultId);

    // 3. Sync all templates to Firestore Cloud if Admin
    if (isUserAdmin(user)) {
      templates.forEach(t => {
        savePresetToCloud(t, user).catch(() => {});
      });
    }

    notifyPresetsUpdated();
    return { success: true, count: templates.length, defaultId };
  } catch (err) {
    console.error('Failed to make presets permanent and default:', err);
    return { success: false, count: 0, defaultId: 'custom_generic_card' };
  }
}

/**
 * Save a new or edited custom template to LocalStorage
 */
export function saveCustomTemplate(
  template: Omit<CustomSavedTemplate, 'id' | 'createdAt'> & { id?: string },
  options: { syncToCloud?: boolean; user?: { userId?: string; name?: string; role?: string } | null } = { syncToCloud: true }
): CustomSavedTemplate {
  const templates = getSavedTemplates();
  const now = Date.now();
  const rawId = template.id 
    ? (template.id.startsWith('custom_tpl_') ? template.id.replace('custom_tpl_', '') : template.id)
    : `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  const existingIdx = templates.findIndex(t => 
    t.id === rawId || 
    `custom_tpl_${t.id}` === template.id || 
    t.id === template.id || 
    `custom_tpl_${t.id}` === rawId ||
    `custom_tpl_${t.id}` === `custom_tpl_${rawId}`
  );

  let result: CustomSavedTemplate;

  if (existingIdx >= 0) {
    // Update existing template
    const existing = templates[existingIdx];
    result = {
      ...existing,
      ...template,
      id: existing.id,
      name: template.name.replace(/^⭐\s*/, '').trim(),
      isGlobal: template.isGlobal !== undefined ? template.isGlobal : (existing.isGlobal ?? true),
      createdAt: existing.createdAt || now,
      updatedAt: now,
    };
    templates[existingIdx] = result;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    localStorage.setItem(PERMANENT_DEFAULTS_KEY, JSON.stringify(templates));
  } else {
    // Create new template
    result = {
      ...template,
      id: rawId,
      name: template.name.replace(/^⭐\s*/, '').trim(),
      isGlobal: template.isGlobal !== undefined ? template.isGlobal : true,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [result, ...templates];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(PERMANENT_DEFAULTS_KEY, JSON.stringify(updated));
  }

  notifyPresetsUpdated();

  // ONLY sync to Firestore cloud database if user is authorized Admin
  if (options.syncToCloud !== false && result.isGlobal !== false && isUserAdmin(options.user)) {
    savePresetToCloud(result, options.user).catch(err => {
      console.warn('Background sync to Firestore cloud preset failed:', err);
    });
  }

  return result;
}

/**
 * Delete a custom template by ID (handles both raw ID and prefixed ID)
 */
export function deleteCustomTemplate(
  id: string,
  options: { deleteFromCloud?: boolean; user?: { userId?: string; name?: string; role?: string } | null } = { deleteFromCloud: true }
): void {
  const templates = getSavedTemplates();
  const rawId = id.startsWith('custom_tpl_') ? id.replace('custom_tpl_', '') : id;
  const filtered = templates.filter(t => t.id !== id && t.id !== rawId && `custom_tpl_${t.id}` !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  localStorage.setItem(PERMANENT_DEFAULTS_KEY, JSON.stringify(filtered));
  recordDeletedPresetId(rawId);
  recordDeletedPresetId(id);
  notifyPresetsUpdated();

  // Also remove from Firestore cloud collection if requested and user is Admin
  if (options.deleteFromCloud !== false && isUserAdmin(options.user)) {
    deletePresetFromCloud(rawId, options.user).catch(err => {
      console.warn('Background deletion from Firestore cloud failed:', err);
    });
  }
}

/**
 * Clear and delete ALL custom templates from local storage
 */
export function clearAllCustomTemplates(): { count: number } {
  const templates = getSavedTemplates();
  const count = templates.length;
  templates.forEach(t => {
    recordDeletedPresetId(t.id);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(PERMANENT_DEFAULTS_KEY, JSON.stringify([]));
  notifyPresetsUpdated();
  return { count };
}

/**
 * Clear and delete ALL presets (custom templates + overrides + permanent defaults) from the Public App
 */
export function deleteAllPresetsFromPublicApp(): { success: boolean; count: number; clearedCustomCount: number } {
  const customTemplates = getSavedTemplates();
  const count = customTemplates.length;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PERMANENT_DEFAULTS_KEY);
    localStorage.removeItem(DEFAULT_PRESET_ID_KEY);
    localStorage.removeItem('sayonika_preset_overrides');
    localStorage.removeItem('sayonika_deleted_official_presets');
    notifyPresetsUpdated();
    return { success: true, count, clearedCustomCount: count };
  } catch (err) {
    console.error('Error deleting public presets:', err);
    return { success: false, count: 0, clearedCustomCount: 0 };
  }
}

const PURGE_ONCE_KEY = 'sayonika_fresh_templates_purged_v4';

/**
 * Automatically wipes all local custom/default templates on client boot so user starts completely fresh.
 */
export function purgeAllLegacyTemplatesOnce(): void {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(PURGE_ONCE_KEY) === 'true') return;

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PERMANENT_DEFAULTS_KEY);
    localStorage.removeItem(DEFAULT_PRESET_ID_KEY);
    localStorage.removeItem('sayonika_preset_overrides');
    localStorage.removeItem('sayonika_deleted_official_presets');
    localStorage.removeItem('sayonika_saved_workspace');
    localStorage.removeItem('sayonika_workspace_settings_v3');
    localStorage.removeItem('sayonika_workspace_settings_backup');
    localStorage.setItem(PURGE_ONCE_KEY, 'true');
    notifyPresetsUpdated();
  } catch (err) {
    console.warn('Notice during fresh template purge:', err);
  }
}

/**
 * Match a file name against user-saved template auto-detect keywords or template names
 */
export function findMatchingSavedTemplate(fileName: string): CustomSavedTemplate | null {
  if (!fileName) return null;
  const lowerName = fileName.toLowerCase();
  const templates = getSavedTemplates();

  for (const t of (templates || [])) {
    if (!t) continue;
    // Check matchKeywords if specified
    if (t.matchKeywords) {
      const keywords = t.matchKeywords
        .toLowerCase()
        .split(/[,;\s]+/)
        .map(k => k.trim())
        .filter(k => k && k.length > 1);

      for (const kw of keywords) {
        if (lowerName.includes(kw)) {
          return t;
        }
      }
    }

    // Check template name words (if 4+ chars)
    const nameWords = (t.name || '')
      .toLowerCase()
      .split(/[\s\-_()]+/)
      .filter(w => w && w.length > 3);

    for (const word of nameWords) {
      if (lowerName.includes(word)) {
        return t;
      }
    }
  }

  return null;
}

/**
 * Convert CustomSavedTemplate to standard PresetConfig for universal compatibility
 */
export function customTemplateToPreset(template: CustomSavedTemplate): PresetConfig {
  return {
    id: `custom_tpl_${template.id}`,
    name: `⭐ ${template.name.replace(/^⭐\s*/, '')}`,
    category: template.category || 'custom',
    description: template.description || 'User Custom Auto-Crop Template',
    aspectRatio: CR80_ASPECT_RATIO,
    dualSided: Boolean(template.dualSided),
    frontBox: { ...template.frontBox },
    backBox: template.dualSided && template.backBox ? { ...template.backBox } : undefined,
    frontPage: template.frontPage || 1,
    backPage: template.backPage || (template.dualSided ? 2 : 1),
    instructions: template.matchKeywords 
      ? `Auto-crops files matching: ${template.matchKeywords}` 
      : (template.instructions || 'Saved manual alignment crop box.'),
    matchKeywords: template.matchKeywords || '',
    suggestedPasswordFormat: template.suggestedPasswordFormat || '',
    marginSettings: template.marginSettings,
    imageAdjustments: template.imageAdjustments,
    isCustom: true,
    isGlobal: template.isGlobal ?? true,
    createdBy: template.createdBy,
    createdByRole: template.createdByRole,
    updatedAt: template.updatedAt,
  };
}

/**
 * Convert PresetConfig or raw object into a sanitized CustomSavedTemplate
 */
export function presetConfigToSavedTemplate(preset: PresetConfig): CustomSavedTemplate {
  const cleanId = preset.id.startsWith('custom_tpl_') ? preset.id.replace('custom_tpl_', '') : preset.id;
  const cleanName = preset.name.replace(/^⭐\s*/, '').trim();

  return {
    id: cleanId,
    name: cleanName,
    category: preset.category || 'custom',
    description: preset.description || `Auto-crop preset for ${cleanName}`,
    dualSided: Boolean(preset.dualSided),
    matchKeywords: preset.matchKeywords || '',
    frontPage: preset.frontPage || 1,
    backPage: preset.backPage || (preset.dualSided ? 2 : 1),
    frontBox: {
      x: Math.max(0, Math.min(100, Number(preset.frontBox.x) || 0)),
      y: Math.max(0, Math.min(100, Number(preset.frontBox.y) || 0)),
      width: Math.max(1, Math.min(100, Number(preset.frontBox.width) || 44)),
      height: Math.max(1, Math.min(100, Number(preset.frontBox.height) || 28)),
    },
    backBox: preset.dualSided && preset.backBox ? {
      x: Math.max(0, Math.min(100, Number(preset.backBox.x) || 0)),
      y: Math.max(0, Math.min(100, Number(preset.backBox.y) || 0)),
      width: Math.max(1, Math.min(100, Number(preset.backBox.width) || 44)),
      height: Math.max(1, Math.min(100, Number(preset.backBox.height) || 28)),
    } : undefined,
    marginSettings: preset.marginSettings,
    imageAdjustments: preset.imageAdjustments,
    suggestedPasswordFormat: preset.suggestedPasswordFormat,
    isGlobal: preset.isGlobal ?? true,
    createdBy: preset.createdBy,
    createdByRole: preset.createdByRole,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Format any list of templates / presets for clean JSON export
 */
export function exportTemplatesAsJson(templatesOrConfigs?: (CustomSavedTemplate | PresetConfig)[] | string[]): string {
  let list: CustomSavedTemplate[] = [];

  if (Array.isArray(templatesOrConfigs) && templatesOrConfigs.length > 0) {
    if (typeof templatesOrConfigs[0] === 'string') {
      // Array of IDs
      const idStrings = templatesOrConfigs as string[];
      const saved = getSavedTemplates();
      const idSet = new Set(idStrings.map(id => id.startsWith('custom_tpl_') ? id.replace('custom_tpl_', '') : id));
      list = saved.filter(t => idSet.has(t.id) || idSet.has(`custom_tpl_${t.id}`));
    } else {
      // Array of objects
      list = (templatesOrConfigs as (CustomSavedTemplate | PresetConfig)[]).map(item => {
        if ('aspectRatio' in item && !('createdAt' in item)) {
          return presetConfigToSavedTemplate(item as PresetConfig);
        }
        return item as CustomSavedTemplate;
      });
    }
  } else {
    // Default to all saved templates
    list = getSavedTemplates();
  }

  // Ensure all items have clean IDs and coordinates
  const sanitizedList = list.map(t => ({
    id: t.id.startsWith('custom_tpl_') ? t.id.replace('custom_tpl_', '') : t.id,
    name: t.name.replace(/^⭐\s*/, '').trim(),
    category: t.category || 'custom',
    description: t.description || 'Auto-crop preset template',
    dualSided: Boolean(t.dualSided),
    matchKeywords: t.matchKeywords || '',
    frontPage: t.frontPage || 1,
    backPage: t.backPage || (t.dualSided ? 2 : 1),
    frontBox: {
      x: Number(Number(t.frontBox.x).toFixed(2)),
      y: Number(Number(t.frontBox.y).toFixed(2)),
      width: Number(Number(t.frontBox.width).toFixed(2)),
      height: Number(Number(t.frontBox.height).toFixed(2)),
    },
    backBox: t.dualSided && t.backBox ? {
      x: Number(Number(t.backBox.x).toFixed(2)),
      y: Number(Number(t.backBox.y).toFixed(2)),
      width: Number(Number(t.backBox.width).toFixed(2)),
      height: Number(Number(t.backBox.height).toFixed(2)),
    } : undefined,
    marginSettings: t.marginSettings,
    imageAdjustments: t.imageAdjustments,
    suggestedPasswordFormat: t.suggestedPasswordFormat,
    createdAt: t.createdAt || Date.now(),
  }));

  const payload = {
    app: 'Sayonika PVC Utility',
    schema: 'sayonika-presets-v2',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    templatesCount: sanitizedList.length,
    templates: sanitizedList,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Universal browser file download helper with safe delayed revoke to prevent corrupted 0-byte files
 */
export function triggerFileDownload(content: string, fileName: string, mimeType = 'application/json;charset=utf-8;'): boolean {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.setAttribute('style', 'display:none');
    document.body.appendChild(link);
    link.click();
    
    // Clean up DOM element immediately, but delay revoking object URL so the browser has time to finish saving the blob stream
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2500);

    return true;
  } catch (err) {
    console.error('File download failed, attempting fallback data-URI method:', err);
    try {
      // Fallback for sandboxed web environments
      const dataUri = `data:${mimeType},` + encodeURIComponent(content);
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) document.body.removeChild(link);
      }, 1000);
      return true;
    } catch (fallbackErr) {
      console.error('Data-URI fallback also failed:', fallbackErr);
      return false;
    }
  }
}

/**
 * Trigger browser file download of templates as a .json file
 */
export function downloadTemplatesAsJsonFile(
  templatesOrConfigs?: (CustomSavedTemplate | PresetConfig)[] | string[], 
  customFileName?: string
): boolean {
  try {
    const jsonStr = exportTemplatesAsJson(templatesOrConfigs);
    let count = 0;
    if (Array.isArray(templatesOrConfigs)) {
      count = templatesOrConfigs.length;
    } else {
      count = getSavedTemplates().length;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = customFileName || `sayonika_presets_${count}_items_${dateStr}.json`;

    return triggerFileDownload(jsonStr, fileName);
  } catch (err) {
    console.error('Failed to download templates JSON:', err);
    return false;
  }
}

/**
 * Export a single template or PresetConfig as a standard JSON string
 */
export function exportSingleTemplateAsJson(templateOrIdOrPreset: CustomSavedTemplate | PresetConfig | string): string {
  let template: CustomSavedTemplate | undefined;

  if (typeof templateOrIdOrPreset === 'string') {
    const rawId = templateOrIdOrPreset.startsWith('custom_tpl_') 
      ? templateOrIdOrPreset.replace('custom_tpl_', '') 
      : templateOrIdOrPreset;

    const saved = getSavedTemplates();
    template = saved.find(t => t.id === templateOrIdOrPreset || t.id === rawId || `custom_tpl_${t.id}` === templateOrIdOrPreset);

    if (!template) {
      // Fallback: check localStorage overrides or default templates
      try {
        const overridesRaw = localStorage.getItem('sayonika_preset_overrides');
        if (overridesRaw) {
          const overrides = JSON.parse(overridesRaw);
          if (overrides[templateOrIdOrPreset] || overrides[rawId]) {
            const conf = overrides[templateOrIdOrPreset] || overrides[rawId];
            template = presetConfigToSavedTemplate(conf);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  } else if ('frontBox' in templateOrIdOrPreset) {
    if ('aspectRatio' in templateOrIdOrPreset && !('createdAt' in templateOrIdOrPreset)) {
      template = presetConfigToSavedTemplate(templateOrIdOrPreset as PresetConfig);
    } else {
      template = templateOrIdOrPreset as CustomSavedTemplate;
    }
  }

  if (!template) {
    throw new Error('Preset template could not be resolved for export.');
  }

  const cleanItem = {
    id: template.id.startsWith('custom_tpl_') ? template.id.replace('custom_tpl_', '') : template.id,
    name: template.name.replace(/^⭐\s*/, '').trim(),
    category: template.category || 'custom',
    description: template.description || 'Auto-crop preset template',
    dualSided: Boolean(template.dualSided),
    matchKeywords: template.matchKeywords || '',
    frontPage: template.frontPage || 1,
    backPage: template.backPage || (template.dualSided ? 2 : 1),
    frontBox: {
      x: Number(Number(template.frontBox.x).toFixed(2)),
      y: Number(Number(template.frontBox.y).toFixed(2)),
      width: Number(Number(template.frontBox.width).toFixed(2)),
      height: Number(Number(template.frontBox.height).toFixed(2)),
    },
    backBox: template.dualSided && template.backBox ? {
      x: Number(Number(template.backBox.x).toFixed(2)),
      y: Number(Number(template.backBox.y).toFixed(2)),
      width: Number(Number(template.backBox.width).toFixed(2)),
      height: Number(Number(template.backBox.height).toFixed(2)),
    } : undefined,
    marginSettings: template.marginSettings,
    imageAdjustments: template.imageAdjustments,
    suggestedPasswordFormat: template.suggestedPasswordFormat,
    createdAt: template.createdAt || Date.now(),
  };

  const payload = {
    app: 'Sayonika PVC Utility',
    schema: 'sayonika-single-preset-v2',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    template: cleanItem,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Trigger download for a single template as a .json file
 */
export function downloadSingleTemplateAsJsonFile(templateOrIdOrPreset: CustomSavedTemplate | PresetConfig | string): boolean {
  try {
    const jsonStr = exportSingleTemplateAsJson(templateOrIdOrPreset);
    let name = 'preset';
    if (typeof templateOrIdOrPreset === 'string') {
      name = templateOrIdOrPreset.replace(/^custom_tpl_/, '');
    } else if (templateOrIdOrPreset && typeof templateOrIdOrPreset.name === 'string') {
      name = templateOrIdOrPreset.name.replace(/^⭐\s*/, '');
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const fileName = `preset_${safeName}.json`;

    return triggerFileDownload(jsonStr, fileName);
  } catch (err) {
    console.error('Failed to download single template JSON:', err);
    return false;
  }
}

/**
 * Helper to safely extract numeric percentage from various box coordinate property formats
 */
function extractBoxCoordinate(boxObj: any): { x: number; y: number; width: number; height: number } | null {
  if (!boxObj || typeof boxObj !== 'object') return null;

  // X coordinate aliases: x, left, leftPercent, startX
  const rawX = boxObj.x ?? boxObj.left ?? boxObj.leftPercent ?? boxObj.startX ?? boxObj.x1;
  // Y coordinate aliases: y, top, topPercent, startY
  const rawY = boxObj.y ?? boxObj.top ?? boxObj.topPercent ?? boxObj.startY ?? boxObj.y1;
  // Width coordinate aliases: width, w, widthPercent
  let rawW = boxObj.width ?? boxObj.w ?? boxObj.widthPercent;
  // Height coordinate aliases: height, h, heightPercent
  let rawH = boxObj.height ?? boxObj.h ?? boxObj.heightPercent;

  // Calculate width/height from x2/y2 or right/bottom if width/height not directly present
  if (rawW === undefined && (boxObj.x2 !== undefined || boxObj.right !== undefined)) {
    const right = boxObj.x2 ?? boxObj.right;
    if (rawX !== undefined) rawW = Number(right) - Number(rawX);
  }
  if (rawH === undefined && (boxObj.y2 !== undefined || boxObj.bottom !== undefined)) {
    const bottom = boxObj.y2 ?? boxObj.bottom;
    if (rawY !== undefined) rawH = Number(bottom) - Number(rawY);
  }

  const numX = Number(rawX);
  const numY = Number(rawY);
  const numW = Number(rawW);
  const numH = Number(rawH);

  if (isNaN(numX) || isNaN(numY) || isNaN(numW) || isNaN(numH)) {
    return null;
  }

  // Handle 0-1 scale coordinates (e.g. 0.054 -> 5.4%)
  let finalX = numX;
  let finalY = numY;
  let finalW = numW;
  let finalH = numH;

  if (finalW > 0 && finalW <= 1 && finalH > 0 && finalH <= 1 && finalX <= 1 && finalY <= 1) {
    finalX = finalX * 100;
    finalY = finalY * 100;
    finalW = finalW * 100;
    finalH = finalH * 100;
  }

  return {
    x: Math.max(0, Math.min(100, Number(finalX.toFixed(2)))),
    y: Math.max(0, Math.min(100, Number(finalY.toFixed(2)))),
    width: Math.max(1, Math.min(100, Number(finalW.toFixed(2)))),
    height: Math.max(1, Math.min(100, Number(finalH.toFixed(2)))),
  };
}

/**
 * Parse and validate templates from ANY JSON format / backup envelope with multi-schema tolerance
 */
export function parseTemplatesJson(jsonInput: string | object): { 
  success: boolean; 
  templates: CustomSavedTemplate[]; 
  error?: string;
  metadata?: { app?: string; exportedAt?: string; schema?: string; version?: string };
} {
  try {
    let parsed: any;

    if (typeof jsonInput === 'string') {
      const cleanStr = jsonInput
        .replace(/^\uFEFF/, '') // Strip UTF-8 BOM
        .trim();

      if (!cleanStr) {
        return { success: false, templates: [], error: 'JSON content is empty.' };
      }

      try {
        parsed = JSON.parse(cleanStr);
      } catch (parseErr: any) {
        // Attempt basic fix for trailing commas in JSON
        try {
          const relaxedJson = cleanStr.replace(/,\s*([\]}])/g, '$1');
          parsed = JSON.parse(relaxedJson);
        } catch {
          return { 
            success: false, 
            templates: [], 
            error: `JSON syntax error: ${parseErr?.message || 'Invalid JSON format'}` 
          };
        }
      }
    } else if (jsonInput && typeof jsonInput === 'object') {
      parsed = jsonInput;
    } else {
      return { success: false, templates: [], error: 'Expected valid JSON object or text.' };
    }

    let candidateList: any[] = [];
    let metadata: any = {};

    if (Array.isArray(parsed)) {
      candidateList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      metadata = {
        app: parsed.app,
        exportedAt: parsed.exportedAt || parsed.exportDate || parsed.createdAt,
        schema: parsed.schema,
        version: parsed.version,
      };

      // Check all common wrapper container property names
      if (Array.isArray(parsed.templates)) {
        candidateList = parsed.templates;
      } else if (Array.isArray(parsed.presets)) {
        candidateList = parsed.presets;
      } else if (Array.isArray(parsed.customTemplates)) {
        candidateList = parsed.customTemplates;
      } else if (Array.isArray(parsed.data)) {
        candidateList = parsed.data;
      } else if (Array.isArray(parsed.items)) {
        candidateList = parsed.items;
      } else if (Array.isArray(parsed.cards)) {
        candidateList = parsed.cards;
      } else if (Array.isArray(parsed.list)) {
        candidateList = parsed.list;
      } else if (parsed.template && typeof parsed.template === 'object') {
        candidateList = [parsed.template];
      } else if (parsed.preset && typeof parsed.preset === 'object') {
        candidateList = [parsed.preset];
      } else if (parsed.frontBox || parsed.front || (parsed.name && (parsed.x !== undefined || parsed.width !== undefined))) {
        // Single standalone template object
        candidateList = [parsed];
      } else {
        return { 
          success: false, 
          templates: [], 
          error: 'Could not find any template definitions in JSON. Expected "templates", "presets", or a template array.' 
        };
      }
    }

    // Filter and sanitize valid templates
    const validTemplates: CustomSavedTemplate[] = [];
    const safeCandidates = Array.isArray(candidateList) ? candidateList : [];

    for (let i = 0; i < safeCandidates.length; i++) {
      const raw = safeCandidates[i];
      if (!raw || typeof raw !== 'object') continue;

      const rawName = raw.name || raw.title || raw.presetName || `Imported Preset ${i + 1}`;
      const name = String(rawName).replace(/^⭐\s*/, '').trim();
      if (!name) continue;

      // Extract frontBox using flexible coordinate extractor
      const rawFront = raw.frontBox || raw.front || raw.cropBox || raw;
      const cleanFrontBox = extractBoxCoordinate(rawFront);

      if (!cleanFrontBox) {
        continue;
      }

      // Extract backBox if present
      const rawBack = raw.backBox || raw.back || raw.rearBox || raw.secondBox;
      const cleanBackBox = rawBack ? extractBoxCoordinate(rawBack) : undefined;
      const isDual = raw.dualSided !== undefined 
        ? Boolean(raw.dualSided) 
        : (cleanBackBox !== null && cleanBackBox !== undefined);

      const rawId = raw.id || raw.presetId || raw.key;
      const id = rawId 
        ? String(rawId).replace(/^custom_tpl_/, '') 
        : `imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

      validTemplates.push({
        id,
        name,
        category: (raw.category || 'custom') as any,
        description: raw.description || `Auto-crop preset for ${name}`,
        dualSided: isDual,
        matchKeywords: typeof raw.matchKeywords === 'string' ? raw.matchKeywords : '',
        frontPage: raw.frontPage ? Number(raw.frontPage) : 1,
        backPage: raw.backPage ? Number(raw.backPage) : (isDual ? 2 : 1),
        frontBox: cleanFrontBox,
        backBox: isDual ? (cleanBackBox || undefined) : undefined,
        marginSettings: raw.marginSettings,
        imageAdjustments: raw.imageAdjustments,
        suggestedPasswordFormat: raw.suggestedPasswordFormat,
        createdAt: raw.createdAt ? Number(raw.createdAt) : Date.now(),
      });
    }

    if (validTemplates.length === 0) {
      return { 
        success: false, 
        templates: [], 
        error: 'No valid preset templates found. Each preset must contain a name and crop coordinates (x, y, width, height).' 
      };
    }

    return {
      success: true,
      templates: validTemplates,
      metadata
    };
  } catch (err: any) {
    return {
      success: false,
      templates: [],
      error: `Failed to parse preset file: ${err?.message || 'Unknown error'}`
    };
  }
}

/**
 * Import templates from a JSON string with options (merge or replace)
 */
export function importTemplatesFromJson(
  jsonInput: string | object, 
  options: { mode?: 'merge' | 'replace'; updateDuplicates?: boolean } = { mode: 'merge', updateDuplicates: true }
): { 
  success: boolean; 
  count: number; 
  addedCount: number; 
  updatedCount: number; 
  error?: string;
  importedTemplates?: CustomSavedTemplate[];
} {
  const parsedRes = parseTemplatesJson(jsonInput);
  if (!parsedRes.success || !Array.isArray(parsedRes.templates) || parsedRes.templates.length === 0) {
    return { 
      success: false, 
      count: 0, 
      addedCount: 0, 
      updatedCount: 0, 
      error: parsedRes.error || 'Invalid preset file' 
    };
  }

  const validTemplates = parsedRes.templates;
  const current = getSavedTemplates();

  if (options.mode === 'replace') {
    // Completely overwrite with imported presets
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validTemplates));
    localStorage.setItem(PERMANENT_DEFAULTS_KEY, JSON.stringify(validTemplates));
    notifyPresetsUpdated();
    return {
      success: true,
      count: validTemplates.length,
      addedCount: validTemplates.length,
      updatedCount: 0,
      importedTemplates: validTemplates
    };
  }

  // Merge strategy
  const existingMap = new Map<string, CustomSavedTemplate>();
  for (const c of current) {
    existingMap.set(c.id, c);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const t of validTemplates) {
    if (existingMap.has(t.id)) {
      if (options.updateDuplicates !== false) {
        existingMap.set(t.id, { ...existingMap.get(t.id)!, ...t });
        updatedCount++;
      }
    } else {
      existingMap.set(t.id, t);
      addedCount++;
    }
  }

  const merged = Array.from(existingMap.values());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  localStorage.setItem(PERMANENT_DEFAULTS_KEY, JSON.stringify(merged));
  notifyPresetsUpdated();

  return {
    success: true,
    count: addedCount + updatedCount,
    addedCount,
    updatedCount,
    importedTemplates: validTemplates
  };
}


