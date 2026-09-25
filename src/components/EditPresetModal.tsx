import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  Copy, 
  Sparkles, 
  Sliders, 
  Layers, 
  Check, 
  AlertCircle,
  FileText,
  Key,
  CreditCard,
  Plus,
  Trash2,
  Download,
  Cloud,
  Globe,
  Lock
} from 'lucide-react';
import { PresetConfig, DocumentType, CropBox, CR80_ASPECT_RATIO } from '../types';
import { savePreset, resetPresetToDefault, deletePreset, isPresetModified } from '../utils/cardPresets';
import { downloadSingleTemplateAsJsonFile } from '../utils/templateManager';
import { isUserAdmin } from '../utils/cloudPresetService';
import { AuthSession } from '../utils/authService';

interface EditPresetModalProps {
  preset: PresetConfig | null;
  currentFrontBox?: CropBox;
  currentBackBox?: CropBox;
  currentUser?: AuthSession | null;
  isOpen: boolean;
  onClose: () => void;
  onPresetSaved: (updatedPreset: PresetConfig) => void;
  onPresetDeleted?: (deletedPresetId: string) => void;
}

const CATEGORIES: { label: string; value: DocumentType }[] = [
  { label: 'Aadhaar Card', value: 'aadhaar' },
  { label: 'Voter ID (EPIC)', value: 'voter' },
  { label: 'PAN Card', value: 'pan' },
  { label: 'WB Ration Card', value: 'wb_ration' },
  { label: 'Ayushman (PM-JAY)', value: 'ayushman' },
  { label: 'Driving Licence', value: 'driving_license' },
  { label: 'Student / Employee ID', value: 'student_id' },
  { label: 'Custom ID', value: 'custom' },
];

