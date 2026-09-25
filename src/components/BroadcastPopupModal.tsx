import React, { useState } from 'react';
import { 
  X, 
  Send, 
  ExternalLink, 
  Download, 
  Share2, 
  Settings, 
  Sparkles, 
  Megaphone,
  Radio,
  CheckCircle2,
  Info,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { BroadcastPopupConfig, BroadcastTheme } from '../utils/broadcastService';
import { AuthSession } from '../utils/authService';

interface BroadcastPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BroadcastPopupConfig;
  authSession?: AuthSession | null;
  onOpenEditor?: () => void;
}

export const BroadcastPopupModal: React.FC<BroadcastPopupModalProps> = ({
  isOpen,
  onClose,
  config,
  authSession,
  onOpenEditor
}) => {
  const [dontShowToday, setDontShowToday] = useState(false);

  // If the popup is not open, or if it is disabled, return null
  if (!isOpen || !config.isEnabled) return null;

  // Check if there is any visible content configured
  const hasVisibleContent = Boolean(
    config.title?.trim() ||
    config.subtitle?.trim() ||
    config.badgeText?.trim() ||
    config.bengaliNotice?.trim() ||
    config.bengaliSubtext?.trim() ||
    config.footerDisclaimer?.trim() ||
    (config.showTelegramButton && config.telegramUrl) ||
    (config.showFacebookButton && config.facebookUrl) ||
    (config.showDownloadButton && config.downloadUrl) ||
    (config.showCustomButton && config.customButtonUrl)
  );

  // If all texts and links have been cleared and no content exists, do not display a blank empty box unless admin wants to edit
  if (!hasVisibleContent && !authSession?.role) {
    return null;
  }

  const handleClose = () => {
    if (dontShowToday) {
      const todayKey = 'sayonika_dismissed_popup_v_' + (config.version || 1);
      localStorage.setItem(todayKey, Date.now().toString());
    }
    onClose();
  };

  // Determine styling based on selected theme
  const getThemeStyles = (theme: BroadcastTheme) => {
    switch (theme) {
      case 'sunset':
        return {
          bannerBg: 'linear-gradient(180deg, #FFE600 0%, #FFDC00 22%, #FF8C00 55%, #FF2600 82%, #D80F00 100%)',
          titleColor: '#000000',
          titleShadow: '1.5px 1.5px 0px #ffffff, 3px 3px 0px rgba(0,0,0,0.3)',
          subtextColor: '#082567',
          subtextShadow: '0.5px 0.5px 0px rgba(255,255,255,0.7)',
          accentBorder: 'border-amber-500/50',
          bodyBg: 'bg-slate-950',
        };
      case 'emerald':
        return {
          bannerBg: 'linear-gradient(135deg, #052e16 0%, #065f46 45%, #047857 75%, #10b981 100%)',
          titleColor: '#ffffff',
          titleShadow: '0 2px 10px rgba(0,0,0,0.5)',
          subtextColor: '#a7f3d0',
          subtextShadow: 'none',
          accentBorder: 'border-emerald-500/50',
          bodyBg: 'bg-slate-950',
        };
      case 'navy':
        return {
          bannerBg: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e3a8a 80%, #2563eb 100%)',
          titleColor: '#ffffff',
          titleShadow: '0 2px 10px rgba(0,0,0,0.6)',
          subtextColor: '#93c5fd',
          subtextShadow: 'none',
          accentBorder: 'border-blue-500/50',
          bodyBg: 'bg-slate-950',
        };
      case 'crimson':
        return {
          bannerBg: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 40%, #dc2626 80%, #ef4444 100%)',
          titleColor: '#ffffff',
          titleShadow: '0 2px 10px rgba(0,0,0,0.6)',
          subtextColor: '#fecaca',
          subtextShadow: 'none',
          accentBorder: 'border-red-500/50',
          bodyBg: 'bg-slate-950',
        };
      case 'purple':
        return {
          bannerBg: 'linear-gradient(135deg, #2e1065 0%, #581c87 40%, #7e22ce 75%, #a855f7 100%)',
          titleColor: '#ffffff',
          titleShadow: '0 2px 10px rgba(0,0,0,0.6)',
          subtextColor: '#e9d5ff',
          subtextShadow: 'none',
          accentBorder: 'border-purple-500/50',
          bodyBg: 'bg-slate-950',
        };
      case 'dark':
      default:
        return {
          bannerBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          titleColor: '#ffffff',
          titleShadow: '0 2px 8px rgba(0,0,0,0.4)',
          subtextColor: '#cbd5e1',
          subtextShadow: 'none',
          accentBorder: 'border-slate-700',
          bodyBg: 'bg-slate-950',
        };
    }
  };

  const currentTheme = getThemeStyles(config.theme || 'sunset');
  const isAdmin = authSession?.role === 'admin';

  return (
    <div 
      id="custom-broadcast-popup-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div 
        id="custom-broadcast-popup-modal"
        className={`relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border ${currentTheme.accentBorder} ${currentTheme.bodyBg} text-slate-100 animate-in fade-in zoom-in-95 duration-200 my-auto`}
      >
        {/* Top Control Bar with Close & Admin Edit */}
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-2">
          {isAdmin && onOpenEditor && (
            <button
              onClick={() => {
                onClose();
                onOpenEditor();
              }}
              title="Edit customizable broadcast popup (Admin only)"
              className="px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Customize Popup</span>
            </button>
          )}

          <button
            onClick={handleClose}
            aria-label="Close popup"
            className="p-1.5 rounded-full bg-black/70 hover:bg-black text-white hover:text-amber-400 border border-white/20 shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Graphic Banner */}
        <div 
          className="relative w-full px-4 py-5 sm:px-8 sm:py-6 md:px-12 md:py-7 text-center select-none overflow-hidden"
          style={{
            background: currentTheme.bannerBg,
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.15)'
          }}
        >
          <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-2 sm:space-y-3">
            
            {/* Optional Badge */}
            {config.badgeText && (
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/30 text-white text-[11px] font-bold tracking-wider uppercase shadow-sm">
                <Radio className="w-3 h-3 text-amber-300 animate-pulse" />
                <span>{config.badgeText}</span>
              </div>
            )}

            {/* Top Main Heading */}
            {config.title && (
              <div className="w-full flex flex-col items-center">
                <h1 
                  className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none"
                  style={{
                    fontFamily: 'serif',
                    letterSpacing: '0.01em',
                    color: currentTheme.titleColor,
                    textShadow: currentTheme.titleShadow
                  }}
                >
                  {config.title}
                </h1>

                {/* Developer / Subtitle Attribution */}
                {config.subtitle && (
                  <div className="w-full flex justify-end pr-3 sm:pr-10 md:pr-16 -mt-0.5 sm:-mt-1">
                    <span 
                      className="text-sm sm:text-lg md:text-xl font-black tracking-wide"
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: config.theme === 'sunset' ? '#000000' : '#ffffff',
                        textShadow: config.theme === 'sunset' ? '0.5px 0.5px 0px #fff' : '0 1px 4px rgba(0,0,0,0.6)'
                      }}
                    >
                      {config.subtitle}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bengali Contact & Request Prompt */}
            {config.bengaliNotice && (
              <div className="px-2 sm:px-6 max-w-3xl">
                <p 
                  className="text-sm sm:text-base md:text-xl font-bold leading-snug"
                  style={{
                    color: currentTheme.subtextColor,
                    textShadow: currentTheme.subtextShadow,
                    fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif"
                  }}
                >
                  {config.bengaliNotice}
                </p>
              </div>
            )}

            {/* Direct Contact & Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 py-1 w-full">
              {/* Telegram Link Badge */}
              {config.showTelegramButton && config.telegramUrl && (
                <a
                  href={config.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="welcome-banner-telegram"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all group cursor-pointer border border-black/10"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
                    <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 translate-x-[-0.5px] translate-y-[0.5px]" />
                  </div>
                  <span>Telegram:</span>
                  <span className="text-[#0055aa] group-hover:underline font-extrabold">{config.telegramHandle || 'Telegram'}</span>
                  <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 group-hover:text-slate-900" />
                </a>
              )}

              {/* Facebook Link Button */}
              {config.showFacebookButton && config.facebookUrl && (
                <a
                  href={config.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="welcome-banner-facebook"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all group cursor-pointer border border-blue-400/30"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-[#1877F2] flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform shrink-0">
                    <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </div>
                  <span>Facebook</span>
                  <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80 group-hover:text-white shrink-0" />
                </a>
              )}

              {/* Download Button */}
              {config.showDownloadButton && config.downloadUrl && (
                <a
                  href={config.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="welcome-banner-download-btn"
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all group cursor-pointer border border-emerald-400/40"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform shrink-0">
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                  </div>
                  <span className="font-extrabold">{config.downloadButtonLabel || 'Download'}</span>
                  <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80 group-hover:text-white shrink-0" />
                </a>
              )}

              {/* Custom Action Button */}
              {config.showCustomButton && config.customButtonUrl && (
                <a
                  href={config.customButtonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all group cursor-pointer border border-indigo-400/40"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{config.customButtonLabel || 'Open Link'}</span>
                  <ExternalLink className="w-3 h-3 text-white/80" />
                </a>
              )}
            </div>

            {/* Bengali Local Offline Execution Assurance Note */}
            {config.bengaliSubtext && (
              <div className="px-2 sm:px-6 max-w-3xl">
                <p 
                  className="text-xs sm:text-base md:text-lg font-bold leading-snug text-white"
                  style={{
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.4)',
                    fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif"
                  }}
                >
                  {config.bengaliSubtext}
                </p>
              </div>
            )}

            {/* Development & Free Notice Footer */}
            {config.footerDisclaimer && (
              <div className="pt-0.5">
                <p 
                  className="text-[11px] sm:text-xs md:text-sm font-bold text-white tracking-wide"
                  style={{
                    textShadow: '1px 1px 2px rgba(0,0,0,0.9)'
                  }}
                >
                  {config.footerDisclaimer}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-slate-900 px-5 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                <ShieldCheck className="w-3 h-3" />
                <span>Live Firestore Synced</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onOpenEditor && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEditor();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Message</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition transform active:scale-95 cursor-pointer"
            >
              Continue to Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
