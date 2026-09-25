import React, { useState, useEffect } from 'react';
import { 
  Save, 
  X, 
  Sparkles, 
  FileText, 
  Check, 
  Sliders, 
  Tag, 
  Layers, 
  HelpCircle, 
  FolderPlus, 
  CreditCard, 
  Cloud, 
  Globe, 
  Share2, 
  Users,
  Lock
} from 'lucide-react';
import { CropBox, DocumentType, CardMarginSettings, ImageAdjustments, CustomSavedTemplate } from '../types';
import { saveCustomTemplate, getSavedTemplates, setDefaultStartingPresetId } from '../utils/templateManager';
import { isUserAdmin } from '../utils/cloudPresetService';
import { AuthSession } from '../utils/authService';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  frontBox: CropBox;
  backBox?: CropBox;
  isDualSided: boolean;
  totalPages?: number;
  frontPageNumber?: number;
  backPageNumber?: number;
  currentFileName?: string;
  marginSettings?: CardMarginSettings;
  imageAdjustments?: ImageAdjustments;
  currentUser?: AuthSession | null;
  onTemplateSaved?: (savedTemplate: CustomSavedTemplate) => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  frontBox,
  backBox,
  isDualSided,
  totalPages = 1,
  frontPageNumber = 1,
  backPageNumber = 1,
  currentFileName = '',
  marginSettings,
  imageAdjustments,
  currentUser,
  onTemplateSaved,
}) => {
  const isAdmin = isUserAdmin(currentUser);
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState<DocumentType>('custom');
  const [keywords, setKeywords] = useState('');
  const [description, setDescription] = useState('');
  const [makeGlobalForEveryone, setMakeGlobalForEveryone] = useState(isAdmin);
  const [saveFrontPage, setSaveFrontPage] = useState(frontPageNumber);
  const [saveBackPage, setSaveBackPage] = useState(backPageNumber);
  const [includeImageAdjustments, setIncludeImageAdjustments] = useState(true);
  const [includeMargins, setIncludeMargins] = useState(true);
  const [setAsDefaultStarting, setSetAsDefaultStarting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [existingTemplates, setExistingTemplates] = useState<CustomSavedTemplate[]>([]);

  useEffect(() => {
    if (isOpen) {
      setExistingTemplates(getSavedTemplates());
      setSaveSuccess(false);
      setMakeGlobalForEveryone(isAdmin);
      setSetAsDefaultStarting(false);
      setSaveFrontPage(frontPageNumber);
      setSaveBackPage(backPageNumber);

      // Suggest initial template name based on active file name
      if (currentFileName) {
        const cleanName = currentFileName
          .replace(/\.[^/.]+$/, '')
          .replace(/[_\-]+/g, ' ')
          .trim();
        setTemplateName(`Template: ${cleanName}`);
        
        // Suggest keywords from filename
        const words = (cleanName || '')
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w && typeof w === 'string' && w.length > 2 && !['pdf', 'scan', 'copy', 'final', 'doc'].includes(w));
        setKeywords(words.join(', '));
      } else {
        setTemplateName('My Custom ID Card Template');
        setKeywords('custom_card, id_card');
      }
    }
  }, [isOpen, currentFileName, frontPageNumber, backPageNumber, isAdmin]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const newTemplate: Omit<CustomSavedTemplate, 'id' | 'createdAt'> = {
      name: templateName.trim(),
      category: category,
      description: description.trim() || `Auto-crop preset for ${templateName.trim()}`,
      dualSided: isDualSided,
      matchKeywords: keywords.trim(),
      frontPage: saveFrontPage,
      backPage: isDualSided ? saveBackPage : undefined,
      isGlobal: isAdmin && makeGlobalForEveryone,
      createdBy: currentUser?.name || (currentUser?.userId ? `@${currentUser.userId}` : 'Biswas Xerox Staff'),
      createdByRole: currentUser?.role || (isAdmin ? 'admin' : 'operator'),
      frontBox: {
        x: Number(frontBox.x.toFixed(2)),
        y: Number(frontBox.y.toFixed(2)),
        width: Number(frontBox.width.toFixed(2)),
        height: Number(frontBox.height.toFixed(2)),
      },
      backBox: isDualSided && backBox ? {
        x: Number(backBox.x.toFixed(2)),
        y: Number(backBox.y.toFixed(2)),
        width: Number(backBox.width.toFixed(2)),
        height: Number(backBox.height.toFixed(2)),
      } : undefined,
      marginSettings: includeMargins ? marginSettings : undefined,
      imageAdjustments: includeImageAdjustments ? imageAdjustments : undefined,
    };

    const saved = saveCustomTemplate(newTemplate, { 
      syncToCloud: isAdmin && makeGlobalForEveryone, 
      user: currentUser 
    });

    if (setAsDefaultStarting) {
      setDefaultStartingPresetId(`custom_tpl_${saved.id}`);
    }

    setSaveSuccess(true);

    if (onTemplateSaved) {
      onTemplateSaved(saved);
    }

    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Save Manual Auto-Crop Template</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isDualSided ? 'Dual Sided' : 'Single Sided'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Save current crop box coordinates to auto-crop all future matching PDFs automatically.
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

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {/* Template Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Template Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Bangaon College 2026 Student ID or Health Slip"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2 text-slate-100 font-medium placeholder-slate-500 text-xs"
              />
            </div>
          </div>

          {/* Auto-Match Filename Keywords */}
          <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Detect Filename Keywords (Comma Separated)</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Auto-Crop Trigger</span>
            </div>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. bangaon, admit, semester, hallticket, college"
              className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-1.5 text-slate-200 text-xs placeholder-slate-500"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-start gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Whenever you drop any PDF with these keywords, Sayonika will <strong>automatically apply this template and crop it instantly</strong> without manual adjustment!
              </span>
            </p>
          </div>

          {/* Category Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Card Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentType)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:border-blue-500"
              >
                <option value="custom">Custom ID / Certificate</option>
                <option value="student_id">Student / Employee ID Card</option>
                <option value="aadhaar">Aadhaar Format</option>
                <option value="voter">Voter ID / EPIC Slip</option>
                <option value="wb_ration">West Bengal Ration Card</option>
                <option value="pan">Income Tax PAN Card</option>
                <option value="ayushman">Ayushman / Health Card</option>
                <option value="driving_license">Driving Licence (DL)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                Description / Shop Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Front photo on left, back address on right"
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs placeholder-slate-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Multi-Page Source Page Routing for this template */}
          {totalPages > 1 && (
            <div className="bg-blue-950/40 border border-blue-800/60 p-3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span>Template Source Pages (Multi-Page PDF)</span>
                </span>
                <span className="text-[10px] text-blue-300 font-mono">PDF has {totalPages} pages</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-xs text-emerald-300 font-medium">Front Side:</span>
                  <select
                    value={saveFrontPage}
                    onChange={(e) => setSaveFrontPage(Number(e.target.value))}
                    className="bg-slate-900 text-slate-200 border border-slate-700 text-xs rounded px-2 py-0.5"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <option key={p} value={p}>Page {p}</option>
                    ))}
                  </select>
                </div>
                {isDualSided && (
                  <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-xs text-blue-300 font-medium">Back Side:</span>
                    <select
                      value={saveBackPage}
                      onChange={(e) => setSaveBackPage(Number(e.target.value))}
                      className="bg-slate-900 text-slate-200 border border-slate-700 text-xs rounded px-2 py-0.5"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p}>Page {p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Captured Coordinates Summary */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Captured Crop Box Coordinates</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Standard CR80 (85.60 × 53.98mm)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-900/90 border border-emerald-500/30 p-2 rounded-lg">
                <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Front Side Box</span>
                </div>
                <div className="text-slate-300">
                  X: <span className="text-white">{frontBox.x}%</span>, Y: <span className="text-white">{frontBox.y}%</span>
                </div>
                <div className="text-slate-300">
                  W: <span className="text-white">{frontBox.width}%</span>, H: <span className="text-white">{frontBox.height}%</span>
                </div>
              </div>

              {isDualSided && backBox ? (
                <div className="bg-slate-900/90 border border-blue-500/30 p-2 rounded-lg">
                  <div className="text-blue-400 font-bold mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span>Back Side Box</span>
                  </div>
                  <div className="text-slate-300">
                    X: <span className="text-white">{backBox.x}%</span>, Y: <span className="text-white">{backBox.y}%</span>
                  </div>
                  <div className="text-slate-300">
                    W: <span className="text-white">{backBox.width}%</span>, H: <span className="text-white">{backBox.height}%</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 p-2 rounded-lg text-slate-500 flex items-center justify-center italic text-center">
                  Single Side Mode (Back side disabled)
                </div>
              )}
            </div>
          </div>

          {/* Cloud Sharing & Optional Attachments */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            {/* Make Available to Everyone toggle (Admin Only) */}
            {isAdmin ? (
              <div className="p-3 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-800/60 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={makeGlobalForEveryone}
                    onChange={(e) => setMakeGlobalForEveryone(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-950 border-blue-700 text-blue-500 focus:ring-0 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5 text-blue-400" />
                        <span>Publish to Cloud Multi-User Database</span>
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                        Admin Global Sync
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Saves this custom template to Firestore Cloud so all operators, computers, and public users can immediately access and download it.
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
                        Saving Locally to Browser Storage
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-semibold border border-slate-700">
                        Local App Only
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      Public and standard users save templates locally in browser storage. Only Administrator is authorized to publish global presets to the Multi-User Cloud database.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeImageAdjustments}
                onChange={(e) => setIncludeImageAdjustments(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-xs">Include Image Adjustments (Brightness, Contrast, Xerox Clarity filter)</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={includeMargins}
                onChange={(e) => setIncludeMargins(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-xs">Include Card Border & Bleed Margin Settings</span>
            </label>

            <label className="flex items-center gap-2 text-amber-300 cursor-pointer hover:text-amber-200 bg-amber-950/20 p-2.5 rounded-xl border border-amber-800/40">
              <input
                type="checkbox"
                checked={setAsDefaultStarting}
                onChange={(e) => setSetAsDefaultStarting(e.target.checked)}
                className="rounded bg-slate-950 border-amber-600 text-amber-500 focus:ring-0"
              />
              <span className="text-xs font-semibold">⭐ Set as Default Starting Preset (Auto-loads on application startup)</span>
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/80">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
            <span>{makeGlobalForEveryone ? 'Cloud Global Storage • Available on all devices' : 'Local Storage Only'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saveSuccess || !templateName.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Template</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
