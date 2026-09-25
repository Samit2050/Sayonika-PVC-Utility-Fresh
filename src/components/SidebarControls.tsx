import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Layers, 
  Download, 
  Upload,
  FileJson,
  Printer, 
  RotateCcw, 
  Eye, 
  EyeOff,
  Sparkles, 
  Info,
  Check,
  Scissors,
  ArrowLeftRight,
  Copy,
  LayoutGrid,
  CreditCard,
  Split,
  Save,
  Tag,
  Key,
  Lock,
  Unlock,
  CheckCircle2,
  HelpCircle,
  Trash2,
  User,
  Cloud
} from 'lucide-react';
import { 
  PresetConfig, 
  CardMarginSettings, 
  ImageAdjustments, 
  CR80_WIDTH_MM, 
  CR80_HEIGHT_MM,
  CustomSavedTemplate 
} from '../types';
import { 
  CARD_PRESETS, 
  getCombinedPresets,
  resolvePresetConfig, 
  deletePreset, 
  isPresetModified,
  DEFAULT_FALLBACK_PRESET,
  getDefaultStartingPresetId,
  setDefaultStartingPresetId,
  makeAllCurrentTemplatesPermanentAndDefault
} from '../utils/cardPresets';
import { getSavedTemplates, downloadSingleTemplateAsJsonFile, PRESETS_UPDATED_EVENT } from '../utils/templateManager';
import { sanitizeCardholderName } from '../utils/nameHelper';

