import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  Settings2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Sparkles, 
  Layers, 
  ArrowRight,
  Info,
  Sliders,
  RotateCw,
  Eye
} from 'lucide-react';
import { 
  EpsonTrayConfig, 
  CR80_WIDTH_MM, 
  CR80_HEIGHT_MM, 
  PrintSettings 
} from '../types';
import { CardExportPair } from '../utils/exporter';
import { 
  DEFAULT_EPSON_TRAY_CONFIG, 
  buildEpsonTraySheets, 
  generateEpsonTrayPdf, 
  triggerEpsonDirectPrint,
  EpsonTraySheet 
} from '../utils/epsonPrintHelper';

interface EpsonPrintModalProps {
  cardPairs: CardExportPair[];
  printSettings: PrintSettings;
  onClose: () => void;
}

export const EpsonPrintModal: React.FC<EpsonPrintModalProps> = ({
  cardPairs = [],
  printSettings,
  onClose,
}) => {
  const [config, setConfig] = useState<EpsonTrayConfig>({
    ...DEFAULT_EPSON_TRAY_CONFIG,
    bleedMm: 1.0,
    borderless: true,
  });

  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [showDriverGuide, setShowDriverGuide] = useState<boolean>(false);
  const [showCalibration, setShowCalibration] = useState<boolean>(false);

  // Compute tray sheets
  const sheets: EpsonTraySheet[] = buildEpsonTraySheets(cardPairs, config);
  const currentSheet = sheets[activeSheetIndex] || sheets[0];

  const isSingleDoc = cardPairs.length === 1;

  // Handle direct print
  const handlePrintAll = () => {
    triggerEpsonDirectPrint(cardPairs, config);
  };

  const handlePrintCurrentSheet = () => {
    triggerEpsonDirectPrint(cardPairs, config, activeSheetIndex);
  };

  const handleDownloadPdf = () => {
    const pdf = generateEpsonTrayPdf(cardPairs, config, printSettings);
    const fileName = isSingleDoc
      ? `${cardPairs[0]?.cardHolderName || 'Single_Card'}_Epson_${config.printerModel}_PVC_Tray.pdf`
      : `Batch_${cardPairs.length}_Cards_Epson_${config.printerModel}_PVC_Tray.pdf`;
    pdf.save(fileName);
  };

  return (
    <div 
      id="epson-print-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Epson {config.printerModel} Direct PVC Tray Print
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono uppercase">
                  Borderless
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  600 DPI HD
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isSingleDoc 
                  ? '1 Document Loaded: 1 Card in Tray (Slot 1: Front • Slot 2: Back)' 
                  : `Batch Mode: ${cardPairs.length} Documents (2 Cards in Tray per Pass • Fronts on Pass 1, Backs on Pass 2)`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDriverGuide(!showDriverGuide)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
                showDriverGuide 
                  ? 'bg-blue-600 text-white border-blue-500' 
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Driver Settings</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Driver Guide Banner if toggled */}
        {showDriverGuide && (
          <div className="bg-blue-950/40 border-b border-blue-800/40 p-4 text-xs text-blue-200">
            <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-blue-900/30 rounded-lg border border-blue-700/40">
                <span className="font-bold text-blue-100 block mb-0.5">1. Paper / Media Type:</span>
                <span className="text-blue-300">Set to <strong>"PVC ID Card"</strong> or <strong>"CD / DVD Tray"</strong></span>
              </div>
              <div className="p-2.5 bg-blue-900/30 rounded-lg border border-blue-700/40">
                <span className="font-bold text-blue-100 block mb-0.5">2. Paper Source & Size:</span>
                <span className="text-blue-300">Select <strong>"PVC Card Tray"</strong> & enable <strong>"Borderless"</strong></span>
              </div>
              <div className="p-2.5 bg-blue-900/30 rounded-lg border border-blue-700/40">
                <span className="font-bold text-blue-100 block mb-0.5">3. 2-Card Tray Workflow:</span>
                <span className="text-blue-300">Print <strong>Pass 1 (Fronts)</strong>, flip cards in tray slots, then print <strong>Pass 2 (Backs)</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          {/* Left Column: Realistic Tray Mockup & Sheet Navigator (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Sheet Tabs / Navigator */}
            {sheets.length > 1 && (
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl p-2 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Tray Sheets:</span>
                  <span className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded font-mono text-xs font-bold border border-blue-800/60">
                    Sheet {activeSheetIndex + 1} of {sheets.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveSheetIndex((prev) => Math.max(0, prev - 1))}
                    disabled={activeSheetIndex === 0}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                    title="Previous Tray Sheet"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveSheetIndex((prev) => Math.min(sheets.length - 1, prev + 1))}
                    disabled={activeSheetIndex === sheets.length - 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                    title="Next Tray Sheet"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Simulated Epson PVC Card Tray (Tray J / 2-Card Slot) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[340px]">
              {/* Tray Header Meta */}
              <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>{currentSheet?.label || 'Epson PVC Tray J (2 Slots)'}</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400">
                  CR80: 85.60 × 53.98 mm ({config.borderless ? `+${config.bleedMm}mm Bleed` : 'Exact'})
                </span>
              </div>

              {/* Realistic Epson Tray Structure (Dark Matte Tray Frame with 2 Card Recesses) */}
              <div 
                id="epson-tray-visual"
                className="w-full max-w-[480px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-700/80 rounded-xl p-4 sm:p-5 shadow-2xl relative"
              >
                {/* Tray Feed Alignment Notch & Arrow */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                  <span>▲ TRAY INSERTION DIRECTION ▲</span>
                </div>

                {/* 2-Card Slots Container */}
                <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Slot 1 (Left Card) */}
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between text-[10px] text-slate-400 mb-1 px-0.5">
                      <span className="font-bold text-slate-300">SLOT 1 (LEFT)</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        currentSheet?.slot1.side === 'front' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : (currentSheet?.slot1.side === 'back' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-slate-800 text-slate-400')
                      }`}>
                        {currentSheet?.slot1.side === 'front' ? 'FRONT' : (currentSheet?.slot1.side === 'back' ? 'BACK' : 'EMPTY')}
                      </span>
                    </div>

                    <div className="w-full aspect-[85.6/53.98] bg-slate-950 border-2 border-dashed border-slate-700 rounded-lg overflow-hidden flex items-center justify-center p-0.5 relative shadow-inner group">
                      {currentSheet?.slot1.canvas ? (
                        <>
                          <img
                            src={currentSheet.slot1.canvas.toDataURL('image/jpeg', 0.95)}
                            alt={currentSheet.slot1.title}
                            className="w-full h-full object-cover rounded shadow"
                          />
                          {config.borderless && (
                            <div className="absolute inset-0 border border-amber-500/40 pointer-events-none rounded" title="Borderless Bleed Zone" />
                          )}
                        </>
                      ) : (
                        <div className="text-center text-slate-600 text-xs">
                          <CreditCard className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span>Slot 1 Empty</span>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 truncate max-w-full mt-1 font-medium">
                      {currentSheet?.slot1.cardHolderName || currentSheet?.slot1.title || 'Card 1'}
                    </span>
                  </div>

                  {/* Slot 2 (Right Card) */}
                  <div className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between text-[10px] text-slate-400 mb-1 px-0.5">
                      <span className="font-bold text-slate-300">SLOT 2 (RIGHT)</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        currentSheet?.slot2.side === 'front' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : (currentSheet?.slot2.side === 'back' ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-slate-800 text-slate-400')
                      }`}>
                        {currentSheet?.slot2.side === 'front' ? 'FRONT' : (currentSheet?.slot2.side === 'back' ? 'BACK' : 'EMPTY')}
                      </span>
                    </div>

                    <div className="w-full aspect-[85.6/53.98] bg-slate-950 border-2 border-dashed border-slate-700 rounded-lg overflow-hidden flex items-center justify-center p-0.5 relative shadow-inner group">
                      {currentSheet?.slot2.canvas ? (
                        <>
                          <img
                            src={currentSheet.slot2.canvas.toDataURL('image/jpeg', 0.95)}
                            alt={currentSheet.slot2.title}
                            className="w-full h-full object-cover rounded shadow"
                          />
                          {config.borderless && (
                            <div className="absolute inset-0 border border-amber-500/40 pointer-events-none rounded" title="Borderless Bleed Zone" />
                          )}
                        </>
                      ) : (
                        <div className="text-center text-slate-600 text-xs">
                          <CreditCard className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span>Slot 2 Empty</span>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 truncate max-w-full mt-1 font-medium">
                      {currentSheet?.slot2.cardHolderName || currentSheet?.slot2.title || 'Card 2'}
                    </span>
                  </div>
                </div>

                {/* Bottom Tray Registration Mark */}
                <div className="mt-2 text-center text-[9px] font-mono text-slate-600 border-t border-slate-800/80 pt-1">
                  EPSON PVC TRAY J • 85.60 × 53.98 MM CR80 ISO
                </div>
              </div>
            </div>

            {/* Quick Tray Thumbnails for Batch */}
            {sheets.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto p-1 custom-scrollbar">
                {sheets.map((sheet, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSheetIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                      activeSheetIndex === idx
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Tray #{sheet.trayIndex}</span>
                    <span className="text-[10px] opacity-80">
                      ({sheet.passType === 'fronts' ? 'Fronts' : (sheet.passType === 'backs' ? 'Backs' : 'Dual')})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Configuration & Actions (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Printer Model Selection */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Epson Printer Model:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['L8050', 'L18050', 'L805'] as const).map((model) => (
                    <button
                      key={model}
                      onClick={() => setConfig({ ...config, printerModel: model })}
                      className={`py-2 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 ${
                        config.printerModel === model
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {config.printerModel === model && <Check className="w-3.5 h-3.5 text-white" />}
                      <span>Epson {model}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Mode Selection */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Imposition / Tray Mode:</span>
                  <span className="text-[10px] text-blue-400 font-normal">
                    {isSingleDoc ? 'Single PDF Mode' : 'Batch 2-Card Mode'}
                  </span>
                </label>

                <div className="space-y-1.5">
                  <button
                    onClick={() => setConfig({ ...config, printMode: isSingleDoc ? 'single_card' : 'batch_2card_dual_pass' })}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-start justify-between ${
                      config.printMode === 'auto' || (isSingleDoc && config.printMode === 'single_card') || (!isSingleDoc && config.printMode === 'batch_2card_dual_pass')
                        ? 'bg-blue-950/60 border-blue-600 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {isSingleDoc ? 'Single PDF (1 Card Front & Back)' : 'Batch 2-Card Dual-Pass (Recommended)'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isSingleDoc
                          ? 'Slot 1 has Front, Slot 2 has Back in 1 Tray load'
                          : 'Pass 1 prints Fronts of 2 cards; Pass 2 prints Backs after flipping'}
                      </div>
                    </div>
                    {((config.printMode === 'auto') || (isSingleDoc && config.printMode === 'single_card') || (!isSingleDoc && config.printMode === 'batch_2card_dual_pass')) && (
                      <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                  </button>

                  <button
                    onClick={() => setConfig({ ...config, printMode: 'side_by_side' })}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-start justify-between ${
                      config.printMode === 'side_by_side'
                        ? 'bg-blue-950/60 border-blue-600 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-100">Side-by-Side Dual-Card Mode</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Each tray contains 1 Document (Slot 1 = Front, Slot 2 = Back)
                      </div>
                    </div>
                    {config.printMode === 'side_by_side' && (
                      <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Pass Filter for Batch */}
              {!isSingleDoc && config.printMode !== 'side_by_side' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Print Pass Selection:
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      onClick={() => setConfig({ ...config, activePass: 'both' })}
                      className={`py-1.5 px-2 rounded-lg border font-semibold ${
                        config.activePass === 'both'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      All (Front+Back)
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, activePass: 'front_only' })}
                      className={`py-1.5 px-2 rounded-lg border font-semibold ${
                        config.activePass === 'front_only'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Fronts Only
                    </button>
                    <button
                      onClick={() => setConfig({ ...config, activePass: 'back_only' })}
                      className={`py-1.5 px-2 rounded-lg border font-semibold ${
                        config.activePass === 'back_only'
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Backs Only
                    </button>
                  </div>
                </div>
              )}

              {/* Borderless Bleed & Calibration */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    PVC Tray Borderless Bleed:
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{config.bleedMm} mm Full Bleed
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[0, 0.5, 1.0, 1.5].map((bleed) => (
                    <button
                      key={bleed}
                      onClick={() => setConfig({ ...config, bleedMm: bleed, borderless: bleed > 0 })}
                      className={`flex-1 py-1 rounded text-xs font-mono font-semibold transition ${
                        config.bleedMm === bleed
                          ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {bleed === 0 ? '0 (Exact)' : `+${bleed}mm`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowCalibration(!showCalibration)}
                  className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 transition pt-1"
                >
                  <Sliders className="w-3 h-3 text-slate-500" />
                  <span>{showCalibration ? 'Hide Tray Calibration' : 'Fine-Tune Tray Position (Offsets)'}</span>
                </button>

                {showCalibration && (
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-1 text-[11px]">X Offset (mm):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={config.offsetXmm}
                        onChange={(e) => setConfig({ ...config, offsetXmm: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1 text-[11px]">Y Offset (mm):</span>
                      <input
                        type="number"
                        step="0.5"
                        value={config.offsetYmm}
                        onChange={(e) => setConfig({ ...config, offsetYmm: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded p-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {/* Primary Direct Print Button */}
              <button
                id="epson-direct-print-btn"
                onClick={handlePrintAll}
                disabled={cardPairs.length === 0}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition active:scale-98 cursor-pointer border border-blue-400/40"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Direct Print (Epson {config.printerModel} PVC Tray)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Print Current Sheet */}
                <button
                  onClick={handlePrintCurrentSheet}
                  disabled={cardPairs.length === 0}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="Print only the visible tray sheet"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>Print This Tray</span>
                </button>

                {/* Download Calibrated PDF */}
                <button
                  id="epson-download-pdf-btn"
                  onClick={handleDownloadPdf}
                  disabled={cardPairs.length === 0}
                  className="py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition"
                  title="Save 600 DPI Calibrated PDF for Epson Print Layout"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save Tray PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
