import * as pdfjsLib from 'pdfjs-dist';
import { parseCardholderNameFromText, parseCandidateNameFromPdfMetadata, extractAllPasswordCandidatesFromFileName } from './nameHelper';
import { renderPdfWithPDFium, getPDFiumPageCount as getPDFiumPageCountCore } from './pdfiumEngine';

// Configure pdfjs worker safely using local Vite URL or fallback CDN
const PDFJS_VERSION = pdfjsLib.version || '6.2.108';

try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
} catch {
  console.warn('PDF.js worker initialization fallback active.');
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;
  } catch {
    // non-blocking
  }
}

export type PdfEngineType = 'pdfium' | 'pdfjs' | 'auto';

const ENGINE_STORAGE_KEY = 'sayonika_pdf_rendering_engine';

/**
 * Gets currently active PDF rendering engine from local preference (default: 'pdfium')
 */
export function getActivePdfEngine(): PdfEngineType {
  if (typeof window === 'undefined') return 'pdfium';
  const saved = localStorage.getItem(ENGINE_STORAGE_KEY) as PdfEngineType;
  if (saved === 'pdfium' || saved === 'pdfjs' || saved === 'auto') {
    return saved;
  }
  return 'pdfium'; // Google PDFium WebAssembly Engine is the default high-performance engine
}

/**
 * Sets active PDF rendering engine in local storage
 */
export function setActivePdfEngine(engine: PdfEngineType): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(ENGINE_STORAGE_KEY, engine);
  }
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pageNumber: number;
  totalPdfPages: number;
  extractedText?: string;
  detectedCardholderName?: string;
  pdfMetadata?: Record<string, unknown>;
  usedPassword?: string;
  renderEngine?: 'Google PDFium WASM' | 'PDF.js';
  renderTimeMs?: number;
}

export async function loadPdfAndRenderPage(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  password?: string,
  targetDpi: number = 400
): Promise<{ 
  success: boolean; 
  page?: RenderedPage; 
  error?: string; 
  isPasswordRequired?: boolean;
  suggestedPassword?: string;
  usedPassword?: string;
  renderEngine?: 'Google PDFium WASM' | 'PDF.js';
  renderTimeMs?: number;
}> {
  const activeEngine = getActivePdfEngine();

  // If engine is 'pdfium' or 'auto', attempt rendering via Google PDFium WASM first
  if (activeEngine === 'pdfium' || activeEngine === 'auto') {
    try {
      const pdfiumRes = await renderPdfWithPDFium(fileOrBuffer, pageNumber, password, targetDpi);
      if (pdfiumRes.success && pdfiumRes.page) {
        return {
          success: true,
          page: {
            canvas: pdfiumRes.page.canvas,
            width: pdfiumRes.page.width,
            height: pdfiumRes.page.height,
            pageNumber: pdfiumRes.page.pageNumber,
            totalPdfPages: pdfiumRes.page.totalPdfPages,
            extractedText: pdfiumRes.page.extractedText,
            detectedCardholderName: pdfiumRes.page.detectedCardholderName,
            pdfMetadata: pdfiumRes.page.pdfMetadata,
            usedPassword: pdfiumRes.page.usedPassword,
            renderEngine: 'Google PDFium WASM',
            renderTimeMs: pdfiumRes.page.renderTimeMs,
          },
          usedPassword: pdfiumRes.usedPassword,
          suggestedPassword: pdfiumRes.suggestedPassword,
          renderEngine: 'Google PDFium WASM',
          renderTimeMs: pdfiumRes.renderTimeMs,
        };
      }

      // If password is required, propagate password prompt immediately without fallback
      if (pdfiumRes.isPasswordRequired) {
        return {
          success: false,
          isPasswordRequired: true,
          suggestedPassword: pdfiumRes.suggestedPassword,
          error: pdfiumRes.error || 'This PDF is password protected. Enter password in CAPITAL letters to unlock.',
          renderEngine: 'Google PDFium WASM',
        };
      }

      // If explicit pdfium was selected and error occurred, return error;
      // if 'auto' was selected, log warning and smoothly fallback to PDF.js
      if (activeEngine === 'pdfium' && pdfiumRes.error) {
        console.warn('[Google PDFium WASM] Render notice, attempting fallback:', pdfiumRes.error);
      }
    } catch (pdfiumErr) {
      console.warn('[Google PDFium WASM] Error, falling back to PDF.js:', pdfiumErr);
    }
  }

  // Fallback or explicit PDF.js rendering pipeline
  return await loadPdfAndRenderPageWithPdfJs(fileOrBuffer, pageNumber, password, targetDpi);
}

