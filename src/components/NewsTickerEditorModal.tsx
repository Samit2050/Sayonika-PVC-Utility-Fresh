import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Sparkles, 
  Megaphone, 
  Globe, 
  ExternalLink, 
  Eye, 
  Sliders, 
  Type, 
  Zap, 
  Play, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Link2
} from 'lucide-react';
import { 
  NewsTickerConfig, 
  NewsTickerEffect, 
  NewsTickerSpeed, 
  DEFAULT_NEWS_TICKER_CONFIG,
  saveNewsTickerConfig 
} from '../utils/newsTickerService';

interface NewsTickerEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: NewsTickerConfig;
  userDisplayName: string;
  onConfigSaved: (config: NewsTickerConfig) => void;
}

const EFFECT_OPTIONS: { id: NewsTickerEffect; label: string; desc: string; previewClass: string }[] = [
  { id: 'neon-pulse', label: 'Neon Cyan & Blue Glow', desc: 'Futuristic glowing aura text', previewClass: 'ticker-effect-neon-pulse text-cyan-300 font-bold' },
  { id: 'rgb-glow', label: 'RGB Chroma Wave', desc: 'Rainbow animating gradient stream', previewClass: 'ticker-effect-rgb-glow font-bold' },
  { id: 'gold-fire', label: 'Golden Amber Fire', desc: 'Warm molten gold radiant flame', previewClass: 'ticker-effect-gold-fire font-bold' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Hot pink, purple and emerald shimmer', previewClass: 'ticker-effect-cyberpunk font-bold' },
  { id: 'smooth-marquee', label: 'Classic Clean News Bar', desc: 'Crisp shadow, high contrast readability', previewClass: 'ticker-effect-smooth-marquee text-white font-semibold' },
  { id: 'subtle', label: 'Subtle Minimalist', desc: 'Quiet elegant ticker styling', previewClass: 'ticker-effect-subtle text-slate-200' },
];

const SPEED_OPTIONS: { id: NewsTickerSpeed; label: string; duration: string }[] = [
  { id: 'slow', label: 'Slow (Easy Reading)', duration: '50s' },
  { id: 'medium', label: 'Medium (Balanced)', duration: '35s' },
  { id: 'fast', label: 'Fast (Dynamic Rush)', duration: '22s' },
];

export const NewsTickerEditorModal: React.FC<NewsTickerEditorModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  userDisplayName,
  onConfigSaved,
}) => {
  const [formData, setFormData] = useState<NewsTickerConfig>({
    ...DEFAULT_NEWS_TICKER_CONFIG,
    ...currentConfig,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.text.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter news or announcement text to scroll.' });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    const res = await saveNewsTickerConfig(formData, userDisplayName);
    setIsSaving(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: 'Scrolling news bar updated and synced live to all users!' });
      onConfigSaved(formData);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setStatusMsg({ type: 'error', text: res.error || 'Failed to update ticker.' });
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset scrolling news bar to recommended defaults?')) {
      setFormData({
        ...DEFAULT_NEWS_TICKER_CONFIG,
        version: formData.version,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-750 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-amber-600 to-red-600 rounded-xl shadow-md shadow-red-950/40 text-white">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Admin Scrolling News & Updates Bar</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-semibold">
                  LIVE SYNC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Customize announcements, visual glow effects, scroll speed, and clickable website links.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-red-950/50 border-red-500/50 text-red-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Master Toggle */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <span>Enable Scrolling News Ticker</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  formData.isEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {formData.isEnabled ? 'ACTIVE' : 'HIDDEN'}
                </span>
              </label>
              <p className="text-xs text-slate-400">
                Display the ticker bar directly under the header across all screens and user sessions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                formData.isEnabled ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Interactive Preview</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Hover to pause</span>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-slate-750 bg-slate-950 p-2.5 flex items-center gap-3">
              {/* Badge Preview */}
              <div 
                className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-sm shrink-0 flex items-center gap-1"
                style={{ backgroundColor: formData.badgeBgColor || '#dc2626' }}
              >
                <Megaphone className="w-3 h-3" />
                <span>{formData.prefixLabel || 'NEWS'}</span>
              </div>

              {/* Scrolling Text Preview */}
              <div className="flex-1 overflow-hidden select-none">
                <div 
                  className={`text-xs ${
                    EFFECT_OPTIONS.find((e) => e.id === formData.effect)?.previewClass || 'text-white'
                  }`}
                  style={{ color: formData.textColor || '#f8fafc' }}
                >
                  <span>{formData.text || 'News text will scroll here...'}</span>
                </div>
              </div>

              {/* Action Link Preview */}
              {formData.linkUrl && (
                <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                  <span>{formData.linkLabel || 'Open Link'}</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Content & Texts */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span>Announcement Message & Prefix</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-300">Prefix Label / Badge Text</label>
                <input
                  type="text"
                  value={formData.prefixLabel}
                  onChange={(e) => setFormData({ ...formData, prefixLabel: e.target.value })}
                  placeholder="e.g. 📢 LATEST NEWS & UPDATES"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Badge Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.badgeBgColor || '#dc2626'}
                    onChange={(e) => setFormData({ ...formData, badgeBgColor: e.target.value })}
                    className="w-9 h-8 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={formData.badgeBgColor || '#dc2626'}
                    onChange={(e) => setFormData({ ...formData, badgeBgColor: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl px-2 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Scrolling Announcement Text</span>
                <span className="text-[10px] text-slate-500">Supports emojis, notices & Bengali / English</span>
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                rows={3}
                placeholder="Type your news announcement, maintenance update, or licensing note here..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Section 2: Website / External Link */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Link2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Clickable Website Link / Action Button</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Target Website URL (Optional)</label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={formData.linkUrl || ''}
                    onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                    placeholder="https://example.com or https://wa.me/..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Users can click the button to directly open your website, WhatsApp, YouTube tutorial, or portal.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Button Label / CTA</label>
                <input
                  type="text"
                  value={formData.linkLabel || ''}
                  onChange={(e) => setFormData({ ...formData, linkLabel: e.target.value })}
                  placeholder="e.g. Visit Website / Read More"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Visual Effects & Animation */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Visual Effects & Scroll Speed</span>
            </h3>

            {/* Effects Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EFFECT_OPTIONS.map((eff) => (
                <div
                  key={eff.id}
                  onClick={() => setFormData({ ...formData, effect: eff.id })}
                  className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    formData.effect === eff.id
                      ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{eff.label}</span>
                    {formData.effect === eff.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">{eff.desc}</p>
                  <div className="p-1.5 bg-slate-900/90 rounded border border-slate-800 text-[11px] overflow-hidden whitespace-nowrap">
                    <span className={eff.previewClass}>Sample Preview Text</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Speed & Hover Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Scrolling Speed</label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, speed: spd.id })}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg capitalize transition cursor-pointer ${
                        formData.speed === spd.id
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {spd.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Hover Behavior</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPausedOnHover: !formData.isPausedOnHover })}
                  className={`w-full p-2 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition ${
                    formData.isPausedOnHover
                      ? 'bg-slate-950 border-amber-500/50 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span>Pause ticker when mouse hovers</span>
                  <span className="font-mono text-[10px]">
                    {formData.isPausedOnHover ? 'YES (Recommended)' : 'NO'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save & Publish Live'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
