import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CustomSavedTemplate, PresetConfig } from '../types';
import { getSavedTemplates, notifyPresetsUpdated, getDeletedPresetIds } from './templateManager';

export const SHARED_PRESETS_COLLECTION = 'shared_presets';
const LOCAL_STORAGE_KEY = 'sayonika_custom_templates';

/**
 * Check if the user is an Administrator or Developer authorized to manage cloud database presets
 */
export function isUserAdmin(user?: { userId?: string; name?: string; role?: string } | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase().trim();
  const userId = String(user.userId || '').toLowerCase().trim();
  return (
    role === 'admin' ||
    role === 'developer' ||
    userId === 'admin' ||
    userId === 'samit' ||
    userId === 'developer' ||
    userId === 'biswasxerox1@gmail.com'
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email || null,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

let unsubscribeCloudPresets: Unsubscribe | null = null;
let cloudSyncActive = false;
let cloudPresetsCount = 0;
let lastSyncTimestamp = 0;

export function getCloudSyncInfo(): { isConnected: boolean; count: number; lastSyncTimestamp: number } {
  return {
    isConnected: cloudSyncActive,
    count: cloudPresetsCount,
    lastSyncTimestamp
  };
}

/**
 * Parses raw Firestore document into a typed CustomSavedTemplate
 */
function parseCloudDoc(docId: string, data: any): CustomSavedTemplate | null {
  if (!data || !data.name || !data.frontBox) return null;

  return {
    id: docId,
    name: data.name,
    category: data.category || 'custom',
    description: data.description || `Auto-crop preset for ${data.name}`,
    dualSided: Boolean(data.dualSided),
    frontBox: {
      x: Number(data.frontBox.x) || 0,
      y: Number(data.frontBox.y) || 0,
      width: Number(data.frontBox.width) || 44,
      height: Number(data.frontBox.height) || 28,
    },
    backBox: data.dualSided && data.backBox ? {
      x: Number(data.backBox.x) || 0,
      y: Number(data.backBox.y) || 0,
      width: Number(data.backBox.width) || 44,
      height: Number(data.backBox.height) || 28,
    } : undefined,
    frontPage: data.frontPage ? Number(data.frontPage) : 1,
    backPage: data.backPage ? Number(data.backPage) : (data.dualSided ? 2 : 1),
    matchKeywords: data.matchKeywords || '',
    suggestedPasswordFormat: data.suggestedPasswordFormat || '',
    instructions: data.instructions || '',
    marginSettings: data.marginSettings || undefined,
    imageAdjustments: data.imageAdjustments || undefined,
    isGlobal: true,
    createdBy: data.createdBy || 'Biswas Xerox Staff',
    createdByRole: data.createdByRole || 'admin',
    createdAt: data.createdAt ? Number(data.createdAt) : Date.now(),
    updatedAt: data.updatedAt ? Number(data.updatedAt) : Date.now(),
  };
}

/**
 * Merge a list of cloud templates into local storage safely.
 * CRITICAL PROTECTION:
 * - NEVER restore presets that were deleted by the operator or admin.
 * - NEVER overwrite local user customizations with older cloud versions.
 * - Keeps user changes forever until admin/developer explicitly changes or deletes them.
 */
function mergeCloudTemplatesIntoLocalStorage(cloudList: CustomSavedTemplate[]): { total: number; added: number; updated: number } {
  const rawLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
  let localTemplates: CustomSavedTemplate[] = [];
  try {
    const parsed = rawLocal ? JSON.parse(rawLocal) : [];
    localTemplates = Array.isArray(parsed) ? parsed : [];
  } catch {
    localTemplates = [];
  }

  const templateMap = new Map<string, CustomSavedTemplate>();

  // 1. Load local templates
  for (const local of localTemplates) {
    const rawId = local.id.replace(/^custom_tpl_/, '');
    templateMap.set(rawId, { ...local, id: rawId });
  }

  const deletedIds = new Set(getDeletedPresetIds());
  let added = 0;
  let updated = 0;

  // 2. Merge Cloud templates without overwriting local customizations or reviving deleted presets
  for (const cloud of cloudList) {
    const cleanCloudId = cloud.id.replace(/^custom_tpl_/, '');

    // NEVER restore any preset that the user or admin explicitly deleted
    if (
      deletedIds.has(cloud.id) || 
      deletedIds.has(cleanCloudId) || 
      deletedIds.has(`custom_tpl_${cleanCloudId}`)
    ) {
      continue;
    }

    const local = templateMap.get(cleanCloudId);
    if (local) {
      // PRESERVE LOCAL OPERATOR EDITS:
      // If local version was modified by user/operator, NEVER revert it back to older cloud defaults!
      const localTime = Number(local.updatedAt) || 0;
      const cloudTime = Number(cloud.updatedAt) || 0;

      if (localTime >= cloudTime) {
        // Local has latest or operator customizations, KEEP local!
        continue;
      }

      // Cloud is strictly newer and not deleted
      templateMap.set(cleanCloudId, { ...cloud, id: cleanCloudId });
      updated++;
    } else {
      // Brand new preset from cloud that doesn't exist locally and wasn't deleted
      templateMap.set(cleanCloudId, { ...cloud, id: cleanCloudId });
      added++;
    }
  }

  const mergedList = Array.from(templateMap.values());
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedList));
  localStorage.setItem('sayonika_permanent_default_templates', JSON.stringify(mergedList));
  cloudPresetsCount = cloudList.length;
  lastSyncTimestamp = Date.now();
  notifyPresetsUpdated();

  return { total: mergedList.length, added, updated };
}