/**
 * Fallback / Alternative PDF renderer using PDF.js
 */
export async function loadPdfAndRenderPageWithPdfJs(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  pageNumber: number = 1,
  password?: string,
  targetDpi: number = 400
): Promise<{ 
  success: boolean; 
  page?: RenderedPage; 
  error?: string; 
  isPasswordRequired?: boolean;
  suggestedPassword?: string;
  usedPassword?: string;
  renderEngine?: 'Google PDFium WASM' | 'PDF.js';
  renderTimeMs?: number;
}> {
  const startTime = performance.now();
  try {
    let arrayBuffer: ArrayBuffer;
    let fileName = '';
    if (fileOrBuffer instanceof File) {
      arrayBuffer = await fileOrBuffer.arrayBuffer();
      fileName = fileOrBuffer.name;
    } else if (fileOrBuffer instanceof Uint8Array) {
      arrayBuffer = fileOrBuffer.buffer.slice(fileOrBuffer.byteOffset, fileOrBuffer.byteOffset + fileOrBuffer.byteLength);
    } else {
      arrayBuffer = fileOrBuffer;
    }

    // Determine candidate passwords to attempt (always capitalized)
    const candidatePasswords: string[] = [];
    if (password && password.trim()) {
      candidatePasswords.push(password.trim().toUpperCase());
      candidatePasswords.push(password.trim()); // also try as typed if special case
    }
    if (fileName) {
      const extractedFromFilename = extractAllPasswordCandidatesFromFileName(fileName);
      for (const cand of extractedFromFilename) {
        if (!candidatePasswords.includes(cand)) {
          candidatePasswords.push(cand);
        }
      }
    }

    // Function to attempt opening with a specific password
    const attemptOpen = async (pwd?: string) => {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(arrayBuffer),
        password: pwd || undefined,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
        enableXfa: true,
        useSystemFonts: true,
      });

      loadingTask.onPassword = (updatePassword: (password: string) => void) => {
        if (pwd) updatePassword(pwd);
      };

      return await loadingTask.promise;
    };

    let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
    let successfulPassword: string | undefined = undefined;

    // 1. Try with explicit password or without password first
    try {
      pdfDoc = await attemptOpen(candidatePasswords.length > 0 ? candidatePasswords[0] : undefined);
      if (candidatePasswords.length > 0) {
        successfulPassword = candidatePasswords[0];
      }
    } catch (firstErr: unknown) {
      const error = firstErr as { name?: string; message?: string };
      const isPassError = error?.name === 'PasswordException' || error?.message?.toLowerCase().includes('password');

      if (isPassError && candidatePasswords.length > 1) {
        for (let i = 1; i < candidatePasswords.length; i++) {
          try {
            pdfDoc = await attemptOpen(candidatePasswords[i]);
            successfulPassword = candidatePasswords[i];
            break;
          } catch {
            // continue trying remaining candidates
          }
        }
      }

      if (!pdfDoc) {
        if (isPassError) {
          const suggested = candidatePasswords.length > 0 ? candidatePasswords[0] : undefined;
          return {
            success: false,
            isPasswordRequired: true,
            suggestedPassword: suggested,
            error: 'This PDF is password protected. Enter password in CAPITAL letters to unlock.',
            renderEngine: 'PDF.js',
          };
        }
        throw firstErr;
      }
    }

    if (!pdfDoc) {
      return { success: false, error: 'Could not initialize PDF document proxy', renderEngine: 'PDF.js' };
    }
    const totalPdfPages = pdfDoc.numPages;
    const clampedPage = Math.min(Math.max(1, pageNumber), totalPdfPages);
    const page = await pdfDoc.getPage(clampedPage);

    // 1. Read document metadata
    let pdfMetadata: Record<string, unknown> | undefined = undefined;
    let detectedCardholderName: string | undefined = undefined;

    try {
      const meta = await pdfDoc.getMetadata();
      if (meta) {
        pdfMetadata = (meta.info || {}) as Record<string, unknown>;
        const nameFromMeta = parseCandidateNameFromPdfMetadata(meta.info as Record<string, unknown>, meta.metadata);
        if (nameFromMeta) {
          detectedCardholderName = nameFromMeta;
        }
      }
    } catch {
      // Non-blocking metadata read
    }

    // Scaling calculation
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const pageWidth = unscaledViewport.width || 595.28;
    const pageHeight = unscaledViewport.height || 841.89;

    const requestedDpi = targetDpi && targetDpi > 0 ? targetDpi : 400;
    let scale = requestedDpi / 72;
    const maxDimension = Math.max(pageWidth, pageHeight);
    const maxAllowedDim = 6500;
    const maxAllowedPixels = 32_000_000;

    if (maxDimension * scale > maxAllowedDim) {
      scale = maxAllowedDim / maxDimension;
    }
    if ((pageWidth * scale) * (pageHeight * scale) > maxAllowedPixels) {
      scale = Math.sqrt(maxAllowedPixels / (pageWidth * pageHeight));
    }
    scale = Math.max(1.0, Math.round(scale * 10000) / 10000);

    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not get 2D canvas context');
    }

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.restore();

    const annotationMode = (pdfjsLib as unknown as { AnnotationMode?: { ENABLE_STORAGE?: number; ENABLE_FORMS?: number; ENABLE?: number } })
      .AnnotationMode?.ENABLE_STORAGE ?? 
      (pdfjsLib as unknown as { AnnotationMode?: { ENABLE_STORAGE?: number; ENABLE_FORMS?: number; ENABLE?: number } })
      .AnnotationMode?.ENABLE_FORMS ?? 2;

    let optionalContentConfigPromise: Promise<unknown> | undefined = undefined;
    try {
      if (typeof pdfDoc.getOptionalContentConfig === 'function') {
        optionalContentConfigPromise = pdfDoc.getOptionalContentConfig();
      }
    } catch {
      // non-blocking
    }

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      intent: 'display',
      annotationMode: annotationMode,
      renderInteractiveForms: true,
      optionalContentConfigPromise: optionalContentConfigPromise,
    };

    // @ts-expect-error pdfjs typing nuance
    await page.render(renderContext).promise;

    try {
      await renderAllPdfImageObjects(page, ctx, viewport);
    } catch (imgRenderErr) {
      console.warn('Post-render PDF image verification note:', imgRenderErr);
    }

    // Extract text content to auto-detect Candidate Name
    let extractedText = '';
    try {
      const textContent = await page.getTextContent();
      extractedText = textContent.items
        .map((item) => (typeof item === 'object' && item && 'str' in item ? (item.str as string) : ''))
        .join('\n');

      if (!detectedCardholderName) {
        const parsed = parseCardholderNameFromText(extractedText);
        if (parsed) {
          detectedCardholderName = parsed;
        }
      }

      if (!detectedCardholderName && totalPdfPages > 1) {
        for (let p = 1; p <= Math.min(totalPdfPages, 3); p++) {
          if (p === clampedPage) continue;
          try {
            const otherPage = await pdfDoc.getPage(p);
            const otherTextContent = await otherPage.getTextContent();
            const fullOtherText = otherTextContent.items
              .map((item) => (typeof item === 'object' && item && 'str' in item ? (item.str as string) : ''))
              .join('\n');
            const foundName = parseCardholderNameFromText(fullOtherText);
            if (foundName) {
              detectedCardholderName = foundName;
              break;
            }
          } catch {
            // non-blocking
          }
        }
      }
    } catch {
      // Text extraction non-blocking
    }

    const renderDuration = Math.round(performance.now() - startTime);

    return {
      success: true,
      page: {
        canvas,
        width: canvas.width,
        height: canvas.height,
        pageNumber: clampedPage,
        totalPdfPages,
        extractedText,
        detectedCardholderName,
        pdfMetadata,
        usedPassword: successfulPassword,
        renderEngine: 'PDF.js',
        renderTimeMs: renderDuration,
      },
      usedPassword: successfulPassword,
      suggestedPassword: successfulPassword,
      renderEngine: 'PDF.js',
      renderTimeMs: renderDuration,
    };
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string };
    if (error?.name === 'PasswordException' || error?.message?.toLowerCase().includes('password')) {
      return {
        success: false,
        isPasswordRequired: true,
        error: 'This PDF is password protected. Enter password to unlock.',
        renderEngine: 'PDF.js',
      };
    }

    return {
      success: false,
      error: error?.message || 'Failed to render PDF document',
      renderEngine: 'PDF.js',
    };
  }
}

