import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Sparkles, 
  Key, 
  HelpCircle, 
  Scissors, 
  CheckCircle2, 
  Layers,
  Printer,
  Sliders,
  RotateCcw,
  Search,
  Plus,
  Tag,
  Check,
  Eye,
  Settings2,
  FileText,
  AlertCircle,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  FileJson,
  Cloud,
  Globe,
  Users,
  Lock,
  Send
} from 'lucide-react';
import { PresetConfig, DocumentType, CropBox } from '../types';
import { 
  getCombinedPresets, 
  resetPresetToDefault, 
  deletePreset, 
  deleteAllPresets,
  deleteAllOfficialPresets,
  restoreAllOfficialPresets,
  resetAllPresetsToDefaults,
  areAllOfficialPresetsDeleted,
  getDeletedOfficialPresetIds,
  isPresetModified,
  getDefaultStartingPresetId,
  setDefaultStartingPresetId,
  makeAllCurrentTemplatesPermanentAndDefault
} from '../utils/cardPresets';
import { 
  getSavedTemplates, 
  downloadSingleTemplateAsJsonFile,
  presetConfigToSavedTemplate,
  PRESETS_UPDATED_EVENT
} from '../utils/templateManager';
import { 
  syncAllLocalPresetsToCloud, 
  downloadAndApplyCloudPresets, 
  savePresetToCloud,
  isUserAdmin,
  performDailyUserTemplateSync,
  getDailyUserSyncStatus,
  pushMasterTemplateUpdateToUsers
} from '../utils/cloudPresetService';
import { AuthSession } from '../utils/authService';
import { EditPresetModal } from './EditPresetModal';
import { PresetImportExportModal } from './PresetImportExportModal';

interface PresetsGuideViewProps {
  onSelectAndCrop: (presetId: string, docType: DocumentType) => void;
  currentFrontBox?: CropBox;
  currentBackBox?: CropBox;
  currentUser?: AuthSession | null;
}