/**
 * Initialize real-time synchronization with Firestore shared_presets collection.
 * When any user adds, modifies, or deletes a custom template in the cloud,
 * this listener automatically merges it into local memory/storage and notifies the app in real time.
 */
export function initCloudPresetsSync(): () => void {
  if (unsubscribeCloudPresets) {
    return () => {
      if (unsubscribeCloudPresets) {
        unsubscribeCloudPresets();
        unsubscribeCloudPresets = null;
      }
    };
  }

  try {
    const colRef = collection(db, SHARED_PRESETS_COLLECTION);
    unsubscribeCloudPresets = onSnapshot(colRef, (snapshot) => {
      cloudSyncActive = true;
      const cloudList: CustomSavedTemplate[] = [];

      snapshot.forEach((docSnap) => {
        const parsed = parseCloudDoc(docSnap.id, docSnap.data());
        if (parsed) {
          cloudList.push(parsed);
        }
      });

      cloudPresetsCount = cloudList.length;
      mergeCloudTemplatesIntoLocalStorage(cloudList);
    }, (error) => {
      console.warn('Live subscription to shared_presets notice:', error);
      cloudSyncActive = false;
    });

    return () => {
      if (unsubscribeCloudPresets) {
        unsubscribeCloudPresets();
        unsubscribeCloudPresets = null;
      }
    };
  } catch (error) {
    console.error('Error starting shared_presets live sync:', error);
    return () => {};
  }
}

/**
 * Ensures all custom presets are permanently uploaded and seeded in the Cloud Firestore database.
 * If cloud collection is missing presets or empty, uploads all local and default starter templates
 * (for Admin only) so they are immediately available for everyone who opens the app.
 * For standard users / public, only downloads existing presets from Cloud into local storage.
 */
