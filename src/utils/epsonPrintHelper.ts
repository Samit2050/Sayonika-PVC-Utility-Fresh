import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CardExportPair } from './exporter';
import { 
  CR80_WIDTH_MM, 
  CR80_HEIGHT_MM, 
  EpsonTrayConfig,
  PrintSettings 
} from '../types';

export interface EpsonPhotoPlusAdjustments {
  photoEnhance: boolean; // Auto PhotoEnhance (Auto Levels + Vivid Boost)
  brightness: number;    // -50 to 50
  contrast: number;      // -50 to 50
  saturation: number;    // 0 to 200 (100 = normal)
  sharpness: number;     // 0 to 100 (unsharp mask for ultra-crisp text/QR code)
  colorMode: 'epson_vivid' | 'standard' | 'grayscale' | 'high_contrast_bw';
  rotationSlot1: number; // 0, 90, 180, 270
  rotationSlot2: number;
}

export const DEFAULT_EPSON_PHOTO_PLUS_ADJUSTMENTS: EpsonPhotoPlusAdjustments = {
  photoEnhance: true,
  brightness: 0,
  contrast: 6,
  saturation: 108,
  sharpness: 25,
  colorMode: 'epson_vivid',
  rotationSlot1: 0,
  rotationSlot2: 0,
};

export const DEFAULT_EPSON_TRAY_CONFIG: EpsonTrayConfig = {
  printerModel: 'L8050',
  printMode: 'auto',
  activePass: 'both',
  borderless: true,
  bleedMm: 1.0,         // 1mm bleed on all 4 sides for true borderless PVC printing
  cardGapMm: 12.0,      // Standard 12mm bridge between Slot 1 and Slot 2 on Epson J Tray
  offsetXmm: 0.0,
  offsetYmm: 0.0,
  dpi: 600,
  reverseBackSlots: false,
};

export interface EpsonTraySheet {
  trayIndex: number;
  passType: 'fronts' | 'backs' | 'dual_side' | 'single';
  label: string;
  slot1: {
    title: string;
    side: 'front' | 'back' | 'none';
    canvas?: HTMLCanvasElement;
    cardHolderName?: string;
  };
  slot2: {
    title: string;
    side: 'front' | 'back' | 'none';
    canvas?: HTMLCanvasElement;
    cardHolderName?: string;
  };
}

/**
 * Applies Epson Photo+ specific image enhancements to a canvas:
 * - Epson Vivid color saturation curve
 * - Auto PhotoEnhance contrast and tone balancing
 * - Unsharp Mask for laser-sharp text & Aadhaar QR codes
 * - Rotations (90, 180, 270)
 */
