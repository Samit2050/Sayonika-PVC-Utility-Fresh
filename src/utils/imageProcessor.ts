import { CropBox, ImageAdjustments, CardMarginSettings, CR80_WIDTH_MM, CR80_HEIGHT_MM } from '../types';

/**
 * Extracts a high-resolution cropped canvas from source with margins, bleed, rounding, and filters
 */
export function cropAndEnhanceRegion(
  sourceCanvas: HTMLCanvasElement,
  box: CropBox | { x: number; y: number; width: number; height: number },
  adjustments: ImageAdjustments,
  marginSettings: CardMarginSettings,
  targetDpi: number = 600
): HTMLCanvasElement {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  // Convert percentages to source pixels
  const pxX = Math.round((box.x / 100) * srcW);
  const pxY = Math.round((box.y / 100) * srcH);
  const pxW = Math.round((box.width / 100) * srcW);
  const pxH = Math.round((box.height / 100) * srcH);

  // Clamp within source canvas bounds
  const clampedX = Math.max(0, Math.min(pxX, srcW - 10));
  const clampedY = Math.max(0, Math.min(pxY, srcH - 10));
  const clampedW = Math.min(pxW, srcW - clampedX);
  const clampedH = Math.min(pxH, srcH - clampedY);

  // Standard CR80 target dimensions in pixels at given DPI
  // 85.60 mm = 3.370 inch * 300 = 1011 px
  // 53.98 mm = 2.125 inch * 300 = 638 px
  const pxPerMm = (targetDpi / 25.4);
  const cardTargetW = Math.round(CR80_WIDTH_MM * pxPerMm);
  const cardTargetH = Math.round(CR80_HEIGHT_MM * pxPerMm);

  // Margin and bleed in pixels
  const marginPx = Math.round(marginSettings.marginMm * pxPerMm);
  const bleedPx = Math.round(marginSettings.bleedMm * pxPerMm);
  const cornerRadiusPx = Math.round(marginSettings.cornerRadiusMm * pxPerMm);

  // Total canvas size including outer margin
  const totalW = cardTargetW + (marginPx * 2);
  const totalH = cardTargetH + (marginPx * 2);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = totalW;
  outCanvas.height = totalH;

  const ctx = outCanvas.getContext('2d');
  if (!ctx) return outCanvas;

  // Fill outer canvas with pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalW, totalH);

  // Intermediate canvas for raw crop
  const rawCropCanvas = document.createElement('canvas');
  rawCropCanvas.width = clampedW;
  rawCropCanvas.height = clampedH;
  const rawCtx = rawCropCanvas.getContext('2d');
  if (rawCtx) {
    rawCtx.imageSmoothingEnabled = true;
    rawCtx.imageSmoothingQuality = 'high';
    rawCtx.drawImage(
      sourceCanvas,
      clampedX, clampedY, clampedW, clampedH,
      0, 0, clampedW, clampedH
    );
  }

  // Draw card area
  const cardX = marginPx;
  const cardY = marginPx;

  ctx.save();

  // Create rounded rectangle clipping path if corner radius > 0
  if (cornerRadiusPx > 0) {
    ctx.beginPath();
    ctx.moveTo(cardX + cornerRadiusPx, cardY);
    ctx.lineTo(cardX + cardTargetW - cornerRadiusPx, cardY);
    ctx.arcTo(cardX + cardTargetW, cardY, cardX + cardTargetW, cardY + cornerRadiusPx, cornerRadiusPx);
    ctx.lineTo(cardX + cardTargetW, cardY + cardTargetH - cornerRadiusPx);
    ctx.arcTo(cardX + cardTargetW, cardY + cardTargetH, cardX + cardTargetW - cornerRadiusPx, cardY + cardTargetH, cornerRadiusPx);
    ctx.lineTo(cardX + cornerRadiusPx, cardY + cardTargetH);
    ctx.arcTo(cardX, cardY + cardTargetH, cardX, cardY + cardTargetH - cornerRadiusPx, cornerRadiusPx);
    ctx.lineTo(cardX, cardY + cornerRadiusPx);
    ctx.arcTo(cardX, cardY, cardX + cornerRadiusPx, cardY, cornerRadiusPx);
    ctx.closePath();
    ctx.clip();
  }

  // Draw cropped image onto destination with high quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Bleed extension: draw slightly larger if bleed > 0
  const drawX = cardX - bleedPx;
  const drawY = cardY - bleedPx;
  const drawW = cardTargetW + (bleedPx * 2);
  const drawH = cardTargetH + (bleedPx * 2);

  // Multi-step scaling for extreme scale ratios (e.g. upscaling smaller crops or downscaling massive scans)
  const scaleRatio = drawW / Math.max(1, clampedW);
  if (scaleRatio > 1.75) {
    // 2-step upscale for smoother gradients and sharper text reconstruction
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = Math.round(clampedW * 1.5);
    stepCanvas.height = Math.round(clampedH * 1.5);
    const stepCtx = stepCanvas.getContext('2d');
    if (stepCtx) {
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(rawCropCanvas, 0, 0, clampedW, clampedH, 0, 0, stepCanvas.width, stepCanvas.height);
      ctx.drawImage(stepCanvas, 0, 0, stepCanvas.width, stepCanvas.height, drawX, drawY, drawW, drawH);
    } else {
      ctx.drawImage(rawCropCanvas, 0, 0, clampedW, clampedH, drawX, drawY, drawW, drawH);
    }
  } else if (scaleRatio < 0.5) {
    // 2-step downscale to preserve fine lines and prevent moire patterns
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = Math.round(clampedW * 0.6);
    stepCanvas.height = Math.round(clampedH * 0.6);
    const stepCtx = stepCanvas.getContext('2d');
    if (stepCtx) {
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(rawCropCanvas, 0, 0, clampedW, clampedH, 0, 0, stepCanvas.width, stepCanvas.height);
      ctx.drawImage(stepCanvas, 0, 0, stepCanvas.width, stepCanvas.height, drawX, drawY, drawW, drawH);
    } else {
      ctx.drawImage(rawCropCanvas, 0, 0, clampedW, clampedH, drawX, drawY, drawW, drawH);
    }
  } else {
    ctx.drawImage(rawCropCanvas, 0, 0, clampedW, clampedH, drawX, drawY, drawW, drawH);
  }
  ctx.restore();

  // Draw cutting guide border outline if configured
  if (marginSettings.borderWidthPx > 0) {
    ctx.save();
    ctx.strokeStyle = marginSettings.borderColor || '#000000';
    ctx.lineWidth = marginSettings.borderWidthPx;
    if (cornerRadiusPx > 0) {
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(cardX, cardY, cardTargetW, cardTargetH, cornerRadiusPx);
      } else {
        ctx.rect(cardX, cardY, cardTargetW, cardTargetH);
      }
      ctx.stroke();
    } else {
      ctx.strokeRect(cardX, cardY, cardTargetW, cardTargetH);
    }
    ctx.restore();
  }

  // Draw scissor cut corner marks
  if (marginSettings.showCutMarks && marginPx > 4) {
    ctx.save();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    const tickLen = 8;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(cardX - 4, cardY);
    ctx.lineTo(cardX - 4 - tickLen, cardY);
    ctx.moveTo(cardX, cardY - 4);
    ctx.lineTo(cardX, cardY - 4 - tickLen);
    // Top-right
    ctx.moveTo(cardX + cardTargetW + 4, cardY);
    ctx.lineTo(cardX + cardTargetW + 4 + tickLen, cardY);
    ctx.moveTo(cardX + cardTargetW, cardY - 4);
    ctx.lineTo(cardX + cardTargetW, cardY - 4 - tickLen);
    // Bottom-left
    ctx.moveTo(cardX - 4, cardY + cardTargetH);
    ctx.lineTo(cardX - 4 - tickLen, cardY + cardTargetH);
    ctx.moveTo(cardX, cardY + cardTargetH + 4);
    ctx.lineTo(cardX, cardY + cardTargetH + 4 + tickLen);
    // Bottom-right
    ctx.moveTo(cardX + cardTargetW + 4, cardY + cardTargetH);
    ctx.lineTo(cardX + cardTargetW + 4 + tickLen, cardY + cardTargetH);
    ctx.moveTo(cardX + cardTargetW, cardY + cardTargetH + 4);
    ctx.lineTo(cardX + cardTargetW, cardY + cardTargetH + 4 + tickLen);
    ctx.stroke();
    ctx.restore();
  }

  // Apply Pixel Filters (Brightness, Contrast, Sharpening, Grayscale)
  applyImageFilters(ctx, totalW, totalH, adjustments);

  return outCanvas;
}

