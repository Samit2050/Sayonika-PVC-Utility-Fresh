import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  FileText, 
  X, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  Sliders, 
  Tag, 
  RefreshCw, 
  FolderOpen,
  Cloud,
  Globe,
  ArrowUpCircle,
  ArrowDownCircle,
  UserCheck,
  CreditCard,
  Trash2,
  Lock,
  ShieldAlert,
  AlertTriangle,
  Database
} from 'lucide-react';
import { CustomSavedTemplate, PresetConfig } from '../types';
import { 
  getSavedTemplates, 
  exportTemplatesAsJson, 
  importTemplatesFromJson, 
  parseTemplatesJson,
  downloadTemplatesAsJsonFile, 
  downloadSingleTemplateAsJsonFile,
  presetConfigToSavedTemplate,
  deleteAllPresetsFromPublicApp
} from '../utils/templateManager';
import { getCombinedPresets, CARD_PRESETS } from '../utils/cardPresets';
import { 
  syncAllLocalPresetsToCloud, 
  downloadAndApplyCloudPresets, 
  fetchCloudPresetsList, 
  savePresetToCloud,
  deletePresetFromCloud,
  deleteAllPresetsFromCloud,
  isUserAdmin,
  getCloudSyncInfo 
} from '../utils/cloudPresetService';
import { AuthSession } from '../utils/authService';

interface PresetImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPresetsUpdated: () => void;
  initialTab?: 'cloud' | 'export' | 'import';
  currentUser?: AuthSession | null;
}