/**
 * Multiplies two 2D affine transformation matrices [a, b, c, d, e, f]
 */
function multiplyTransform(m1: number[], m2: number[]): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * Resolves a PDF object from page or common object cache
 */
async function resolvePdfImageObject(page: unknown, objId: string): Promise<unknown> {
  const p = page as {
    objs?: {
      get?: (id: string, cb?: (obj: unknown) => void) => unknown;
      has?: (id: string) => boolean;
      _objs?: Record<string, { data?: unknown } | unknown>;
    };
    commonObjs?: {
      get?: (id: string, cb?: (obj: unknown) => void) => unknown;
      has?: (id: string) => boolean;
      _objs?: Record<string, { data?: unknown } | unknown>;
    };
  };

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (val: unknown) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    try {
      // Check direct cache entry first
      if (p.objs?._objs?.[objId]) {
        const entry = p.objs._objs[objId] as { data?: unknown };
        finish(entry && entry.data !== undefined ? entry.data : entry);
        return;
      }
      if (p.commonObjs?._objs?.[objId]) {
        const entry = p.commonObjs._objs[objId] as { data?: unknown };
        finish(entry && entry.data !== undefined ? entry.data : entry);
        return;
      }

      // Try calling get with callback
      if (p.objs?.get) {
        const res = p.objs.get(objId, (o) => finish(o));
        if (res !== undefined && res !== null) {
          finish(res);
          return;
        }
      }
      if (p.commonObjs?.get) {
        const res = p.commonObjs.get(objId, (o) => finish(o));
        if (res !== undefined && res !== null) {
          finish(res);
          return;
        }
      }

      setTimeout(() => finish(null), 100);
    } catch {
      finish(null);
    }
  });
}

