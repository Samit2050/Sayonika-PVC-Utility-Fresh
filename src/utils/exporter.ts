import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  BatchItem,
  CR80_WIDTH_MM,
  CR80_HEIGHT_MM,
  PaperLayoutType,
  PrintSettings,
} from '../types';
import { sanitizeCardholderName, formatCardJpegFileName, cleanFileNameToCardholderName } from './nameHelper';
import { generateEpsonTrayPdf, DEFAULT_EPSON_TRAY_CONFIG } from './epsonPrintHelper';

export interface CardExportPair {
  name: string;
  cardHolderName?: string;
  frontCanvas: HTMLCanvasElement;
  backCanvas?: HTMLCanvasElement;
}

/**
 * Creates a print-ready PDF using jsPDF with exact millimeter dimensions
 */
export function generatePrintPdf(
  items: CardExportPair[],
  settings: PrintSettings
): jsPDF {
  const { layout, shopHeader, contactNumber, showCutMarks, cardGapMm = 4 } = {
    ...settings,
    showCutMarks: true
  };

  let pdf: jsPDF;

  if (layout === 'epson_l8050_tray') {
    return generateEpsonTrayPdf(items, {
      ...DEFAULT_EPSON_TRAY_CONFIG,
      borderless: true,
      bleedMm: 1.0,
      cardGapMm: 12.0,
    }, settings);
  } else if (layout === 'pvc_tray') {
    // Custom Page Size for Direct PVC Card Tray (Side by side)
    // 2 cards: (85.6 * 2) + gap + margins ≈ 185 mm x 65 mm
    const pageW = (CR80_WIDTH_MM * 2) + cardGapMm + 16;
    const pageH = CR80_HEIGHT_MM + 16;
    pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pageW, pageH]
    });

    items.forEach((item, idx) => {
      if (idx > 0) pdf.addPage([pageW, pageH], 'landscape');

      const startX = 8;
      const startY = 8;

      // Draw Front Card
      const frontImgData = item.frontCanvas.toDataURL('image/jpeg', 0.99);
      pdf.addImage(frontImgData, 'JPEG', startX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');
      
      // Draw Back Card if present
      if (item.backCanvas) {
        const backX = startX + CR80_WIDTH_MM + cardGapMm;
        const backImgData = item.backCanvas.toDataURL('image/jpeg', 0.99);
        pdf.addImage(backImgData, 'JPEG', backX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');

        // Draw middle cut guide line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(startX + CR80_WIDTH_MM + (cardGapMm / 2), 4, startX + CR80_WIDTH_MM + (cardGapMm / 2), pageH - 4);
      }
    });

  } else if (layout === 'pvc_tray_stacked') {
    const pageW = CR80_WIDTH_MM + 16;
    const pageH = (CR80_HEIGHT_MM * 2) + cardGapMm + 16;
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageW, pageH]
    });

    items.forEach((item, idx) => {
      if (idx > 0) pdf.addPage([pageW, pageH], 'portrait');

      const startX = 8;
      let startY = 8;

      const frontImgData = item.frontCanvas.toDataURL('image/jpeg', 0.99);
      pdf.addImage(frontImgData, 'JPEG', startX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');

      if (item.backCanvas) {
        startY += CR80_HEIGHT_MM + cardGapMm;
        const backImgData = item.backCanvas.toDataURL('image/jpeg', 0.99);
        pdf.addImage(backImgData, 'JPEG', startX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');
      }
    });

  } else if (layout === 'photo_4x6_dual') {
    // 4x6 inches = 101.6 mm x 152.4 mm (Landscape or Portrait)
    // In landscape: 152.4 mm width, 101.6 mm height
    const pageW = 152.4;
    const pageH = 101.6;
    pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pageW, pageH]
    });

    items.forEach((item, idx) => {
      if (idx > 0) pdf.addPage([pageW, pageH], 'landscape');

      // Center dual cards horizontally
      const totalCardsW = item.backCanvas ? (CR80_WIDTH_MM * 2 + cardGapMm) : CR80_WIDTH_MM;
      const startX = Math.max(5, (pageW - totalCardsW) / 2);
      const startY = (pageH - CR80_HEIGHT_MM) / 2;

      const frontImgData = item.frontCanvas.toDataURL('image/jpeg', 0.99);
      pdf.addImage(frontImgData, 'JPEG', startX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');

      if (item.backCanvas) {
        const backX = startX + CR80_WIDTH_MM + cardGapMm;
        const backImgData = item.backCanvas.toDataURL('image/jpeg', 0.99);
        pdf.addImage(backImgData, 'JPEG', backX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');

        // Scissor cut guide line
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(startX + CR80_WIDTH_MM + (cardGapMm / 2), startY - 4, startX + CR80_WIDTH_MM + (cardGapMm / 2), startY + CR80_HEIGHT_MM + 4);
      }

      // Small header watermark
      if (shopHeader) {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`${shopHeader} ${contactNumber ? '• ' + contactNumber : ''}`, pageW / 2, pageH - 4, { align: 'center' });
      }
    });

  } else if (layout === 'a4_5_cards') {
    // A4 Portrait: 210 mm x 297 mm
    // Fits up to 5 pairs (10 cards) or 5 individual dual-side sets per page
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageW = 210;
    const pageH = 297;
    const marginX = 14;
    let currentY = 18;

    // Header banner on first page
    if (shopHeader) {
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${shopHeader} — Sayonika PVC Utility Print Sheet`, marginX, 10);
      pdf.text(`CR80 Card Standard (85.60 mm × 53.98 mm) | Contact: ${contactNumber || 'biswasxerox40@gmail.com'}`, marginX, 14);
      pdf.setDrawColor(220, 220, 220);
      pdf.line(marginX, 15.5, pageW - marginX, 15.5);
    }

    items.forEach((item, idx) => {
      // If adding this card overflows A4 height, add new page
      if (currentY + CR80_HEIGHT_MM > pageH - 15) {
        pdf.addPage('a4', 'portrait');
        currentY = 18;
      }

      // Card row
      const frontX = marginX;
      const frontImgData = item.frontCanvas.toDataURL('image/jpeg', 0.99);
      pdf.addImage(frontImgData, 'JPEG', frontX, currentY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');

      if (item.backCanvas) {
        const backX = frontX + CR80_WIDTH_MM + cardGapMm;
        const backImgData = item.backCanvas.toDataURL('image/jpeg', 0.99);
        pdf.addImage(backImgData, 'JPEG', backX, currentY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');

        // Draw middle cut guide line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(frontX + CR80_WIDTH_MM + (cardGapMm / 2), currentY - 2, frontX + CR80_WIDTH_MM + (cardGapMm / 2), currentY + CR80_HEIGHT_MM + 2);
      }

      // Card label on margin
      pdf.setFontSize(7);
      pdf.setTextColor(140, 140, 140);
      pdf.text(`${idx + 1}. ${item.name}`, marginX, currentY - 1.5);

      currentY += CR80_HEIGHT_MM + 7;
    });

  } else {
    // Default A4 Single Center
    pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageW = 210;
    const pageH = 297;

    items.forEach((item, idx) => {
      if (idx > 0) pdf.addPage('a4', 'portrait');

      const totalW = item.backCanvas ? (CR80_WIDTH_MM * 2 + cardGapMm) : CR80_WIDTH_MM;
      const startX = (pageW - totalW) / 2;
      const startY = (pageH - CR80_HEIGHT_MM) / 2;

      const frontImgData = item.frontCanvas.toDataURL('image/jpeg', 0.99);
      pdf.addImage(frontImgData, 'JPEG', startX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');

      if (item.backCanvas) {
        const backX = startX + CR80_WIDTH_MM + cardGapMm;
        const backImgData = item.backCanvas.toDataURL('image/jpeg', 0.99);
        pdf.addImage(backImgData, 'JPEG', backX, startY, CR80_WIDTH_MM, CR80_HEIGHT_MM, undefined, 'SLOW');
      }

      if (shopHeader) {
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`${shopHeader} • ${contactNumber || ''}`, pageW / 2, startY + CR80_HEIGHT_MM + 10, { align: 'center' });
      }
    });
  }

  return pdf;
}

/**
 * Sanitizes base name without extension and formats candidate name
 */
export function getCardBaseName(fileNameOrName: string): string {
  if (!fileNameOrName) return 'Candidate';
  // If it's already a clean candidate name, sanitize it
  if (!fileNameOrName.includes('.')) {
    return sanitizeCardholderName(fileNameOrName);
  }
  return cleanFileNameToCardholderName(fileNameOrName);
}

/**
 * Downloads a single canvas as JPEG with strict Serial Number and _F or _B naming using Cardholder Name
 */
export function downloadCardSideJpeg(
  canvas: HTMLCanvasElement,
  cardHolderNameOrFileName: string,
  side: 'F' | 'B' | 'f' | 'b',
  quality: number = 0.99,
  serialNumber: number | string = 1
) {
  const cardHolderName = getCardBaseName(cardHolderNameOrFileName);
  const filename = formatCardJpegFileName(cardHolderName, side, serialNumber);

  canvas.toBlob(
    (blob) => {
      if (blob) {
        saveAs(blob, filename);
      }
    },
    'image/jpeg',
    quality
  );
}

/**
 * Downloads both front and back as JPEG (_F.jpg and _B.jpg) named with Serial Number and Cardholder Name directly without ZIP
 */
export async function downloadCardBothSidesJpeg(
  frontCanvas: HTMLCanvasElement,
  backCanvas?: HTMLCanvasElement,
  cardHolderNameOrFileName: string = 'Card_Holder',
  quality: number = 0.99,
  serialNumber: number | string = 1
) {
  const cardHolderName = getCardBaseName(cardHolderNameOrFileName);
  
  // 1. Download Front side as <Serial>_<CardHolderName>_F.jpg in JPEG format
  downloadCardSideJpeg(frontCanvas, cardHolderName, 'F', quality, serialNumber);

  // 2. Download Back side as <Serial>_<CardHolderName>_B.jpg (if present) with slight delay for browser download queue
  if (backCanvas) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    downloadCardSideJpeg(backCanvas, cardHolderName, 'B', quality, serialNumber);
  }
}

/**
 * Downloads multiple cards as individual JPEG files with Serial Numbers (<Serial>_<CardHolderName>_F.jpg and <Serial>_<CardHolderName>_B.jpg)
 */
export async function downloadBatchJpegs(
  items: CardExportPair[],
  quality: number = 0.99
) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const serial = i + 1;
    const cardHolderName = item.cardHolderName || getCardBaseName(item.name);

    // Download Front side as <Serial>_<Name>_F.jpg
    downloadCardSideJpeg(item.frontCanvas, cardHolderName, 'F', quality, serial);

    // Download Back side as <Serial>_<Name>_B.jpg if present
    if (item.backCanvas) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      downloadCardSideJpeg(item.backCanvas, cardHolderName, 'B', quality, serial);
    }

    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}

/**
 * Downloads a single canvas as JPEG
 */
export function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpeg' = 'jpeg'
) {
  // Ensure filename has .jpg extension if saving as jpeg
  let targetFilename = filename;
  if (format === 'jpeg' && !targetFilename.toLowerCase().endsWith('.jpg') && !targetFilename.toLowerCase().endsWith('.jpeg')) {
    targetFilename = `${targetFilename.replace(/\.[^/.]+$/, '')}.jpg`;
  }

  canvas.toBlob(
    (blob) => {
      if (blob) {
        saveAs(blob, targetFilename);
      }
    },
    `image/${format}`,
    0.99
  );
}