export const PresetImportExportModal: React.FC<PresetImportExportModalProps> = ({
  isOpen,
  onClose,
  onPresetsUpdated,
  initialTab = 'cloud',
  currentUser,
}) => {
  const isAdmin = isUserAdmin(currentUser);
  const [activeTab, setActiveTab] = useState<'cloud' | 'export' | 'import'>(initialTab);
  const [exportFilter, setExportFilter] = useState<'all' | 'custom' | 'official'>('all');
  const [exportablePresets, setExportablePresets] = useState<(CustomSavedTemplate | PresetConfig)[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Cloud State
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);
  const [isCloudDownloading, setIsCloudDownloading] = useState<boolean>(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cloudPresetsList, setCloudPresetsList] = useState<CustomSavedTemplate[]>([]);
  const [loadingCloudList, setLoadingCloudList] = useState<boolean>(false);
  
  // Delete Modals & In-Progress States
  const [showDeletePublicModal, setShowDeletePublicModal] = useState<boolean>(false);
  const [showDeleteCloudModal, setShowDeleteCloudModal] = useState<boolean>(false);
  const [deletingCloudPresetId, setDeletingCloudPresetId] = useState<string | null>(null);
  const [isDeletingAllPublic, setIsDeletingAllPublic] = useState<boolean>(false);
  const [isDeletingAllCloud, setIsDeletingAllCloud] = useState<boolean>(false);

  // Export State
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Import State
  const [importJsonText, setImportJsonText] = useState('');
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [syncImportedToCloud, setSyncImportedToCloud] = useState<boolean>(isAdmin);
  const [parsedPreview, setParsedPreview] = useState<{
    success: boolean;
    templates: CustomSavedTemplate[];
    error?: string;
    metadata?: any;
  } | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCloudPresets = async () => {
    setLoadingCloudList(true);
    try {
      const res = await fetchCloudPresetsList();
      if (res.success) {
        setCloudPresetsList(res.templates);
      }
    } catch (e) {
      console.warn('Could not fetch cloud list preview:', e);
    } finally {
      setLoadingCloudList(false);
    }
  };

  const handleDownloadCloudPresetsNow = async () => {
    setIsCloudDownloading(true);
    setCloudSyncMsg(null);
    try {
      const res = await downloadAndApplyCloudPresets();
      if (res.success) {
        setCloudSyncMsg({
          type: 'success',
          text: `☁️ Successfully downloaded & updated ${res.count} preset(s) from Cloud Database (${res.addedCount} new, ${res.updatedCount} updated)!`
        });
        onPresetsUpdated();
        reloadExportList();
        loadCloudPresets();
        setTimeout(() => setCloudSyncMsg(null), 5000);
      } else {
        setCloudSyncMsg({
          type: 'error',
          text: `Cloud download notice: ${res.error || 'Failed to download.'}`
        });
      }
    } catch (err: any) {
      setCloudSyncMsg({
        type: 'error',
        text: `Cloud download error: ${err?.message || 'Unknown network error'}`
      });
    } finally {
      setIsCloudDownloading(false);
    }
  };

  const handleUploadAllToCloudNow = async () => {
    setIsCloudSyncing(true);
    setCloudSyncMsg(null);
    try {
      const res = await syncAllLocalPresetsToCloud(currentUser);
      if (res.success) {
        setCloudSyncMsg({
          type: 'success',
          text: `⬆️ Successfully uploaded ${res.count} custom preset(s) to Firestore Cloud! All users can now download them.`
        });
        loadCloudPresets();
        onPresetsUpdated();
        setTimeout(() => setCloudSyncMsg(null), 5000);
      } else {
        setCloudSyncMsg({
          type: 'error',
          text: `Cloud upload notice: ${res.error || 'No presets to upload.'}`
        });
      }
    } catch (err: any) {
      setCloudSyncMsg({
        type: 'error',
        text: `Cloud upload error: ${err?.message || 'Unknown error'}`
      });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleUploadSinglePreset = async (template: CustomSavedTemplate) => {
    if (!isAdmin) return;
    setIsCloudSyncing(true);
    try {
      const ok = await savePresetToCloud(template, currentUser);
      if (ok) {
        setCloudSyncMsg({
          type: 'success',
          text: `⬆️ Uploaded "${template.name}" to Cloud Database!`
        });
        loadCloudPresets();
        setTimeout(() => setCloudSyncMsg(null), 4000);
      } else {
        setCloudSyncMsg({
          type: 'error',
          text: `Failed to upload "${template.name}".`
        });
      }
    } catch (e: any) {
      setCloudSyncMsg({
        type: 'error',
        text: `Error uploading preset: ${e?.message || 'Unknown'}`
      });
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleDeleteAllPublicPresets = () => {
    setIsDeletingAllPublic(true);
    try {
      const res = deleteAllPresetsFromPublicApp();
      if (res.success) {
        setCloudSyncMsg({
          type: 'success',
          text: `🗑️ Cleaned Public App: Deleted all (${res.clearedCustomCount}) custom preset(s) and restored standard defaults.`
        });
        setShowDeletePublicModal(false);
        onPresetsUpdated();
        reloadExportList();
        setTimeout(() => setCloudSyncMsg(null), 5000);
      }
    } catch (err: any) {
      setCloudSyncMsg({
        type: 'error',
        text: `Error cleaning public presets: ${err?.message || 'Unknown error'}`
      });
    } finally {
      setIsDeletingAllPublic(false);
    }
  };

  const handleDeleteAllCloudPresets = async () => {
    if (!isAdmin) {
      setCloudSyncMsg({
        type: 'error',
        text: 'Access Denied: Only Administrator is authorized to delete from the Cloud Database.'
      });
      return;
    }
    setIsDeletingAllCloud(true);
    try {
      const res = await deleteAllPresetsFromCloud(currentUser);
      if (res.success) {
        setCloudSyncMsg({
          type: 'success',
          text: `☁️🗑️ Deleted all (${res.count}) preset(s) and templates from the Cloud Multi-User Sync Database!`
        });
        setShowDeleteCloudModal(false);
        loadCloudPresets();
        onPresetsUpdated();
        setTimeout(() => setCloudSyncMsg(null), 5000);
      } else {
        setCloudSyncMsg({
          type: 'error',
          text: `Cloud deletion notice: ${res.error || 'Failed to delete cloud presets.'}`
        });
      }
    } catch (err: any) {
      setCloudSyncMsg({
        type: 'error',
        text: `Cloud deletion error: ${err?.message || 'Unknown error'}`
      });
    } finally {
      setIsDeletingAllCloud(false);
    }
  };

  const handleDeleteSingleCloudPreset = async (presetId: string, name: string) => {
    if (!isAdmin) {
      setCloudSyncMsg({
        type: 'error',
        text: 'Access Denied: Only Administrator can delete presets from Cloud.'
      });
      return;
    }
    setDeletingCloudPresetId(presetId);
    try {
      const ok = await deletePresetFromCloud(presetId, currentUser);
      if (ok) {
        setCloudSyncMsg({
          type: 'success',
          text: `🗑️ Deleted "${name}" from Cloud Multi-User Database.`
        });
        loadCloudPresets();
        setTimeout(() => setCloudSyncMsg(null), 4000);
      } else {
        setCloudSyncMsg({
          type: 'error',
          text: `Failed to delete "${name}" from Cloud.`
        });
      }
    } catch (e: any) {
      setCloudSyncMsg({
        type: 'error',
        text: `Error deleting preset: ${e?.message || 'Unknown error'}`
      });
    } finally {
      setDeletingCloudPresetId(null);
    }
  };

  const reloadExportList = () => {
    const combined = getCombinedPresets();
    const customList = getSavedTemplates();
    
    let list: (CustomSavedTemplate | PresetConfig)[] = [];
    if (exportFilter === 'custom') {
      list = customList;
    } else if (exportFilter === 'official') {
      list = combined.filter(p => !p.isCustom && !p.id.startsWith('custom_tpl_'));
    } else {
      list = combined;
    }

    setExportablePresets(list);
    setSelectedIds(list.map(t => t.id));
  };

  useEffect(() => {
    if (isOpen) {
      reloadExportList();
      setActiveTab(initialTab);
      setImportJsonText('');
      setImportedFile(null);
      setParsedPreview(null);
      setImportSuccessMsg(null);
      setCopiedToClipboard(false);
      setCloudSyncMsg(null);
      loadCloudPresets();
    }
  }, [isOpen, initialTab, exportFilter]);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    setSelectedIds(exportablePresets.map(t => t.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getSelectedItems = () => {
    const customList = getSavedTemplates();
    const combined = getCombinedPresets();

    return selectedIds.map(id => {
      const custom = customList.find(c => c.id === id || `custom_tpl_${c.id}` === id);
      if (custom) return custom;

      const official = combined.find(c => c.id === id);
      if (official) return presetConfigToSavedTemplate(official);

      const found = CARD_PRESETS.find(c => c.id === id);
      if (found) return presetConfigToSavedTemplate(found);

      return null;
    }).filter((t): t is CustomSavedTemplate => t !== null);
  };

  const handleDownloadExportFile = () => {
    const items = getSelectedItems();
    if (items.length === 0) return;
    downloadTemplatesAsJsonFile(items, `Sayonika_PVC_Presets_${items.length}_items.json`);
  };

  const handleCopyJsonToClipboard = () => {
    const items = getSelectedItems();
    const jsonStr = exportTemplatesAsJson(items);
    navigator.clipboard.writeText(jsonStr);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2500);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportJsonText(text);
      validateJsonInput(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setImportJsonText(text);
    validateJsonInput(text);
  };

  const validateJsonInput = (text: string) => {
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }

    const res = parseTemplatesJson(text);
    if (res.success) {
      setParsedPreview({
        success: true,
        templates: Array.isArray(res.templates) ? res.templates : [],
        metadata: res.metadata
      });
    } else {
      setParsedPreview({
        success: false,
        templates: [],
        error: res.error || 'Invalid preset JSON'
      });
    }
  };

  const handleConfirmImport = async () => {
    if (!importJsonText.trim()) return;
    const res = importTemplatesFromJson(importJsonText, { mode: importMode, updateDuplicates: true });
    
    if (res.success) {
      if (isAdmin && syncImportedToCloud) {
        try {
          await syncAllLocalPresetsToCloud(currentUser);
        } catch (e) {
          console.warn('Cloud sync on import notice:', e);
        }
      }

      onPresetsUpdated();
      reloadExportList();
      loadCloudPresets();
      
      const msg = importMode === 'replace' 
        ? `Successfully replaced custom presets with ${res.count} imported presets${(isAdmin && syncImportedToCloud) ? ' & synced to Cloud' : ''}.` 
        : `Successfully imported ${res.count} preset(s) (${res.addedCount} new, ${res.updatedCount} updated)${(isAdmin && syncImportedToCloud) ? ' & synced to Cloud' : ''}.`;
      
      setImportSuccessMsg(msg);
      setParsedPreview(null);
      setImportJsonText('');
      setImportedFile(null);
      setTimeout(() => {
        setImportSuccessMsg(null);
        setActiveTab('cloud');
      }, 2200);
    } else {
      setParsedPreview(prev => ({
        success: false,
        templates: prev?.templates || [],
        error: res.error || 'Import failed. Please check your JSON format.'
      }));
    }
  };

  const customLocalTemplates = Array.isArray(getSavedTemplates()) ? getSavedTemplates() : [];
  const safeCloudPresetsList = Array.isArray(cloudPresetsList) ? cloudPresetsList : [];
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];
  const safeExportablePresets = Array.isArray(exportablePresets) ? exportablePresets : [];

  return (
    <div 
      id="preset-import-export-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in select-none"
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Cloud className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Cloud Presets, Sharing & Backup</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  Multi-User Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload your custom presets to Cloud for all users, or download and update the latest presets on your device.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-6 bg-slate-950/40 border-b border-slate-800 gap-2">
          <button
            id="tab-cloud-presets-btn"
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'cloud'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>☁️ Cloud Presets & Sync</span>
            {safeCloudPresetsList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                {safeCloudPresetsList.length}
              </span>
            )}
          </button>

          <button
            id="tab-export-presets-btn"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (.json)</span>
          </button>

          <button
            id="tab-import-presets-btn"
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import (.json)</span>
          </button>
        </div>

        {/* Global Notifications / Status */}
        {cloudSyncMsg && (
          <div className={`mx-6 mt-4 p-3 border rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-lg ${
            cloudSyncMsg.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300' 
              : 'bg-red-950/80 border-red-500/60 text-red-300'
          }`}>
            {cloudSyncMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{cloudSyncMsg.text}</span>
          </div>
        )}

        {importSuccessMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importSuccessMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
          {/* ===================== TAB 1: CLOUD SYNC & SHARING ===================== */}
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {/* Dual Action Header Banner */}
              <div className={`grid gap-4 ${isAdmin ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {/* 1. Download & Update Card (For Users) */}
                <div className="p-4 bg-gradient-to-br from-blue-950/70 to-slate-900/90 border border-blue-800/80 rounded-2xl shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                        <ArrowDownCircle className="w-4 h-4 text-blue-400" />
                        <span>Download from Cloud</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[10px] font-bold">
                        For All Users
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed mb-3">
                      Fetch and update all custom auto-crop presets published by Biswas Xerox / Admin to this computer.
                    </p>
                  </div>

                  <button
                    id="cloud-download-presets-btn"
                    onClick={handleDownloadCloudPresetsNow}
                    disabled={isCloudDownloading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCloudDownloading ? 'animate-spin' : ''}`} />
                    <span>{isCloudDownloading ? 'Downloading Presets...' : '☁️ Download & Update Presets Now'}</span>
                  </button>
                </div>

                {/* 2. Upload to Cloud Card (For Admin/Creators Only) */}
                {isAdmin ? (
                  <div className="p-4 bg-gradient-to-br from-emerald-950/70 to-slate-900/90 border border-emerald-800/80 rounded-2xl shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                          <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                          <span>Upload to Cloud</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold">
                          Admin / Creator
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed mb-3">
                        Publish all {customLocalTemplates.length} local custom presets saved on this PC so that other staff & operators can access them.
                      </p>
                    </div>

                    <button
                      id="cloud-upload-presets-btn"
                      onClick={handleUploadAllToCloudNow}
                      disabled={isCloudSyncing || customLocalTemplates.length === 0}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                    >
                      <Upload className={`w-4 h-4 ${isCloudSyncing ? 'animate-pulse' : ''}`} />
                      <span>{isCloudSyncing ? 'Uploading to Cloud...' : `⬆️ Upload All (${customLocalTemplates.length}) to Cloud`}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3">
                    <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Cloud Upload Restricted</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Only verified Administrator can upload or delete presets in the Cloud Multi-User Sync Database. Public users can download and use all available cloud templates.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cloud Database Presets List */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-blue-400" />
                      <span>Presets Available in Cloud Database</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                      {safeCloudPresetsList.length} items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadCloudPresets}
                      disabled={loadingCloudList}
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold hover:underline"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingCloudList ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>

                    {isAdmin && safeCloudPresetsList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowDeleteCloudModal(true)}
                        className="px-2.5 py-1 bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-red-100 border border-red-800/60 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition"
                        title="Delete all presets from Firestore Multi-User Cloud database"
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                        <span>Delete All from Cloud</span>
                      </button>
                    )}
                  </div>
                </div>

                {loadingCloudList ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    <span>Fetching live cloud templates...</span>
                  </div>
                ) : safeCloudPresetsList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                    <Cloud className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-slate-300 font-semibold">No presets uploaded to Cloud yet.</p>
                    <p className="text-slate-400 text-[11px]">
                      {isAdmin ? 'Click "Upload to Cloud" above or create a new template and enable "Publish to Cloud".' : 'Administrator has not published any custom cloud presets yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto custom-scrollbar p-1">
                    {cloudPresetsList.map((tpl) => (
                      <div 
                        key={tpl.id}
                        className="p-3 bg-slate-950/80 border border-slate-800 hover:border-blue-700/60 rounded-xl transition flex flex-col justify-between space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-200 text-xs truncate">⭐ {tpl.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {tpl.description || 'Custom Auto-Crop Preset'}
                            </p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono shrink-0">
                            {tpl.dualSided ? 'Dual Sided' : 'Single'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10.5px] text-slate-400 border-t border-slate-850 pt-2">
                          <span className="flex items-center gap-1 truncate max-w-[140px]">
                            <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{tpl.createdBy || 'Biswas Xerox'}</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-[10px]">
                              {tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleDateString() : 'Active'}
                            </span>
                            
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleCloudPreset(tpl.id, tpl.name)}
                                disabled={deletingCloudPresetId === tpl.id}
                                className="px-2 py-0.5 bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-red-200 border border-red-800/70 rounded text-[10px] font-semibold flex items-center gap-1 transition"
                                title={`Delete "${tpl.name}" from Cloud Database`}
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>{deletingCloudPresetId === tpl.id ? 'Deleting...' : 'Delete'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Local Presets Upload Checklist (Admin Only) */}
              {isAdmin && customLocalTemplates.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      My Local Presets Ready for Upload ({customLocalTemplates.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleUploadAllToCloudNow}
                      disabled={isCloudSyncing}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <span>Upload All ({customLocalTemplates.length})</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar">
                    {customLocalTemplates.map((local) => (
                      <div 
                        key={local.id}
                        className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-200 text-xs truncate block">
                            ⭐ {local.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {local.dualSided ? 'Dual Sided' : 'Single Sided'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleUploadSinglePreset(local)}
                          disabled={isCloudSyncing}
                          className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shrink-0"
                          title="Upload this specific preset to Cloud"
                        >
                          <Upload className="w-3 h-3 text-emerald-400" />
                          <span>Upload</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public App Presets Reset / Purge Tool */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Public App Clean / Reset Tool</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Delete all custom presets from this browser app and restore standard factory templates.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeletePublicModal(true)}
                  className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/90 text-rose-300 hover:text-rose-100 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete All Presets from Public App</span>
                </button>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: EXPORT PRESETS ===================== */}
          {activeTab === 'export' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">Show:</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setExportFilter('all')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                          exportFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        All Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFilter('custom')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                          exportFilter === 'custom' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        ⭐ Custom Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFilter('official')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                          exportFilter === 'official' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Official Only
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Preset Selection List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {exportablePresets.map((preset) => {
                  const isChecked = selectedIds.includes(preset.id);
                  const isCustom = Boolean(preset.isCustom) || preset.id.startsWith('custom_tpl_');
                  
                  return (
                    <label 
                      key={preset.id} 
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                        isChecked 
                          ? 'bg-blue-950/40 border-blue-700/80 text-white' 
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/80 hover:text-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSelect(preset.id)}
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs truncate">
                            {isCustom ? `⭐ ${preset.name}` : preset.name}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                            isCustom ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {preset.dualSided ? 'Dual' : 'Single'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {preset.description || `Auto-crop preset for ${preset.name}`}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Actions & JSON Preview */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  <span className="font-bold text-slate-200">{safeSelectedIds.length}</span> of {safeExportablePresets.length} presets selected
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{showJsonPreview ? 'Hide JSON' : 'Preview JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyJsonToClipboard}
                    disabled={safeSelectedIds.length === 0}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {copiedToClipboard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToClipboard ? 'Copied!' : 'Copy JSON'}</span>
                  </button>

                  <button
                    type="button"
                    id="download-export-json-file-btn"
                    onClick={handleDownloadExportFile}
                    disabled={safeSelectedIds.length === 0}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .json Backup File</span>
                  </button>
                </div>
              </div>

              {/* JSON preview drawer */}
              {showJsonPreview && (
                <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-300 font-mono">export_presets.json preview</span>
                    <button
                      type="button"
                      onClick={handleCopyJsonToClipboard}
                      className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-2.5 bg-slate-900 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-40 custom-scrollbar">
                    {exportTemplatesAsJson(getSelectedItems())}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ===================== TAB 3: IMPORT PRESETS ===================== */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-slate-750 hover:border-blue-500/80 bg-slate-950/40 hover:bg-slate-950/80 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200 text-xs">
                    {importedFile ? importedFile.name : 'Click to browse or Drag & Drop .json preset file'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports JSON files exported from Sayonika PVC Utility
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Paste JSON Text Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Or Paste JSON content:</span>
                  {importJsonText && (
                    <button
                      type="button"
                      onClick={() => { setImportJsonText(''); setParsedPreview(null); setImportedFile(null); }}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <textarea
                  value={importJsonText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder='Paste {"version": 1, "templates": [...]} JSON text here...'
                  className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition resize-none custom-scrollbar"
                />
              </div>

              {/* Import Preview / Validation */}
              {parsedPreview && (
                <div className="space-y-3 animate-fade-in">
                  {parsedPreview.success ? (
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-emerald-300 font-semibold text-xs">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Valid JSON! Found {parsedPreview?.templates?.length ?? 0} preset(s) ready to import.</span>
                        </span>
                      </div>

                      {/* Import Conflict Strategy */}
                      <div className="pt-2 border-t border-emerald-500/30 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-300">Import Strategy:</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                              <input
                                type="radio"
                                name="importMode"
                                checked={importMode === 'merge'}
                                onChange={() => setImportMode('merge')}
                                className="text-emerald-500 bg-slate-900 border-slate-700"
                              />
                              <span>Merge with existing</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-xs">
                              <input
                                type="radio"
                                name="importMode"
                                checked={importMode === 'replace'}
                                onChange={() => setImportMode('replace')}
                                className="text-red-500 bg-slate-900 border-slate-700"
                              />
                              <span className="text-amber-300">Replace all custom presets</span>
                            </label>
                          </div>
                        </div>

                        {/* Sync to Cloud Toggle */}
                        {isAdmin ? (
                          <div className="p-2.5 bg-blue-950/40 border border-blue-800/60 rounded-lg flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-blue-200 text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={syncImportedToCloud}
                                onChange={(e) => setSyncImportedToCloud(e.target.checked)}
                                className="rounded bg-slate-950 border-blue-700 text-blue-500 focus:ring-0"
                              />
                              <span className="flex items-center gap-1.5">
                                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                                <span>Make imported presets available for everyone in Cloud</span>
                              </span>
                            </label>
                            <span className="text-[10px] text-blue-400 font-mono">Firestore Shared</span>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-300 text-xs">
                              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Importing into this local browser workspace only (Cloud upload restricted to Admin)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">Local Only</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{parsedPreview.error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Import Button */}
              {parsedPreview && parsedPreview.success && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    id="confirm-import-json-btn"
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Import {parsedPreview?.templates?.length ?? 0} Preset(s) Now</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCloudPresetsNow}
              disabled={isCloudDownloading}
              className="px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 hover:text-blue-100 border border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              title="Download latest presets from Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudDownloading ? 'animate-spin' : ''}`} />
              <span>☁️ Download & Update from Cloud</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeletePublicModal(true)}
              className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-850 rounded-lg text-xs font-medium flex items-center gap-1 transition"
              title="Clean all custom presets from this browser app"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Reset Public App</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog: Delete All Presets from Public App */}
      {showDeletePublicModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-rose-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Delete All Presets from Public App?</h3>
                <p className="text-xs text-rose-300">Clean local workspace & restore standard factory presets</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              This will permanently delete all custom presets and modified dimensions stored in this browser session. All official standard presets (Aadhaar, Voter, PAN, e-SHRAM, Ayushman, Driving Licence, etc.) will be restored to default factory crop settings.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeletePublicModal(false)}
                disabled={isDeletingAllPublic}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-delete-all-public-presets-btn"
                onClick={handleDeleteAllPublicPresets}
                disabled={isDeletingAllPublic}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isDeletingAllPublic ? 'animate-spin' : ''}`} />
                <span>{isDeletingAllPublic ? 'Deleting...' : 'Yes, Delete All Local Presets'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete All Presets from Cloud Multi-User Database */}
      {showDeleteCloudModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-red-700/90 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Delete All from Cloud Database?</h3>
                <p className="text-xs text-red-300">Admin Multi-User Cloud Purge</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
              <span className="text-red-400 font-bold block mb-1">⚠️ Warning: Irreversible Cloud Operation</span>
              This will permanently delete all {safeCloudPresetsList.length} shared presets and templates from the Firestore Multi-User Cloud database. Other devices and operators will no longer be able to sync or download these presets.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteCloudModal(false)}
                disabled={isDeletingAllCloud}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-delete-all-cloud-presets-btn"
                onClick={handleDeleteAllCloudPresets}
                disabled={isDeletingAllCloud}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition disabled:opacity-50"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isDeletingAllCloud ? 'animate-spin' : ''}`} />
                <span>{isDeletingAllCloud ? 'Deleting Cloud Database...' : 'Yes, Delete All from Cloud'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
