import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Layers, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Download, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  UserCheck,
  Split,
  FolderOpen,
  FileJson,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DocumentType, PresetConfig, CropBox, CustomSavedTemplate } from '../types';
import { generateSampleDocumentCanvas } from '../utils/sampleGenerator';
import { 
  getSavedTemplates, 
  deleteCustomTemplate,
  downloadTemplatesAsJsonFile,
  downloadSingleTemplateAsJsonFile,
  importTemplatesFromJson
} from '../utils/templateManager';

interface SampleTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSample: (docType: DocumentType) => void;
  onLoadCustomFile: (file: File, isDualSided?: boolean) => void;
  onLoadDualFiles: (frontFile: File, backFile: File) => void;
  onApplySavedTemplate: (template: CustomSavedTemplate) => void;
  onOpenImportExportModal?: (tab?: 'export' | 'import') => void;
  currentFrontBox: CropBox;
  currentBackBox?: CropBox;
  currentIsDualSided: boolean;
}

export const SampleTemplateModal: React.FC<SampleTemplateModalProps> = ({
  isOpen,
  onClose,
  onLoadSample,
  onLoadCustomFile,
  onLoadDualFiles,
  onApplySavedTemplate,
  onOpenImportExportModal,
  currentFrontBox,
  currentBackBox,
  currentIsDualSided,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload_file' | 'dual_sides' | 'saved_templates'>('presets');
  
  // Custom File Upload state
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);
  const [customDualSided, setCustomDualSided] = useState<boolean>(true);
  const customFileInputRef = useRef<HTMLInputElement>(null);

  // Dual Sides Upload state
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Saved Templates in LocalStorage
  const [savedTemplates, setSavedTemplates] = useState<CustomSavedTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateDesc, setNewTemplateDesc] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedTemplates(getSavedTemplates());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const safeSavedTemplates = Array.isArray(savedTemplates) ? savedTemplates : [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle single custom file select
  const handleCustomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomFile(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setCustomFilePreview(url);
      } else {
        setCustomFilePreview(null);
      }
    }
  };

  // Handle front file select
  const handleFrontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFrontFile(file);
      if (file.type.startsWith('image/')) {
        setFrontPreview(URL.createObjectURL(file));
      } else {
        setFrontPreview(null);
      }
    }
  };

  // Handle back file select
  const handleBackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackFile(file);
      if (file.type.startsWith('image/')) {
        setBackPreview(URL.createObjectURL(file));
      } else {
        setBackPreview(null);
      }
    }
  };

  // Submit custom template upload
  const handleLoadCustomTemplateSubmit = () => {
    if (!customFile) return;
    onLoadCustomFile(customFile, customDualSided);
    onClose();
  };

  // Submit dual files combine
  const handleLoadDualSidesSubmit = () => {
    if (!frontFile || !backFile) return;
    onLoadDualFiles(frontFile, backFile);
    onClose();
  };

  // Save current box configuration as a template
  const handleSaveCurrentAsTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTemplate: CustomSavedTemplate = {
      id: 'template_' + Date.now(),
      name: newTemplateName.trim(),
      category: 'custom',
      description: newTemplateDesc.trim() || 'Custom user alignment template',
      dualSided: currentIsDualSided,
      frontBox: { ...currentFrontBox },
      backBox: currentIsDualSided && currentBackBox ? { ...currentBackBox } : undefined,
      createdAt: Date.now(),
    };

    const updated = [newTemplate, ...savedTemplates];
    setSavedTemplates(updated);
    localStorage.setItem('sayonika_custom_templates', JSON.stringify(updated));
    setNewTemplateName('');
    setNewTemplateDesc('');
    setSaveSuccessMsg('Template saved successfully to your browser storage!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteCustomTemplate(id);
    setSavedTemplates(getSavedTemplates());
  };

  const builtInTemplates: { type: DocumentType; title: string; subtitle: string; icon: any; color: string; badge: string }[] = [
    {
      type: 'aadhaar',
      title: 'Aadhaar Card (UIDAI e-Aadhaar)',
      subtitle: 'Official UIDAI A4 PDF with Bottom Front & Back Cut-Out strip',
      icon: ShieldCheck,
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
      badge: 'Dual Sided CR80'
    },
    {
      type: 'voter',
      title: 'Voter ID (e-EPIC New Color Format)',
      subtitle: 'Election Commission of India Digital e-EPIC slip with Front & Back',
      icon: CreditCard,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      badge: 'Dual Sided CR80'
    },
    {
      type: 'wb_ration',
      title: 'West Bengal Digital Ration Card (WBPDS)',
      subtitle: 'Food & Supplies Dept digital e-RC certificate with dual cards',
      icon: Building,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      badge: 'Dual Sided CR80'
    },
    {
      type: 'pan',
      title: 'PAN Card (NSDL e-PAN Letter)',
      subtitle: 'Income Tax Department e-PAN letter with bottom cutting zone',
      icon: FileText,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      badge: 'Dual Sided CR80'
    },
    {
      type: 'ayushman',
      title: 'Ayushman Bharat (PM-JAY Golden Card)',
      subtitle: 'National Health Authority health card with Front & Back benefits',
      icon: Sparkles,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      badge: 'Dual Sided CR80'
    },
    {
      type: 'driving_license',
      title: 'Driving Licence (MoRTH Sarathi)',
      subtitle: 'Ministry of Road Transport smart card slip with chip & QR',
      icon: UserCheck,
      color: 'text-green-400 bg-green-500/10 border-green-500/30',
      badge: 'Dual Sided CR80'
    },
    {
      type: 'student_id',
      title: 'Student / Employee ID Card Template',
      subtitle: 'Standard CR80 Institutional Card with Front & Back details',
      icon: CreditCard,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      badge: 'Dual Sided CR80'
    }
  ];

  return (
    <div id="sample-template-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Sample Templates & Custom Upload</span>
                <span className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded-full font-mono">PVC Utility</span>
              </h2>
              <p className="text-xs text-slate-400">
                Load official Indian ID test samples, upload custom templates, or merge separate Front & Back scans.
              </p>
            </div>
          </div>
          <button
            id="close-sample-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 bg-slate-950/60 border-b border-slate-800 gap-2 overflow-x-auto">
          <button
            id="tab-presets-btn"
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'presets'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready Indian ID Samples (1-Click)</span>
          </button>

          <button
            id="tab-upload-file-btn"
            onClick={() => setActiveTab('upload_file')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'upload_file'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Custom Template</span>
          </button>

          <button
            id="tab-dual-sides-btn"
            onClick={() => setActiveTab('dual_sides')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dual_sides'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Separate Front & Back Scans</span>
          </button>

          <button
            id="tab-saved-templates-btn"
            onClick={() => setActiveTab('saved_templates')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'saved_templates'
                ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Saved Custom Presets ({safeSavedTemplates.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* 1. Ready Indian ID Samples */}
          {activeTab === 'presets' && (
            <div>
              <div className="mb-4">
                <p className="text-xs text-slate-400">
                  Select an authentic test document to test auto-cropping, margin bleed settings, and CR80 PVC printing layout without needing a real customer file:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {builtInTemplates.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition flex flex-col justify-between group"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2.5 rounded-lg border ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition">
                              {item.title}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono border border-slate-700">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onLoadSample(item.type);
                          onClose();
                        }}
                        className="w-full py-2 px-3 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-98"
                      >
                        <span>Load Sample & Align Front/Back</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Upload Custom Template */}
          {activeTab === 'upload_file' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="text-center">
                <h3 className="text-sm font-bold text-slate-100">Upload Single Template File (PDF or Image)</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload a master form, high-res scan, or template document to crop front and back cards.
                </p>
              </div>

              {/* Drop area */}
              <div
                onClick={() => customFileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center transition ${
                  customFile 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-slate-700 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-950'
                }`}
              >
                <input
                  ref={customFileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleCustomFileChange}
                  className="hidden"
                />

                {customFilePreview ? (
                  <div className="max-h-40 max-w-xs mb-3 overflow-hidden rounded border border-slate-700 shadow">
                    <img src={customFilePreview} alt="Preview" className="max-h-40 object-contain" />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-800 rounded-full text-blue-400 mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                )}

                {customFile ? (
                  <div className="text-center">
                    <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>{customFile.name}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(customFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace file
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-300">
                      Click to browse or drag & drop template document
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports PDF, PNG, JPG, JPEG, WEBP (High Resolution recommended)
                    </p>
                  </div>
                )}
              </div>

              {/* Template Configuration */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <label className="text-xs font-bold text-slate-300 block">Template Card Mode:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomDualSided(true)}
                    className={`p-3 rounded-lg border text-left transition flex items-start gap-2.5 ${
                      customDualSided
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Dual Sided (Front + Back)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Creates two crop boxes for front & back sides</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomDualSided(false)}
                    className={`p-3 rounded-lg border text-left transition flex items-start gap-2.5 ${
                      !customDualSided
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Single Sided (Front Only)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Creates a single card crop box (e.g. single pass ID)</div>
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={handleLoadCustomTemplateSubmit}
                disabled={!customFile}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-40 transition"
              >
                <span>Load Template Into Editor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 3. Separate Front & Back Scans */}
          {activeTab === 'dual_sides' && (
            <div className="space-y-5">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="text-sm font-bold text-slate-100">Upload Separate Front & Back Scans / Photos</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Common Xerox shop scenario: Customer sent two separate photos/scans (Front side and Back side).
                  Upload both and Sayonika will automatically combine them side-by-side!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Front Side Upload */}
                <div
                  onClick={() => frontInputRef.current?.click()}
                  className={`p-5 border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center transition min-h-[160px] ${
                    frontFile 
                      ? 'border-emerald-500 bg-emerald-500/5' 
                      : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
                  }`}
                >
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFrontFileChange}
                    className="hidden"
                  />
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
                    1. Front Side Image / Scan
                  </span>

                  {frontPreview ? (
                    <div className="max-h-24 max-w-full mb-2 overflow-hidden rounded border border-emerald-500/40">
                      <img src={frontPreview} alt="Front" className="max-h-24 object-contain" />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-800 rounded-full text-emerald-400 mb-2">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  {frontFile ? (
                    <p className="text-xs font-semibold text-slate-200 text-center truncate max-w-[200px]">
                      {frontFile.name}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 text-center">Click to select Front Scan</p>
                  )}
                </div>

                {/* Back Side Upload */}
                <div
                  onClick={() => backInputRef.current?.click()}
                  className={`p-5 border-2 border-dashed rounded-xl cursor-pointer flex flex-col items-center justify-center transition min-h-[160px] ${
                    backFile 
                      ? 'border-blue-500 bg-blue-500/5' 
                      : 'border-slate-700 bg-slate-950/50 hover:border-slate-600'
                  }`}
                >
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleBackFileChange}
                    className="hidden"
                  />
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                    2. Back Side Image / Scan
                  </span>

                  {backPreview ? (
                    <div className="max-h-24 max-w-full mb-2 overflow-hidden rounded border border-blue-500/40">
                      <img src={backPreview} alt="Back" className="max-h-24 object-contain" />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-800 rounded-full text-blue-400 mb-2">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  {backFile ? (
                    <p className="text-xs font-semibold text-slate-200 text-center truncate max-w-[200px]">
                      {backFile.name}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 text-center">Click to select Back Scan</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleLoadDualSidesSubmit}
                disabled={!frontFile || !backFile}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition"
              >
                <Split className="w-4 h-4" />
                <span>Merge & Align Front + Back Cards Into Editor</span>
              </button>
            </div>
          )}

          {/* 4. Saved Custom Presets */}
          {activeTab === 'saved_templates' && (
            <div className="space-y-6">
              {/* Save Current Section */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>Save Current Editor Crop Box Layout as Reusable Template</span>
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Quickly save your current Front ({Math.round(currentFrontBox.width)}%×{Math.round(currentFrontBox.height)}%)
                  {currentIsDualSided && ` and Back (${Math.round(currentBackBox.width)}%×{Math.round(currentBackBox.height)}%)`} box coordinates.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-1">
                    <label className="text-[11px] text-slate-400 block mb-1">Template Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bangaon School ID 2026"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1">Notes / Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Front card at bottom left, back card at bottom right"
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {saveSuccessMsg ? (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>{saveSuccessMsg}</span>
                    </span>
                  ) : <div />}

                  <button
                    onClick={handleSaveCurrentAsTemplate}
                    disabled={!newTemplateName.trim()}
                    className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                  >
                    Save As Preset Template
                  </button>
                </div>
              </div>

              {/* List of Saved Templates */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Your Saved Presets ({safeSavedTemplates.length})</span>
                  </h4>

                  {/* Pre-set Import & Export Actions */}
                  <div className="flex items-center gap-2">
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept="application/json,.json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result as string;
                            const res = importTemplatesFromJson(text, { mode: 'merge', updateDuplicates: true });
                            if (res.success) {
                              setSavedTemplates(getSavedTemplates());
                              showToast(`Successfully imported ${res.count} preset(s)!`);
                            } else {
                              showToast(`Import failed: ${res.error}`);
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />

                    {/* Quick Import Preset File (.json) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenImportExportModal) {
                          onOpenImportExportModal('import');
                          onClose();
                        } else {
                          importFileInputRef.current?.click();
                        }
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                      title="Import custom preset templates from a .json file"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-400" />
                      <span>Import Presets</span>
                    </button>

                    {/* Quick Export Preset File (.json) */}
                    <button
                      type="button"
                      disabled={safeSavedTemplates.length === 0}
                      onClick={() => {
                        if (onOpenImportExportModal) {
                          onOpenImportExportModal('export');
                          onClose();
                        } else {
                          const ok = downloadTemplatesAsJsonFile();
                          if (ok) {
                            showToast(`Exported ${safeSavedTemplates.length} presets to JSON file!`);
                          }
                        }
                      }}
                      className="px-2.5 py-1.5 bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800/70 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40 shadow-sm"
                      title="Export and download all saved custom presets as a .json backup file"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Export Presets ({safeSavedTemplates.length})</span>
                    </button>
                  </div>
                </div>

                {toastMessage && (
                  <div className="mb-3 p-2.5 bg-emerald-950/90 border border-emerald-500/70 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{toastMessage}</span>
                  </div>
                )}

                {safeSavedTemplates.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-400">No custom templates saved yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Adjust your crop boxes in the editor and click "Save As Preset Template" above, or import a JSON preset file.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {safeSavedTemplates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition flex items-center justify-between"
                      >
                        <div className="flex-1 mr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">⭐ {tmpl.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded font-mono">
                              {tmpl.dualSided ? 'Dual Sided' : 'Single Sided'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{tmpl.description}</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">
                            Front: X {Math.round(tmpl.frontBox.x)}%, Y {Math.round(tmpl.frontBox.y)}% • {new Date(tmpl.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Export single preset JSON */}
                          <button
                            type="button"
                            onClick={() => {
                              const ok = downloadSingleTemplateAsJsonFile(tmpl);
                              if (ok) {
                                showToast(`Exported "${tmpl.name}" as JSON!`);
                              }
                            }}
                            className="p-1.5 bg-slate-850 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition"
                            title={`Export "${tmpl.name}" as a single .json preset file`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              onApplySavedTemplate(tmpl);
                              onClose();
                            }}
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
                            title="Apply this template"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="p-1.5 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Sayonika PVC Utility • Designed for High Precision Indian ID Crops</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
