import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  Megaphone, 
  Palette, 
  Globe, 
  Send, 
  Share2, 
  Download, 
  Eye, 
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sliders,
  Type,
  Layout
} from 'lucide-react';
import { 
  BroadcastPopupConfig, 
  BroadcastTheme, 
  DEFAULT_BROADCAST_CONFIG, 
  saveBroadcastConfig,
  clearBroadcastConfigInFirestore
} from '../utils/broadcastService';
import { AuthSession } from '../utils/authService';

interface BroadcastEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: BroadcastPopupConfig;
  authSession: AuthSession;
  onConfigSaved: (savedConfig: BroadcastPopupConfig) => void;
}

export const BroadcastEditorModal: React.FC<BroadcastEditorModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  authSession,
  onConfigSaved
}) => {
  const [formData, setFormData] = useState<BroadcastPopupConfig>({
    ...DEFAULT_BROADCAST_CONFIG,
    ...currentConfig
  });
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'buttons' | 'style'>('content');

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await saveBroadcastConfig(formData, authSession.name || authSession.userId);
    setIsSaving(false);

    if (res.success) {
      showToast('Pop-up message updated & live synced to all active users!');
      onConfigSaved(formData);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      showToast(`Failed to save: ${res.error}`);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset all popup message content and buttons back to clean settings?')) {
      setFormData({
        ...DEFAULT_BROADCAST_CONFIG,
        version: formData.version
      });
      showToast('Reset to default clean template.');
    }
  };

  const handleClearAllTextsAndLinks = async () => {
    if (window.confirm('Are you sure you want to clear all texts and links from Firebase and disable the popup notice?')) {
      setIsSaving(true);
      const res = await clearBroadcastConfigInFirestore(authSession.name || authSession.userId);
      setIsSaving(false);
      if (res.success) {
        setFormData({
          ...DEFAULT_BROADCAST_CONFIG,
          version: (formData.version || 1) + 1
        });
        onConfigSaved({
          ...DEFAULT_BROADCAST_CONFIG,
          version: (formData.version || 1) + 1
        });
        showToast('All default texts and links cleared from Firebase successfully!');
      } else {
        showToast(`Failed to clear in Firebase: ${res.error}`);
      }
    }
  };

  const themes: { id: BroadcastTheme; name: string; gradient: string }[] = [
    { id: 'sunset', name: 'Sunset Electric (Yellow-Orange-Red)', gradient: 'from-amber-400 via-orange-500 to-red-600' },
    { id: 'emerald', name: 'Emerald Forest (Green-Teal)', gradient: 'from-emerald-600 via-teal-700 to-slate-900' },
    { id: 'navy', name: 'Deep Royal Navy (Blue-Indigo)', gradient: 'from-blue-600 via-indigo-900 to-slate-950' },
    { id: 'crimson', name: 'Crimson Alert (Red-Ruby)', gradient: 'from-red-600 via-rose-900 to-slate-950' },
    { id: 'purple', name: 'Regal Purple (Purple-Violet)', gradient: 'from-purple-600 via-fuchsia-900 to-slate-950' },
    { id: 'dark', name: 'Midnight Charcoal (Clean Slate)', gradient: 'from-slate-700 via-slate-850 to-slate-950' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-orange-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Customizable Pop-up Message Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
                  LIVE CLOUD SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customize the global announcement popup shown to all operators & users in real-time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/60 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'content'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Titles & Message Text</span>
          </button>

          <button
            onClick={() => setActiveTab('buttons')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'buttons'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Links & Action Buttons</span>
          </button>

          <button
            onClick={() => setActiveTab('style')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'style'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Theme & Banner Style</span>
          </button>

          {/* Master Enable/Disable Toggle */}
          <div className="ml-auto flex items-center gap-2 pl-3 border-l border-slate-800">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-0 cursor-pointer"
              />
              <span className={formData.isEnabled ? 'text-emerald-400' : 'text-slate-400'}>
                {formData.isEnabled ? 'Popup Enabled' : 'Popup Disabled'}
              </span>
            </label>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-5 mt-3 p-3 bg-blue-950/90 border border-blue-700/80 rounded-xl text-xs text-blue-200 flex items-center gap-2 shadow-lg animate-in fade-in">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'content' && (
            <div className="space-y-4">
              {/* Title & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Main Banner Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Sayonika PVC Utility"
                    className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Header Badge (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.badgeText || ''}
                    onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                    placeholder="e.g. OFFICIAL NOTICE"
                    className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Subtitle / Developer */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Subtitle / Developer Attribution
                </label>
                <input
                  type="text"
                  value={formData.subtitle || ''}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Developed by- Samit Biswas"
                  className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Bengali Primary Notice */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bengali Support / Inquiry Text (Dark Navy Header Box)
                </label>
                <textarea
                  rows={2}
                  value={formData.bengaliNotice || ''}
                  onChange={(e) => setFormData({ ...formData, bengaliNotice: e.target.value })}
                  placeholder="এই অ্যাপ টি ব্যাবহার করতে কোন সমস্যার সম্মুখিন হলে বা আপনাদের কোন বিশেষ আইডি কার্ডের অপশন এই অ্যাপএ পাবার জন্য নিচে দেওয়া আমার টেলিগ্রাম আইডি তে যোগাযোগ করুন"
                  className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Bengali Offline Execution Guarantee Subtext */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bengali Local Privacy Guarantee (White Subtext)
                </label>
                <textarea
                  rows={2}
                  value={formData.bengaliSubtext || ''}
                  onChange={(e) => setFormData({ ...formData, bengaliSubtext: e.target.value })}
                  placeholder="এই অ্যাপ টি একবার আপনার ব্রাউসারে ওপেন হবার পর আপনার ডিভাইসে লোকালি রান হয় কোন ডকুমেন্ট আমাদের সার্ভারে আপলোড হয় না ।"
                  className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Footer Disclaimer */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Bottom Footer Disclaimer / Copyright
                </label>
                <input
                  type="text"
                  value={formData.footerDisclaimer || ''}
                  onChange={(e) => setFormData({ ...formData, footerDisclaimer: e.target.value })}
                  placeholder="This tool is under developement phase & Free to use for all"
                  className="w-full bg-slate-950 border border-slate-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'buttons' && (
            <div className="space-y-5">
              {/* Telegram Button Settings */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Send className="w-4 h-4 text-sky-400" />
                    <span>Telegram Contact Button</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showTelegramButton}
                      onChange={(e) => setFormData({ ...formData, showTelegramButton: e.target.checked })}
                      className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-500"
                    />
                    <span>Show Button</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Telegram Handle</label>
                    <input
                      type="text"
                      value={formData.telegramHandle || ''}
                      onChange={(e) => setFormData({ ...formData, telegramHandle: e.target.value })}
                      placeholder="@SamitBiltu"
                      className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Telegram Direct URL</label>
                    <input
                      type="url"
                      value={formData.telegramUrl || ''}
                      onChange={(e) => setFormData({ ...formData, telegramUrl: e.target.value })}
                      placeholder="https://t.me/SamitBiltu"
                      className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Facebook Button Settings */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span>Facebook Link Button</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showFacebookButton}
                      onChange={(e) => setFormData({ ...formData, showFacebookButton: e.target.checked })}
                      className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-500"
                    />
                    <span>Show Button</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Facebook URL</label>
                  <input
                    type="url"
                    value={formData.facebookUrl || ''}
                    onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                    placeholder="https://www.facebook.com/share/18F2Prv45C/"
                    className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* PC Download Button Settings */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>PC Download / Update Installer Button</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showDownloadButton}
                      onChange={(e) => setFormData({ ...formData, showDownloadButton: e.target.checked })}
                      className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-500"
                    />
                    <span>Show Button</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Button Text</label>
                    <input
                      type="text"
                      value={formData.downloadButtonLabel || ''}
                      onChange={(e) => setFormData({ ...formData, downloadButtonLabel: e.target.value })}
                      placeholder="Download App for PC"
                      className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Download Link (Google Drive / Direct URL)</label>
                    <input
                      type="url"
                      value={formData.downloadUrl || ''}
                      onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Custom 4th Button (Optional) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Custom Action Button (Optional)</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showCustomButton}
                      onChange={(e) => setFormData({ ...formData, showCustomButton: e.target.checked })}
                      className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-blue-500"
                    />
                    <span>Show Custom Button</span>
                  </label>
                </div>

                {formData.showCustomButton && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Button Label</label>
                      <input
                        type="text"
                        value={formData.customButtonLabel || ''}
                        onChange={(e) => setFormData({ ...formData, customButtonLabel: e.target.value })}
                        placeholder="e.g. YouTube Tutorial"
                        className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Target URL</label>
                      <input
                        type="url"
                        value={formData.customButtonUrl || ''}
                        onChange={(e) => setFormData({ ...formData, customButtonUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full bg-slate-900 border border-slate-750 focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Visual Theme & Color Palette
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => setFormData({ ...formData, theme: theme.id })}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      formData.theme === theme.id
                        ? 'border-blue-500 bg-slate-800 ring-2 ring-blue-500/30'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${theme.gradient} shadow-md`} />
                      <div>
                        <div className="text-xs font-bold text-white">{theme.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono capitalize">{theme.id} style</div>
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      formData.theme === theme.id ? 'border-blue-400 bg-blue-500' : 'border-slate-600'
                    }`}>
                      {formData.theme === theme.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Behavior Settings */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Display & Popup Trigger Behavior
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoPopupOnLogin ?? true}
                      onChange={(e) => setFormData({ ...formData, autoPopupOnLogin: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500"
                    />
                    <span>Automatically display this pop-up when operators launch or log in to the application</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              title="Reset fields in editor form to clean template"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Fields</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllTextsAndLinks}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-800/50 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Clear all default texts and links from Firebase directly"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Clear Firebase Defaults</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Syncing to Firestore...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Broadcast to All Users</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