export async function ensureCloudPresetsSeeded(
  user?: { userId?: string; name?: string; role?: string } | null
): Promise<{ seeded: boolean; count: number }> {
  try {
    const colRef = collection(db, SHARED_PRESETS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const cloudMap = new Map<string, any>();

    snapshot.forEach(docSnap => {
      cloudMap.set(docSnap.id, docSnap.data());
    });

    const localTemplates = getSavedTemplates();
    const deletedIds = new Set(getDeletedPresetIds());
    let uploadCount = 0;

    // Upload local templates to cloud ONLY if current user is an Admin/Developer
    if (isUserAdmin(user)) {
      for (const tpl of localTemplates) {
        const cleanId = tpl.id.replace(/^custom_tpl_/, '');
        if (deletedIds.has(cleanId) || deletedIds.has(tpl.id)) {
          continue; // Do not upload deleted presets
        }

        const existingCloud = cloudMap.get(cleanId);
        const localTime = Number(tpl.updatedAt) || 0;
        const cloudTime = Number(existingCloud?.updatedAt) || 0;

        // Upload if not yet in cloud OR if admin made changes locally that are newer than cloud
        if (!existingCloud || localTime > cloudTime) {
          const ok = await savePresetToCloud(tpl, user);
          if (ok) uploadCount++;
        }
      }
    }

    // Download anything that was in the cloud into local storage for this device/session
    if (snapshot.size > 0) {
      const cloudList: CustomSavedTemplate[] = [];
      snapshot.forEach((docSnap) => {
        const parsed = parseCloudDoc(docSnap.id, docSnap.data());
        if (parsed && !deletedIds.has(parsed.id) && !deletedIds.has(docSnap.id)) {
          cloudList.push(parsed);
        }
      });
      mergeCloudTemplatesIntoLocalStorage(cloudList);
    }

    cloudSyncActive = true;
    lastSyncTimestamp = Date.now();
    return { seeded: true, count: uploadCount };
  } catch (error) {
    console.warn('Cloud preset seeding notice (offline or connecting):', error);
    return { seeded: false, count: 0 };
  }
}

/**
 * Explicit manual download & update from Firestore Cloud Database.
 * Directly queries the Firestore 'shared_presets' collection,
 * saves to local storage, and returns detailed status for UI feedback.
 */
export async function downloadAndApplyCloudPresets(): Promise<{
  success: boolean;
  count: number;
  addedCount: number;
  updatedCount: number;
  templates: CustomSavedTemplate[];
  error?: string;
}> {
  try {
    const colRef = collection(db, SHARED_PRESETS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const cloudList: CustomSavedTemplate[] = [];

    snapshot.forEach((docSnap) => {
      const parsed = parseCloudDoc(docSnap.id, docSnap.data());
      if (parsed) {
        cloudList.push(parsed);
      }
    });

    cloudPresetsCount = cloudList.length;
    cloudSyncActive = true;
    lastSyncTimestamp = Date.now();

    const { added, updated } = mergeCloudTemplatesIntoLocalStorage(cloudList);

    return {
      success: true,
      count: cloudList.length,
      addedCount: added,
      updatedCount: updated,
      templates: cloudList,
    };
  } catch (error: any) {
    console.error('Failed to download cloud presets:', error);
    return {
      success: false,
      count: 0,
      addedCount: 0,
      updatedCount: 0,
      templates: [],
      error: error?.message || 'Failed to download cloud presets from Firestore.'
    };
  }
}

/**
 * Fetch all available presets directly from Firestore without writing to localStorage (for preview/list).
 */
export async function fetchCloudPresetsList(): Promise<{
  success: boolean;
  templates: CustomSavedTemplate[];
  error?: string;
}> {
  try {
    const colRef = collection(db, SHARED_PRESETS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const cloudList: CustomSavedTemplate[] = [];

    snapshot.forEach((docSnap) => {
      const parsed = parseCloudDoc(docSnap.id, docSnap.data());
      if (parsed) {
        cloudList.push(parsed);
      }
    });

    return {
      success: true,
      templates: cloudList,
    };
  } catch (error: any) {
    return {
      success: false,
      templates: [],
      error: error?.message || 'Failed to fetch cloud presets list.'
    };
  }
}

/**
 * Save or update a custom template to Firestore shared_presets collection.
 * RESTRICTED: Only Administrator can save or upload presets to Cloud.
 * Public and standard users will not be allowed to write to Cloud.
 */
export async function savePresetToCloud(
  template: CustomSavedTemplate,
  user?: { userId?: string; name?: string; role?: string } | null
): Promise<boolean> {
  // CRITICAL ENFORCEMENT: Strictly block public/non-admin users from uploading to Cloud
  if (!isUserAdmin(user)) {
    console.warn('Blocked cloud upload: Public/Standard users cannot save presets to Cloud. Presets are saved locally.');
    return false;
  }

  const cleanId = template.id.startsWith('custom_tpl_') 
    ? template.id.replace('custom_tpl_', '') 
    : template.id;

  const docRef = doc(db, SHARED_PRESETS_COLLECTION, cleanId);

  const payload = {
    id: cleanId,
    name: template.name.replace(/^⭐\s*/, '').trim(),
    category: template.category || 'custom',
    description: template.description || `Auto-crop preset for ${template.name}`,
    dualSided: Boolean(template.dualSided),
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
    } : null,
    frontPage: template.frontPage || 1,
    backPage: template.backPage || (template.dualSided ? 2 : 1),
    matchKeywords: template.matchKeywords || '',
    suggestedPasswordFormat: template.suggestedPasswordFormat || '',
    instructions: template.instructions || '',
    marginSettings: template.marginSettings || null,
    imageAdjustments: template.imageAdjustments || null,
    isGlobal: true,
    createdBy: user?.name || (user?.userId ? `@${user.userId}` : template.createdBy || 'Biswas Xerox Staff'),
    createdByRole: user?.role || template.createdByRole || 'admin',
    createdAt: template.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SHARED_PRESETS_COLLECTION}/${cleanId}`);
    return false;
  }
}

/**
 * Delete a single custom preset from Firestore shared_presets collection.
 * RESTRICTED: Only Administrator can delete presets from Cloud database.
 */
export async function deletePresetFromCloud(
  presetId: string,
  user?: { userId?: string; name?: string; role?: string } | null
): Promise<boolean> {
  if (user && !isUserAdmin(user)) {
    console.warn('Blocked cloud preset deletion: Only Administrator is authorized.');
    return false;
  }

  const cleanId = presetId.startsWith('custom_tpl_') 
    ? presetId.replace('custom_tpl_', '') 
    : presetId;

  const docRef = doc(db, SHARED_PRESETS_COLLECTION, cleanId);

  try {
    await deleteDoc(docRef);
    notifyPresetsUpdated();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SHARED_PRESETS_COLLECTION}/${cleanId}`);
    return false;
  }
}

