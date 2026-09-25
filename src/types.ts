export type DocumentType = 
  | 'aadhaar'
  | 'voter'
  | 'pan'
  | 'wb_ration'
  | 'ayushman'
  | 'driving_license'
  | 'student_id'
  | 'custom';

export interface CustomSavedTemplate {
  id: string;
  name: string;
  category: DocumentType;
  description: string;
  dualSided: boolean;
  frontBox: { x: number; y: number; width: number; height: number };
  backBox?: { x: number; y: number; width: number; height: number };
  frontPage?: number;     // 1-indexed page number (e.g. 1)
  backPage?: number;      // 1-indexed page number (e.g. 2 for multi-page PDFs)
  matchKeywords?: string; // Comma-separated filename match keywords (e.g. "kalyani, admit, sem2")
  suggestedPasswordFormat?: string;
  instructions?: string;
  marginSettings?: Partial<CardMarginSettings>;
  imageAdjustments?: Partial<ImageAdjustments>;
  isGlobal?: boolean;     // Available for everyone via Firestore Cloud
  createdBy?: string;
  createdByRole?: string;
  createdAt: number;
  updatedAt?: number;
}

export type PaperLayoutType = 
  | 'pvc_tray'          // Direct PVC Card Tray (Side by side 86x54mm)
  | 'pvc_tray_stacked'  // Top and Bottom
  | 'epson_l8050_tray'  // Epson L8050 / L18050 PVC Card Tray (2-Card Borderless Front & Back)
  | 'a4_5_cards'        // A4 Photo/Glossy Paper (5 cards imposition)
  | 'a4_single'         // A4 Single Center
  | 'photo_4x6_dual'    // 4x6 inch (100x150mm) 2 cards side by side
  | 'photo_4x6_single'  // 4x6 inch single
  | 'single_front_only' // Only Front Side
  | 'single_back_only'; // Only Back Side

export interface EpsonTrayConfig {
  printerModel: 'L8050' | 'L18050' | 'L805' | 'Universal';
  printMode: 'auto' | 'batch_2card_dual_pass' | 'side_by_side' | 'single_card';
  activePass: 'both' | 'front_only' | 'back_only';
  borderless: boolean;
  bleedMm: number;        // Borderless bleed extension (0 - 2mm, default 1.0mm)
  cardGapMm: number;      // Distance between card slots (default 12mm)
  offsetXmm: number;      // Fine-tuning tray horizontal offset
  offsetYmm: number;      // Fine-tuning tray vertical offset
  dpi: 300 | 600;         // Resolution (default 600 DPI)
  reverseBackSlots: boolean; // Align flipped back slots accurately for 2-pass printing
}

export interface CropBox {
  id: 'front' | 'back' | 'single';
  label: string;
  x: number;      // percentage (0-100) or pixel
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface PresetConfig {
  id: string;
  name: string;
  category: DocumentType;
  description: string;
  aspectRatio: number; // default 85.6 / 53.98 = 1.5858
  dualSided: boolean;
  frontBox: { x: number; y: number; width: number; height: number }; // In percentage 0-100
  backBox?: { x: number; y: number; width: number; height: number }; // In percentage 0-100
  frontPage?: number; // default 1
  backPage?: number;  // default 1 or 2
  suggestedPasswordFormat?: string;
  instructions?: string;
  matchKeywords?: string;
  marginSettings?: Partial<CardMarginSettings>;
  imageAdjustments?: Partial<ImageAdjustments>;
  isCustom?: boolean;
  isModified?: boolean;
  isGlobal?: boolean;
  createdBy?: string;
  createdByRole?: string;
  updatedAt?: number;
}

export interface ImageAdjustments {
  brightness: number;  // -50 to 50
  contrast: number;    // -50 to 50
  sharpness: number;   // 0 to 100
  saturation: number;  // 0 to 200
  grayscale: boolean;
  rotation: number;    // 0, 90, 180, 270
}

export interface CardMarginSettings {
  marginMm: number;        // Outer margin around card (0 - 5mm)
  bleedMm: number;         // Bleed margin extension (0 - 3mm)
  cornerRadiusMm: number;  // CR80 standard is ~3.18mm (0 - 5mm)
  borderWidthPx: number;   // Cutting guide border (0, 1, 2 px)
  borderColor: string;     // '#000000', '#666666', etc.
  showCutMarks: boolean;   // Scissor corner tick marks
}

export interface BatchItem {
  id: string;
  file: File;
  name: string;
  cardHolderName?: string;
  size: number;
  status: 'pending' | 'password_required' | 'loading' | 'ready' | 'processing' | 'completed' | 'error';
  password?: string;
  passwordAttempts?: number;
  docType: DocumentType;
  presetId: string;
  numPages: number;
  currentPage: number;
  frontPageNumber?: number; // Page for front card crop (default 1)
  backPageNumber?: number;  // Page for back card crop (default 2 or 1)
  previewUrl?: string;
  frontCropUrl?: string;
  backCropUrl?: string;
  combinedPreviewUrl?: string;
  frontBox: CropBox;
  backBox?: CropBox;
  errorMessage?: string;
  processedDate?: number;
}

export interface PrintSettings {
  layout: PaperLayoutType;
  dpi: number;             // 300 or 600
  fitScale: number;        // 100% exact CR80 size (85.60 x 53.98mm)
  showCardLabels: boolean;
  shopHeader: string;
  contactNumber: string;
  showWatermark: boolean;
  cardGapMm: number;       // Distance between cards
}

export const CR80_WIDTH_MM = 85.60;
export const CR80_HEIGHT_MM = 53.98;
export const CR80_ASPECT_RATIO = CR80_WIDTH_MM / CR80_HEIGHT_MM; // 1.5857725

export const MM_TO_INCH = 1 / 25.4;
export const CR80_WIDTH_INCH = CR80_WIDTH_MM * MM_TO_INCH; // ~3.370 inch
export const CR80_HEIGHT_INCH = CR80_HEIGHT_MM * MM_TO_INCH; // ~2.125 inch