export function applyEpsonPhotoPlusFilter(
  sourceCanvas: HTMLCanvasElement,
  options: {
    photoEnhance?: boolean;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    sharpness?: number;
    colorMode?: 'epson_vivid' | 'standard' | 'grayscale' | 'high_contrast_bw';
    rotation?: number;
  } = {}
): HTMLCanvasElement {
  const {
    photoEnhance = true,
    brightness = 0,
    contrast = 0,
    saturation = 100,
    sharpness = 0,
    colorMode = 'epson_vivid',
    rotation = 0,
  } = options;

  const rot = ((rotation % 360) + 360) % 360;
  const isRotated90or270 = rot === 90 || rot === 270;

  const width = isRotated90or270 ? sourceCanvas.height : sourceCanvas.width;
  const height = isRotated90or270 ? sourceCanvas.width : sourceCanvas.height;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.save();
  // Handle rotation
  if (rot === 90) {
    ctx.translate(width, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (rot === 180) {
    ctx.translate(width, height);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (rot === 270) {
    ctx.translate(0, height);
    ctx.rotate((270 * Math.PI) / 180);
  }

  // Draw source image
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();

  // Pixel-level PhotoEnhance and filter processing
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Calculate effective brightness & contrast
    let effBrightness = brightness;
    let effContrast = contrast;
    let effSaturation = saturation;

    if (photoEnhance) {
      effBrightness += 2; // subtle tone lift
      effContrast += 8;   // punchy contrast
      if (colorMode === 'epson_vivid') {
        effSaturation = Math.max(effSaturation, 112);
      }
    }

    if (colorMode === 'epson_vivid') {
      effSaturation *= 1.08;
    }

    const contrastFactor = (259 * (effContrast + 255)) / (255 * (259 - effContrast));
    const satFactor = effSaturation / 100;

    const isMonochrome = colorMode === 'grayscale' || colorMode === 'high_contrast_bw';

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1. Grayscale / Black & White
      if (isMonochrome) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        if (colorMode === 'high_contrast_bw') {
          const thresholded = gray > 128 ? 255 : 0;
          data[i] = thresholded;
          data[i + 1] = thresholded;
          data[i + 2] = thresholded;
          continue;
        } else {
          r = gray;
          g = gray;
          b = gray;
        }
      }

      // 2. Brightness & Contrast
      r = contrastFactor * (r + effBrightness - 128) + 128;
      g = contrastFactor * (g + effBrightness - 128) + 128;
      b = contrastFactor * (b + effBrightness - 128) + 128;

      // 3. Saturation (Epson Vivid)
      if (!isMonochrome && satFactor !== 1) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + satFactor * (r - gray);
        g = gray + satFactor * (g - gray);
        b = gray + satFactor * (b - gray);
      }

      // Clamp 0-255
      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    // 4. Sharpness Filter (3x3 Unsharp convolution)
    if (sharpness > 0) {
      const sharpAmount = Math.min(1.2, (sharpness / 100) * 0.8);
      const originalData = new Uint8ClampedArray(data);
      const rowBytes = width * 4;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * rowBytes + x * 4;

          for (let c = 0; c < 3; c++) {
            const center = originalData[idx + c];
            const top = originalData[idx - rowBytes + c];
            const bottom = originalData[idx + rowBytes + c];
            const left = originalData[idx - 4 + c];
            const right = originalData[idx + 4 + c];

            const laplacian = 4 * center - (top + bottom + left + right);
            const sharpened = center + laplacian * sharpAmount;
            data[idx + c] = Math.min(255, Math.max(0, sharpened));
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.warn('Epson Photo+ filter application warning:', e);
  }

  return outputCanvas;
}

/**
 * Exports high-resolution 600 DPI CR80 image package formatted for direct drag-and-drop
 * into official Desktop Epson Photo+ application
 */
export async function exportEpsonPhotoPlusZip(
  items: CardExportPair[],
  adjustments: EpsonPhotoPlusAdjustments = DEFAULT_EPSON_PHOTO_PLUS_ADJUSTMENTS
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('Epson_PhotoPlus_ID_Cards');

  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return;

  // CR80 standard at 600 DPI = 2022 × 1276 pixels
  const TARGET_W = 2022;
  const TARGET_H = 1276;

  safeItems.forEach((item, idx) => {
    const baseName = (item.cardHolderName || item.name || `Card_${idx + 1}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    // Process Front
    if (item.frontCanvas) {
      const enhancedFront = applyEpsonPhotoPlusFilter(item.frontCanvas, {
        photoEnhance: adjustments.photoEnhance,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        sharpness: adjustments.sharpness,
        colorMode: adjustments.colorMode,
        rotation: adjustments.rotationSlot1,
      });

      const highResCanvas = document.createElement('canvas');
      highResCanvas.width = TARGET_W;
      highResCanvas.height = TARGET_H;
      const ctx = highResCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(enhancedFront, 0, 0, TARGET_W, TARGET_H);
        const dataUrl = highResCanvas.toDataURL('image/jpeg', 0.98);
        const base64Data = dataUrl.split(',')[1];
        folder?.file(`${baseName}_Front.jpg`, base64Data, { base64: true });
      }
    }

    // Process Back
    if (item.backCanvas) {
      const enhancedBack = applyEpsonPhotoPlusFilter(item.backCanvas, {
        photoEnhance: adjustments.photoEnhance,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        sharpness: adjustments.sharpness,
        colorMode: adjustments.colorMode,
        rotation: adjustments.rotationSlot2,
      });

      const highResCanvas = document.createElement('canvas');
      highResCanvas.width = TARGET_W;
      highResCanvas.height = TARGET_H;
      const ctx = highResCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(enhancedBack, 0, 0, TARGET_W, TARGET_H);
        const dataUrl = highResCanvas.toDataURL('image/jpeg', 0.98);
        const base64Data = dataUrl.split(',')[1];
        folder?.file(`${baseName}_Back.jpg`, base64Data, { base64: true });
      }
    }
  });

  // Include Epson Photo+ Instruction Guide
  const guideText = `
========================================================================
   EPSON PHOTO+ (PVC ID CARD PRINTING GUIDE)
   Compatible with Epson L8050 / L18050 / L805 / L850 / L8180
========================================================================

HOW TO PRINT USING OFFICIAL EPSON PHOTO+ APP:
1. Open Epson Photo+ on your computer.
2. Select "ID Card" / "PVC Card" layout template:
   - Paper Size: "PVC Card Tray" or "CD/DVD Tray"
   - Paper Type: "PVC ID Card" or "Ultra Glossy / Premium Glossy"
3. Drag & drop the Front images into Slot 1 and Back images into Slot 2.
4. Set Borderless to "On" (Amount of Extension: Standard).
5. Quality: "High Quality" (600 DPI Ultra HD).
6. Insert the PVC Tray into the printer aligned with the arrow marks.
7. Click Print!

BATCH DUAL-PASS PRINTING INSTRUCTIONS:
- Pass 1: Print all Front cards in the tray slots.
- Flip: Turn the PVC cards over in the tray slots without changing slot order.
- Pass 2: Print all Back cards.

All images in this package are pre-calibrated to exact CR80 ISO specifications (85.60 × 53.98 mm) at 600 DPI.
Generated by Sayonika PVC Utility - Epson Photo+ Integration Module.
========================================================================
  `.trim();

  folder?.file('EPSON_PHOTO_PLUS_PRINT_GUIDE.txt', guideText);

  const content = await zip.generateAsync({ type: 'blob' });
  const archiveName = safeItems.length === 1
    ? `${safeItems[0]?.cardHolderName || 'Card'}_EpsonPhotoPlus_600DPI.zip`
    : `Batch_${safeItems.length}_Cards_EpsonPhotoPlus_600DPI.zip`;

  saveAs(content, archiveName);
}

/**
 * Calculates tray sheets based on documents and Epson tray mode:
 * - Single PDF: 1 Card in Tray (Slot 1: Front, Slot 2: Back)
 * - Multi Documents: 2 Cards in Tray (Pass 1 Fronts: Doc1 & Doc2, Pass 2 Backs: Doc1 & Doc2)
 */
export function buildEpsonTraySheets(
  items: CardExportPair[],
  config: EpsonTrayConfig = DEFAULT_EPSON_TRAY_CONFIG
): EpsonTraySheet[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const safeItems = items;
  const sheets: EpsonTraySheet[] = [];
  const isSingleDoc = safeItems.length === 1;
  const mode = config.printMode === 'auto' 
    ? (isSingleDoc ? 'single_card' : 'batch_2card_dual_pass')
    : config.printMode;

  if (mode === 'single_card' || (isSingleDoc && mode !== 'batch_2card_dual_pass')) {
    // 1 Document -> 1 Tray Sheet with Front on Slot 1 and Back on Slot 2
    const item = safeItems[0];
    sheets.push({
      trayIndex: 1,
      passType: item.backCanvas ? 'dual_side' : 'single',
      label: `Tray #1: ${item.name} (${item.backCanvas ? 'Front & Back' : 'Front Only'})`,
      slot1: {
        title: `${item.cardHolderName || item.name} (FRONT)`,
        side: 'front',
        canvas: item.frontCanvas,
        cardHolderName: item.cardHolderName,
      },
      slot2: {
        title: item.backCanvas ? `${item.cardHolderName || item.name} (BACK)` : 'Empty Slot 2',
        side: item.backCanvas ? 'back' : 'none',
        canvas: item.backCanvas,
        cardHolderName: item.cardHolderName,
      },
    });
  } else if (mode === 'side_by_side') {
    // Each document gets 1 tray (Slot 1 = Front, Slot 2 = Back)
    items.forEach((item, idx) => {
      sheets.push({
        trayIndex: idx + 1,
        passType: 'dual_side',
        label: `Tray #${idx + 1}: ${item.cardHolderName || item.name} (Front & Back)`,
        slot1: {
          title: `${item.cardHolderName || item.name} (FRONT)`,
          side: 'front',
          canvas: item.frontCanvas,
          cardHolderName: item.cardHolderName,
        },
        slot2: {
          title: item.backCanvas ? `${item.cardHolderName || item.name} (BACK)` : 'Empty Slot 2',
          side: item.backCanvas ? 'back' : 'none',
          canvas: item.backCanvas,
          cardHolderName: item.cardHolderName,
        },
      });
    });
  } else {
    // Batch 2-Card Dual-Pass Mode (2 Cards per Printer Tray)
    // Pair items: (0, 1), (2, 3), (4, 5)...
    let trayCounter = 1;
    for (let i = 0; i < items.length; i += 2) {
      const docA = items[i];
      const docB = items[i + 1]; // may be undefined if odd total

      // 1. Fronts Pass (Slot 1 = Doc A Front, Slot 2 = Doc B Front)
      if (config.activePass === 'both' || config.activePass === 'front_only') {
        sheets.push({
          trayIndex: trayCounter,
          passType: 'fronts',
          label: `Tray #${trayCounter} — Pass 1 (FRONTS): ${docA.cardHolderName || docA.name}${docB ? ` + ${docB.cardHolderName || docB.name}` : ''}`,
          slot1: {
            title: `Card 1: ${docA.cardHolderName || docA.name} (FRONT)`,
            side: 'front',
            canvas: docA.frontCanvas,
            cardHolderName: docA.cardHolderName,
          },
          slot2: {
            title: docB ? `Card 2: ${docB.cardHolderName || docB.name} (FRONT)` : 'Slot 2 (Empty)',
            side: docB ? 'front' : 'none',
            canvas: docB?.frontCanvas,
            cardHolderName: docB?.cardHolderName,
          },
        });
      }

      // 2. Backs Pass (Slot 1 = Doc A Back, Slot 2 = Doc B Back)
      const hasBacks = docA.backCanvas || (docB && docB.backCanvas);
      if (hasBacks && (config.activePass === 'both' || config.activePass === 'back_only')) {
        sheets.push({
          trayIndex: trayCounter,
          passType: 'backs',
          label: `Tray #${trayCounter} — Pass 2 (BACKS): ${docA.cardHolderName || docA.name}${docB ? ` + ${docB.cardHolderName || docB.name}` : ''}`,
          slot1: {
            title: docA.backCanvas ? `Card 1: ${docA.cardHolderName || docA.name} (BACK)` : 'Card 1 (No Back)',
            side: docA.backCanvas ? 'back' : 'none',
            canvas: docA.backCanvas,
            cardHolderName: docA.cardHolderName,
          },
          slot2: {
            title: docB?.backCanvas ? `Card 2: ${docB.cardHolderName || docB.name} (BACK)` : (docB ? 'Card 2 (No Back)' : 'Slot 2 (Empty)'),
            side: docB?.backCanvas ? 'back' : 'none',
            canvas: docB?.backCanvas,
            cardHolderName: docB?.cardHolderName,
          },
        });
      }

      trayCounter++;
    }
  }

  return sheets;
}

/**
 * Generates an exact millimeter calibrated PDF for Epson L8050 / L18050 PVC Card Tray Borderless
 */
export function generateEpsonTrayPdf(
  items: CardExportPair[],
  config: EpsonTrayConfig = DEFAULT_EPSON_TRAY_CONFIG,
  printSettings?: Partial<PrintSettings>
): jsPDF {
  const sheets = buildEpsonTraySheets(items, config);
  const { bleedMm = 1.0, cardGapMm = 12.0, offsetXmm = 0, offsetYmm = 0 } = config;

  // Epson L8050 / L18050 2-Card Tray Dimensions (mm)
  // Page Width: 200 mm (Landscape), Height: 140 mm or Exact PVC Tray Imposition 190mm x 70mm
  const cardW = CR80_WIDTH_MM + (config.borderless ? bleedMm * 2 : 0);
  const cardH = CR80_HEIGHT_MM + (config.borderless ? bleedMm * 2 : 0);

  // Exact 2-card Tray dimensions
  const trayWidthMm = (CR80_WIDTH_MM * 2) + cardGapMm + 24; // ~195.2 mm
  const trayHeightMm = CR80_HEIGHT_MM + 20;                 // ~73.98 mm

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [trayWidthMm, trayHeightMm],
  });

  const startX = 12 + offsetXmm - (config.borderless ? bleedMm : 0);
  const startY = 10 + offsetYmm - (config.borderless ? bleedMm : 0);
  const slot2X = startX + CR80_WIDTH_MM + cardGapMm + (config.borderless ? bleedMm * 2 : 0);

  sheets.forEach((sheet, idx) => {
    if (idx > 0) {
      pdf.addPage([trayWidthMm, trayHeightMm], 'landscape');
    }

    // 1. Draw Slot 1 Card
    if (sheet.slot1.canvas) {
      const img1 = sheet.slot1.canvas.toDataURL('image/jpeg', 0.99);
      pdf.addImage(img1, 'JPEG', startX, startY, cardW, cardH, undefined, 'SLOW');
    }

    // 2. Draw Slot 2 Card
    if (sheet.slot2.canvas) {
      const img2 = sheet.slot2.canvas.toDataURL('image/jpeg', 0.99);
      pdf.addImage(img2, 'JPEG', slot2X, startY, cardW, cardH, undefined, 'SLOW');
    }

    // 3. Tray & Slot Identification marks on non-printable edges (Top margin)
    pdf.setFontSize(6.5);
    pdf.setTextColor(140, 140, 140);
    pdf.text(
      `EPSON ${config.printerModel} PVC TRAY BORDERLESS • ${sheet.label.toUpperCase()}`,
      trayWidthMm / 2,
      5,
      { align: 'center' }
    );

    // Slot corner registration tick marks
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    // Center divider guide
    pdf.setLineDashPattern([1.5, 1.5], 0);
    const midX = startX + CR80_WIDTH_MM + (config.borderless ? bleedMm : 0) + (cardGapMm / 2);
    pdf.line(midX, 6, midX, trayHeightMm - 4);

    // Bottom info line
    if (printSettings?.shopHeader) {
      pdf.setFontSize(6);
      pdf.setTextColor(160, 160, 160);
      pdf.text(
        `${printSettings.shopHeader} | CR80 (85.60 × 53.98 mm) | 600 DPI Ultra HD`,
        trayWidthMm / 2,
        trayHeightMm - 2.5,
        { align: 'center' }
      );
    }
  });

  return pdf;
}

