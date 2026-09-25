import React, { useState } from 'react';
import { X, Send, ExternalLink, ArrowRight, ShieldCheck, Copy, Check, Share2, Download } from 'lucide-react';

interface WelcomeBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeBannerModal: React.FC<WelcomeBannerModalProps> = ({ isOpen, onClose }) => {
  const [copiedTelegram, setCopiedTelegram] = useState(false);
  const [copiedFacebook, setCopiedFacebook] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const handleCopy = (text: string, type: 'tg' | 'fb') => {
    navigator.clipboard.writeText(text);
    if (type === 'tg') {
      setCopiedTelegram(true);
      setTimeout(() => setCopiedTelegram(false), 2000);
    } else {
      setCopiedFacebook(true);
      setTimeout(() => setCopiedFacebook(false), 2000);
    }
  };

  return (
    <div 
      id="welcome-banner-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div 
        id="welcome-banner-modal"
        className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-amber-500/50 bg-slate-950 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close Button at top right */}
        <button
          id="close-welcome-banner-btn"
          onClick={handleClose}
          aria-label="Close welcome banner"
          className="absolute top-2.5 right-2.5 z-30 p-1.5 rounded-full bg-black/70 hover:bg-black text-white hover:text-amber-400 border border-white/20 shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* The Graphic Banner recreating the exact uploaded design - Wide & Compact Height */}
        <div 
          className="relative w-full px-4 py-5 sm:px-8 sm:py-6 md:px-12 md:py-7 text-center select-none overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #FFE600 0%, #FFDC00 22%, #FF8C00 55%, #FF2600 82%, #D80F00 100%)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.15)'
          }}
        >
          <div className="relative z-10 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-2 sm:space-y-3">
            
            {/* Top Main Heading: Sayonika PVC Utility with outlined hollow/3D styling */}
            <div className="w-full flex flex-col items-center">
              <h1 
                className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-black leading-none"
                style={{
                  fontFamily: 'serif',
                  letterSpacing: '0.01em',
                  textShadow: '2px 2px 0px #ffffff, -1px -1px 0px #ffffff, 1px -1px 0px #ffffff, -1px 1px 0px #ffffff, 3px 4px 6px rgba(0,0,0,0.3)',
                  WebkitTextStroke: '1.5px #000000',
                  color: '#000000'
                }}
              >
                Sayonika PVC Utility
              </h1>

              {/* Developer Attribution right under title */}
              <div className="w-full flex justify-end pr-3 sm:pr-10 md:pr-16 -mt-0.5 sm:-mt-1">
                <span 
                  className="text-sm sm:text-lg md:text-xl font-black text-black tracking-wide"
                  style={{
                    fontFamily: 'Georgia, serif',
                    textShadow: '0.5px 0.5px 0px #fff'
                  }}
                >
                  Developed by- <span className="font-extrabold">Samit Biswas</span>
                </span>
              </div>
            </div>

            {/* Bengali Contact & Request Prompt */}
            <div className="px-2 sm:px-6 max-w-3xl">
              <p 
                className="text-sm sm:text-base md:text-xl font-bold leading-snug"
                style={{
                  color: '#082567',
                  textShadow: '0.5px 0.5px 0px rgba(255,255,255,0.7)',
                  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif"
                }}
              >
                এই অ্যাপ টি ব্যাবহার করতে কোন সমস্যার সম্মুখিন হলে বা আপনাদের কোন বিশেষ আইডি কার্ডের অপশন এই অ্যাপএ পাবার জন্য নিচে দেওয়া আমার টেলিগ্রাম আইডি তে যোগাযোগ করুন
              </p>
            </div>

            {/* Direct Contact Links: Telegram, Facebook & Green Download in a horizontal row */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 py-0.5 w-full">
              {/* Telegram Link Badge */}
              <a
                href="https://t.me/SamitBiltu"
                target="_blank"
                rel="noopener noreferrer"
                id="welcome-banner-telegram"
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 hover:bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all group cursor-pointer border border-black/10"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#229ED9] text-white flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
                  <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 translate-x-[-0.5px] translate-y-[0.5px]" />
                </div>
                <span>Telegram:</span>
                <span className="text-[#0055aa] group-hover:underline font-extrabold">@SamitBiltu</span>
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 group-hover:text-slate-900" />
              </a>

              {/* Facebook Link Button */}
              <a
                href="https://www.facebook.com/share/18F2Prv45C/"
                target="_blank"
                rel="noopener noreferrer"
                id="welcome-banner-facebook"
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all group cursor-pointer border border-blue-400/30"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white text-[#1877F2] flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform shrink-0">
                  <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
                <span>Facebook:</span>
                <span className="font-extrabold group-hover:underline">
                  Visit Facebook
                </span>
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80 group-hover:text-white shrink-0" />
              </a>
            </div>

            {/* Bengali Local Offline Execution Assurance Note */}
            <div className="px-2 sm:px-6 max-w-3xl">
              <p 
                className="text-xs sm:text-base md:text-lg font-bold leading-snug text-white"
                style={{
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.4)',
                  fontFamily: "'Segoe UI', 'Noto Sans Bengali', sans-serif"
                }}
              >
                এই অ্যাপ টি একবার আপনার ব্রাউসারে ওপেন হবার পর আপনার ডিভাইসে লোকালি রান হয় কোন ডকুমেন্ট আমাদের সার্ভারে আপলোড হয় না ।
              </p>
            </div>

            {/* Development & Free Notice Footer */}
            <div className="pt-0.5">
              <p 
                className="text-[11px] sm:text-xs md:text-sm font-bold text-white tracking-wide"
                style={{
                  textShadow: '1px 1px 2px rgba(0,0,0,0.9)'
                }}
              >
                This tool is under developement phase & Free to use for all
              </p>
            </div>

          </div>
        </div>

        {/* Modal Bottom Action Controls */}
        <div className="bg-slate-900 px-5 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/SamitBiltu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#229ED9]/20 hover:bg-[#229ED9]/30 text-cyan-300 hover:text-cyan-200 border border-[#229ED9]/40 text-xs font-semibold transition"
            >
              <Send className="w-3.5 h-3.5 text-[#229ED9]" />
              <span>Telegram</span>
            </a>

            <a
              href="https://www.facebook.com/share/18F2Prv45C/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/30 text-blue-300 hover:text-blue-200 border border-[#1877F2]/40 text-xs font-semibold transition"
            >
              <Share2 className="w-3.5 h-3.5 text-[#1877F2]" />
              <span>Facebook</span>
            </a>
          </div>

          <button
            id="confirm-close-welcome-btn"
            onClick={handleClose}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-orange-500/20 transition-all transform active:scale-95 cursor-pointer"
          >
            <span>Continue to Tool</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