/**
 * Converts any raw PDF image object (1-bit monochrome, DeviceGray, ImageMask, RGB, RGBA) into an HTMLCanvasElement
 */
function convertPdfImageToCanvas(rawObj: unknown, currentFillRgb: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }): HTMLCanvasElement | null {
  if (!rawObj) return null;

  // Case 1: Already an ImageBitmap or HTMLCanvasElement or HTMLImageElement
  if (typeof ImageBitmap !== 'undefined' && rawObj instanceof ImageBitmap) {
    const c = document.createElement('canvas');
    c.width = rawObj.width;
    c.height = rawObj.height;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(rawObj, 0, 0);
    return c;
  }
  if (rawObj instanceof HTMLCanvasElement) {
    return rawObj;
  }
  if (rawObj instanceof HTMLImageElement) {
    const c = document.createElement('canvas');
    c.width = rawObj.naturalWidth || rawObj.width;
    c.height = rawObj.naturalHeight || rawObj.height;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(rawObj, 0, 0);
    return c;
  }

  // Case 2: Object with pixel buffer data
  const imgObj = rawObj as {
    data?: Uint8Array | Uint8ClampedArray | number[];
    width?: number;
    height?: number;
    isMask?: boolean;
    imageMask?: boolean;
    isMaskXObject?: boolean;
    decode?: number[];
    bitsPerComponent?: number;
    kind?: number;
    components?: number;
  };

  const width = imgObj.width;
  const height = imgObj.height;
  const data = imgObj.data;

  if (!width || !height || !data || data.length === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imgData = ctx.createImageData(width, height);
  const rgba = imgData.data;
  const totalPixels = width * height;
  const isMask = !!(imgObj.isMask || imgObj.imageMask || imgObj.isMaskXObject);
  const decode = imgObj.decode;
  const bytesPerRow = Math.ceil(width / 8);

  // 1-bit Monochrome or DeviceGray packed buffer (QR codes, barcodes, 1-bit bitmaps)
  if (imgObj.bitsPerComponent === 1 || data.length < totalPixels) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteIndex = y * bytesPerRow + (x >> 3);
        const bitIndex = 7 - (x & 7);
        const bit = byteIndex < data.length ? ((data[byteIndex] >> bitIndex) & 1) : 0;
        const pixelIndex = (y * width + x) * 4;

        if (isMask) {
          // In PDF ImageMask: decode [0, 1] means 0 is masked/transparent, 1 is painted.
          // decode [1, 0] means 1 is masked/transparent, 0 is painted.
          const isPaint = (decode && decode[0] === 1) ? (bit === 0) : (bit === 1);
          if (isPaint) {
            rgba[pixelIndex] = currentFillRgb.r;
            rgba[pixelIndex + 1] = currentFillRgb.g;
            rgba[pixelIndex + 2] = currentFillRgb.b;
            rgba[pixelIndex + 3] = 255;
          } else {
            rgba[pixelIndex] = 255;
            rgba[pixelIndex + 1] = 255;
            rgba[pixelIndex + 2] = 255;
            rgba[pixelIndex + 3] = 0;
          }
        } else {
          // Standard 1-bit DeviceGray: decode [0, 1] -> 0=black, 1=white. decode [1, 0] -> 0=white, 1=black.
          const isWhite = (decode && decode[0] === 1) ? (bit === 0) : (bit === 1);
          const val = isWhite ? 255 : 0;
          rgba[pixelIndex] = val;
          rgba[pixelIndex + 1] = val;
          rgba[pixelIndex + 2] = val;
          rgba[pixelIndex + 3] = 255;
        }
      }
    }
  } else if (data.length === totalPixels) {
    // 8-bit Grayscale (DeviceGray)
    for (let i = 0; i < totalPixels; i++) {
      let val = data[i];
      if (decode && decode.length >= 2) {
        val = Math.round(decode[0] * 255 + (val / 255) * (decode[1] - decode[0]) * 255);
      }
      const pixelIdx = i * 4;
      rgba[pixelIdx] = val;
      rgba[pixelIdx + 1] = val;
      rgba[pixelIdx + 2] = val;
      rgba[pixelIdx + 3] = 255;
    }
  } else if (data.length === totalPixels * 3) {
    // 24-bit RGB
    for (let i = 0; i < totalPixels; i++) {
      const srcIdx = i * 3;
      const destIdx = i * 4;
      rgba[destIdx] = data[srcIdx];
      rgba[destIdx + 1] = data[srcIdx + 1];
      rgba[destIdx + 2] = data[srcIdx + 2];
      rgba[destIdx + 3] = 255;
    }
  } else if (data.length >= totalPixels * 4) {
    // 32-bit RGBA or CMYK
    if (imgObj.components === 4 && (!imgObj.kind || imgObj.kind === 4)) {
      // CMYK conversion
      for (let i = 0; i < totalPixels; i++) {
        const srcIdx = i * 4;
        const destIdx = i * 4;
        const c = data[srcIdx] / 255;
        const m = data[srcIdx + 1] / 255;
        const y = data[srcIdx + 2] / 255;
        const k = data[srcIdx + 3] / 255;
        rgba[destIdx] = Math.round(255 * (1 - c) * (1 - k));
        rgba[destIdx + 1] = Math.round(255 * (1 - m) * (1 - k));
        rgba[destIdx + 2] = Math.round(255 * (1 - y) * (1 - k));
        rgba[destIdx + 3] = 255;
      }
    } else {
      // Direct RGBA
      for (let i = 0; i < totalPixels * 4; i++) {
        rgba[i] = data[i];
      }
    }
  } else {
    // Fallback: copy available data
    for (let i = 0; i < Math.min(totalPixels, data.length); i++) {
      const pixelIdx = i * 4;
      const val = data[i];
      rgba[pixelIdx] = val;
      rgba[pixelIdx + 1] = val;
      rgba[pixelIdx + 2] = val;
      rgba[pixelIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Inspects the operator list and renders all PDF image XObjects (including 1-bit DeviceGray QR codes)
 */
async function renderAllPdfImageObjects(
  page: unknown,
  ctx: CanvasRenderingContext2D,
  viewport: { transform: number[] }
): Promise<void> {
  const p = page as { getOperatorList?: () => Promise<{ fnArray: number[]; argsArray: unknown[] }> };
  if (!p || typeof p.getOperatorList !== 'function') return;

  const opList = await p.getOperatorList();
  if (!opList) return;
  const { fnArray, argsArray } = opList;
  if (!fnArray || !argsArray || !Array.isArray(fnArray) || !Array.isArray(argsArray)) return;

  // Retrieve standard PDF.js operator codes dynamically
  const OPS = (pdfjsLib as unknown as { OPS?: Record<string, number> }).OPS || {};
  const OP_SAVE = OPS.save ?? 10;
  const OP_RESTORE = OPS.restore ?? 11;
  const OP_TRANSFORM = OPS.transform ?? 12;
  const OP_PAINT_IMAGE_XOBJECT = OPS.paintImageXObject ?? 85;
  const OP_PAINT_IMAGE_MASK_XOBJECT = OPS.paintImageMaskXObject ?? 83;
  const OP_PAINT_INLINE_IMAGE = OPS.paintInlineImageXObject ?? 86;
  const OP_PAINT_JPEG = OPS.paintJpegXObject ?? 82;
  const OP_PAINT_IMAGE_REPEAT = OPS.paintImageXObjectRepeat ?? 88;
  const OP_SET_FILL_RGB = OPS.setFillRGBColor ?? 39;

  // CTM matrix stack (Identity matrix default)
  const ctmStack: number[][] = [[1, 0, 0, 1, 0, 0]];
  let currentFillRgb = { r: 0, g: 0, b: 0 };

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[];

    if (fn === OP_SAVE) {
      const top = ctmStack[ctmStack.length - 1];
      ctmStack.push([...top]);
    } else if (fn === OP_RESTORE) {
      if (ctmStack.length > 1) {
        ctmStack.pop();
      }
    } else if (fn === OP_TRANSFORM && Array.isArray(args) && args.length >= 6) {
      const tMatrix = [
        Number(args[0]) || 0,
        Number(args[1]) || 0,
        Number(args[2]) || 0,
        Number(args[3]) || 0,
        Number(args[4]) || 0,
        Number(args[5]) || 0,
      ];
      const topIdx = ctmStack.length - 1;
      ctmStack[topIdx] = multiplyTransform(ctmStack[topIdx], tMatrix);
    } else if (fn === OP_SET_FILL_RGB && Array.isArray(args) && args.length >= 3) {
      currentFillRgb = {
        r: Math.round(Number(args[0]) * 255) || 0,
        g: Math.round(Number(args[1]) * 255) || 0,
        b: Math.round(Number(args[2]) * 255) || 0,
      };
    } else if (
      fn === OP_PAINT_IMAGE_XOBJECT ||
      fn === OP_PAINT_IMAGE_MASK_XOBJECT ||
      fn === OP_PAINT_INLINE_IMAGE ||
      fn === OP_PAINT_JPEG ||
      fn === OP_PAINT_IMAGE_REPEAT
    ) {
      let rawImageObj: unknown = null;
      if (fn === OP_PAINT_INLINE_IMAGE && args && args[0]) {
        rawImageObj = args[0];
      } else if (args && typeof args[0] === 'string') {
        const objId = args[0];
        rawImageObj = await resolvePdfImageObject(page, objId);
      }

      if (rawImageObj) {
        const imgCanvas = convertPdfImageToCanvas(rawImageObj, currentFillRgb);
        if (imgCanvas && imgCanvas.width > 0 && imgCanvas.height > 0) {
          const currentCTM = ctmStack[ctmStack.length - 1];
          const combined = multiplyTransform(viewport.transform, currentCTM);
          // PDF images have origin at bottom-left in unit square: transform [1, 0, 0, -1, 0, 1]
          const finalTransform = multiplyTransform(combined, [1, 0, 0, -1, 0, 1]);

          ctx.save();
          ctx.setTransform(
            finalTransform[0],
            finalTransform[1],
            finalTransform[2],
            finalTransform[3],
            finalTransform[4],
            finalTransform[5]
          );
          ctx.imageSmoothingEnabled = false; // Preserve crisp module pixels for QR codes and barcodes
          ctx.drawImage(imgCanvas, 0, 0, 1, 1);
          ctx.restore();
        }
      }
    }
  }
}

/**
 * Rapidly inspects PDF document page count without rendering pages
 */
export async function getPdfPageCount(file: File, password?: string): Promise<number> {
  const activeEngine = getActivePdfEngine();
  if (activeEngine === 'pdfium' || activeEngine === 'auto') {
    try {
      const count = await getPDFiumPageCountCore(file, password);
      if (count > 0) return count;
    } catch {
      // fallback to pdfjs
    }
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      password: password ? password.trim().toUpperCase() : undefined,
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
      enableXfa: true,
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    return doc.numPages || 1;
  } catch {
    return 1;
  }
}

/**
 * Loads an image file (PNG, JPG, WebP) onto a high resolution canvas
 */
export async function loadImageToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