/**
 * Triggers direct browser printing calibrated for Epson L8050 / L18050 PVC Card Tray Borderless
 */
export function triggerEpsonDirectPrint(
  items: CardExportPair[],
  config: EpsonTrayConfig = DEFAULT_EPSON_TRAY_CONFIG,
  sheetIndex?: number
) {
  const sheets = buildEpsonTraySheets(items, config);
  if (sheets.length === 0) return;

  const targetSheets = typeof sheetIndex === 'number' && sheetIndex >= 0 && sheetIndex < sheets.length
    ? [sheets[sheetIndex]]
    : sheets;

  const { bleedMm = 1.0, cardGapMm = 12.0, borderless = true } = config;

  // Build high-resolution printable HTML document
  const printWindow = window.open('', '_blank', 'width=900,height=600');
  if (!printWindow) {
    // Fallback: trigger normal window.print
    window.print();
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Epson ${config.printerModel} Direct PVC Tray Print</title>
  <style>
    @page {
      size: landscape;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .tray-sheet-page {
      width: 195mm;
      height: 74mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      padding: 0;
    }
    .tray-sheet-page:last-child {
      page-break-after: auto;
    }
    .tray-grid {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: ${cardGapMm}mm;
      position: relative;
    }
    .card-slot {
      width: ${CR80_WIDTH_MM + (borderless ? bleedMm * 2 : 0)}mm;
      height: ${CR80_HEIGHT_MM + (borderless ? bleedMm * 2 : 0)}mm;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
    }
    .card-slot img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .empty-slot {
      border: 1px dashed #cccccc;
      border-radius: 3.18mm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #999999;
    }
    @media screen {
      body {
        background: #0f172a;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .tray-sheet-page {
        background: #ffffff;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        border-radius: 6px;
      }
      .toolbar {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 999;
        display: flex;
        gap: 10px;
      }
      .btn {
        background: #2563eb;
        color: white;
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        font-size: 13px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(37,99,235,0.4);
      }
      .btn:hover {
        background: #1d4ed8;
      }
    }
    @media print {
      .toolbar {
        display: none !important;
      }
      .tray-sheet-page {
        box-shadow: none !important;
        border-radius: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" onclick="window.print()">Print to Epson PVC Tray (Ctrl + P)</button>
    <button class="btn" style="background:#475569" onclick="window.close()">Close</button>
  </div>

  ${targetSheets.map((sheet) => `
    <div class="tray-sheet-page">
      <div class="tray-grid">
        <!-- Slot 1 (Left Card) -->
        <div class="card-slot ${!sheet.slot1.canvas ? 'empty-slot' : ''}">
          ${sheet.slot1.canvas ? `<img src="${sheet.slot1.canvas.toDataURL('image/jpeg', 0.98)}" alt="${sheet.slot1.title}" />` : '<span>Slot 1 Empty</span>'}
        </div>

        <!-- Slot 2 (Right Card) -->
        <div class="card-slot ${!sheet.slot2.canvas ? 'empty-slot' : ''}">
          ${sheet.slot2.canvas ? `<img src="${sheet.slot2.canvas.toDataURL('image/jpeg', 0.98)}" alt="${sheet.slot2.title}" />` : '<span>Slot 2 Empty</span>'}
        </div>
      </div>
    </div>
  `).join('')}

  <script>
    // Auto-trigger system print once images have loaded
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