interface SidebarControlsProps {
  selectedPresetId: string;
  marginSettings: CardMarginSettings;
  imageAdjustments: ImageAdjustments;
  frontPreviewCanvas: HTMLCanvasElement | null;
  backPreviewCanvas: HTMLCanvasElement | null;
  cardHolderName?: string;
  onCardHolderNameChange?: (name: string) => void;
  saveDpi?: 300 | 600;
  onSaveDpiChange?: (dpi: 300 | 600) => void;
  isDualSided: boolean;
  activeBoxId: 'front' | 'back';
  totalPages?: number;
  currentPage?: number;
  frontPageNumber?: number;
  backPageNumber?: number;
  isPdf?: boolean;
  activePdfPassword?: string;
  isPasswordLocked?: boolean;
  onApplyPdfPassword?: (password: string, rememberForBatch: boolean) => void;
  onFrontPageChange?: (page: number) => void;
  onBackPageChange?: (page: number) => void;
  onSetPageLayoutPreset?: (mode: 'p1_front_p2_back' | 'both_p1' | 'both_current' | 'swap_pages') => void;
  onSelectPreset: (presetId: string) => void;
  onActiveBoxChange: (id: 'front' | 'back') => void;
  onToggleDualSided: (dual: boolean) => void;
  onSwapSides: () => void;
  onMatchDimensions: () => void;
  onQuickPosition: (position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'center') => void;
  onOpenSampleModal: () => void;
  onOpenSaveTemplate?: () => void;
  onOpenPresetImportExport?: (tab?: 'cloud' | 'export' | 'import') => void;
  onEditActivePreset?: () => void;
  onMarginSettingsChange: (settings: CardMarginSettings) => void;
  onImageAdjustmentsChange: (adjustments: ImageAdjustments) => void;
  onExportFront: () => void;
  onExportBack: () => void;
  onExportBothJpeg?: () => void;
  onExportPdf: () => void;
  onSendToPrintStudio: () => void;
  onOpenEpsonPrint?: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  selectedPresetId,
  marginSettings,
  imageAdjustments,
  frontPreviewCanvas,
  backPreviewCanvas,
  cardHolderName = 'Card_Holder',
  onCardHolderNameChange,
  saveDpi = 300,
  onSaveDpiChange,
  isDualSided,
  activeBoxId,
  totalPages = 1,
  currentPage = 1,
  frontPageNumber = 1,
  backPageNumber = 1,
  isPdf = true,
  activePdfPassword = '',
  isPasswordLocked = false,
  onApplyPdfPassword,
  onFrontPageChange,
  onBackPageChange,
  onSetPageLayoutPreset,
  onSelectPreset,
  onActiveBoxChange,
  onToggleDualSided,
  onSwapSides,
  onMatchDimensions,
  onQuickPosition,
  onOpenSampleModal,
  onOpenSaveTemplate,
  onOpenPresetImportExport,
  onEditActivePreset,
  onMarginSettingsChange,
  onImageAdjustmentsChange,
  onExportFront,
  onExportBack,
  onExportBothJpeg,
  onExportPdf,
  onSendToPrintStudio,
  onOpenEpsonPrint,
}) => {
  const [availablePresets, setAvailablePresets] = useState<PresetConfig[]>(() => getCombinedPresets());
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(() => getDefaultStartingPresetId());

  useEffect(() => {
    const handleUpdate = () => {
      setAvailablePresets(getCombinedPresets());
      setDefaultPresetId(getDefaultStartingPresetId());
    };
    window.addEventListener(PRESETS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(PRESETS_UPDATED_EVENT, handleUpdate);
  }, []);

  const safePresets = Array.isArray(availablePresets) ? availablePresets : [];
  const currentPreset = resolvePresetConfig(selectedPresetId) || safePresets[0] || DEFAULT_FALLBACK_PRESET;
  const isCurrentDefault = defaultPresetId === selectedPresetId || defaultPresetId === `custom_tpl_${selectedPresetId}` || (Boolean(defaultPresetId?.startsWith('custom_tpl_')) && defaultPresetId?.replace('custom_tpl_', '') === selectedPresetId);
  const savedTemplates = getSavedTemplates() || [];

  // Group active presets by category
  const customPresets = safePresets.filter(p => p && (p.isCustom || p.id?.startsWith('custom_tpl_')));
  const aadhaarPresets = safePresets.filter(p => p && p.category === 'aadhaar' && !p.isCustom && !p.id?.startsWith('custom_tpl_'));
  const voterPresets = safePresets.filter(p => p && p.category === 'voter' && !p.isCustom && !p.id?.startsWith('custom_tpl_'));
  const rationPresets = safePresets.filter(p => p && p.category === 'wb_ration' && !p.isCustom && !p.id?.startsWith('custom_tpl_'));
  const panPresets = safePresets.filter(p => p && p.category === 'pan' && !p.isCustom && !p.id?.startsWith('custom_tpl_'));
  const otherPresets = safePresets.filter(p => p && !['aadhaar', 'voter', 'wb_ration', 'pan'].includes(p.category) && !p.isCustom && !p.id?.startsWith('custom_tpl_'));

  // Local PDF password state
  const [sidebarPassword, setSidebarPassword] = useState(activePdfPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberForBatch, setRememberForBatch] = useState(true);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [showDeleteConfirmInSidebar, setShowDeleteConfirmInSidebar] = useState(false);

  const isCurrentCustom = Boolean(selectedPresetId?.startsWith('custom_tpl_')) || Boolean(currentPreset?.isCustom);
  const isCurrentModified = isPresetModified(selectedPresetId);

  useEffect(() => {
    setSidebarPassword(activePdfPassword);
  }, [activePdfPassword]);

  useEffect(() => {
    setShowDeleteConfirmInSidebar(false);
  }, [selectedPresetId]);

  const handleDeleteActivePreset = () => {
    deletePreset(selectedPresetId);
    setShowDeleteConfirmInSidebar(false);
    const remaining = getCombinedPresets() || [];
    const fallbackId = (remaining?.length || 0) > 0 ? remaining[0].id : DEFAULT_FALLBACK_PRESET.id;
    onSelectPreset(fallbackId);
    setStatusToast('Preset deleted');
    setTimeout(() => setStatusToast(null), 2500);
  };

  const handleResetActivePreset = () => {
    deletePreset(selectedPresetId);
    setShowDeleteConfirmInSidebar(false);
    onSelectPreset(selectedPresetId);
    setStatusToast('Reset preset to defaults');
    setTimeout(() => setStatusToast(null), 2500);
  };

  const handleApplyPassword = () => {
    if (onApplyPdfPassword) {
      onApplyPdfPassword(sidebarPassword.trim().toUpperCase(), rememberForBatch);
      setStatusToast('Applied password');
      setTimeout(() => setStatusToast(null), 2500);
    }
  };

  const handleMarginChange = (key: keyof CardMarginSettings, value: number | string | boolean) => {
    onMarginSettingsChange({
      ...marginSettings,
      [key]: value,
    });
  };

  const handleAdjustmentChange = (key: keyof ImageAdjustments, value: number | boolean) => {
    onImageAdjustmentsChange({
      ...imageAdjustments,
      [key]: value,
    });
  };

  const handleResetAdjustments = () => {
    onImageAdjustmentsChange({
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      saturation: 100,
      grayscale: false,
      rotation: 0,
    });
  };

  return (
    <aside id="sidebar-controls" className="w-full lg:w-84 xl:w-96 bg-slate-950/90 border-l border-slate-800/90 flex flex-col h-full overflow-y-auto custom-scrollbar select-none text-slate-200">
      {/* 1. Document Preset & Sample Gallery Trigger */}
      <div className="p-4 border-b border-slate-850">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Document Auto-Crop Preset</span>
          </label>
          <div className="flex items-center gap-2">
            {onOpenPresetImportExport && (
              <button
                type="button"
                onClick={() => onOpenPresetImportExport('cloud')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline"
                title="Download from Cloud or upload custom presets for all users"
              >
                <Cloud className="w-3 h-3 text-blue-400" />
                <span>Cloud Hub</span>
              </button>
            )}
            <button
              onClick={onOpenSampleModal}
              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 hover:underline"
              title="Browse full sample template gallery & custom upload"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Templates</span>
            </button>
          </div>
        </div>

        <select
          id="preset-selector-dropdown"
          value={selectedPresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
          className="w-full bg-slate-900/90 border border-slate-750 text-slate-100 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:outline-none transition shadow-sm"
        >
          {customPresets.length > 0 && (
            <optgroup label="⭐ My Custom Presets & Templates">
              {customPresets.map((p) => {
                const isDef = defaultPresetId === p.id || defaultPresetId === `custom_tpl_${p.id}` || (defaultPresetId?.startsWith('custom_tpl_') && defaultPresetId.replace('custom_tpl_', '') === p.id);
                return (
                  <option key={p.id} value={p.id}>
                    ⭐ {p.name} ({p.dualSided ? 'Dual Sided' : 'Single Sided'}) {isDef ? '★ [Default]' : ''}
                  </option>
                );
              })}
            </optgroup>
          )}

          {aadhaarPresets.length > 0 && (
            <optgroup label="Aadhaar Card (UIDAI)">
              {aadhaarPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {defaultPresetId === p.id ? '★ [Default]' : ''}
                </option>
              ))}
            </optgroup>
          )}

          {voterPresets.length > 0 && (
            <optgroup label="Voter ID (Election Commission)">
              {voterPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {defaultPresetId === p.id ? '★ [Default]' : ''}
                </option>
              ))}
            </optgroup>
          )}

          {rationPresets.length > 0 && (
            <optgroup label="West Bengal Ration Card (WBPDS)">
              {rationPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {defaultPresetId === p.id ? '★ [Default]' : ''}
                </option>
              ))}
            </optgroup>
          )}

          {panPresets.length > 0 && (
            <optgroup label="PAN Card (Income Tax / NSDL / UTI)">
              {panPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {defaultPresetId === p.id ? '★ [Default]' : ''}
                </option>
              ))}
            </optgroup>
          )}

          {otherPresets.length > 0 && (
            <optgroup label="Other Document Presets">
              {otherPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {defaultPresetId === p.id ? '★ [Default]' : ''}
                </option>
              ))}
            </optgroup>
          )}

          {safePresets.length === 0 && (
            <option value={DEFAULT_FALLBACK_PRESET.id}>Default Standard Card (CR80)</option>
          )}
        </select>

        <div className="flex items-center gap-2 mt-2.5">
          {/* Quick Set as Default Preset Button */}
          <button
            type="button"
            id="set-default-preset-sidebar-btn"
            onClick={() => {
              setDefaultStartingPresetId(selectedPresetId);
              setDefaultPresetId(selectedPresetId);
              setStatusToast(`⭐ Set "${currentPreset.name}" as Default Starting Preset`);
              setTimeout(() => setStatusToast(null), 2500);
            }}
            className={`p-1.5 rounded-lg text-xs font-bold transition active:scale-98 shadow-sm border flex items-center justify-center ${
              isCurrentDefault
                ? 'bg-amber-950/70 text-amber-300 border-amber-500/50 hover:bg-amber-900/80'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border-slate-700'
            }`}
            title={isCurrentDefault ? 'Currently default starting preset' : 'Set as default starting preset'}
          >
            <span className="text-amber-400">★</span>
          </button>

          {onEditActivePreset && (
            <button
              id="edit-active-preset-btn"
              onClick={onEditActivePreset}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 hover:border-blue-600 rounded-lg text-xs font-semibold transition active:scale-98 shadow-sm"
              title="Edit crop coordinates, dimensions, aspect ratio, or multi-page routing for this preset"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit</span>
            </button>
          )}

          {onOpenSaveTemplate && (
            <button
              id="save-current-crop-template-btn"
              onClick={onOpenSaveTemplate}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 hover:border-emerald-600 rounded-lg text-xs font-semibold transition active:scale-98 shadow-sm"
              title="Save current crop box positions as a permanent template to auto-crop future matching PDFs"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save Preset</span>
            </button>
          )}

          {isCurrentCustom && (
            <>
              <button
                type="button"
                id="export-active-preset-btn"
                onClick={() => {
                  const ok = downloadSingleTemplateAsJsonFile(currentPreset.id);
                  if (ok) {
                    setStatusToast(`Exported "${currentPreset.name}" as JSON!`);
                    setTimeout(() => setStatusToast(null), 2500);
                  }
                }}
                className="p-1.5 bg-slate-850 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition active:scale-98 shadow-sm"
                title={`Export and download "${currentPreset.name}" as .json preset file`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                id="delete-active-preset-btn"
                onClick={() => setShowDeleteConfirmInSidebar(true)}
                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 hover:border-red-600 rounded-lg text-xs font-semibold transition active:scale-98 shadow-sm"
                title={`Delete custom preset "${currentPreset.name}"`}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </>
          )}

          {!isCurrentCustom && isCurrentModified && (
            <button
              id="reset-active-preset-btn"
              onClick={handleResetActivePreset}
              className="p-1.5 bg-slate-850 hover:bg-amber-950 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-700 rounded-lg text-xs font-semibold transition active:scale-98 shadow-sm"
              title="Reset modified preset coordinates back to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>

        {/* Inline Delete Confirmation for Custom Preset */}
        {showDeleteConfirmInSidebar && isCurrentCustom && (
          <div className="mt-2.5 p-2.5 bg-red-950/70 border border-red-800/80 rounded-xl text-xs animate-fade-in space-y-2">
            <div className="flex items-center gap-1.5 text-red-300 font-semibold text-[11px]">
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Delete "{currentPreset.name}" permanently?</span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmInSidebar(false)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteActivePreset}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {currentPreset.instructions && (
          <p className="mt-2.5 text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
            <span className="text-blue-400 font-bold">Smart Guide: </span>
            {currentPreset.instructions}
          </p>
        )}
      </div>

      {/* 2. PDF Password Entry & Instant Decryption Box (Available for every PDF) */}
      {isPdf && (
        <div id="sidebar-pdf-password-box" className="p-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>PDF Password & Unlock</span>
            </label>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              isPasswordLocked 
                ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                : activePdfPassword 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isPasswordLocked ? (
                <>
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </>
              ) : activePdfPassword ? (
                <>
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Decrypted</span>
                </>
              ) : (
                <>
                  <Unlock className="w-2.5 h-2.5" />
                  <span>Password Box</span>
                </>
              )}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-2.5 leading-snug">
            Enter or update password for encrypted PDFs (UIDAI e-Aadhaar, e-PAN, e-EPIC, etc.):
          </p>

          <div className="space-y-2">
            <div className="relative">
              <input
                id="sidebar-pdf-password-input"
                type={showPassword ? 'text' : 'password'}
                value={sidebarPassword}
                onChange={(e) => setSidebarPassword(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyPassword();
                  }
                }}
                placeholder="e.g. SAMI1994 or DDMMYYYY"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg py-2 pl-3 pr-9 text-xs text-slate-100 font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberForBatch}
                  onChange={(e) => setRememberForBatch(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Remember for batch</span>
              </label>

              <button
                id="sidebar-apply-password-btn"
                onClick={handleApplyPassword}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow active:scale-95"
                title="Apply password and decrypt/reload the PDF"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Apply / Unlock</span>
              </button>
            </div>

            {statusToast && (
              <div className="text-[11px] text-emerald-400 bg-emerald-950/60 p-1.5 rounded border border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{statusToast}</span>
              </div>
            )}

            {/* Quick Government Document Format Rules */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold block">Password Rules Cheat Sheet:</span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSidebarPassword('NAME1990')}
                  className="px-1.5 py-1 text-left bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 truncate"
                  title="Aadhaar: First 4 Letters of Name in CAPITAL + 4-digit Year of Birth"
                >
                  <span className="text-amber-400 font-bold">Aadhaar:</span> NAME4+YYYY
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarPassword('01011990')}
                  className="px-1.5 py-1 text-left bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 truncate"
                  title="PAN Card: Date of Birth in DDMMYYYY without slashes"
                >
                  <span className="text-blue-400 font-bold">PAN:</span> DDMMYYYY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Multi-Page PDF Source Routing (Visible when totalPages > 1) */}
      {totalPages > 1 && (
        <div className="p-4 border-b border-slate-800 bg-blue-950/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Page Source Routing</span>
            </label>
            <span className="text-[10px] bg-blue-900/60 text-blue-200 border border-blue-700/50 px-1.5 py-0.5 rounded font-mono">
              {totalPages} Pages PDF
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Select which PDF page contains the <strong>Front Side</strong> and <strong>Back Side</strong> of the card.
          </p>

          <div className="space-y-2.5">
            {/* Front Side Source Page Selector */}
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-emerald-900/60">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-semibold text-emerald-300">Front Card Page:</span>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={frontPageNumber}
                  onChange={(e) => onFrontPageChange && onFrontPageChange(Number(e.target.value))}
                  className="bg-slate-900 text-slate-100 border border-slate-700 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      Page {p} {p === currentPage ? '(Current View)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Back Side Source Page Selector (If Dual Sided) */}
            {isDualSided && (
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-blue-900/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                  <span className="text-xs font-semibold text-blue-300">Back Card Page:</span>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={backPageNumber}
                    onChange={(e) => onBackPageChange && onBackPageChange(Number(e.target.value))}
                    className="bg-slate-900 text-slate-100 border border-slate-700 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-mono font-bold"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>
                        Page {p} {p === currentPage ? '(Current View)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Quick Multi-Page Presets */}
            {isDualSided && onSetPageLayoutPreset && (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onSetPageLayoutPreset('p1_front_p2_back')}
                  className={`px-2 py-1.5 rounded text-[11px] font-semibold border transition text-center ${
                    frontPageNumber === 1 && backPageNumber === 2
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                  title="Front on Page 1, Back on Page 2 (Standard for 2-page ID cards)"
                >
                  ⚡ P1 Front + P2 Back
                </button>

                <button
                  type="button"
                  onClick={() => onSetPageLayoutPreset('both_p1')}
                  className={`px-2 py-1.5 rounded text-[11px] font-semibold border transition text-center ${
                    frontPageNumber === 1 && backPageNumber === 1
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                  title="Both Front and Back are on Page 1"
                >
                  ⚡ Both on Page 1
                </button>

                <button
                  type="button"
                  onClick={() => onSetPageLayoutPreset('both_current')}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                  title={`Set both Front & Back to current viewing page (Page ${currentPage})`}
                >
                  📌 Both on Page {currentPage}
                </button>

                <button
                  type="button"
                  onClick={() => onSetPageLayoutPreset('swap_pages')}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-slate-900 border border-slate-800 text-amber-300 hover:bg-slate-800 flex items-center justify-center gap-1"
                  title="Swap source pages between Front and Back"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Swap Pages</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Side Selection & Card Configuration (Front / Back / Dual) */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span>Card Sides & Alignment</span>
          </label>
          <span className="text-[10px] text-slate-400 font-mono">
            {isDualSided ? 'Dual Side Mode' : 'Single Side Mode'}
          </span>
        </div>

        {/* Side Mode Toggle Button (Dual vs Single) */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => onToggleDualSided(true)}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
              isDualSided
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Dual Sided (Front + Back)</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleDualSided(false)}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
              !isDualSided
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Single Sided (Front Only)</span>
          </button>
        </div>

        {/* Active Side Selector Tabs */}
        <div className="flex items-center gap-2 mb-3 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onActiveBoxChange('front')}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeBoxId === 'front'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span>Select Front Side</span>
          </button>

          {isDualSided && (
            <button
              type="button"
              onClick={() => onActiveBoxChange('back')}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeBoxId === 'back'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-blue-400 hover:bg-slate-900'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <span>Select Back Side</span>
            </button>
          )}
        </div>

        {/* Quick Side Operations */}
        {isDualSided && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={onSwapSides}
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
              title="Swap coordinates between Front and Back card"
            >
              <ArrowLeftRight className="w-3 h-3 text-amber-400" />
              <span>Swap Front ⇄ Back</span>
            </button>

            <button
              type="button"
              onClick={onMatchDimensions}
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
              title="Copy Width and Height from Front box to Back box"
            >
              <Copy className="w-3 h-3 text-emerald-400" />
              <span>Match Back Size</span>
            </button>
          </div>
        )}

        {/* Quick Position Presets for Selected Side */}
        <div>
          <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Quick Placement ({activeBoxId === 'front' ? 'Front Side' : 'Back Side'}):</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => onQuickPosition('bottom-left')}
              className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-center transition"
            >
              Bottom Left
            </button>
            <button
              type="button"
              onClick={() => onQuickPosition('bottom-right')}
              className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-center transition"
            >
              Bottom Right
            </button>
            <button
              type="button"
              onClick={() => onQuickPosition('center')}
              className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded text-center transition"
            >
              Center Full
            </button>
          </div>
        </div>
      </div>

      {/* 3. Adjustable Margin & Bleed Settings */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Adjustable Margins & Bleed</span>
          </label>
        </div>

        {/* Outer Margin Slider */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Outer Margin:</span>
            <span className="font-mono text-emerald-400 font-semibold">{marginSettings.marginMm} mm</span>
          </div>
          <input
            id="margin-slider"
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={marginSettings.marginMm}
            onChange={(e) => handleMarginChange('marginMm', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Bleed Margin Slider */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Bleed Extension:</span>
            <span className="font-mono text-emerald-400 font-semibold">{marginSettings.bleedMm} mm</span>
          </div>
          <input
            id="bleed-slider"
            type="range"
            min="0"
            max="3"
            step="0.2"
            value={marginSettings.bleedMm}
            onChange={(e) => handleMarginChange('bleedMm', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Corner Radius (CR80 Standard is 3.18mm) */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">CR80 Corner Radius:</span>
            <span className="font-mono text-emerald-400 font-semibold">{marginSettings.cornerRadiusMm} mm</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="corner-radius-slider"
              type="range"
              min="0"
              max="5"
              step="0.2"
              value={marginSettings.cornerRadiusMm}
              onChange={(e) => handleMarginChange('cornerRadiusMm', parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <button
              onClick={() => handleMarginChange('cornerRadiusMm', 3.18)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded border border-slate-700 font-mono"
              title="Set standard ISO CR80 3.18mm corner radius"
            >
              3.18 mm
            </button>
          </div>
        </div>

        {/* Border & Cut Guide Marks */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id="cut-marks-checkbox"
              type="checkbox"
              checked={marginSettings.showCutMarks}
              onChange={(e) => handleMarginChange('showCutMarks', e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span className="text-slate-300">Scissor Corner Marks</span>
          </label>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">Border:</span>
            <select
              value={marginSettings.borderWidthPx}
              onChange={(e) => handleMarginChange('borderWidthPx', parseInt(e.target.value))}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-0.5"
            >
              <option value="0">None</option>
              <option value="1">1 px Line</option>
              <option value="2">2 px Line</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Image Enhancement & Xerox Clarity Booster */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Image Clarity & Print Filter</span>
          </label>
          <button
            onClick={handleResetAdjustments}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
            title="Reset Filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Brightness */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Brightness:</span>
            <span className="font-mono text-slate-400">{imageAdjustments.brightness > 0 ? `+${imageAdjustments.brightness}` : imageAdjustments.brightness}</span>
          </div>
          <input
            type="range"
            min="-40"
            max="40"
            step="1"
            value={imageAdjustments.brightness}
            onChange={(e) => handleAdjustmentChange('brightness', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Contrast */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Contrast:</span>
            <span className="font-mono text-slate-400">{imageAdjustments.contrast > 0 ? `+${imageAdjustments.contrast}` : imageAdjustments.contrast}</span>
          </div>
          <input
            type="range"
            min="-40"
            max="40"
            step="1"
            value={imageAdjustments.contrast}
            onChange={(e) => handleAdjustmentChange('contrast', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Sharpness Booster */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Sharpness / Unsharp Mask:</span>
            <span className="font-mono text-amber-400 font-semibold">{imageAdjustments.sharpness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={imageAdjustments.sharpness}
            onChange={(e) => handleAdjustmentChange('sharpness', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Grayscale Toggle */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={imageAdjustments.grayscale}
              onChange={(e) => handleAdjustmentChange('grayscale', e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span className="text-slate-300">B&W / Grayscale Mode</span>
          </label>
        </div>
      </div>

      {/* 5. Live Processed Previews */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>CR80 Card Output Preview</span>
          </label>

          {/* Cardholder Name input */}
          <div className="mb-3 p-2.5 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Card Holder Name:</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">JPEG Export</span>
            </div>
            <input
              type="text"
              value={cardHolderName || ''}
              onChange={(e) => onCardHolderNameChange && onCardHolderNameChange(e.target.value)}
              placeholder="e.g. RAHUL KUMAR"
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none font-medium"
            />
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
              <span className="text-emerald-400 font-semibold">
                {cardHolderName ? sanitizeCardholderName(cardHolderName) : 'Card_Holder'}_F.jpg
              </span>
              {isDualSided && (
                <span className="text-blue-400 font-semibold">
                  • {cardHolderName ? sanitizeCardholderName(cardHolderName) : 'Card_Holder'}_B.jpg
                </span>
              )}
            </div>
          </div>

          {/* Front Card Preview */}
          <div className="mb-3">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span>Front Card (85.6 × 54 mm)</span>
                {activeBoxId === 'front' && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-mono">
                    Active
                  </span>
                )}
              </span>
              <button
                onClick={onExportFront}
                disabled={!frontPreviewCanvas}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 disabled:opacity-30 text-[10px] font-medium bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 transition"
                title="Save Front as JPEG (_F.jpg)"
              >
                <Download className="w-3 h-3" />
                <span>Save (_F.jpg)</span>
              </button>
            </div>
            <div 
              onClick={() => onActiveBoxChange('front')}
              className={`w-full aspect-[85.6/53.98] bg-slate-950 border rounded-lg overflow-hidden flex items-center justify-center p-1 relative shadow-inner cursor-pointer transition ${
                activeBoxId === 'front' ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-800 hover:border-slate-700'
              }`}
              title="Click to select Front Card in editor"
            >
              {frontPreviewCanvas ? (
                <img
                  src={frontPreviewCanvas.toDataURL()}
                  alt="Front Preview"
                  className="max-w-full max-h-full object-contain rounded shadow"
                />
              ) : (
                <span className="text-[11px] text-slate-600 font-mono">No Front Crop</span>
              )}
            </div>
          </div>

          {/* Back Card Preview if dual sided */}
          {isDualSided && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-blue-400 font-semibold flex items-center gap-1">
                  <span>Back Card (85.6 × 54 mm)</span>
                  {activeBoxId === 'back' && (
                    <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded text-[9px] font-mono">
                      Active
                    </span>
                  )}
                </span>
                <button
                  onClick={onExportBack}
                  disabled={!backPreviewCanvas}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-30 text-[10px] font-medium bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/60 transition"
                  title="Save Back as JPEG (_B.jpg)"
                >
                  <Download className="w-3 h-3" />
                  <span>Save (_B.jpg)</span>
                </button>
              </div>
              <div 
                onClick={() => onActiveBoxChange('back')}
                className={`w-full aspect-[85.6/53.98] bg-slate-950 border rounded-lg overflow-hidden flex items-center justify-center p-1 relative shadow-inner cursor-pointer transition ${
                  activeBoxId === 'back' ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-800 hover:border-slate-700'
                }`}
                title="Click to select Back Card in editor"
              >
                {backPreviewCanvas ? (
                  <img
                    src={backPreviewCanvas.toDataURL()}
                    alt="Back Preview"
                    className="max-w-full max-h-full object-contain rounded shadow"
                  />
                ) : (
                  <span className="text-[11px] text-slate-600 font-mono">No Back Crop</span>
                )}
              </div>
            </div>
          )}

          {/* 600 DPI Ultra HD Resolution Status */}
          <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-amber-500/30">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Save Resolution:</span>
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                <Check className="w-3 h-3 text-amber-400" />
                <span>600 DPI (Ultra HD)</span>
              </span>
            </div>
            
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold font-mono">
                  HD
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-200">600 DPI Ultra HD Output</div>
                  <div className="text-[10px] text-slate-400 font-mono">2022 × 1275 px (CR80 ISO Standard)</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                Active
              </span>
            </div>

            <p className="text-[10px] text-slate-400 mt-1.5 leading-tight">
              Files are saved exclusively in <strong>600 DPI Ultra HD</strong> for crystal-sharp text, razor-sharp QR codes, and micro-details on PVC card printers.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2 pt-3 border-t border-slate-800">
          {/* Epson Photo+ ID Card Print */}
          {onOpenEpsonPrint && (
            <button
              id="sidebar-epson-direct-print-btn"
              onClick={onOpenEpsonPrint}
              disabled={!frontPreviewCanvas}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-40 transition active:scale-98 border border-blue-400/50"
              title="Epson Photo+ ID Card Print (Same to Same Epson Photo+ PVC Tray Layout)"
            >
              <Printer className="w-4 h-4 text-cyan-300 animate-pulse" />
              <span>Epson Photo+ ID Card Print</span>
            </button>
          )}

          <button
            id="download-both-jpeg-btn"
            onClick={onExportBothJpeg || onExportFront}
            disabled={!frontPreviewCanvas}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 transition active:scale-98"
            title="Save as JPEG format: 01_F.jpg and 01_B.jpg"
          >
            <Download className="w-4 h-4" />
            <span>Save JPEGs (_F & _B)</span>
          </button>

          <button
            id="download-single-pdf-btn"
            onClick={onExportPdf}
            disabled={!frontPreviewCanvas}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CR80 PVC Ready PDF</span>
          </button>

          <button
            id="open-print-studio-btn"
            onClick={onSendToPrintStudio}
            disabled={!frontPreviewCanvas}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium text-xs flex items-center justify-center gap-2 disabled:opacity-40 transition"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span>Open in Print Imposition Studio</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