/**
 * Pixel-level filter manipulation for crisp Xerox output
 */
function applyImageFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adjustments: ImageAdjustments
) {
  const { brightness, contrast, sharpness, grayscale, saturation } = adjustments;

  // Check if any filter needs to be applied
  if (brightness === 0 && contrast === 0 && sharpness === 0 && !grayscale && saturation === 100) {
    return;
  }

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Contrast factor
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  // Brightness offset
  const bOffset = brightness * 2.55;
  // Saturation factor
  const satFactor = saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    if (brightness !== 0) {
      r += bOffset;
      g += bOffset;
      b += bOffset;
    }

    // Contrast
    if (contrast !== 0) {
      r = factor * (r - 128) + 128;
      g = factor * (g - 128) + 128;
      b = factor * (b - 128) + 128;
    }

    // Grayscale or Saturation
    if (grayscale) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray;
      g = gray;
      b = gray;
    } else if (saturation !== 100) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * satFactor;
      g = gray + (g - gray) * satFactor;
      b = gray + (b - gray) * satFactor;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imgData, 0, 0);

  // Sharpening kernel if sharpness > 0
  if (sharpness > 0) {
    applySharpen(ctx, width, height, sharpness / 100);
  }
}

function applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  if (strength <= 0) return;
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;
  const output = ctx.createImageData(w, h);
  const dst = output.data;

  // Unsharp mask with luminance isolation to prevent color noise/fringing
  const weight = Math.min(1.5, strength * 0.85);
  const threshold = 3; // noise floor to keep smooth card backgrounds clean

  for (let y = 1; y < h - 1; y++) {
    const yOffset = y * w;
    const topYOffset = (y - 1) * w;
    const botYOffset = (y + 1) * w;

    for (let x = 1; x < w - 1; x++) {
      const idx = (yOffset + x) * 4;
      const top = (topYOffset + x) * 4;
      const bot = (botYOffset + x) * 4;
      const left = (yOffset + x - 1) * 4;
      const right = (yOffset + x + 1) * 4;

      // Calculate center luminance and 4-neighborhood average
      const centerLum = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
      const topLum = 0.299 * src[top] + 0.587 * src[top + 1] + 0.114 * src[top + 2];
      const botLum = 0.299 * src[bot] + 0.587 * src[bot + 1] + 0.114 * src[bot + 2];
      const leftLum = 0.299 * src[left] + 0.587 * src[left + 1] + 0.114 * src[left + 2];
      const rightLum = 0.299 * src[right] + 0.587 * src[right + 1] + 0.114 * src[right + 2];

      const avgLum = (topLum + botLum + leftLum + rightLum) * 0.25;
      const diffLum = centerLum - avgLum;

      // If gradient exceeds noise threshold, sharpen the edge
      if (Math.abs(diffLum) > threshold) {
        const lumDelta = diffLum * weight;
        for (let c = 0; c < 3; c++) {
          const val = src[idx + c] + lumDelta;
          dst[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
        }
      } else {
        dst[idx] = src[idx];
        dst[idx + 1] = src[idx + 1];
        dst[idx + 2] = src[idx + 2];
      }
      dst[idx + 3] = src[idx + 3]; // Preserve alpha channel
    }
  }

  // Copy perimeter edge pixels untouched
  for (let x = 0; x < w; x++) {
    const topIdx = x * 4;
    const botIdx = ((h - 1) * w + x) * 4;
    for (let c = 0; c < 4; c++) {
      dst[topIdx + c] = src[topIdx + c];
      dst[botIdx + c] = src[botIdx + c];
    }
  }
  for (let y = 0; y < h; y++) {
    const leftIdx = (y * w) * 4;
    const rightIdx = (y * w + w - 1) * 4;
    for (let c = 0; c < 4; c++) {
      dst[leftIdx + c] = src[leftIdx + c];
      dst[rightIdx + c] = src[rightIdx + c];
    }
  }

  ctx.putImageData(output, 0, 0);
}