/**
 * Delete ALL presets and templates from the Cloud Multi-User Sync Database.
 * RESTRICTED: Only Administrator can perform this action.
 */
export async function deleteAllPresetsFromCloud(
  user?: { userId?: string; name?: string; role?: string } | null
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isUserAdmin(user)) {
    return {
      success: false,
      count: 0,
      error: 'Unauthorized: Only Administrator can delete presets from Cloud Database.'
    };
  }

  try {
    const colRef = collection(db, SHARED_PRESETS_COLLECTION);
    const snapshot = await getDocs(colRef);
    let deletedCount = 0;

    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    cloudPresetsCount = 0;
    // Wipe local cache so local and cloud are completely in sync
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem('sayonika_permanent_default_templates');
    localStorage.removeItem('sayonika_default_preset_id');
    localStorage.removeItem('sayonika_preset_overrides');
    localStorage.removeItem('sayonika_deleted_official_presets');
    notifyPresetsUpdated();

    return {
      success: true,
      count: deletedCount
    };
  } catch (error: any) {
    console.error('Failed to delete all presets from cloud database:', error);
    handleFirestoreError(error, OperationType.DELETE, SHARED_PRESETS_COLLECTION);
    return {
      success: false,
      count: 0,
      error: error?.message || 'Failed to delete presets from Cloud database.'
    };
  }
}

/**
 * Sync / Upload all local custom presets to Firestore cloud database.
 * RESTRICTED: Only Administrator can upload presets to the Cloud multi-user database.
 */
