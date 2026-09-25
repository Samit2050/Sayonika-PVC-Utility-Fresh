import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Layers, 
  UploadCloud, 
  FolderPlus,
  FolderOpen,
  Play, 
  Download, 
  Trash2, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Printer, 
  Edit3,
  FileText,
  Save,
  Check,
  Tag,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Square
} from 'lucide-react';
import { BatchItem, DocumentType, CardMarginSettings, ImageAdjustments, PrintSettings } from '../types';
import { getCombinedPresets, DEFAULT_FALLBACK_PRESET, getDefaultPresetId } from '../utils/cardPresets';
import { getSavedTemplates, PRESETS_UPDATED_EVENT } from '../utils/templateManager';
import { cleanFileNameToCardholderName, sanitizeCardholderName, formatCardJpegFileName } from '../utils/nameHelper';

interface BatchProcessingViewProps {
  items: BatchItem[];
  isProcessing: boolean;
  progressPercent: number;
  autoSaveEnabled: boolean;
  marginSettings: CardMarginSettings;
  imageAdjustments: ImageAdjustments;
  printSettings: PrintSettings;
  saveDpi?: 300 | 600;
  onSaveDpiChange?: (dpi: 300 | 600) => void;
  savedBatchPassword?: string;
  onSavedBatchPasswordChange?: (password: string) => void;
  onApplyBatchPasswordToAll?: (password: string) => void;
  onItemPasswordChange?: (id: string, password: string, autoUnlock?: boolean) => void;
  onItemNameChange?: (id: string, cardHolderName: string) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onProcessAll: () => void;
  onStopProcessing?: () => void;
  onPresetChange: (id: string, presetId: string) => void;
  onItemPageChange?: (id: string, frontPage: number, backPage: number) => void;
  onSetAllPagesP1P2?: () => void;
  onEditInCanvas: (item: BatchItem) => void;
  onUnlockPassword: (item: BatchItem) => void;
  onToggleAutoSave: (enabled: boolean) => void;
  onDownloadAllZip: () => void;
  onDownloadItemJpegs?: (item: BatchItem) => void;
  onDownloadMasterPdf: () => void;
  onOpenPrintStudio: () => void;
  onOpenEpsonPrint?: () => void;
}