/**
 * Smart Edge Detection: Scans the region around an approximate crop box
 * to locate card boundary lines (dark borders / color transitions).
 */
export function smartDetectCardEdges(
  sourceCanvas: HTMLCanvasElement,
  currentBox: CropBox | { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number; detected: boolean } {
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  const searchX = Math.max(0, ((currentBox.x - 4) / 100) * srcW);
  const searchY = Math.max(0, ((currentBox.y - 4) / 100) * srcH);
  const searchW = Math.min(srcW - searchX, ((currentBox.width + 8) / 100) * srcW);
  const searchH = Math.min(srcH - searchY, ((currentBox.height + 8) / 100) * srcH);

  const testCanvas = document.createElement('canvas');
  testCanvas.width = Math.round(searchW);
  testCanvas.height = Math.round(searchH);
  const ctx = testCanvas.getContext('2d');
  if (!ctx) return { ...currentBox, detected: false };

  ctx.drawImage(
    sourceCanvas,
    searchX, searchY, searchW, searchH,
    0, 0, searchW, searchH
  );

  const imgData = ctx.getImageData(0, 0, testCanvas.width, testCanvas.height);
  const data = imgData.data;
  const tw = testCanvas.width;
  const th = testCanvas.height;

  // Compute horizontal and vertical projection of gradient edges
  const hGradients = new Float32Array(th);
  const vGradients = new Float32Array(tw);

  for (let y = 1; y < th - 1; y++) {
    for (let x = 1; x < tw - 1; x++) {
      const idx = (y * tw + x) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      const topGray = (data[((y - 1) * tw + x) * 4] + data[((y - 1) * tw + x) * 4 + 1] + data[((y - 1) * tw + x) * 4 + 2]) / 3;
      const leftGray = (data[(y * tw + (x - 1)) * 4] + data[(y * tw + (x - 1)) * 4 + 1] + data[(y * tw + (x - 1)) * 4 + 2]) / 3;

      const dy = Math.abs(gray - topGray);
      const dx = Math.abs(gray - leftGray);

      if (dy > 30) hGradients[y] += dy;
      if (dx > 30) vGradients[x] += dx;
    }
  }

  // Find peak edges
  let topPeak = 0, topMax = 0;
  for (let y = 0; y < th * 0.35; y++) {
    if (hGradients[y] > topMax) {
      topMax = hGradients[y];
      topPeak = y;
    }
  }

  let botPeak = th - 1, botMax = 0;
  for (let y = Math.round(th * 0.65); y < th; y++) {
    if (hGradients[y] > botMax) {
      botMax = hGradients[y];
      botPeak = y;
    }
  }

  let leftPeak = 0, leftMax = 0;
  for (let x = 0; x < tw * 0.35; x++) {
    if (vGradients[x] > leftMax) {
      leftMax = vGradients[x];
      leftPeak = x;
    }
  }

  let rightPeak = tw - 1, rightMax = 0;
  for (let x = Math.round(tw * 0.65); x < tw; x++) {
    if (vGradients[x] > rightMax) {
      rightMax = vGradients[x];
      rightPeak = x;
    }
  }

  // If valid bounding box found
  if (rightPeak > leftPeak + 50 && botPeak > topPeak + 30) {
    const finalAbsX = searchX + leftPeak;
    const finalAbsY = searchY + topPeak;
    const finalAbsW = rightPeak - leftPeak;
    const finalAbsH = botPeak - topPeak;

    return {
      x: (finalAbsX / srcW) * 100,
      y: (finalAbsY / srcH) * 100,
      width: (finalAbsW / srcW) * 100,
      height: (finalAbsH / srcH) * 100,
      detected: true
    };
  }

  return { ...currentBox, detected: false };
}

/**
 * Combines Front and Back cards into a single high-res canvas (Side-by-Side or Stacked)
 */
export function createCombinedCardPreview(
  frontCanvas: HTMLCanvasElement,
  backCanvas?: HTMLCanvasElement,
  stacked: boolean = false,
  gapPx: number = 16
): HTMLCanvasElement {
  const outCanvas = document.createElement('canvas');

  if (!backCanvas) {
    outCanvas.width = frontCanvas.width;
    outCanvas.height = frontCanvas.height;
    const ctx = outCanvas.getContext('2d');
    ctx?.drawImage(frontCanvas, 0, 0);
    return outCanvas;
  }

  if (stacked) {
    outCanvas.width = Math.max(frontCanvas.width, backCanvas.width);
    outCanvas.height = frontCanvas.height + backCanvas.height + gapPx;
    const ctx = outCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      ctx.drawImage(frontCanvas, 0, 0);
      
      // Draw middle cut guide line
      ctx.save();
      ctx.strokeStyle = '#D1D5DB';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, frontCanvas.height + gapPx / 2);
      ctx.lineTo(outCanvas.width, frontCanvas.height + gapPx / 2);
      ctx.stroke();
      ctx.restore();

      ctx.drawImage(backCanvas, 0, frontCanvas.height + gapPx);
    }
  } else {
    outCanvas.width = frontCanvas.width + backCanvas.width + gapPx;
    outCanvas.height = Math.max(frontCanvas.height, backCanvas.height);
    const ctx = outCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      ctx.drawImage(frontCanvas, 0, 0);

      // Draw vertical middle cut guide line
      ctx.save();
      ctx.strokeStyle = '#D1D5DB';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(frontCanvas.width + gapPx / 2, 0);
      ctx.lineTo(frontCanvas.width + gapPx / 2, outCanvas.height);
      ctx.stroke();
      ctx.restore();

      ctx.drawImage(backCanvas, frontCanvas.width + gapPx, 0);
    }
  }

  return outCanvas;
}
