import React, { useState } from 'react';
import { 
  Printer, 
  Download, 
  Settings2, 
  LayoutGrid, 
  Check, 
  Scissors, 
  FileCheck,
  CreditCard,
  X
} from 'lucide-react';
import { PrintSettings, PaperLayoutType, CR80_WIDTH_MM, CR80_HEIGHT_MM } from '../types';
import { CardExportPair, generatePrintPdf, downloadBatchJpegs } from '../utils/exporter';

interface PrintStudioModalProps {
  cardPairs: CardExportPair[];
  printSettings: PrintSettings;
  onPrintSettingsChange: (settings: PrintSettings) => void;
  onClose?: () => void;
}

export const PrintStudioModal: React.FC<PrintStudioModalProps> = ({
  cardPairs = [],
  printSettings,
  onPrintSettingsChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

  const handleLayoutChange = (layout: PaperLayoutType) => {
    onPrintSettingsChange({
      ...printSettings,
      layout,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const pdf = generatePrintPdf(cardPairs, printSettings);
    pdf.save(`Sayonika_PVC_PrintReady_${printSettings.layout}.pdf`);
  };

  const handleDownloadJpegs = () => {
    downloadBatchJpegs(cardPairs);
  };

  return (
    <div id="print-studio-modal" className="flex-1 flex flex-col p-6 bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-400" />
            <span>Print Imposition Studio</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono">
              {cardPairs.length} Ready Card{cardPairs.length !== 1 ? 's' : ''}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibrated for Epson PVC trays, Canon ID trays, A4 Glossy photo paper, and 4x6 lab sheets.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="trigger-system-print-btn"
            onClick={handlePrint}
            disabled={cardPairs.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-40 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Now (Ctrl + P)</span>
          </button>

          <button
            id="download-print-jpegs-btn"
            onClick={handleDownloadJpegs}
            disabled={cardPairs.length === 0}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-40 transition active:scale-95"
            title="Save all cards as JPEG files (_f and _b) without ZIP"
          >
            <Download className="w-4 h-4" />
            <span>Save All JPEGs (f & b)</span>
          </button>

          <button
            id="download-print-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={cardPairs.length === 0}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-700/20 disabled:opacity-40 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Save Print-Ready PDF</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Controls on left, Sheet Preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Setting Controls */}
        <div className="space-y-4">
          {/* Layout Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
              <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
              <span>Select Paper & Imposition Layout</span>
            </label>

            <div className="space-y-2">
              {/* Epson Photo+ / L8050 / L18050 Dedicated PVC Tray Borderless Option */}
              <button
                onClick={() => handleLayoutChange('epson_l8050_tray')}
                className={`w-full text-left p-3 rounded-lg border text-xs transition flex items-start justify-between ${
                  printSettings.layout === 'epson_l8050_tray'
                    ? 'bg-blue-950/80 border-blue-500 text-white ring-1 ring-blue-500/50'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5 text-blue-300">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    <span>Epson Photo+ / L8050 / L18050 (2-Card PVC Tray)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Official Epson Photo+ Tray layout: 1 Card for Single PDF (Front & Back) • 2 Cards per Tray for Batch
                  </div>
                </div>
                {printSettings.layout === 'epson_l8050_tray' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>

              <button
                onClick={() => handleLayoutChange('pvc_tray')}
                className={`w-full text-left p-3 rounded-lg border text-xs transition flex items-start justify-between ${
                  printSettings.layout === 'pvc_tray'
                    ? 'bg-blue-950/60 border-blue-600 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Generic PVC Tray (Side-by-Side)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Epson L805 / L850 / Canon PVC Tray format (85.60 × 53.98 mm Front & Back aligned)
                  </div>
                </div>
                {printSettings.layout === 'pvc_tray' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>

              <button
                onClick={() => handleLayoutChange('a4_5_cards')}
                className={`w-full text-left p-3 rounded-lg border text-xs transition flex items-start justify-between ${
                  printSettings.layout === 'a4_5_cards'
                    ? 'bg-blue-950/60 border-blue-600 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>A4 Sheet (5 Cards / 10 Sides Multi-Card)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Standard A4 Glossy/Photo Paper with customer titles and scissor guidelines
                  </div>
                </div>
                {printSettings.layout === 'a4_5_cards' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>

              <button
                onClick={() => handleLayoutChange('photo_4x6_dual')}
                className={`w-full text-left p-3 rounded-lg border text-xs transition flex items-start justify-between ${
                  printSettings.layout === 'photo_4x6_dual'
                    ? 'bg-blue-950/60 border-blue-600 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    <span>4×6 Inch Photo Paper (Dual Cards)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    100×150 mm standard mini photo lab paper used in Xerox centers
                  </div>
                </div>
                {printSettings.layout === 'photo_4x6_dual' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>

              <button
                onClick={() => handleLayoutChange('a4_single')}
                className={`w-full text-left p-3 rounded-lg border text-xs transition flex items-start justify-between ${
                  printSettings.layout === 'a4_single'
                    ? 'bg-blue-950/60 border-blue-600 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold">A4 Single Card (Centered)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    1 Set per page centered for single customer delivery
                  </div>
                </div>
                {printSettings.layout === 'a4_single' && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Shop Header & Options */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Shop Branding & Watermark</span>
            </label>

            <div>
              <span className="text-slate-300 block mb-1">Header Text / Shop Name:</span>
              <input
                type="text"
                value={printSettings.shopHeader}
                onChange={(e) => onPrintSettingsChange({ ...printSettings, shopHeader: e.target.value })}
                placeholder="e.g. Biswas Xerox & Cyber Point"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <span className="text-slate-300 block mb-1">Contact Phone / Email:</span>
              <input
                type="text"
                value={printSettings.contactNumber}
                onChange={(e) => onPrintSettingsChange({ ...printSettings, contactNumber: e.target.value })}
                placeholder="biswasxerox40@gmail.com"
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Spacing Between Cards:</span>
              <div className="flex items-center gap-1">
                {[0, 2, 4, 6].map((gap) => (
                  <button
                    key={gap}
                    onClick={() => onPrintSettingsChange({ ...printSettings, cardGapMm: gap })}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      printSettings.cardGapMm === gap
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {gap}mm
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Printable Sheet Preview (Matches real dimensions) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-4 px-2">
            <span className="font-semibold text-slate-200">Scale Preview (1:1 Print Alignment)</span>
            <span className="font-mono text-[11px] text-blue-400">CR80 ISO Card: 85.60 mm × 53.98 mm</span>
          </div>

          {cardPairs.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-2 text-slate-700" />
              <p className="text-sm">No cards cropped yet</p>
              <p className="text-xs text-slate-600">Crop a card in the editor or run batch mode first.</p>
            </div>
          ) : (
            /* Visual Simulated Paper Sheet */
            <div
              id="printable-paper-sheet"
              className={`bg-white text-slate-900 rounded-lg shadow-2xl p-6 border-2 border-dashed border-slate-300 overflow-y-auto max-h-[580px] custom-scrollbar ${
                printSettings.layout === 'a4_5_cards' || printSettings.layout === 'a4_single'
                  ? 'w-[420px] min-h-[594px]'
                  : 'w-[460px] min-h-[300px]'
              }`}
            >
              {/* Sheet Header */}
              {printSettings.shopHeader && (
                <div className="text-center pb-3 mb-4 border-b border-slate-200">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    {printSettings.shopHeader}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Sayonika PVC Utility • {printSettings.contactNumber || 'biswasxerox40@gmail.com'}
                  </p>
                </div>
              )}

              {/* Cards Grid */}
              <div className="space-y-4">
                {cardPairs.map((pair, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-full flex items-center justify-between text-[9px] text-slate-400 mb-1 px-1">
                      <span>Card #{idx + 1}: {pair.name}</span>
                      <span>85.6 × 54 mm</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded">
                      {/* Front */}
                      <div className="relative group">
                        <img
                          src={pair.frontCanvas.toDataURL()}
                          alt="Front"
                          className="w-36 aspect-[85.6/53.98] object-cover rounded shadow-sm border border-slate-300"
                        />
                        <span className="absolute bottom-0.5 left-1 text-[8px] bg-emerald-700 text-white px-1 rounded">
                          FRONT
                        </span>
                      </div>

                      {/* Scissor cut line if back exists */}
                      {pair.backCanvas && (
                        <div className="h-20 border-r-2 border-dashed border-slate-400 relative">
                          <Scissors className="w-3 h-3 text-slate-500 absolute -top-1 -left-1.5 rotate-90" />
                        </div>
                      )}

                      {/* Back */}
                      {pair.backCanvas && (
                        <div className="relative group">
                          <img
                            src={pair.backCanvas.toDataURL()}
                            alt="Back"
                            className="w-36 aspect-[85.6/53.98] object-cover rounded shadow-sm border border-slate-300"
                          />
                          <span className="absolute bottom-0.5 left-1 text-[8px] bg-blue-700 text-white px-1 rounded">
                            BACK
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
