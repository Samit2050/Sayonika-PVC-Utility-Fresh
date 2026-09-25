import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Link, 
  ExternalLink, 
  Save, 
  RotateCcw, 
  X, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  Eye,
  CheckCircle2,
  Tag,
  MessageSquare,
  Zap,
  Flame,
  Layers,
  Palette
} from 'lucide-react';
import { 
  AppUpdateConfig, 
  DEFAULT_APP_UPDATE_CONFIG, 
  saveAppUpdateConfig 
} from '../utils/appUpdateService';
import { playCropSuccessSound } from '../utils/audioNotification';

interface AppUpdateLinkEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AppUpdateConfig;
  userDisplayName?: string;
  userRole?: string;
  onConfigSaved?: (newConfig: AppUpdateConfig) => void;
}

export const AppUpdateLinkEditorModal: React.FC<AppUpdateLinkEditorModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  userDisplayName = 'Admin',
  userRole = 'admin',
  onConfigSaved,
}) => {
  const [url, setUrl] = useState<string>(currentConfig.url || '');
  const [buttonLabel, setButtonLabel] = useState<string>(currentConfig.buttonLabel || 'Update App');
  const [badgeText, setBadgeText] = useState<string>(currentConfig.badgeText || 'NEW');
  const [tooltipText, setTooltipText] = useState<string>(currentConfig.tooltipText || '');
  const [versionTag, setVersionTag] = useState<string>(currentConfig.versionTag || 'v2.4');
  const [isEnabled, setIsEnabled] = useState<boolean>(currentConfig.isEnabled ?? true);
  
  // RGB Glow settings
  const [rgbGlowEnabled, setRgbGlowEnabled] = useState<boolean>(currentConfig.rgbGlowEnabled ?? true);
  const [rgbGlowStyle, setRgbGlowStyle] = useState<'rainbow' | 'cyberpunk' | 'neon-emerald' | 'fire'>(
    currentConfig.rgbGlowStyle || 'rainbow'
  );
  const [rgbGlowHalo, setRgbGlowHalo] = useState<boolean>(currentConfig.rgbGlowHalo ?? false);
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(currentConfig.url || '');
      setButtonLabel(currentConfig.buttonLabel || 'Update App');
      setBadgeText(currentConfig.badgeText || 'NEW');
      setTooltipText(currentConfig.tooltipText || '');
      setVersionTag(currentConfig.versionTag || 'v2.4');
      setIsEnabled(currentConfig.isEnabled ?? true);
      setRgbGlowEnabled(currentConfig.rgbGlowEnabled ?? true);
      setRgbGlowStyle(currentConfig.rgbGlowStyle || 'rainbow');
      setRgbGlowHalo(currentConfig.rgbGlowHalo ?? false);
      setStatusMessage(null);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide a valid download URL (Google Drive, MEGA, etc.)' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const updater = `${userDisplayName} (${userRole.toUpperCase()})`;
    const updatedPayload: Partial<AppUpdateConfig> = {
      url: url.trim(),
      buttonLabel: buttonLabel.trim() || 'Update App',
      badgeText: badgeText.trim() || 'NEW',
      tooltipText: tooltipText.trim() || `Download latest update / installer for PC (${versionTag})`,
      versionTag: versionTag.trim() || 'v2.4',
      isEnabled,
      rgbGlowEnabled,
      rgbGlowStyle,
      rgbGlowHalo,
      updatedBy: updater,
      updatedAt: Date.now(),
    };

    const res = await saveAppUpdateConfig(updatedPayload, updater);
    setIsSaving(false);

    if (res.success) {
      playCropSuccessSound();
      setStatusMessage({ type: 'success', text: 'Successfully saved and live synced with Firestore for all users!' });
      if (onConfigSaved) {
        onConfigSaved({
          ...currentConfig,
          ...updatedPayload,
        } as AppUpdateConfig);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to save to Firestore' });
    }
  };

  const handleResetDefault = () => {
    setUrl(DEFAULT_APP_UPDATE_CONFIG.url);
    setButtonLabel(DEFAULT_APP_UPDATE_CONFIG.buttonLabel);
    setBadgeText(DEFAULT_APP_UPDATE_CONFIG.badgeText);
    setTooltipText(DEFAULT_APP_UPDATE_CONFIG.tooltipText);
    setVersionTag(DEFAULT_APP_UPDATE_CONFIG.versionTag || 'v2.4');
    setIsEnabled(true);
    setRgbGlowEnabled(DEFAULT_APP_UPDATE_CONFIG.rgbGlowEnabled ?? true);
    setRgbGlowStyle(DEFAULT_APP_UPDATE_CONFIG.rgbGlowStyle || 'rainbow');
    setRgbGlowHalo(DEFAULT_APP_UPDATE_CONFIG.rgbGlowHalo ?? false);
    setStatusMessage({ type: 'success', text: 'Default link & settings restored. Click "Save & Sync" to commit to Firestore.' });
  };

  const handleTestLink = () => {
    if (!url.trim()) return;
    try {
      window.open(url.trim(), '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
  };

  // Helper for glow class in preview
  const getGlowClass = () => {
    if (!rgbGlowEnabled) {
      return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 border-emerald-400/40';
    }
    switch (rgbGlowStyle) {
      case 'cyberpunk':
        return 'rgb-glow-cyberpunk text-white shadow-lg';
      case 'neon-emerald':
        return 'rgb-glow-neon-emerald text-white shadow-lg';
      case 'fire':
        return 'rgb-glow-fire text-white shadow-lg';
      case 'rainbow':
      default:
        return 'rgb-glow-active text-white shadow-lg';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        id="app-update-link-editor-modal"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden text-slate-100 ring-1 ring-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${
              rgbGlowEnabled ? 'rgb-glow-active text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 ring-1 ring-emerald-400/40'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Edit "Update App" Link & RGB Glow
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold">
                  FIRESTORE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Custom URL, label, and animated RGB glow synchronized in real-time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {statusMessage && (
            <div 
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/60 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Live Button Preview Card with RGB Glow Simulation */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Interactive Button Preview</span>
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                rgbGlowEnabled 
                  ? 'bg-purple-950 border-purple-500 text-purple-300 animate-pulse font-bold' 
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {rgbGlowEnabled ? `RGB GLOW: ON (${rgbGlowStyle.toUpperCase()})` : 'RGB GLOW: OFF'}
              </span>
            </div>

            <div className="flex items-center justify-center p-5 bg-slate-900/90 rounded-lg border border-slate-800/80">
              <div className={rgbGlowHalo && rgbGlowEnabled ? 'rgb-glow-container-halo' : ''}>
                <a
                  href={url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (!url) e.preventDefault();
                  }}
                  className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all transform active:scale-95 cursor-pointer border whitespace-nowrap ${getGlowClass()}`}
                  title={tooltipText || 'Download latest update / installer for PC'}
                >
                  <Download className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span>{buttonLabel || 'Update App'}</span>
                  {badgeText && (
                    <span className="px-1.5 py-0.2 rounded bg-black/40 text-white text-[9px] font-mono border border-white/40 font-bold backdrop-blur-sm">
                      {badgeText}
                    </span>
                  )}
                </a>
              </div>
            </div>
          </div>

          {/* RGB Glow Live Settings Section */}
          <div className="p-4 bg-gradient-to-r from-purple-950/30 via-slate-950/80 to-blue-950/30 border border-purple-800/50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">RGB Glow Effect</span>
                <span className="text-[10px] text-purple-300 font-mono bg-purple-900/40 px-1.5 py-0.5 rounded border border-purple-500/40">
                  Real-Time Sync
                </span>
              </div>

              {/* Master ON / OFF Toggle Switch */}
              <button
                type="button"
                onClick={() => setRgbGlowEnabled(!rgbGlowEnabled)}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  rgbGlowEnabled
                    ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-600/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${rgbGlowEnabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                <span>{rgbGlowEnabled ? 'GLOW ON' : 'GLOW OFF'}</span>
              </button>
            </div>

            {rgbGlowEnabled && (
              <div className="space-y-2.5 pt-2 border-t border-purple-900/40">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  <span>Select RGB Glow Preset Style:</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setRgbGlowStyle('rainbow')}
                    className={`p-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer border ${
                      rgbGlowStyle === 'rainbow'
                        ? 'bg-purple-900/60 border-purple-400 text-white ring-1 ring-purple-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-sm">🌈</span>
                    <span className="text-[11px]">Rainbow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRgbGlowStyle('cyberpunk')}
                    className={`p-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer border ${
                      rgbGlowStyle === 'cyberpunk'
                        ? 'bg-pink-900/60 border-pink-400 text-white ring-1 ring-pink-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-pink-400" />
                    <span className="text-[11px]">Cyberpunk</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRgbGlowStyle('neon-emerald')}
                    className={`p-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer border ${
                      rgbGlowStyle === 'neon-emerald'
                        ? 'bg-emerald-900/60 border-emerald-400 text-white ring-1 ring-emerald-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px]">Emerald Neon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRgbGlowStyle('fire')}
                    className={`p-2 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer border ${
                      rgbGlowStyle === 'fire'
                        ? 'bg-amber-900/60 border-amber-400 text-white ring-1 ring-amber-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px]">Solar Fire</span>
                  </button>
                </div>

                {/* Optional Outer Halo Ring Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <label className="text-[11px] text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rgbGlowHalo}
                      onChange={(e) => setRgbGlowHalo(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-purple-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Include 360° Rotating Conic Halo Aura</span>
                  </label>
                  <span className="text-[10px] text-slate-500">Extra Visual Pop</span>
                </div>
              </div>
            )}
          </div>

          {/* 1. Download URL Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download / Update URL (Google Drive, MEGA, Dropbox, etc.)</span>
              </label>
              {url && (
                <button
                  type="button"
                  onClick={handleTestLink}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Test and open URL in a new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Test Link</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view?usp=drive_link"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Paste the shareable link of your installer or Google Drive file. Ensure access is set to <em>"Anyone with the link can view"</em>.
            </p>
          </div>

          {/* 2. Button Label & Badge Text */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Button Label Text</span>
              </label>
              <input
                type="text"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Update App"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Badge Tag Text (e.g. NEW / v2.4)</span>
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="NEW"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* 3. Hover Tooltip Text & Version */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Hover Tooltip Description
              </label>
              <input
                type="text"
                value={tooltipText}
                onChange={(e) => setTooltipText(e.target.value)}
                placeholder="Download latest update / installer for PC (Google Drive)"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Version Tag
              </label>
              <input
                type="text"
                value={versionTag}
                onChange={(e) => setVersionTag(e.target.value)}
                placeholder="v2.4"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Meta Info */}
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Permission: <strong>{userDisplayName} ({userRole.toUpperCase()})</strong></span>
            </div>
            {currentConfig.updatedAt && (
              <span className="text-slate-500 font-mono">
                Last synced: {new Date(currentConfig.updatedAt).toLocaleDateString()} {new Date(currentConfig.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-3">
            <button
              type="button"
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-600 hover:opacity-90 text-white text-xs font-bold rounded-lg shadow-md shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Syncing Firestore...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save & Live Sync</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