export async function syncAllLocalPresetsToCloud(
  user?: { userId?: string; name?: string; role?: string } | null
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!isUserAdmin(user)) {
    return {
      success: false,
      count: 0,
      error: 'Unauthorized: Public/Standard users are not permitted to upload presets to the Cloud database.'
    };
  }

  try {
    const templates = getSavedTemplates();
    if (templates.length === 0) {
      return { success: true, count: 0, error: 'No custom templates found to upload.' };
    }

    let count = 0;
    for (const t of templates) {
      const ok = await savePresetToCloud(t, user);
      if (ok) count++;
    }

    return { success: true, count };
  } catch (error: any) {
    return { 
      success: false, 
      count: 0, 
      error: error?.message || 'Failed to upload local presets to cloud.' 
    };
  }
}

export const DAILY_USER_TEMPLATE_SYNC_KEY = 'sayonika_last_daily_template_sync_v1';
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface DailyUserSyncStatus {
  lastSyncTimestamp: number;
  isEligibleForSync: boolean;
  hoursSinceLastSync: number;
  hoursUntilNextSync: number;
}

/**
 * Get current daily template sync status for regular users
 */
export function getDailyUserSyncStatus(): DailyUserSyncStatus {
  const raw = typeof window !== 'undefined' ? localStorage.getItem(DAILY_USER_TEMPLATE_SYNC_KEY) : null;
  const lastSync = raw ? parseInt(raw, 10) : 0;
  const now = Date.now();
  const elapsed = now - lastSync;
  const isEligible = lastSync === 0 || elapsed >= TWENTY_FOUR_HOURS_MS;
  const hoursSince = lastSync > 0 ? Math.floor(elapsed / (1000 * 60 * 60)) : -1;
  const hoursUntil = isEligible ? 0 : Math.ceil((TWENTY_FOUR_HOURS_MS - elapsed) / (1000 * 60 * 60));

  return {
    lastSyncTimestamp: lastSync,
    isEligibleForSync: isEligible,
    hoursSinceLastSync: hoursSince,
    hoursUntilNextSync: hoursUntil
  };
}

/**
 * Daily Template Auto-Update & Refresh Function for Regular Users.
 * - Runs once in 24 hours automatically.
 * - Downloads the latest verified master templates directly from the Firestore Cloud database.
 * - Cleans and purges all old, stale local templates and overrides.
 * - Strictly restricted: ONLY executes for regular users / operators / guests.
 *   Admins and developers are protected so their working templates are never wiped.
 */