export const EditPresetModal: React.FC<EditPresetModalProps> = ({
  preset,
  currentFrontBox,
  currentBackBox,
  currentUser,
  isOpen,
  onClose,
  onPresetSaved,
  onPresetDeleted,
}) => {
  const isAdmin = isUserAdmin(currentUser);
  const [formData, setFormData] = useState<PresetConfig | null>(null);
  const [saveMode, setSaveMode] = useState<'update' | 'new'>('update');
  const [syncToCloud, setSyncToCloud] = useState<boolean>(isAdmin);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (preset) {
      setFormData({
        ...preset,
        frontBox: { ...preset.frontBox },
        backBox: preset.backBox ? { ...preset.backBox } : undefined,
      });
      setSaveMode('update');
      setSyncToCloud(isAdmin ? (preset.isGlobal !== false) : false);
      setShowDeleteConfirm(false);
    }
  }, [preset, isAdmin]);

  if (!isOpen || !formData) return null;

  const isOfficial = !formData.id.startsWith('custom_tpl_') && !formData.isCustom;
  const isCustomized = isPresetModified(formData.id);

  const handleDelete = () => {
    if (!formData) return;
    deletePreset(formData.id);
    if (onPresetDeleted) {
      onPresetDeleted(formData.id);
    }
    onClose();
  };

  const handleCopyFromCanvas = () => {
    if (currentFrontBox) {
      setFormData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          frontBox: {
            x: Number(currentFrontBox.x.toFixed(2)),
            y: Number(currentFrontBox.y.toFixed(2)),
            width: Number(currentFrontBox.width.toFixed(2)),
            height: Number(currentFrontBox.height.toFixed(2)),
          },
          backBox: prev.dualSided && currentBackBox ? {
            x: Number(currentBackBox.x.toFixed(2)),
            y: Number(currentBackBox.y.toFixed(2)),
            width: Number(currentBackBox.width.toFixed(2)),
            height: Number(currentBackBox.height.toFixed(2)),
          } : prev.backBox
        };
      });
    }
  };

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!formData) return;

    let toSave: PresetConfig = { 
      ...formData,
      isGlobal: isAdmin && syncToCloud,
      createdBy: formData.createdBy || currentUser?.name || (currentUser?.userId ? `@${currentUser.userId}` : 'Biswas Xerox Staff'),
      createdByRole: formData.createdByRole || currentUser?.role || (isAdmin ? 'admin' : 'operator'),
      updatedAt: Date.now()
    };

    if (saveMode === 'new') {
      toSave = {
        ...toSave,
        id: `custom_tpl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: `⭐ ${toSave.name.replace(/^⭐\s*/, '')} (Custom)`,
        isCustom: true,
      };
    }

    const saved = savePreset(toSave);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      onPresetSaved(saved);
      onClose();
    }, 350);
  };

  const handleResetToDefault = () => {
    if (!isOfficial) return;
    const restored = resetPresetToDefault(formData.id);
    if (restored) {
      setFormData({ ...restored });
      onPresetSaved(restored);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 800);
    }
  };

  const updateFrontDim = (key: keyof PresetConfig['frontBox'], val: number) => {
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        frontBox: {
          ...prev.frontBox,
          [key]: Math.max(0, Math.min(100, Number(val.toFixed(2))))
        }
      };
    });
  };

  const updateBackDim = (key: keyof NonNullable<PresetConfig['backBox']>, val: number) => {
    setFormData(prev => {
      if (!prev || !prev.backBox) return prev;
      return {
        ...prev,
        backBox: {
          ...prev.backBox,
          [key]: Math.max(0, Math.min(100, Number(val.toFixed(2))))
        }
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto custom-scrollbar">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Edit Crop Preset & Calibration</h3>
                {isCustomized && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    Customized
                  </span>
                )}
                {isOfficial && !isCustomized && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    Official Default
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Fine-tune auto-crop coordinates, aspect ratios, and document routing</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* Quick Copy from Workspace Banner */}
          <div className="flex items-center justify-between p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl">
            <div className="flex items-center gap-2 text-blue-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Copy currently selected box position from your workspace editor?</span>
            </div>
            <button
              type="button"
              onClick={handleCopyFromCanvas}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow transition shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Use Workspace Coordinates</span>
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Preset Display Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Document Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as DocumentType })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Card Layout Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      dualSided: true,
                      backBox: formData.backBox || { x: 51.0, y: formData.frontBox.y, width: formData.frontBox.width, height: formData.frontBox.height }
                    });
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition ${
                    formData.dualSided
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-700 text-slate-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Dual Sided (f & b)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, dualSided: false })}
                  className={`flex-1 py-2 px-3 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition ${
                    !formData.dualSided
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-700 text-slate-400'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Single Sided</span>
                </button>
              </div>
            </div>
          </div>

          {/* Front Card Coordinates */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-slate-200">Front Card Crop Box (Percentages 0–100%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Source Page:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.frontPage || 1}
                  onChange={e => setFormData({ ...formData, frontPage: parseInt(e.target.value) || 1 })}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">X Pos (%):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.frontBox.x}
                    onChange={e => updateFrontDim('x', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Y Pos (%):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.frontBox.y}
                    onChange={e => updateFrontDim('y', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Width (%):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.frontBox.width}
                    onChange={e => updateFrontDim('width', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Height (%):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.frontBox.height}
                    onChange={e => updateFrontDim('height', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Back Card Coordinates (if dual-sided) */}
          {formData.dualSided && formData.backBox && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="font-bold text-slate-200">Back Card Crop Box (Percentages 0–100%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Source Page:</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.backPage || 1}
                    onChange={e => setFormData({ ...formData, backPage: parseInt(e.target.value) || 1 })}
                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">X Pos (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.backBox.x}
                    onChange={e => updateBackDim('x', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Y Pos (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.backBox.y}
                    onChange={e => updateBackDim('y', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Width (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.backBox.width}
                    onChange={e => updateBackDim('width', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Height (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.backBox.height}
                    onChange={e => updateBackDim('height', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-bold focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Suggested Password Format & Auto-Detect Keywords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Password Format Rule / Hint</span>
              </label>
              <input
                type="text"
                value={formData.suggestedPasswordFormat || ''}
                onChange={e => setFormData({ ...formData, suggestedPasswordFormat: e.target.value })}
                placeholder="e.g. FIRST 4 LETTERS IN CAPS + YEAR OF BIRTH"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 text-[11px]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Detect Filename Keywords</span>
              </label>
              <input
                type="text"
                value={formData.matchKeywords || ''}
                onChange={e => setFormData({ ...formData, matchKeywords: e.target.value })}
                placeholder="e.g. aadhaar, uidai, eaadhaar"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 text-[11px]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description / Notes</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500 text-[11px]"
            />
          </div>

          {/* Cloud Global Sharing Toggle */}
          {isAdmin ? (
            <div className="p-3 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/60 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToCloud}
                  onChange={(e) => setSyncToCloud(e.target.checked)}
                  className="mt-0.5 rounded bg-slate-950 border-blue-700 text-blue-500 focus:ring-0 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-blue-400" />
                      <span>Update Cloud Multi-User Database</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                      Admin Global Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    When enabled, saves/updates this preset in Firestore Cloud database so all shop operators & users can immediately access it.
                  </p>
                </div>
              </label>
            </div>
          ) : (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      Local Workspace Preset Only
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-semibold border border-slate-700">
                      Local
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Saved locally to your browser. Only Administrator is permitted to upload or modify presets in the shared Multi-User Cloud database.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Mode Selector */}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="saveMode"
                checked={saveMode === 'update'}
                onChange={() => setSaveMode('update')}
                className="text-blue-600 bg-slate-950 border-slate-700"
              />
              <span>Update current preset ({formData.name})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="radio"
                name="saveMode"
                checked={saveMode === 'new'}
                onChange={() => setSaveMode('new')}
                className="text-blue-600 bg-slate-950 border-slate-700"
              />
              <span>Save as a new custom preset</span>
            </label>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 flex-wrap">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 bg-red-950/80 border border-red-800/80 px-3 py-1.5 rounded-lg text-xs animate-fade-in">
                <span className="text-red-300 font-semibold">
                  {isOfficial ? 'Delete this official preset from your workspace?' : 'Delete this custom preset permanently?'}
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Yes, Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 rounded-lg font-medium text-xs border border-red-800/50 hover:border-red-600 flex items-center gap-1.5 transition"
                title="Delete preset from workspace"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Preset</span>
              </button>
            )}

            {isOfficial && isCustomized && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-1.5 bg-slate-800 hover:bg-amber-950 hover:text-amber-300 text-slate-300 rounded-lg font-medium text-xs border border-slate-700 hover:border-amber-800 flex items-center gap-1.5 transition"
                title="Revert back to standard UIDAI/ECI official crop coordinates"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset to Factory Default</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (formData) {
                  downloadSingleTemplateAsJsonFile(formData);
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg font-medium text-xs border border-slate-700 transition flex items-center gap-1.5"
              title="Download this preset as a .json file backup"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saveMode === 'update' ? 'Save Preset Changes' : 'Create New Preset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
