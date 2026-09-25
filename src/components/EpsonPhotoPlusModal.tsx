import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Download, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Sparkles, 
  Sliders, 
  RotateCw, 
  ArrowLeftRight, 
  FileText, 
  Info, 
  Eye, 
  RefreshCw, 
  Maximize2, 
  Sun, 
  Contrast, 
  Palette, 
  Zap,
  FolderArchive,
  Layers
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
  DEFAULT_EPSON_PHOTO_PLUS_ADJUSTMENTS,
  EpsonPhotoPlusAdjustments,
  buildEpsonTraySheets, 
  generateEpsonTrayPdf, 
  triggerEpsonDirectPrint,
  applyEpsonPhotoPlusFilter,
  exportEpsonPhotoPlusZip,
  EpsonTraySheet 
} from '../utils/epsonPrintHelper';

interface EpsonPhotoPlusModalProps {
  cardPairs: CardExportPair[];
  printSettings: PrintSettings;
  onClose: () => void;
}

export type EpsonMediaTemplate = 'pvc_tray' | 'photo_4x6' | 'a4_paper';

export const EpsonPhotoPlusModal: React.FC<EpsonPhotoPlusModalProps> = ({
  cardPairs = [],
  printSettings,
  onClose,
}) => {
  // Configuration State
  const [config, setConfig] = useState<EpsonTrayConfig>({
    ...DEFAULT_EPSON_TRAY_CONFIG,
    bleedMm: 1.0,
    borderless: true,
  });

  // Epson Photo+ Image Adjustments & Color Controls
  const [adjustments, setAdjustments] = useState<EpsonPhotoPlusAdjustments>({
    ...DEFAULT_EPSON_PHOTO_PLUS_ADJUSTMENTS,
  });

  const [activeMediaTemplate, setActiveMediaTemplate] = useState<EpsonMediaTemplate>('pvc_tray');
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<'slot1' | 'slot2' | 'both'>('both');
  const [showDriverGuide, setShowDriverGuide] = useState<boolean>(false);
  const [showFineTune, setShowFineTune] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  // Compute tray sheets
  const rawSheets: EpsonTraySheet[] = useMemo(() => {
    return buildEpsonTraySheets(cardPairs, config);
  }, [cardPairs, config]);

  const currentSheet = rawSheets[activeSheetIndex] || rawSheets[0];
  const isSingleDoc = cardPairs.length === 1;

  // Process enhanced preview canvases on the fly
  const enhancedSlot1Preview = useMemo(() => {
    if (!currentSheet?.slot1?.canvas) return null;
    const filtered = applyEpsonPhotoPlusFilter(currentSheet.slot1.canvas, {
      photoEnhance: adjustments.photoEnhance,
      brightness: adjustments.brightness,
      contrast: adjustments.contrast,
      saturation: adjustments.saturation,
      sharpness: adjustments.sharpness,
      colorMode: adjustments.colorMode,
      rotation: adjustments.rotationSlot1,
    });
    return filtered.toDataURL('image/jpeg', 0.96);
  }, [currentSheet?.slot1?.canvas, adjustments]);

  const enhancedSlot2Preview = useMemo(() => {
    if (!currentSheet?.slot2?.canvas) return null;
    const filtered = applyEpsonPhotoPlusFilter(currentSheet.slot2.canvas, {
      photoEnhance: adjustments.photoEnhance,
      brightness: adjustments.brightness,
      contrast: adjustments.contrast,
      saturation: adjustments.saturation,
      sharpness: adjustments.sharpness,
      colorMode: adjustments.colorMode,
      rotation: adjustments.rotationSlot2,
    });
    return filtered.toDataURL('image/jpeg', 0.96);
  }, [currentSheet?.slot2?.canvas, adjustments]);

  // Handle Rotations
  const handleRotateSlot = (slot: 'slot1' | 'slot2') => {
    if (slot === 'slot1') {
      setAdjustments((prev) => ({
        ...prev,
        rotationSlot1: (prev.rotationSlot1 + 90) % 360,
      }));
    } else {
      setAdjustments((prev) => ({
        ...prev,
        rotationSlot2: (prev.rotationSlot2 + 90) % 360,
      }));
    }
  };

  const handleRotateBoth = () => {
    setAdjustments((prev) => ({
      ...prev,
      rotationSlot1: (prev.rotationSlot1 + 90) % 360,
      rotationSlot2: (prev.rotationSlot2 + 90) % 360,
    }));
  };

  // Swap Slot 1 & Slot 2 Rotations / Alignments
  const handleSwapSlots = () => {
    setAdjustments((prev) => ({
      ...prev,
      rotationSlot1: prev.rotationSlot2,
      rotationSlot2: prev.rotationSlot1,
    }));
  };

  // Direct Print via Epson Photo+ Calibrated Engine
  const handleDirectPrint = () => {
    // Generate enhanced items
    const enhancedPairs: CardExportPair[] = cardPairs.map((pair) => ({
      name: pair.name,
      cardHolderName: pair.cardHolderName,
      frontCanvas: applyEpsonPhotoPlusFilter(pair.frontCanvas, {
        photoEnhance: adjustments.photoEnhance,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        sharpness: adjustments.sharpness,
        colorMode: adjustments.colorMode,
        rotation: adjustments.rotationSlot1,
      }),
      backCanvas: pair.backCanvas
        ? applyEpsonPhotoPlusFilter(pair.backCanvas, {
            photoEnhance: adjustments.photoEnhance,
            brightness: adjustments.brightness,
            contrast: adjustments.contrast,
            saturation: adjustments.saturation,
            sharpness: adjustments.sharpness,
            colorMode: adjustments.colorMode,
            rotation: adjustments.rotationSlot2,
          })
        : undefined,
    }));

    triggerEpsonDirectPrint(enhancedPairs, config);
  };

  // Export Desktop Epson Photo+ Drag & Drop Package
  const handleExportPhotoPlusZip = async () => {
    setIsExportingZip(true);
    try {
      await exportEpsonPhotoPlusZip(cardPairs, adjustments);
    } catch (err) {
      console.error('Failed to export Epson Photo+ ZIP:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Save Tray PDF
  const handleDownloadPdf = () => {
    const enhancedPairs: CardExportPair[] = cardPairs.map((pair) => ({
      name: pair.name,
      cardHolderName: pair.cardHolderName,
      frontCanvas: applyEpsonPhotoPlusFilter(pair.frontCanvas, {
        photoEnhance: adjustments.photoEnhance,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        sharpness: adjustments.sharpness,
        colorMode: adjustments.colorMode,
        rotation: adjustments.rotationSlot1,
      }),
      backCanvas: pair.backCanvas
        ? applyEpsonPhotoPlusFilter(pair.backCanvas, {
            photoEnhance: adjustments.photoEnhance,
            brightness: adjustments.brightness,
            contrast: adjustments.contrast,
            saturation: adjustments.saturation,
            sharpness: adjustments.sharpness,
            colorMode: adjustments.colorMode,
            rotation: adjustments.rotationSlot2,
          })
        : undefined,
    }));

    const pdf = generateEpsonTrayPdf(enhancedPairs, config, printSettings);
    const fileName = isSingleDoc
      ? `${cardPairs[0]?.cardHolderName || 'Single_Card'}_EpsonPhotoPlus_${config.printerModel}.pdf`
      : `Batch_${cardPairs.length}_Cards_EpsonPhotoPlus_${config.printerModel}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div 
      id="epson-photoplus-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Epson Photo+ Signature Top Ribbon */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/30">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-blue-400 uppercase font-mono">
                  EPSON Photo+
                </span>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  ID Card Print Assistant
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  L8050 / L18050
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span>Direct PVC Tray (Tray J) Imposition</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-semibold">600 DPI Ultra HD</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-300 font-mono">CR80 (85.60 × 53.98 mm)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Driver Guidance Button */}
            <button
              id="epson-driver-guide-toggle"
              onClick={() => setShowDriverGuide(!showDriverGuide)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border ${
                showDriverGuide 
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30' 
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Epson Driver Setup</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Driver Guide Banner */}
        {showDriverGuide && (
          <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border-b border-blue-800/40 p-3.5 text-xs text-blue-200">
            <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-950/50 rounded-xl border border-blue-700/50">
                <span className="font-bold text-blue-100 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Media / Paper Type:
                </span>
                <span className="text-blue-200">
                  Select <strong>"PVC ID Card"</strong> or <strong>"CD / DVD Tray"</strong> in Epson Printer Preferences.
                </span>
              </div>
              <div className="p-3 bg-blue-950/50 rounded-xl border border-blue-700/50">
                <span className="font-bold text-blue-100 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  Paper Source & Borderless:
                </span>
                <span className="text-blue-200">
                  Select <strong>"PVC Card Tray"</strong> and check <strong>"Borderless (Amount: Standard)"</strong>.
                </span>
              </div>
              <div className="p-3 bg-blue-950/50 rounded-xl border border-blue-700/50">
                <span className="font-bold text-blue-100 flex items-center gap-1.5 mb-1">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                  2-Card Batch Pass Flip:
                </span>
                <span className="text-blue-200">
                  Print <strong>Pass 1 (Fronts)</strong>, then physically flip the cards in the tray slots, and print <strong>Pass 2 (Backs)</strong>.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Photo+ Top Toolbar Ribbon */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Template Quick Selection */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-1">Template:</span>
            <button
              onClick={() => setActiveMediaTemplate('pvc_tray')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                activeMediaTemplate === 'pvc_tray'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>PVC Card Tray (2-Card)</span>
            </button>
            <button
              onClick={() => setActiveMediaTemplate('photo_4x6')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                activeMediaTemplate === 'photo_4x6'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>4×6 Photo Paper (2-Up)</span>
            </button>
            <button
              onClick={() => setActiveMediaTemplate('a4_paper')}
              className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                activeMediaTemplate === 'a4_paper'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>A4 Photo Paper</span>
            </button>
          </div>

          {/* Quick Rotation & Slot Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleRotateSlot('slot1')}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-medium flex items-center gap-1 transition"
              title="Rotate Slot 1 (Left Card) by 90°"
            >
              <RotateCw className="w-3 h-3 text-blue-400" />
              <span>Rotate Slot 1 ({adjustments.rotationSlot1}°)</span>
            </button>

            <button
              onClick={() => handleRotateSlot('slot2')}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-medium flex items-center gap-1 transition"
              title="Rotate Slot 2 (Right Card) by 90°"
            >
              <RotateCw className="w-3 h-3 text-blue-400" />
              <span>Rotate Slot 2 ({adjustments.rotationSlot2}°)</span>
            </button>

            <button
              onClick={handleRotateBoth}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-medium flex items-center gap-1 transition"
              title="Rotate Both Cards"
            >
              <RotateCw className="w-3 h-3 text-emerald-400" />
              <span>Rotate All</span>
            </button>

            <button
              onClick={handleSwapSlots}
              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-medium flex items-center gap-1 transition"
              title="Swap Slot Orientations"
            >
              <ArrowLeftRight className="w-3 h-3 text-amber-400" />
              <span>Swap</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-5 overflow-y-auto custom-scrollbar">
          {/* Left Column: Realistic Epson Photo+ Tray Canvas & Tray Navigator (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Sheet Tabs / Navigator if multiple cards */}
            {rawSheets.length > 1 && (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2 px-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Active Tray:</span>
                  <span className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded font-mono text-xs font-bold border border-blue-800">
                    Tray Sheet {activeSheetIndex + 1} of {rawSheets.length}
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
                    onClick={() => setActiveSheetIndex((prev) => Math.min(rawSheets.length - 1, prev + 1))}
                    disabled={activeSheetIndex === rawSheets.length - 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                    title="Next Tray Sheet"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* True-to-Life Interactive Epson PVC Tray Display (Tray J) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden shadow-inner min-h-[360px]">
              {/* Tray Header & Dimensions Banner */}
              <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>{currentSheet?.label || 'Epson Photo+ PVC Tray J (2 Slots)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Bleed: +{config.bleedMm} mm Borderless
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    600 DPI
                  </span>
                </div>
              </div>

              {/* Realistic Epson Tray Mold */}
              <div 
                id="epson-photoplus-tray-frame"
                className="w-full max-w-[500px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-slate-700/80 rounded-xl p-4 sm:p-5 shadow-2xl relative"
              >
                {/* Feeder Direction Notch */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                  <span>▲ TRAY INSERTION ARROW (FEED FIRST) ▲</span>
                </div>

                {/* 2-Card Slot Frame */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Slot 1: Left Card */}
                  <div 
                    onClick={() => setSelectedSlot('slot1')}
                    className={`flex flex-col items-center p-1 rounded-xl transition cursor-pointer ${
                      selectedSlot === 'slot1' ? 'ring-2 ring-blue-500 bg-blue-950/20' : ''
                    }`}
                  >
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
                      {enhancedSlot1Preview ? (
                        <>
                          <img
                            src={enhancedSlot1Preview}
                            alt={currentSheet?.slot1.title}
                            className="w-full h-full object-cover rounded shadow"
                          />
                          {config.borderless && (
                            <div className="absolute inset-0 border border-amber-500/50 pointer-events-none rounded" title="Borderless Bleed Zone (+1mm)" />
                          )}
                          {adjustments.photoEnhance && (
                            <span className="absolute top-1 right-1 px-1 py-0.2 bg-blue-600/90 text-[8px] font-black text-white rounded font-mono shadow">
                              ENHANCED
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-slate-600 text-xs">
                          <CreditCard className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span>Slot 1 Empty</span>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-300 truncate max-w-full mt-1.5 font-medium">
                      {currentSheet?.slot1.cardHolderName || currentSheet?.slot1.title || 'Card 1'}
                    </span>
                  </div>

                  {/* Slot 2: Right Card */}
                  <div 
                    onClick={() => setSelectedSlot('slot2')}
                    className={`flex flex-col items-center p-1 rounded-xl transition cursor-pointer ${
                      selectedSlot === 'slot2' ? 'ring-2 ring-blue-500 bg-blue-950/20' : ''
                    }`}
                  >
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
                      {enhancedSlot2Preview ? (
                        <>
                          <img
                            src={enhancedSlot2Preview}
                            alt={currentSheet?.slot2.title}
                            className="w-full h-full object-cover rounded shadow"
                          />
                          {config.borderless && (
                            <div className="absolute inset-0 border border-amber-500/50 pointer-events-none rounded" title="Borderless Bleed Zone (+1mm)" />
                          )}
                          {adjustments.photoEnhance && (
                            <span className="absolute top-1 right-1 px-1 py-0.2 bg-blue-600/90 text-[8px] font-black text-white rounded font-mono shadow">
                              ENHANCED
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-slate-600 text-xs">
                          <CreditCard className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <span>Slot 2 Empty</span>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-300 truncate max-w-full mt-1.5 font-medium">
                      {currentSheet?.slot2.cardHolderName || currentSheet?.slot2.title || 'Card 2'}
                    </span>
                  </div>
                </div>

                {/* Bottom Tray Registration Mark */}
                <div className="mt-3 text-center text-[9px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5 flex items-center justify-between px-1">
                  <span>EPSON PVC TRAY J</span>
                  <span>ISO CR80 85.60 × 53.98 MM</span>
                  <span>FEED DIRECTION ▲</span>
                </div>
              </div>
            </div>

            {/* Quick Tray Thumbnails Carousel */}
            {rawSheets.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto p-1 custom-scrollbar">
                {rawSheets.map((sheet, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSheetIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
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

          {/* Right Column: Epson Photo+ Inspector & Adjustments Panel (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div className="space-y-3 overflow-y-auto pr-1">
              {/* Printer Model & Paper Type */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Epson Printer Model:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['L8050', 'L18050', 'L805'] as const).map((model) => (
                    <button
                      key={model}
                      onClick={() => setConfig({ ...config, printerModel: model })}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1 ${
                        config.printerModel === model
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {config.printerModel === model && <Check className="w-3 h-3 text-white" />}
                      <span>Epson {model}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Epson Photo+ Image Enhancements & Color Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Photo+ Image Adjustments</span>
                  </label>
                  <button
                    onClick={() => setAdjustments({ ...DEFAULT_EPSON_PHOTO_PLUS_ADJUSTMENTS })}
                    className="text-[10px] text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Auto PhotoEnhance Toggle */}
                <button
                  onClick={() => setAdjustments((prev) => ({ ...prev, photoEnhance: !prev.photoEnhance }))}
                  className={`w-full p-2 rounded-lg border text-xs font-bold flex items-center justify-between transition ${
                    adjustments.photoEnhance
                      ? 'bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border-blue-500 text-blue-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${adjustments.photoEnhance ? 'text-amber-400' : 'text-slate-500'}`} />
                    <div className="text-left">
                      <div>Auto PhotoEnhance</div>
                      <div className="text-[10px] font-normal text-slate-400">Crisp ID text, sharp portrait, vivid colors</div>
                    </div>
                  </div>
                  {adjustments.photoEnhance && <Check className="w-4 h-4 text-blue-400" />}
                </button>

                {/* Color Mode Selector */}
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    onClick={() => setAdjustments({ ...adjustments, colorMode: 'epson_vivid' })}
                    className={`py-1.5 px-2 rounded-md font-semibold border text-[11px] ${
                      adjustments.colorMode === 'epson_vivid'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Epson Vivid
                  </button>
                  <button
                    onClick={() => setAdjustments({ ...adjustments, colorMode: 'standard' })}
                    className={`py-1.5 px-2 rounded-md font-semibold border text-[11px] ${
                      adjustments.colorMode === 'standard'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setAdjustments({ ...adjustments, colorMode: 'grayscale' })}
                    className={`py-1.5 px-2 rounded-md font-semibold border text-[11px] ${
                      adjustments.colorMode === 'grayscale'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Monochrome
                  </button>
                </div>

                {/* Sliders: Brightness, Contrast, Sharpness */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Sun className="w-3 h-3" /> Brightness
                      </span>
                      <span className="font-mono text-slate-200">{adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={adjustments.brightness}
                      onChange={(e) => setAdjustments({ ...adjustments, brightness: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Contrast className="w-3 h-3" /> Contrast
                      </span>
                      <span className="font-mono text-slate-200">{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={adjustments.contrast}
                      onChange={(e) => setAdjustments({ ...adjustments, contrast: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Sharpness (Text & QR)
                      </span>
                      <span className="font-mono text-slate-200">{adjustments.sharpness}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={adjustments.sharpness}
                      onChange={(e) => setAdjustments({ ...adjustments, sharpness: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Borderless Expansion & Offsets */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    PVC Tray Borderless Bleed:
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{config.bleedMm} mm Bleed
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[0, 0.5, 1.0, 1.5].map((bleed) => (
                    <button
                      key={bleed}
                      onClick={() => setConfig({ ...config, bleedMm: bleed, borderless: bleed > 0 })}
                      className={`flex-1 py-1 rounded text-xs font-mono font-bold transition ${
                        config.bleedMm === bleed
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {bleed === 0 ? 'Exact (0)' : `+${bleed}mm`}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowFineTune(!showFineTune)}
                  className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 transition pt-1"
                >
                  <Sliders className="w-3 h-3 text-slate-500" />
                  <span>{showFineTune ? 'Hide Tray Position Calibration' : 'Fine-Tune Tray Millimeter Offsets'}</span>
                </button>

                {showFineTune && (
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

            {/* Bottom Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {/* Primary Direct Print Button */}
              <button
                id="epson-photoplus-direct-print-btn"
                onClick={handleDirectPrint}
                disabled={cardPairs.length === 0}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition active:scale-98 cursor-pointer border border-blue-400/40"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Direct Print (Epson Photo+ Format)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* Export for Desktop Epson Photo+ */}
                <button
                  id="epson-photoplus-export-zip-btn"
                  onClick={handleExportPhotoPlusZip}
                  disabled={cardPairs.length === 0 || isExportingZip}
                  className="py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition"
                  title="Download CR80 High-Res JPEGs ready to drag & drop into Epson Photo+ PC app"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isExportingZip ? 'Packaging...' : 'Export for Photo+ App'}</span>
                </button>

                {/* Save Tray PDF */}
                <button
                  id="epson-photoplus-save-pdf-btn"
                  onClick={handleDownloadPdf}
                  disabled={cardPairs.length === 0}
                  className="py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition"
                  title="Save 600 DPI Calibrated PDF"
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