export const PresetsGuideView: React.FC<PresetsGuideViewProps> = ({ 
  onSelectAndCrop,
  currentFrontBox,
  currentBackBox,
  currentUser
}) => {
  const isAdmin = isUserAdmin(currentUser);
  const [presets, setPresets] = useState<PresetConfig[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingPreset, setEditingPreset] = useState<PresetConfig | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [importExportTab, setImportExportTab] = useState<'cloud' | 'export' | 'import'>('cloud');
  const [presetToDelete, setPresetToDelete] = useState<PresetConfig | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [isDownloadingCloud, setIsDownloadingCloud] = useState<boolean>(false);
  const [isDailyUpdating, setIsDailyUpdating] = useState<boolean>(false);
  const [isPushingUpdate, setIsPushingUpdate] = useState<boolean>(false);
  const [showPushConfirm, setShowPushConfirm] = useState<boolean>(false);
  const [dailyStatus, setDailyStatus] = useState(() => getDailyUserSyncStatus());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load presets with user overrides and custom templates
  const refreshPresets = () => {
    setPresets(getCombinedPresets());
    setDefaultPresetId(getDefaultStartingPresetId());
    setDailyStatus(getDailyUserSyncStatus());
  };

  useEffect(() => {
    refreshPresets();

    const handlePresetsUpdated = () => {
      refreshPresets();
    };

    window.addEventListener(PRESETS_UPDATED_EVENT, handlePresetsUpdated);
    return () => {
      window.removeEventListener(PRESETS_UPDATED_EVENT, handlePresetsUpdated);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmPushUpdate = async () => {
    if (!isAdmin) {
      showToast('⚠️ Restricted: Only Developer or Administrator can push manual template updates.');
      return;
    }
    setIsPushingUpdate(true);
    try {
      const res = await pushMasterTemplateUpdateToUsers(currentUser);
      if (res.success) {
        refreshPresets();
        showToast(`🚀 Pushed template update to all users! ${res.count} templates published. All user devices will update instantly.`);
        setShowPushConfirm(false);
      } else {
        showToast(`Failed to push update: ${res.error}`);
      }
    } catch (e: any) {
      showToast(`Push update error: ${e?.message || 'Network error'}`);
    } finally {
      setIsPushingUpdate(false);
    }
  };

  const handleTriggerDailySync = async () => {
    if (isAdmin) {
      showToast('ℹ️ Admin notice: Admin templates are master & protected from auto-wipe.');
      return;
    }
    setIsDailyUpdating(true);
    try {
      const res = await performDailyUserTemplateSync(currentUser, { force: true });
      refreshPresets();
      if (res.performed) {
        showToast(`✨ Daily template update complete: Cleared old templates and downloaded ${res.count} fresh cloud template(s)!`);
      } else {
        showToast(res.reason || res.error || 'Templates already synchronized.');
      }
    } catch (e: any) {
      showToast(`Daily sync error: ${e?.message || 'Network failure'}`);
    } finally {
      setIsDailyUpdating(false);
    }
  };

  const handleDownloadCloudAll = async () => {
    setIsDownloadingCloud(true);
    try {
      const res = await downloadAndApplyCloudPresets();
      if (res.success) {
        refreshPresets();
        showToast(`☁️ Downloaded & updated ${res.count} preset(s) from Cloud Database (${res.addedCount} new, ${res.updatedCount} updated)!`);
      } else {
        showToast(`Cloud download notice: ${res.error || 'Failed'}`);
      }
    } catch (e: any) {
      showToast(`Cloud download error: ${e?.message || 'Unknown network error'}`);
    } finally {
      setIsDownloadingCloud(false);
    }
  };

  const handleMakePermanentAndDefaultAll = () => {
    if (!isAdmin) {
      showToast('⚠️ Restricted: Only Developer and Administrator can set permanent defaults.');
      return;
    }
    const res = makeAllCurrentTemplatesPermanentAndDefault(currentUser);
    setDefaultPresetId(res.defaultId);
    refreshPresets();
    showToast(`🌟 Saved ${res.count} preset(s) as Permanent Defaults and synced with Cloud!`);
  };

  const handleSetAsDefault = (presetId: string, name: string) => {
    setDefaultStartingPresetId(presetId);
    setDefaultPresetId(presetId);
    refreshPresets();
    showToast(`⭐ Set "${name}" as Default Starting Preset!`);
  };

  const handleSyncCloudAll = async () => {
    setIsSyncingCloud(true);
    try {
      const res = await syncAllLocalPresetsToCloud(currentUser);
      if (res.success) {
        showToast(`⬆️ Uploaded ${res.count} preset(s) to Firestore Cloud database! Available to everyone.`);
      } else {
        showToast(`Cloud upload notice: ${res.error}`);
      }
    } catch (e: any) {
      showToast(`Cloud upload error: ${e?.message || 'Unknown'}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleUploadSinglePresetToCloud = async (preset: PresetConfig) => {
    try {
      const tpl = presetConfigToSavedTemplate(preset);
      const ok = await savePresetToCloud(tpl, currentUser);
      if (ok) {
        showToast(`⬆️ Uploaded "${preset.name}" to Cloud for all users!`);
      } else {
        showToast(`Failed to upload "${preset.name}".`);
      }
    } catch (e: any) {
      showToast(`Error uploading preset: ${e?.message || 'Unknown'}`);
    }
  };

  const handleEdit = (preset: PresetConfig) => {
    setEditingPreset(preset);
    setIsEditModalOpen(true);
  };

  const handleCreateNew = () => {
    const newPreset: PresetConfig = {
      id: `custom_tpl_${Date.now()}`,
      name: '⭐ New Custom ID Preset',
      category: 'custom',
      description: 'Custom identity card preset with front and back crop coordinates',
      aspectRatio: 85.60 / 53.98,
      dualSided: true,
      frontBox: currentFrontBox || { x: 5, y: 65, width: 44, height: 28 },
      backBox: currentBackBox || { x: 51, y: 65, width: 44, height: 28 },
      frontPage: 1,
      backPage: 2,
      isCustom: true,
      isGlobal: true,
      createdBy: currentUser?.name || (currentUser?.userId ? `@${currentUser.userId}` : 'Biswas Xerox Staff'),
      createdByRole: currentUser?.role || 'operator',
    };
    setEditingPreset(newPreset);
    setIsEditModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!presetToDelete) return;
    deletePreset(presetToDelete.id);
    refreshPresets();
    showToast(`Preset "${presetToDelete.name}" deleted successfully.`);
    setPresetToDelete(null);
  };

  const handleDeleteAllPresets = () => {
    const res = deleteAllPresets();
    refreshPresets();
    setShowDeleteAllConfirm(false);
    showToast(`Deleted all ${res.count} presets from library.`);
  };

  const handleDeleteAllOfficial = () => {
    const res = deleteAllOfficialPresets();
    refreshPresets();
    setShowDeleteAllConfirm(false);
    showToast(`Deleted all ${res.count} official presets. Only custom templates remain.`);
  };

  const handleRestoreOfficial = () => {
    const res = restoreAllOfficialPresets();
    refreshPresets();
    showToast(`Restored ${res.count} official presets back to the library.`);
  };

  const handleResetAllToDefaults = () => {
    const res = resetAllPresetsToDefaults();
    refreshPresets();
    setShowDeleteAllConfirm(false);
    showToast(`Restored all ${res.count} default card presets.`);
  };

  const deletedOfficialCount = (getDeletedOfficialPresetIds() || []).length;
  const allOfficialDeleted = areAllOfficialPresetsDeleted();

  const categories = [
    { id: 'all', label: 'All Presets' },
    { id: 'custom', label: '⭐ Custom Presets' },
    { id: 'aadhaar', label: 'Aadhaar (UIDAI)' },
    { id: 'voter', label: 'Voter ID (ECI)' },
    { id: 'wb_ration', label: 'WB Ration Card' },
    { id: 'pan', label: 'PAN Card (NSDL/UTI)' },
    { id: 'ayushman', label: 'Ayushman / Health' },
  ];

  const safePresets = Array.isArray(presets) ? presets : [];

  const filteredPresets = safePresets.filter((p) => {
    if (!p) return false;
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory || (selectedCategory === 'custom' && (p.isCustom || Boolean(p.id?.startsWith('custom_tpl_'))));
    const name = (p.name || '').toLowerCase();
    const desc = (p.description || '').toLowerCase();
    const keywords = (p.matchKeywords || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q || name.includes(q) || desc.includes(q) || keywords.includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 p-4 md:p-6 bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-fade-in border border-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modern Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-blue-400" />
              <span>Custom Card Presets Hub</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-mono">
                {safePresets.length} Custom Presets Available
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Manage your custom card presets. Create custom templates tailored for your shop and sync with Firestore Cloud.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Make Presets Permanent & Default Button (Developer and Admin Only) */}
            {isAdmin ? (
              <>
                <button
                  id="make-presets-permanent-default-btn"
                  onClick={handleMakePermanentAndDefaultAll}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-600/25 transition active:scale-95 border border-amber-400/40"
                  title="Developer & Admin: Save all current custom presets as permanent defaults and sync across shop devices"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-200" />
                  <span>⭐ Make Presets Permanent & Default</span>
                </button>

                <button
                  id="push-master-template-update-btn"
                  onClick={() => setShowPushConfirm(true)}
                  disabled={isPushingUpdate}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition active:scale-95 border border-purple-400/40 disabled:opacity-50"
                  title="Admin: Instantly push fresh templates to all users. This wipes old templates on every user device in real time and downloads your fresh templates."
                >
                  <Send className={`w-4 h-4 text-purple-200 ${isPushingUpdate ? 'animate-pulse' : ''}`} />
                  <span>{isPushingUpdate ? 'Pushing...' : '🚀 Push Update to All Users'}</span>
                </button>
              </>
            ) : (
              <button
                id="make-presets-permanent-default-btn"
                disabled={true}
                className="px-3.5 py-2.5 bg-slate-850/60 border border-slate-800 text-slate-500 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-50 select-none shadow-none"
                title="Restricted: Only Developer and Administrator can set permanent defaults"
              >
                <Lock className="w-3.5 h-3.5 text-amber-500/60" />
                <span className="flex items-center gap-1.5">
                  <span>Make Presets Permanent</span>
                  <span className="text-[10px] bg-slate-900 text-amber-400/80 px-1.5 py-0.5 rounded font-mono border border-slate-800">Admin Only</span>
                </span>
              </button>
            )}

            {/* Download & Update from Cloud (For Users) */}
            <button
              id="download-cloud-presets-hub-btn"
              onClick={handleDownloadCloudAll}
              disabled={isDownloadingCloud}
              className="px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition active:scale-95 disabled:opacity-50"
              title="Download and update all presets published by Biswas Xerox / Admin from Cloud database"
            >
              <RefreshCw className={`w-4 h-4 ${isDownloadingCloud ? 'animate-spin' : ''}`} />
              <span>{isDownloadingCloud ? 'Downloading...' : '☁️ Download & Update from Cloud'}</span>
            </button>

            <button
              id="create-custom-preset-main-btn"
              onClick={handleCreateNew}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Custom Preset</span>
            </button>

            {/* Delete All Presets Button */}
            <button
              id="delete-all-presets-hub-btn"
              onClick={() => setShowDeleteAllConfirm(true)}
              className="px-3.5 py-2.5 bg-red-950/40 hover:bg-red-900/70 text-red-300 hover:text-red-100 border border-red-800/60 hover:border-red-600 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-950/30 transition active:scale-95"
              title="Delete all presets from library"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>🗑️ Delete All Presets</span>
            </button>
          </div>
        </div>

        {/* Daily Cloud Auto-Update Banner (Once in a day for regular users) */}
        {!isAdmin ? (
          <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/80 border border-blue-800/50 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
                <RefreshCw className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span>Daily Cloud Auto-Update</span>
                  </h4>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                    24-Hour Schedule Active
                  </span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                    Users & Operators Only
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Your templates automatically refresh once every 24 hours directly from the Biswas Xerox / Admin Cloud database. When updated, old local templates are removed to keep your library pristine.
                </p>
                <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
                  <span>Last Daily Sync: <strong className="text-slate-200">{dailyStatus.lastSyncTimestamp > 0 ? new Date(dailyStatus.lastSyncTimestamp).toLocaleString() : 'Pending first daily sync'}</strong></span>
                  {dailyStatus.hoursUntilNextSync > 0 && (
                    <span className="text-slate-400">· Next scheduled auto-check in ~{dailyStatus.hoursUntilNextSync}h</span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              id="daily-update-clean-now-btn"
              onClick={handleTriggerDailySync}
              disabled={isDailyUpdating}
              className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition active:scale-95 disabled:opacity-50"
              title="Force daily update right now: purges old local templates and downloads verified cloud master templates"
            >
              <RefreshCw className={`w-4 h-4 ${isDailyUpdating ? 'animate-spin' : ''}`} />
              <span>{isDailyUpdating ? 'Updating...' : '⚡ Daily Update & Clean Now'}</span>
            </button>
          </div>
        ) : (
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <span className="font-bold">⭐ Master Administrator Mode:</span>
              <span className="text-amber-400/80">Your templates are protected from daily user auto-wipes. Use &quot;Make Presets Permanent &amp; Default&quot; to publish new master templates to all users.</span>
            </div>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search presets, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 1. Presets Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Active Card Dimensions & Calibration Library ({filteredPresets.length})</span>
            </h3>
          </div>

          {filteredPresets.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl p-10 text-center space-y-3">
              <CreditCard className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-semibold text-sm">No Presets Found</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {allOfficialDeleted 
                  ? "All official presets have been deleted. Click below to create your custom template, or click 'Restore Official Presets' to reload defaults."
                  : "No presets matched your search or category filter. Try clearing your search query or creating a new custom preset."}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleCreateNew}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  + Create Custom Preset
                </button>
                {deletedOfficialCount > 0 && (
                  <button
                    onClick={handleRestoreOfficial}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-amber-500/40 transition"
                  >
                    Restore Official Presets
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPresets.map((preset) => {
                const isCustom = preset.isCustom || preset.id.startsWith('custom_tpl_');
                const isModified = isPresetModified(preset.id);
                const isDefault = defaultPresetId === preset.id || defaultPresetId === `custom_tpl_${preset.id}` || (defaultPresetId?.startsWith('custom_tpl_') && defaultPresetId.replace('custom_tpl_', '') === preset.id);

                return (
                  <div
                    key={preset.id}
                    className={`bg-slate-900 rounded-2xl border transition-all duration-200 flex flex-col justify-between p-4.5 hover:shadow-xl hover:border-slate-700 ${
                      isDefault
                        ? 'border-amber-500/60 bg-amber-950/15 ring-1 ring-amber-500/30'
                        : isCustom 
                        ? 'border-emerald-500/30 bg-emerald-950/10' 
                        : isModified
                        ? 'border-blue-500/40 bg-blue-950/10'
                        : 'border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                              <span>⭐ Default</span>
                            </span>
                          )}

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCustom 
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                              : isModified
                              ? 'bg-blue-900/60 text-blue-300 border border-blue-700/60'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {isCustom ? 'Custom Preset' : isModified ? 'Customized' : preset.category.toUpperCase()}
                          </span>

                          {isCustom && preset.isGlobal !== false && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1">
                              <Cloud className="w-2.5 h-2.5 text-blue-400" />
                              <span>Cloud Shared</span>
                            </span>
                          )}
                        </div>

                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                          preset.dualSided 
                            ? 'bg-purple-950 text-purple-300 border-purple-800/80' 
                            : 'bg-teal-950 text-teal-300 border-teal-800/80'
                        }`}>
                          {preset.dualSided ? 'Dual Sided (Front + Back)' : 'Single Sided'}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          {preset.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {preset.description}
                        </p>
                      </div>

                      {/* Multi-Page Info if applicable */}
                      {(preset.frontPage || preset.backPage) && (
                        <div className="text-[11px] bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-slate-400 font-mono">
                          <span>Multi-Page Source:</span>
                          <span className="text-blue-300 font-bold">
                            Front: P{preset.frontPage || 1} {preset.dualSided && `| Back: P${preset.backPage || 2}`}
                          </span>
                        </div>
                      )}

                      {/* Coordinates Box Summary */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[11px] text-slate-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-semibold">Front Box:</span>
                          <span>X:{preset.frontBox.x}% Y:{preset.frontBox.y}% W:{preset.frontBox.width}% H:{preset.frontBox.height}%</span>
                        </div>
                        {preset.dualSided && preset.backBox && (
                          <div className="flex items-center justify-between border-t border-slate-800/60 pt-1">
                            <span className="text-blue-400 font-semibold">Back Box:</span>
                            <span>X:{preset.backBox.x}% Y:{preset.backBox.y}% W:{preset.backBox.width}% H:{preset.backBox.height}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 mt-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Set as Default Starting Preset Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetAsDefault(preset.id, preset.name);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition ${
                            isDefault
                              ? 'bg-amber-950/70 text-amber-300 border-amber-500/50 shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700 hover:text-amber-300 hover:border-amber-700/50'
                          }`}
                          title={isDefault ? 'Currently set as Default Starting Preset' : 'Set as Default Starting Preset'}
                        >
                          <span className="text-amber-400">★</span>
                          <span>{isDefault ? 'Default' : 'Set Default'}</span>
                        </button>

                        {/* Edit Preset Button */}
                        <button
                          onClick={() => handleEdit(preset)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition"
                          title="Edit crop coordinates, dimensions, aspect ratio, or multi-page routing"
                        >
                          <Sliders className="w-3 h-3 text-blue-400" />
                          <span>Edit</span>
                        </button>

                        {/* Export JSON Button for preset */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const ok = downloadSingleTemplateAsJsonFile(preset);
                            if (ok) {
                              showToast(`Exported "${preset.name}" as JSON preset file!`);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition"
                          title={`Export "${preset.name}" as a single .json preset file`}
                        >
                          <Download className="w-3 h-3" />
                        </button>

                        {/* Delete Preset Button (Both Official and Custom) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPresetToDelete(preset);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 rounded-lg border border-slate-700 hover:border-red-800 transition"
                          title={isCustom ? `Delete custom preset "${preset.name}"` : `Delete official preset "${preset.name}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>

                        {/* Reset to Factory Default Button (if modified official preset) */}
                        {!isCustom && isModified && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resetPresetToDefault(preset.id);
                              refreshPresets();
                              showToast(`Reset "${preset.name}" back to factory defaults.`);
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-amber-950 text-slate-400 hover:text-amber-300 rounded-lg border border-slate-700 hover:border-amber-800 transition"
                            title="Reset back to factory default coordinates"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Test Preset Button */}
                      <button
                        onClick={() => onSelectAndCrop(preset.id, preset.category)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold shadow transition flex items-center gap-1.5 active:scale-95"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Test Preset</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Password Decryption Reference Guide */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-800 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Government PDF Password Cheat-Sheet</h3>
              <p className="text-[11px] text-slate-400">Quick decryption rules for locked government downloaded files</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>UIDAI e-Aadhaar PDF:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                First 4 letters of your name in <strong className="text-slate-200">CAPITALS</strong> + 4-digit Year of Birth (YYYY).
              </p>
              <div className="mt-2 bg-slate-900 p-2 rounded-lg font-mono text-[10.5px] text-amber-300 border border-slate-800">
                Example: <span className="text-slate-300">RAVI KUMAR, 1988</span> → <strong className="text-emerald-400">RAVI1988</strong>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>NSDL / UTI e-PAN PDF:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Date of Birth in continuous <strong className="text-slate-200">DDMMYYYY</strong> format without spaces or slashes.
              </p>
              <div className="mt-2 bg-slate-900 p-2 rounded-lg font-mono text-[10.5px] text-amber-300 border border-slate-800">
                Example: <span className="text-slate-300">05/11/1992</span> → <strong className="text-emerald-400">05111992</strong>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>e-EPIC Voter / Ration Card:</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Registered Mobile Number or EPIC Number in capital letters.
              </p>
              <div className="mt-2 bg-slate-900 p-2 rounded-lg font-mono text-[10.5px] text-amber-300 border border-slate-800">
                Example: <strong className="text-emerald-400">9830012345</strong> or <strong className="text-emerald-400">WB/01/001/123456</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Single Preset Confirmation Modal */}
      {presetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-900/60 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Delete Preset
                </h3>
                <p className="text-xs text-slate-400">Confirmation required</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to delete preset <strong className="text-white">"{presetToDelete.name}"</strong>?
              </p>
              <p className="text-[11px] text-red-400 mt-2">
                This preset will be removed from your preset selector and batch dropdowns.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPresetToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Preset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete ALL Presets Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-300">
                  Delete All Presets from Library?
                </h3>
                <p className="text-xs text-slate-400">Choose how you would like to clear your presets</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-3">
              <p className="text-slate-300 leading-relaxed">
                You currently have <strong className="text-white font-mono">{safePresets.length}</strong> active presets loaded in your workspace.
              </p>
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-300 text-[11px] space-y-1">
                <div className="font-semibold text-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Warning: This will clear presets from your dropdown selector.</span>
                </div>
                <div>You can either delete all presets completely, delete only built-in government cards, or restore original factory defaults anytime.</div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                id="confirm-delete-all-presets-btn"
                onClick={handleDeleteAllPresets}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>🗑️ Delete ALL Presets (Custom & Built-in)</span>
              </button>

              <button
                type="button"
                id="confirm-delete-official-only-btn"
                onClick={handleDeleteAllOfficial}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Delete Official Govt Presets Only (Keep My Custom Presets)</span>
              </button>

              <button
                type="button"
                id="confirm-restore-defaults-btn"
                onClick={handleResetAllToDefaults}
                className="w-full py-2.5 px-4 bg-slate-850 hover:bg-slate-800 text-emerald-400 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                <span>Restore Original Factory Default Presets</span>
              </button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Push Update Confirmation Modal */}
      {showPushConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <Send className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Push Master Template Update</h3>
                <p className="text-xs text-purple-300/80 font-mono">Instant Live Broadcast to All User Devices</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <p className="leading-relaxed">
                You are about to publish an instant template update. When confirmed:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Your current master presets will be uploaded to the Cloud Firestore database.</li>
                <li><strong className="text-amber-400">All user and operator devices</strong> will receive an immediate live signal.</li>
                <li>Every user device will <strong className="text-red-400">delete all previous templates</strong> and auto-download your fresh templates.</li>
                <li>Your admin account remains protected and unaffected.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowPushConfirm(false)}
                disabled={isPushingUpdate}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-push-update-action-btn"
                onClick={handleConfirmPushUpdate}
                disabled={isPushingUpdate}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isPushingUpdate ? 'animate-pulse' : ''}`} />
                <span>{isPushingUpdate ? 'Pushing Update...' : '🚀 Confirm & Push Update Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preset Import/Export Modal */}
      <PresetImportExportModal
        isOpen={isImportExportOpen}
        initialTab={importExportTab}
        currentUser={currentUser}
        onClose={() => setIsImportExportOpen(false)}
        onPresetsUpdated={() => {
          refreshPresets();
          showToast('Custom presets updated successfully!');
        }}
      />

      {/* Edit Preset Modal */}
      <EditPresetModal
        isOpen={isEditModalOpen}
        preset={editingPreset}
        currentFrontBox={currentFrontBox}
        currentBackBox={currentBackBox}
        currentUser={currentUser}
        onClose={() => setIsEditModalOpen(false)}
        onPresetSaved={(updated) => {
          refreshPresets();
          showToast(`Preset "${updated.name}" saved successfully!`);
        }}
        onPresetDeleted={() => {
          refreshPresets();
          showToast(`Preset deleted successfully.`);
        }}
      />
    </div>
  );
};