export async function performDailyUserTemplateSync(
  user?: { userId?: string; name?: string; role?: string } | null,
  options: { force?: boolean } = {}
): Promise<{
  performed: boolean;
  count: number;
  reason?: string;
  error?: string;
  templates?: CustomSavedTemplate[];
}> {
  // 1. Protection: Only execute for regular users. Never wipe Admin / Developer templates!
  if (isUserAdmin(user)) {
    return {
      performed: false,
      count: 0,
      reason: 'Skipped: Administrator & Developer accounts are excluded from daily template auto-wipe.'
    };
  }

  // 2. Check 24-hour interval unless force is set
  const { isEligibleForSync, hoursUntilNextSync } = getDailyUserSyncStatus();
  if (!options.force && !isEligibleForSync) {
    return {
      performed: false,
      count: 0,
      reason: `Templates already up to date for today. Next scheduled auto-update in ~${hoursUntilNextSync}h.`
    };
  }

  try {
    // 3. Download fresh templates directly from Firestore shared_presets
    const colRef = collection(db, SHARED_PRESETS_COLLECTION);
    const snapshot = await getDocs(colRef);
    const cloudTemplates: CustomSavedTemplate[] = [];

    snapshot.forEach((docSnap) => {
      const parsed = parseCloudDoc(docSnap.id, docSnap.data());
      if (parsed) {
        cloudTemplates.push(parsed);
      }
    });

    // 4. Delete all old local templates and overrides for this user
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('sayonika_permanent_default_templates');
    localStorage.removeItem('sayonika_preset_overrides');
    localStorage.removeItem('sayonika_deleted_official_presets');
    localStorage.removeItem('sayonika_deleted_preset_ids');

    // 5. Store the fresh downloaded cloud templates into local memory
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudTemplates));
    localStorage.setItem('sayonika_permanent_default_templates', JSON.stringify(cloudTemplates));

    if (cloudTemplates.length > 0) {
      const primaryDefaultId = `custom_tpl_${cloudTemplates[0].id.replace(/^custom_tpl_/, '')}`;
      localStorage.setItem('sayonika_default_preset_id', primaryDefaultId);
    } else {
      localStorage.removeItem('sayonika_default_preset_id');
    }

    // 6. Record timestamp of daily sync
    const now = Date.now();
    localStorage.setItem(DAILY_USER_TEMPLATE_SYNC_KEY, String(now));
    cloudPresetsCount = cloudTemplates.length;
    cloudSyncActive = true;
    lastSyncTimestamp = now;

    // 7. Trigger app-wide reactive update
    notifyPresetsUpdated();

    return {
      performed: true,
      count: cloudTemplates.length,
      templates: cloudTemplates,
      reason: `Daily template refresh complete: cleared old local templates and downloaded ${cloudTemplates.length} verified cloud templates.`
    };
  } catch (error: any) {
    console.error('Error in daily user template sync:', error);
    handleFirestoreError(error, OperationType.LIST, SHARED_PRESETS_COLLECTION);
    return {
      performed: false,
      count: 0,
      error: error?.message || 'Failed to download daily templates from Firestore Cloud database.'
    };
  }
}

export const TEMPLATE_PUSH_BROADCAST_DOC = 'template_push_broadcast';
export const LAST_HANDLED_PUSH_KEY = 'sayonika_last_handled_template_push_id';

export interface TemplatePushBroadcast {
  pushId: string;
  version: number;
  pushedAt: number;
  pushedBy: string;
  pushedByRole?: string;
  templateCount: number;
  note?: string;
  forceWipeAndDownload: boolean;
}

/**
 * Admin manual push function:
 * 1. Verifies user is Admin/Developer.
 * 2. Uploads all local master templates to Firestore shared_presets.
 * 3. Broadcasts instant update signal to system_config/template_push_broadcast.
 * 4. All active user devices across the internet receive the push in real-time,
 *    wipe previous templates, and download fresh templates from the cloud.
 */
