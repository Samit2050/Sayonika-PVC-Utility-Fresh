import React from 'react';
import { User, Mail, Send, MapPin, Store, CheckCircle2, X, Printer, Layers, Sparkles } from 'lucide-react';

interface DeveloperModalProps {
  onClose: () => void;
  onOpenWelcomeBanner?: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({ onClose, onOpenWelcomeBanner }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-slate-100 relative my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & App Info */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-orange-500/30">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-100">Sayonika PVC Utility</h3>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
                v2.5 CR80 PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-Precision PDF to PVC Auto-Crop & Batch Studio for Indian Government IDs
            </p>
          </div>
        </div>

        {/* Biswas Xerox Centre Info */}
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-orange-950/40 p-4 rounded-xl border border-amber-500/30 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Store className="w-4 h-4" />
              <span>Biswas Xerox Centre</span>
            </h4>
            <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Bara Andulia, Chapra, Nadia</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Developer</span>
                <span className="font-bold text-slate-200">Samit Biswas</span>
              </div>
            </div>

            <a 
              href="https://t.me/SamitBiltu"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900/90 hover:bg-slate-850 p-3 rounded-lg border border-slate-800 hover:border-[#229ED9]/50 flex items-center gap-2.5 transition group"
            >
              <div className="w-8 h-8 rounded-full bg-[#229ED9]/20 text-[#229ED9] flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Telegram</span>
                <span className="font-bold text-[#229ED9] group-hover:underline">@SamitBiltu</span>
              </div>
            </a>

            <a 
              href="https://www.facebook.com/share/18F2Prv45C/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900/90 hover:bg-slate-850 p-3 rounded-lg border border-slate-800 hover:border-[#1877F2]/50 flex items-center gap-2.5 transition group"
            >
              <div className="w-8 h-8 rounded-full bg-[#1877F2]/20 text-[#1877F2] flex items-center justify-center shrink-0">
                <Send className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Facebook</span>
                <span className="font-bold text-blue-400 group-hover:underline text-[11px] truncate block">Samit Biswas</span>
              </div>
            </a>

            <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Email</span>
                <a href="mailto:biswasxerox40@gmail.com" className="font-bold text-amber-300 hover:underline text-[11px] truncate block">
                  biswasxerox40@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features Overview */}
        <div className="space-y-4 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Key Engineering Features
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Calibrated Government Presets</span>
              </div>
              <p className="text-[11px] text-slate-400">
                1-Click auto-crop for UIDAI e-Aadhaar & mAadhaar, Election Commission Voter ID (e-EPIC), WBPDS Digital Ration Card, and NSDL/UTI PAN Cards.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <div className="font-semibold text-blue-400 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Batch Processing & Auto-Save</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bulk drag-and-drop multiple PDFs, auto-crop cards in parallel, with automatic local save and unified ZIP packaging.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart Edge Snap & Xerox Boost</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Algorithmic border locator, sharpness boost filter, contrast optimizer, and adjustable 0-5mm bleed margins.
              </p>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              <div className="font-semibold text-indigo-400 flex items-center gap-1.5 mb-1">
                <Printer className="w-3.5 h-3.5" />
                <span>Print Imposition Studio</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Epson L805 / Canon PVC tray format, A4 5-in-1 multi-sheet with scissor cutting tick marks, and 4x6 photo paper.
              </p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 text-xs">
          <h4 className="font-bold text-slate-300 mb-2">Windows PC Keyboard Shortcuts:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Ctrl + O</kbd> Open Files</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Ctrl + P</kbd> Print Layout</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Ctrl + S</kbd> Export PDF</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Ctrl + Wheel</kbd> Zoom Canvas</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Alt + Drag</kbd> Pan Canvas</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700">Tab</kbd> Switch Front/Back</div>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          {onOpenWelcomeBanner && (
            <button
              onClick={() => {
                onClose();
                onOpenWelcomeBanner();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Show Welcome Banner Popup</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow ml-auto"
          >
            Close & Start Cropping
          </button>
        </div>
      </div>
    </div>
  );
};