export const BatchProcessingView: React.FC<BatchProcessingViewProps> = ({
  items = [],
  isProcessing,
  progressPercent,
  autoSaveEnabled,
  marginSettings,
  imageAdjustments,
  printSettings,
  saveDpi = 300,
  onSaveDpiChange,
  savedBatchPassword = '',
  onSavedBatchPasswordChange,
  onApplyBatchPasswordToAll,
  onItemPasswordChange,
  onItemNameChange,
  onFilesSelected,
  onRemoveItem,
  onClearAll,
  onProcessAll,
  onStopProcessing,
  onPresetChange,
  onItemPageChange,
  onSetAllPagesP1P2,
  onEditInCanvas,
  onUnlockPassword,
  onToggleAutoSave,
  onDownloadAllZip,
  onDownloadItemJpegs,
  onDownloadMasterPdf,
  onOpenPrintStudio,
  onOpenEpsonPrint,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [globalPreset, setGlobalPreset] = useState<string>(() => getDefaultPresetId());
  const [masterPasswordInput, setMasterPasswordInput] = useState<string>(savedBatchPassword);
  const [showMasterPassword, setShowMasterPassword] = useState<boolean>(false);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'password_required' | 'pending' | 'error'>('all');
  const [savedTemplates, setSavedTemplates] = useState(() => getSavedTemplates());

  useEffect(() => {
    const handleUpdate = () => {
      setSavedTemplates(getSavedTemplates());
    };
    window.addEventListener(PRESETS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(PRESETS_UPDATED_EVENT, handleUpdate);
  }, []);

  // Scroll navigation state
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isScrollable, setIsScrollable] = useState<boolean>(false);

  const safeItems = Array.isArray(items) ? items : [];
  const allCombinedPresets = getCombinedPresets() || [];

  const completedCount = safeItems.filter((i) => i && i.status === 'completed').length;
  const passwordRequiredCount = safeItems.filter((i) => i && i.status === 'password_required').length;
  const pendingCount = safeItems.filter((i) => i && (i.status === 'pending' || i.status === 'processing')).length;
  const errorCount = safeItems.filter((i) => i && i.status === 'error').length;

  // Filtered items based on search and status
  const filteredItems = safeItems.filter((item) => {
    if (!item) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = (item.name || '').toLowerCase();
    const holder = (item.cardHolderName || cleanFileNameToCardholderName(item.name || '')).toLowerCase();
    const preset = (item.presetId || '').toLowerCase();
    return name.includes(q) || holder.includes(q) || preset.includes(q);
  });

  // Track container scroll position and compute percentage
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const currentTop = el.scrollTop;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setScrollTop(currentTop);
    setIsScrollable(maxScroll > 30);
    setScrollProgress(maxScroll > 0 ? Math.round((currentTop / maxScroll) * 100) : 0);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Check on resize as items add/remove
    const observer = new ResizeObserver(() => handleScroll());
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [handleScroll, safeItems.length]);

  // Page Scroll Up / Down Actions
  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
  };

  const scrollPageUp = () => {
    if (!containerRef.current) return;
    const step = Math.max(300, containerRef.current.clientHeight * 0.75);
    containerRef.current.scrollBy({ top: -step, behavior: 'smooth' });
  };

  const scrollPageDown = () => {
    if (!containerRef.current) return;
    const step = Math.max(300, containerRef.current.clientHeight * 0.75);
    containerRef.current.scrollBy({ top: step, behavior: 'smooth' });
  };

  // Keyboard navigation for smooth up and down browsing (Arrows, PageUp/PageDown, Home/End, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        containerRef.current?.scrollBy({ top: 120, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        containerRef.current?.scrollBy({ top: -120, behavior: 'smooth' });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        scrollPageUp();
      } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        scrollPageDown();
      } else if (e.key === ' ' && e.shiftKey) {
        e.preventDefault();
        scrollPageUp();
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToTop();
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToBottom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleApplyGlobalPreset = () => {
    items.forEach((item) => {
      onPresetChange(item.id, globalPreset);
    });
  };

  return (
    <div 
      ref={containerRef}
      id="batch-processing-view" 
      tabIndex={0}
      className="flex-1 flex flex-col p-6 bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar scroll-smooth relative focus:outline-none"
    >
      {/* Header bar & Summary Metric Cards */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
              <Layers className="w-4 h-4" />
            </div>
            <span>Batch Processing Queue</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 text-xs font-mono font-medium">
              {safeItems.length} {safeItems.length === 1 ? 'Document' : 'Documents'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Process multiple documents in bulk with auto-crop from standard cards or your <strong>Saved Custom Templates</strong>.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Hidden Folder Input for Batch Uploads */}
          <input
            id="batch-folder-input"
            type="file"
            multiple
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFilesSelected(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          {/* Hidden File Input for Batch Uploads */}
          <input
            id="batch-file-input"
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFilesSelected(e.target.files);
                e.target.value = '';
              }
            }}
            className="hidden"
          />

          {/* Add Folder Button */}
          <label
            htmlFor="batch-folder-input"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow transition active:scale-95 select-none"
            title="Open an entire folder of PDFs and image documents for batch processing"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Folder</span>
          </label>

          {/* Add Files Button */}
          <label
            htmlFor="batch-file-input"
            className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-750 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95 select-none"
            title="Select individual PDF or image files"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Add Files</span>
          </label>

          {/* Auto-save toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs cursor-pointer hover:bg-slate-850 transition select-none">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => onToggleAutoSave(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <Save className={`w-3.5 h-3.5 ${autoSaveEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-slate-300 font-medium">Auto-Save JPEGs</span>
          </label>

          {/* Clear Button */}
          {safeItems.length > 0 && (
            <button
              id="batch-clear-queue-btn"
              onClick={onClearAll}
              disabled={isProcessing}
              className="px-3.5 py-1.5 bg-orange-950/40 hover:bg-orange-900/60 text-orange-400 hover:text-orange-200 border border-orange-500/40 hover:border-orange-400/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm shadow-orange-950/30 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5 text-orange-400" />
              <span>Clear Queue</span>
            </button>
          )}

          {/* Stop Ongoing Cropping Button */}
          {isProcessing && onStopProcessing ? (
            <button
              onClick={onStopProcessing}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black tracking-wide flex items-center gap-2 shadow-lg shadow-red-600/30 transition active:scale-95 animate-pulse cursor-pointer border border-red-400/60"
              title="Stop ongoing card cropping immediately"
            >
              <Square className="w-4 h-4 fill-white text-white" />
              <span>Stop Cropping</span>
            </button>
          ) : (
            /* Primary Process Button (Vibrant Yellow) */
            <button
              id="batch-process-all-view-btn"
              onClick={onProcessAll}
              disabled={safeItems.length === 0 || isProcessing}
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-black tracking-wide flex items-center gap-2 shadow-lg shadow-yellow-400/30 disabled:opacity-40 transition active:scale-95 cursor-pointer border border-yellow-300"
            >
              <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>{isProcessing ? 'Processing Queue...' : 'Auto-Crop All Cards'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Processing Progress Bar */}
      {isProcessing && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 animate-pulse">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-blue-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
              <span>Auto-cropping high-resolution cards ({completedCount}/{items.length})...</span>
            </span>
            <span className="font-mono text-slate-300 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Master PDF Password Bar */}
      <div className="hidden bg-slate-900 border border-amber-500/30 rounded-xl p-3.5 mb-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                Master PDF Password
                <span className="text-[10px] text-amber-400 font-normal bg-amber-950/80 px-2 py-0.2 rounded border border-amber-800/80">
                  Applies to all encrypted PDFs
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                Set a default password for encrypted e-Aadhaar or e-PAN PDFs in this batch:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <input
                id="master-batch-password-input"
                type={showMasterPassword ? 'text' : 'password'}
                value={masterPasswordInput}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  setMasterPasswordInput(upper);
                  if (onSavedBatchPasswordChange) {
                    onSavedBatchPasswordChange(upper);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onApplyBatchPasswordToAll) {
                    onApplyBatchPasswordToAll(masterPasswordInput.trim().toUpperCase());
                  }
                }}
                placeholder="e.g. SAMI1994 or DDMMYYYY"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg py-1.5 pl-3 pr-8 text-xs font-mono uppercase text-slate-100 tracking-wider focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowMasterPassword(!showMasterPassword)}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                title={showMasterPassword ? 'Hide' : 'Show'}
              >
                {showMasterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              id="apply-master-password-btn"
              onClick={() => {
                if (onApplyBatchPasswordToAll && masterPasswordInput.trim()) {
                  onApplyBatchPasswordToAll(masterPasswordInput.trim().toUpperCase());
                }
              }}
              className="hidden px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition items-center gap-1.5 shadow active:scale-95 whitespace-nowrap"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Apply to All (CAPITAL)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
          <span className="font-semibold text-slate-300">Quick Helpers (CAPITAL):</span>
          <button
            onClick={() => {
              setMasterPasswordInput('NAME1990');
              if (onSavedBatchPasswordChange) onSavedBatchPasswordChange('NAME1990');
            }}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-amber-300 rounded border border-slate-800"
          >
            Aadhaar: NAME4+YYYY
          </button>
          <button
            onClick={() => {
              setMasterPasswordInput('01011990');
              if (onSavedBatchPasswordChange) onSavedBatchPasswordChange('01011990');
            }}
            className="px-2 py-0.5 bg-slate-950 hover:bg-slate-800 text-blue-300 rounded border border-slate-800"
          >
            PAN: DDMMYYYY
          </button>
        </div>
      </div>

      {/* Global Preset Bulk Applier & DPI Selector */}
      {safeItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 mb-4 gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-medium">Bulk Apply Preset:</span>
            <select
              value={globalPreset}
              onChange={(e) => setGlobalPreset(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
            >
              {(allCombinedPresets?.length ?? 0) === 0 ? (
                <option value={DEFAULT_FALLBACK_PRESET.id}>Standard CR80 (Default)</option>
              ) : (
                allCombinedPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.isCustom || p.id.startsWith('custom_tpl_') ? `⭐ ${p.name}` : p.name}
                  </option>
                ))
              )}
            </select>
            <button
              onClick={handleApplyGlobalPreset}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition"
            >
              Apply to All Files
            </button>
            {onSetAllPagesP1P2 && (
              <button
                onClick={onSetAllPagesP1P2}
                className="px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-700/60 rounded-lg font-semibold transition flex items-center gap-1.5 shadow-sm"
                title="Set Page 1 as Front and Page 2 as Back for all items in batch"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>All P1 Front + P2 Back</span>
              </button>
            )}
          </div>

          {/* 600 DPI Ultra HD Resolution Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-amber-500/30">
            <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5 font-mono">
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>600 DPI Ultra HD</span>
              <span className="text-[9px] bg-amber-500 text-slate-950 px-1 rounded font-extrabold">2022×1275 px</span>
            </span>
          </div>

          {/* Export action buttons */}
          {completedCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenEpsonPrint && (
                <button
                  id="batch-epson-direct-print-btn"
                  onClick={onOpenEpsonPrint}
                  className="hidden px-3.5 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold items-center gap-1.5 shadow-md shadow-blue-600/30 transition active:scale-95 border border-blue-400/50"
                  title="Epson Photo+ ID Card Print (Same to Same Epson Photo+ PVC Tray Layout)"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>Epson Photo+ ID Card Print ({completedCount})</span>
                </button>
              )}

              <button
                id="batch-download-jpegs-btn"
                onClick={onDownloadAllZip}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow transition"
                title="Directly saves JPEG format at 600 DPI Ultra HD: [CardHolderName]_F.jpg and [CardHolderName]_B.jpg without ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save All JPEGs ({completedCount}) @ 600 DPI</span>
              </button>

              <button
                id="batch-open-print-btn"
                onClick={onOpenPrintStudio}
                className="hidden px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Print Sheet Imposition</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Items Queue Table */}
      {safeItems.length === 0 ? (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex-1 min-h-[500px] flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl transition ${
            isDragOver ? 'border-blue-500 bg-blue-500/10 text-blue-300' : 'border-slate-800 bg-slate-900/30 text-slate-500'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="text-sm font-semibold text-slate-300">Queue is currently empty</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Drag & drop multiple PDF or Image files here, or click below to select files from your computer.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <label
              htmlFor="batch-folder-input"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow transition active:scale-95 select-none"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Folder</span>
            </label>
            <label
              htmlFor="batch-file-input"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95 select-none"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Select Files</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex-1 flex flex-col min-h-[560px] lg:min-h-[680px] mb-6">
          {/* Table Header Controls & Fast Search/Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-950/90 border-b border-slate-800 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="queue-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PDF or Cardholder Name..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({safeItems.length})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-850 hover:bg-slate-800 text-emerald-400'
                }`}
              >
                Ready ({completedCount})
              </button>
              {passwordRequiredCount > 0 && (
                <button
                  onClick={() => setStatusFilter('password_required')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    statusFilter === 'password_required'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-850 hover:bg-slate-800 text-amber-400'
                  }`}
                >
                  Password ({passwordRequiredCount})
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    statusFilter === 'pending'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-850 hover:bg-slate-800 text-blue-400'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
              )}
            </div>

            {/* Quick Browse Up / Down Table Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={scrollToTop}
                className="px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition shadow-sm"
                title="Scroll to Top of Queue"
              >
                <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Top</span>
              </button>
              <button
                type="button"
                onClick={scrollToBottom}
                className="px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition shadow-sm"
                title="Scroll to Bottom of Queue"
              >
                <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Bottom</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 custom-scrollbar overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-20 bg-slate-950 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-800 shadow-md">
                <tr>
                  <th className="py-3 px-4 w-12 bg-slate-950">#</th>
                  <th className="py-3 px-4 bg-slate-950">Document File</th>
                  <th className="py-3 px-4 min-w-[180px] bg-slate-950">
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <User className="w-3.5 h-3.5" />
                      <span>Candidate Name</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 bg-slate-950">Card Preset / Template</th>
                  <th className="py-3 px-4 min-w-[180px] bg-slate-950">PDF Password</th>
                  <th className="py-3 px-4 bg-slate-950">Status</th>
                  <th className="py-3 px-4 text-center bg-slate-950">Preview</th>
                  <th className="py-3 px-4 text-right bg-slate-950">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      <p className="text-xs">No documents match the current search filter.</p>
                      <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        className="mt-2 text-xs text-blue-400 hover:underline"
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                  const effectiveCardName = item.cardHolderName !== undefined ? item.cardHolderName : cleanFileNameToCardholderName(item.name);
                  const itemSerial = idx + 1;
                  const frontFileName = formatCardJpegFileName(effectiveCardName, 'F', itemSerial);
                  const backFileName = formatCardJpegFileName(effectiveCardName, 'B', itemSerial);

                  return (
                    <tr key={item.id} className="hover:bg-slate-850/60 transition">
                      <td className="py-3 px-4 font-mono text-slate-500">{itemSerial}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200 truncate max-w-xs">{item.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{(item.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span className="text-blue-400 font-medium">{item.numPages || 1} Pages</span>
                        </div>
                        
                        {/* Multi-page page selectors inside table row (Compact & Small) */}
                        {item.numPages && item.numPages > 1 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1 px-1.5 rounded-md border border-slate-700/60 text-[10px] shadow-sm max-w-fit">
                            <div className="flex items-center gap-1 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/50">
                              <span className="text-emerald-300 font-bold text-[9px] uppercase tracking-wider">F:</span>
                              <select
                                value={item.frontPageNumber || 1}
                                onChange={(e) => onItemPageChange && onItemPageChange(item.id, Number(e.target.value), item.backPageNumber || 2)}
                                className="bg-slate-900 text-emerald-300 font-mono font-bold border border-emerald-700/60 text-[10px] rounded px-1 py-0 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                              >
                                {Array.from({ length: item.numPages }, (_, i) => i + 1).map((p) => (
                                  <option key={p} value={p}>P{p}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1 bg-blue-950/40 px-1.5 py-0.2 rounded border border-blue-800/50">
                              <span className="text-blue-300 font-bold text-[9px] uppercase tracking-wider">B:</span>
                              <select
                                value={item.backPageNumber || 2}
                                onChange={(e) => onItemPageChange && onItemPageChange(item.id, item.frontPageNumber || 1, Number(e.target.value))}
                                className="bg-slate-900 text-blue-300 font-mono font-bold border border-blue-700/60 text-[10px] rounded px-1 py-0 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-pointer"
                              >
                                {Array.from({ length: item.numPages }, (_, i) => i + 1).map((p) => (
                                  <option key={p} value={p}>P{p}</option>
                                ))}
                              </select>
                            </div>

                            {onItemPageChange && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onItemPageChange(item.id, 1, Math.min(2, item.numPages || 1))}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wide transition shadow-sm ${
                                    (item.frontPageNumber || 1) === 1 && (item.backPageNumber || 2) === 2
                                      ? 'bg-blue-600 text-white border border-blue-400 ring-1 ring-blue-400/50'
                                      : 'bg-slate-855 hover:bg-slate-750 text-slate-300 border border-slate-700'
                                  }`}
                                  title="Set Page 1 as Front and Page 2 as Back"
                                >
                                  P1+P2
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onItemPageChange(item.id, 1, 1)}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-medium transition ${
                                    (item.frontPageNumber || 1) === 1 && (item.backPageNumber || 2) === 1
                                      ? 'bg-blue-600 text-white border border-blue-400 ring-1 ring-blue-400/50'
                                      : 'bg-slate-855 hover:bg-slate-750 text-slate-300 border border-slate-700'
                                  }`}
                                  title="Both on Page 1"
                                >
                                  Both P1
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Card Holder Name Editable Column */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.cardHolderName !== undefined ? item.cardHolderName : effectiveCardName}
                            onChange={(e) => {
                              if (onItemNameChange) {
                                onItemNameChange(item.id, e.target.value);
                              }
                            }}
                            placeholder="Card Holder Name"
                            className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-blue-500 text-slate-100 text-xs font-semibold rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            title="Edit Card Holder Name for JPEG saving"
                          />
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                            <span className="text-emerald-400 font-medium">{frontFileName}</span>
                            {item.backBox && (
                              <span className="text-blue-400 font-medium">• {backFileName}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={item.presetId}
                          onChange={(e) => onPresetChange(item.id, e.target.value)}
                          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 max-w-xs"
                        >
                          {(allCombinedPresets?.length ?? 0) === 0 ? (
                            <option value={DEFAULT_FALLBACK_PRESET.id}>Standard CR80 (Default)</option>
                          ) : (
                            allCombinedPresets.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.isCustom || p.id.startsWith('custom_tpl_') ? `⭐ ${p.name}` : p.name}
                              </option>
                            ))
                          )}
                        </select>
                      </td>

                      {/* Dedicated PDF Password Entry Box for Every PDF */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex-1 min-w-[120px]">
                            <input
                              type={visiblePasswords[item.id] ? 'text' : 'password'}
                              value={item.password || ''}
                              onChange={(e) => {
                                if (onItemPasswordChange) {
                                  onItemPasswordChange(item.id, e.target.value.toUpperCase(), false);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && onItemPasswordChange) {
                                  onItemPasswordChange(item.id, (item.password || '').toUpperCase(), true);
                                }
                              }}
                              placeholder="PDF Password"
                              className={`w-full bg-slate-950 border rounded px-2 py-1 pr-7 text-xs font-mono uppercase tracking-wider focus:outline-none ${
                                item.status === 'password_required' 
                                  ? 'border-amber-500 text-amber-200 focus:ring-1 focus:ring-amber-500' 
                                  : 'border-slate-700 text-slate-200 focus:border-blue-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setVisiblePasswords(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="absolute right-1.5 top-1.5 text-slate-500 hover:text-slate-300"
                              title={visiblePasswords[item.id] ? 'Hide Password' : 'Show Password'}
                            >
                              {visiblePasswords[item.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>

                          {item.status === 'password_required' ? (
                            <button
                              onClick={() => {
                                if (onItemPasswordChange && item.password) {
                                  onItemPasswordChange(item.id, item.password, true);
                                } else {
                                  onUnlockPassword(item);
                                }
                              }}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow whitespace-nowrap"
                              title="Unlock & Crop this PDF"
                            >
                              <Key className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                          ) : item.password ? (
                            <button
                              onClick={() => {
                                if (onItemPasswordChange) {
                                  onItemPasswordChange(item.id, item.password, true);
                                }
                              }}
                              className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition flex items-center gap-1 whitespace-nowrap"
                              title="Re-apply password & crop"
                            >
                              <Unlock className="w-3 h-3 text-emerald-400" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Ready</span>
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-[11px]">
                            <Clock className="w-3 h-3 text-blue-400 animate-spin" />
                            <span>Cropping</span>
                          </span>
                        )}
                        {item.status === 'password_required' && (
                          <button
                            onClick={() => onUnlockPassword(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[11px] hover:bg-amber-900 transition animate-pulse"
                          >
                            <Key className="w-3 h-3 text-amber-400" />
                            <span>Password Required</span>
                          </button>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px]">
                            <span>Pending</span>
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 text-[11px]">
                            <AlertCircle className="w-3 h-3 text-red-400" />
                            <span>Error</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.frontCropUrl ? (
                          <div className="inline-flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                            <img
                              src={item.frontCropUrl}
                              alt="Front"
                              className="w-12 h-7.5 object-cover rounded shadow"
                              title={`Front Card (${frontFileName})`}
                            />
                            {item.backCropUrl && (
                              <img
                                src={item.backCropUrl}
                                alt="Back"
                                className="w-12 h-7.5 object-cover rounded shadow"
                                title={`Back Card (${backFileName})`}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.status === 'completed' && item.frontCropUrl && onDownloadItemJpegs && (
                            <button
                              onClick={() => onDownloadItemJpegs(item)}
                              className="p-1.5 text-emerald-400 hover:text-white hover:bg-emerald-600 rounded transition"
                              title={`Save JPEG files: ${frontFileName} & ${backFileName}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditInCanvas(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition"
                            title="Open & Fine-tune in Precision Canvas Editor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                            title="Remove from Queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          {/* Table Bottom Quick Navigation & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-300">
                Showing {filteredItems.length} of {safeItems.length} {safeItems.length === 1 ? 'document' : 'documents'}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{completedCount} Ready</span>
              {passwordRequiredCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-medium">{passwordRequiredCount} Password Required</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scrollToTop}
                className="px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-750 rounded-lg text-[11px] font-medium flex items-center gap-1 transition shadow-sm"
                title="Scroll back to Top of Page (Home)"
              >
                <ChevronsUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Top of Queue</span>
              </button>
              <button
                type="button"
                onClick={scrollToBottom}
                className="px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-750 rounded-lg text-[11px] font-medium flex items-center gap-1 transition shadow-sm"
                title="Scroll to Bottom of Page (End)"
              >
                <ChevronsDown className="w-3.5 h-3.5 text-blue-400" />
                <span>Bottom of Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