export async function pushMasterTemplateUpdateToUsers(
  adminUser?: { userId?: string; name?: string; role?: string } | null,
  options: { note?: string } = {}
): Promise<{ success: boolean; count: number; pushId?: string; error?: string }> {
  if (!isUserAdmin(adminUser)) {
    return {
      success: false,
      count: 0,
      error: 'Restricted: Only Administrator or Developer can push manual template updates to users.'
    };
  }

  try {
    // 1. Sync / Save current templates to Cloud shared_presets
    const uploadRes = await syncAllLocalPresetsToCloud(adminUser);
    if (!uploadRes.success && uploadRes.error && !uploadRes.error.includes('No custom templates found')) {
      return { success: false, count: 0, error: uploadRes.error };
    }

    const templates = Array.isArray(getSavedTemplates()) ? getSavedTemplates() : [];
    const pushId = `push_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const pushPayload: TemplatePushBroadcast = {
      pushId,
      version: now,
      pushedAt: now,
      pushedBy: adminUser?.name || (adminUser?.userId ? `@${adminUser.userId}` : 'Biswas Xerox Admin'),
      pushedByRole: adminUser?.role || 'admin',
      templateCount: templates.length,
      note: options.note || 'Admin pushed instant master template update',
      forceWipeAndDownload: true
    };

    // 2. Broadcast signal via Firestore system_config
    const broadcastRef = doc(db, 'system_config', TEMPLATE_PUSH_BROADCAST_DOC);
    await setDoc(broadcastRef, pushPayload, { merge: true });

    // Mark admin device as having handled this push
    localStorage.setItem(LAST_HANDLED_PUSH_KEY, pushId);

    return {
      success: true,
      count: templates.length,
      pushId
    };
  } catch (error: any) {
    console.error('Failed to push master template update:', error);
    handleFirestoreError(error, OperationType.WRITE, `system_config/${TEMPLATE_PUSH_BROADCAST_DOC}`);
    return {
      success: false,
      count: 0,
      error: error?.message || 'Failed to send template push broadcast.'
    };
  }
}

/**
 * Real-time listener for regular users:
 * Listens to system_config/template_push_broadcast.
 * When a new push from Admin is detected:
 * - Deletes ALL previous templates
 * - Downloads fresh templates from Cloud
 * - Updates local storage and informs the user
 * - Skips Admin/Developer accounts so master templates are never wiped
 */
export function subscribeToAdminTemplatePushes(
  currentUser?: { userId?: string; name?: string; role?: string } | null,
  onPushReceived?: (info: { count: number; pushedBy: string; timestamp: number; note?: string }) => void
): () => void {
  // If user is Admin, they shouldn't wipe their own templates when listening
  if (isUserAdmin(currentUser)) {
    return () => {};
  }

  try {
    const broadcastRef = doc(db, 'system_config', TEMPLATE_PUSH_BROADCAST_DOC);
    const unsubscribe = onSnapshot(broadcastRef, async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as TemplatePushBroadcast;
      if (!data || !data.pushId) return;

      const lastHandledPush = localStorage.getItem(LAST_HANDLED_PUSH_KEY);
      if (lastHandledPush === data.pushId) {
        // Already processed this exact push
        return;
      }

      // Check if this push is fresh (pushed within last 7 days)
      if (Date.now() - (data.pushedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
        return;
      }

      console.log(`[Instant Push] Detected new template update from ${data.pushedBy} (${data.pushId})`);

      try {
        // Fetch fresh cloud templates
        const colRef = collection(db, SHARED_PRESETS_COLLECTION);
        const colSnap = await getDocs(colRef);
        const cloudTemplates: CustomSavedTemplate[] = [];

        colSnap.forEach((docSnap) => {
          const parsed = parseCloudDoc(docSnap.id, docSnap.data());
          if (parsed) {
            cloudTemplates.push(parsed);
          }
        });

        // 1. Delete ALL previous templates & overrides
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem('sayonika_permanent_default_templates');
        localStorage.removeItem('sayonika_preset_overrides');
        localStorage.removeItem('sayonika_deleted_official_presets');
        localStorage.removeItem('sayonika_deleted_preset_ids');

        // 2. Download and write fresh templates
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudTemplates));
        localStorage.setItem('sayonika_permanent_default_templates', JSON.stringify(cloudTemplates));

        if (cloudTemplates.length > 0) {
          const primaryDefaultId = `custom_tpl_${cloudTemplates[0].id.replace(/^custom_tpl_/, '')}`;
          localStorage.setItem('sayonika_default_preset_id', primaryDefaultId);
        } else {
          localStorage.removeItem('sayonika_default_preset_id');
        }

        // 3. Update sync tracking keys
        localStorage.setItem(LAST_HANDLED_PUSH_KEY, data.pushId);
        localStorage.setItem(DAILY_USER_TEMPLATE_SYNC_KEY, String(Date.now()));
        cloudPresetsCount = cloudTemplates.length;
        lastSyncTimestamp = Date.now();

        // 4. Notify app
        notifyPresetsUpdated();

        if (onPushReceived) {
          onPushReceived({
            count: cloudTemplates.length,
            pushedBy: data.pushedBy || 'Admin',
            timestamp: data.pushedAt || Date.now(),
            note: data.note
          });
        }
      } catch (err) {
        console.error('[Instant Push] Error applying fresh template update:', err);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.warn('[Instant Push] Could not initialize template push listener:', error);
    return () => {};
  }
}




