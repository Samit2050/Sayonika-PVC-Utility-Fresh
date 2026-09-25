import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCw, 
  Move, 
  Lock, 
  Unlock, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crop as CropIcon,
  HelpCircle,
  ArrowLeftRight,
  Copy,
  Split,
  CreditCard,
  Save,
  Sliders,
  Key,
  FolderOpen,
  Eye,
  EyeOff,
  AlertCircle,
  FileText,
  Pencil,
  Crosshair,
  Check,
  X
} from 'lucide-react';
import { CropBox, CR80_ASPECT_RATIO, CR80_WIDTH_MM, CR80_HEIGHT_MM } from '../types';
import { smartDetectCardEdges } from '../utils/imageProcessor';

interface CanvasEditorProps {
  sourceCanvas: HTMLCanvasElement | null;
  frontBox: CropBox;
  backBox?: CropBox;
  activeBoxId: 'front' | 'back';
  isDualSided: boolean;
  lockAspectRatio: boolean;
  currentPage: number;
  totalPages: number;
  frontPageNumber?: number;
  backPageNumber?: number;
  isPdf?: boolean;
  activePdfPassword?: string;
  isPasswordLocked?: boolean;
  lockedFileName?: string;
  onUnlockPassword?: (password: string, rememberForBatch: boolean) => void;
  onOpenFileClick?: () => void;
  onEditActivePreset?: () => void;
  onFrontPageChange?: (page: number) => void;
  onBackPageChange?: (page: number) => void;
  onSetCurrentPageAsFront?: () => void;
  onSetCurrentPageAsBack?: () => void;
  onBoxChange: (box: CropBox) => void;
  onActiveBoxChange: (id: 'front' | 'back') => void;
  onToggleDualSided?: (dual: boolean) => void;
  onSwapSides?: () => void;
  onMatchDimensions?: () => void;
  onOpenSaveTemplate?: () => void;
  onToggleLockAspectRatio: () => void;
  onPageChange: (page: number) => void;
  onRotatePage: () => void;
}

type DragMode = 'none' | 'move' | 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export const CanvasEditor: React.FC<CanvasEditorProps> = ({
  sourceCanvas,
  frontBox,
  backBox,
  activeBoxId,
  isDualSided,
  lockAspectRatio,
  currentPage,
  totalPages,
  frontPageNumber = 1,
  backPageNumber = 1,
  isPdf = true,
  activePdfPassword = '',
  isPasswordLocked = false,
  lockedFileName = '',
  onUnlockPassword,
  onOpenFileClick,
  onEditActivePreset,
  onFrontPageChange,
  onBackPageChange,
  onSetCurrentPageAsFront,
  onSetCurrentPageAsBack,
  onBoxChange,
  onActiveBoxChange,
  onToggleDualSided,
  onSwapSides,
  onMatchDimensions,
  onOpenSaveTemplate,
  onToggleLockAspectRatio,
  onPageChange,
  onRotatePage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; box: CropBox }>({
    mouseX: 0,
    mouseY: 0,
    box: frontBox,
  });
  const [nudgeStep, setNudgeStep] = useState<number>(0.5); // % of page or step
  const [smartDetectedMsg, setSmartDetectedMsg] = useState<string | null>(null);

  // Manual Draw Crop Box States
  const [isDrawMode, setIsDrawMode] = useState<boolean>(false);
  const [drawTarget, setDrawTarget] = useState<'front' | 'back'>('front');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStartPercent, setDrawStartPercent] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrentPercent, setDrawCurrentPercent] = useState<{ x: number; y: number } | null>(null);

  // Inline & Toolbar password states
  const [inlinePassword, setInlinePassword] = useState(activePdfPassword);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [rememberBatch, setRememberBatch] = useState(true);
  const [passwordError, setPasswordError] = useState(false);
  const [isPasswordPopoverOpen, setIsPasswordPopoverOpen] = useState(false);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawToMainCanvas = useCallback((canvasEl: HTMLCanvasElement | null) => {
    if (!canvasEl || !sourceCanvas) return;
    try {
      const targetCtx = canvasEl.getContext('2d');
      if (targetCtx) {
        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';
        targetCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        targetCtx.drawImage(sourceCanvas, 0, 0);
      }
    } catch (err) {
      console.warn('Canvas direct draw error:', err);
    }
  }, [sourceCanvas]);

  // Ensure canvas is drawn on mount, update, or resize
  useEffect(() => {
    if (mainCanvasRef.current) {
      drawToMainCanvas(mainCanvasRef.current);
    }
  }, [sourceCanvas, drawToMainCanvas]);

  useEffect(() => {
    if (activePdfPassword) {
      setInlinePassword(activePdfPassword);
    }
  }, [activePdfPassword]);

  const activeBox = activeBoxId === 'front' ? frontBox : (backBox || frontBox);

  // Inline password submit (forced UPPERCASE)
  const handleInlineUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlinePassword.trim()) {
      setPasswordError(true);
      return;
    }
    if (onUnlockPassword) {
      onUnlockPassword(inlinePassword.trim().toUpperCase(), rememberBatch);
    }
  };

  // Keyboard shortcut listener (F for front, B for back, S for swap, D for draw, ESC to cancel draw)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        if (isDrawMode || isDrawing) {
          setIsDrawMode(false);
          setIsDrawing(false);
          setDrawStartPercent(null);
          setDrawCurrentPercent(null);
        }
      } else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        setIsDrawMode((prev) => !prev);
        setDrawTarget(activeBoxId);
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        onActiveBoxChange('front');
      } else if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.metaKey && isDualSided) {
        onActiveBoxChange('back');
      } else if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && isDualSided && onSwapSides) {
        onSwapSides();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(4.0, z * 1.15));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.15, z * 0.85));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDualSided, onActiveBoxChange, onSwapSides, isDrawMode, isDrawing, activeBoxId]);

  // Fit image to screen automatically depending on browser resolution & viewport
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !sourceCanvas) return;
    const containerW = Math.max(200, containerRef.current.clientWidth - 40);
    const containerH = Math.max(200, containerRef.current.clientHeight - 40);
    
    // Check screen device pixel ratio
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const scaleX = containerW / sourceCanvas.width;
    const scaleY = containerH / sourceCanvas.height;
    
    // Scale dynamically to fill stage without cropping or pixelation
    const optimalZoom = Math.min(scaleX, scaleY, Math.max(1.0, 1.4 / Math.min(dpr, 1.5)));
    
    setZoom(optimalZoom);
    setPan({
      x: Math.max(10, (containerW - sourceCanvas.width * optimalZoom) / 2 + 20),
      y: Math.max(10, (containerH - sourceCanvas.height * optimalZoom) / 2 + 20),
    });
  }, [sourceCanvas]);

  // Automatic screen resolution and viewport resize observer
  useEffect(() => {
    if (sourceCanvas) {
      fitToScreen();
    }

    const containerEl = containerRef.current;
    if (!containerEl) return;

    let resizeTimer: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (sourceCanvas) {
          fitToScreen();
        }
      }, 100);
    });

    observer.observe(containerEl);
    window.addEventListener('resize', fitToScreen);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', fitToScreen);
    };
  }, [sourceCanvas, fitToScreen]);

  // Calculate mouse position relative to sourceCanvas in 0-100%
  const getCanvasRelativePercent = (e: React.MouseEvent) => {
    if (!containerRef.current || !sourceCanvas) return null;
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseContainerX = e.clientX - containerRect.left;
    const mouseContainerY = e.clientY - containerRect.top;

    const canvasX = (mouseContainerX - pan.x) / zoom;
    const canvasY = (mouseContainerY - pan.y) / zoom;

    const percentX = Math.max(0, Math.min(100, (canvasX / sourceCanvas.width) * 100));
    const percentY = Math.max(0, Math.min(100, (canvasY / sourceCanvas.height) * 100));

    return { percentX, percentY };
  };

  // Handle Smart Border Snap
  const handleSmartSnap = () => {
    if (!sourceCanvas) return;
    const result = smartDetectCardEdges(sourceCanvas, activeBox);
    if (result.detected) {
      onBoxChange({
        ...activeBox,
        x: Number(result.x.toFixed(2)),
        y: Number(result.y.toFixed(2)),
        width: Number(result.width.toFixed(2)),
        height: Number(result.height.toFixed(2)),
      });
      setSmartDetectedMsg(`Card border snapped with precision!`);
      setTimeout(() => setSmartDetectedMsg(null), 3000);
    } else {
      setSmartDetectedMsg(`No clear card boundary found at current position.`);
      setTimeout(() => setSmartDetectedMsg(null), 3000);
    }
  };

  // Drag & Resize Handlers for Existing Boxes
  const handleBoxMouseDown = (e: React.MouseEvent, box: CropBox, mode: DragMode) => {
    if (isDrawMode) return; // Do not start move/resize when in manual draw mode
    e.stopPropagation();
    if (activeBoxId !== box.id) {
      onActiveBoxChange(box.id as 'front' | 'back');
    }
    setDragMode(mode);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      box: { ...box },
    });
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (isDrawMode && sourceCanvas) {
      const coords = getCanvasRelativePercent(e);
      if (coords) {
        setIsDrawing(true);
        setDrawStartPercent({ x: coords.percentX, y: coords.percentY });
        setDrawCurrentPercent({ x: coords.percentX, y: coords.percentY });
      }
    }
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    if (isDrawing && drawStartPercent && sourceCanvas) {
      const coords = getCanvasRelativePercent(e);
      if (coords) {
        setDrawCurrentPercent({ x: coords.percentX, y: coords.percentY });
      }
      return;
    }

    if (dragMode === 'none' || !sourceCanvas) return;

    const deltaPixelX = (e.clientX - dragStart.mouseX) / zoom;
    const deltaPixelY = (e.clientY - dragStart.mouseY) / zoom;

    // Convert pixel delta to percentage
    const deltaPercentX = (deltaPixelX / sourceCanvas.width) * 100;
    const deltaPercentY = (deltaPixelY / sourceCanvas.height) * 100;

    let newX = dragStart.box.x;
    let newY = dragStart.box.y;
    let newW = dragStart.box.width;
    let newH = dragStart.box.height;

    if (dragMode === 'move') {
      newX = Math.max(0, Math.min(100 - newW, dragStart.box.x + deltaPercentX));
      newY = Math.max(0, Math.min(100 - newH, dragStart.box.y + deltaPercentY));
    } else {
      // Resizing
      if (dragMode.includes('e')) {
        newW = Math.max(5, Math.min(100 - newX, dragStart.box.width + deltaPercentX));
      }
      if (dragMode.includes('w')) {
        const potentialW = dragStart.box.width - deltaPercentX;
        if (potentialW >= 5 && dragStart.box.x + deltaPercentX >= 0) {
          newX = dragStart.box.x + deltaPercentX;
          newW = potentialW;
        }
      }
      if (dragMode.includes('s')) {
        newH = Math.max(5, Math.min(100 - newY, dragStart.box.height + deltaPercentY));
      }
      if (dragMode.includes('n')) {
        const potentialH = dragStart.box.height - deltaPercentY;
        if (potentialH >= 5 && dragStart.box.y + deltaPercentY >= 0) {
          newY = dragStart.box.y + deltaPercentY;
          newH = potentialH;
        }
      }

      // Maintain Aspect Ratio if locked
      if (lockAspectRatio) {
        const imageRatio = sourceCanvas.width / sourceCanvas.height;
        const targetPercentRatio = CR80_ASPECT_RATIO / imageRatio;

        if (dragMode.includes('e') || dragMode.includes('w')) {
          newH = newW / targetPercentRatio;
        } else {
          newW = newH * targetPercentRatio;
        }
      }
    }

    onBoxChange({
      ...activeBox,
      x: Number(newX.toFixed(2)),
      y: Number(newY.toFixed(2)),
      width: Number(newW.toFixed(2)),
      height: Number(newH.toFixed(2)),
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragMode('none');

    // Commit Manual Draw Crop Box
    if (isDrawing && drawStartPercent && drawCurrentPercent && sourceCanvas) {
      let rawMinX = Math.min(drawStartPercent.x, drawCurrentPercent.x);
      let rawMinY = Math.min(drawStartPercent.y, drawCurrentPercent.y);
      let rawW = Math.abs(drawCurrentPercent.x - drawStartPercent.x);
      let rawH = Math.abs(drawCurrentPercent.y - drawStartPercent.y);

      if (lockAspectRatio) {
        const imageRatio = sourceCanvas.width / sourceCanvas.height;
        const targetPercentRatio = CR80_ASPECT_RATIO / imageRatio;
        rawH = rawW / targetPercentRatio;
        if (drawCurrentPercent.y < drawStartPercent.y) {
          rawMinY = Math.max(0, drawStartPercent.y - rawH);
        }
      }

      // Ensure minimum reasonable dimensions (at least 2% x 2%)
      if (rawW >= 2 && rawH >= 2) {
        const newBox: CropBox = {
          id: drawTarget,
          label: drawTarget === 'front' ? 'Front Side' : 'Back Side',
          x: Number(Math.max(0, Math.min(100 - rawW, rawMinX)).toFixed(2)),
          y: Number(Math.max(0, Math.min(100 - rawH, rawMinY)).toFixed(2)),
          width: Number(Math.min(100, rawW).toFixed(2)),
          height: Number(Math.min(100, rawH).toFixed(2)),
          color: drawTarget === 'front' ? '#10B981' : '#3B82F6',
        };

        if (drawTarget === 'back' && !isDualSided && onToggleDualSided) {
          onToggleDualSided(true);
        }

        onBoxChange(newBox);
        onActiveBoxChange(drawTarget);
        setSmartDetectedMsg(`Custom ${drawTarget === 'front' ? 'Front' : 'Back'} crop box placed!`);
        setTimeout(() => setSmartDetectedMsg(null), 3000);
      }

      setIsDrawing(false);
      setDrawStartPercent(null);
      setDrawCurrentPercent(null);
      setIsDrawMode(false);
    }
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [isDrawing, drawStartPercent, drawCurrentPercent, lockAspectRatio, sourceCanvas, drawTarget, isDualSided, onToggleDualSided, onBoxChange, onActiveBoxChange]);

  // Zoom with mouse wheel (Ctrl + Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.min(Math.max(0.15, z * zoomDelta), 4.0));
    }
  };

  // Fine Nudge Buttons
  const handleNudge = (deltaX: number, deltaY: number) => {
    if (!sourceCanvas) return;
    const newX = Math.max(0, Math.min(100 - activeBox.width, activeBox.x + deltaX));
    const newY = Math.max(0, Math.min(100 - activeBox.height, activeBox.y + deltaY));
    onBoxChange({
      ...activeBox,
      x: Number(newX.toFixed(2)),
      y: Number(newY.toFixed(2)),
    });
  };

  // Render a Single Crop Box Overlay
  const renderCropBoxOverlay = (box: CropBox, isActive: boolean) => {
    const isFront = box.id === 'front';
    const borderColor = isFront ? 'border-emerald-400' : 'border-blue-400';
    const badgeColor = isFront ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white';
    const glowColor = isActive ? (isFront ? 'shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'shadow-[0_0_15px_rgba(59,130,246,0.5)]') : '';

    return (
      <div
        key={box.id}
        id={`crop-box-${box.id}`}
        style={{
          left: `${box.x}%`,
          top: `${box.y}%`,
          width: `${box.width}%`,
          height: `${box.height}%`,
        }}
        onMouseDown={(e) => handleBoxMouseDown(e, box, 'move')}
        className={`absolute border-2 ${borderColor} ${glowColor} ${
          isActive ? 'z-20 ring-2 ring-white/60' : 'z-10 opacity-75'
        } ${isDrawMode ? 'pointer-events-none' : 'cursor-move'} transition-shadow duration-75 select-none`}
      >
        {/* Semi-transparent inner card guide */}
        <div className={`w-full h-full ${isFront ? 'bg-emerald-500/10' : 'bg-blue-500/10'} pointer-events-none relative`}>
          {/* Real standard card dimensions display */}
          <div className="absolute top-1 left-1.5 flex items-center gap-1 pointer-events-none">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeColor} shadow-md flex items-center gap-1`}>
              <CreditCard className="w-2.5 h-2.5" />
              <span>{box.label || (isFront ? 'Front Side' : 'Back Side')}</span>
            </span>
            <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-slate-900/90 text-slate-200 border border-slate-700 backdrop-blur-sm">
              85.6 × 54 mm
            </span>
          </div>

          {/* Center Crosshair Marker */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <div className="w-3 h-0.5 bg-white/70"></div>
            <div className="h-3 w-0.5 bg-white/70 absolute"></div>
          </div>
        </div>

        {/* 8-Point Resize Handles (only for active box and when not drawing) */}
        {isActive && !isDrawMode && (
          <>
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 'nw')}
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-nw-resize z-30 shadow hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 'ne')}
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-ne-resize z-30 shadow hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 'sw')}
              className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-sw-resize z-30 shadow hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 'se')}
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-se-resize z-30 shadow hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 'n')}
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-n-resize z-30 shadow hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 's')}
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-s-resize z-30 shadow hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 'w')}
              className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-w-resize z-30 shadow hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => handleBoxMouseDown(e, box, 'e')}
              className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-full cursor-e-resize z-30 shadow hover:scale-125 transition-transform"
            />
          </>
        )}
      </div>
    );
  };

  // Render Live Preview of Crop Box Being Drawn
  const renderDrawnBoxPreview = () => {
    if (!isDrawing || !drawStartPercent || !drawCurrentPercent || !sourceCanvas) return null;

    let rawMinX = Math.min(drawStartPercent.x, drawCurrentPercent.x);
    let rawMinY = Math.min(drawStartPercent.y, drawCurrentPercent.y);
    let rawW = Math.abs(drawCurrentPercent.x - drawStartPercent.x);
    let rawH = Math.abs(drawCurrentPercent.y - drawStartPercent.y);

    if (lockAspectRatio) {
      const imageRatio = sourceCanvas.width / sourceCanvas.height;
      const targetPercentRatio = CR80_ASPECT_RATIO / imageRatio;
      rawH = rawW / targetPercentRatio;
      if (drawCurrentPercent.y < drawStartPercent.y) {
        rawMinY = Math.max(0, drawStartPercent.y - rawH);
      }
    }

    const isFront = drawTarget === 'front';

    return (
      <div
        id="drawing-crop-box-preview"
        style={{
          left: `${rawMinX}%`,
          top: `${rawMinY}%`,
          width: `${rawW}%`,
          height: `${rawH}%`,
        }}
        className={`absolute border-2 border-dashed ${
          isFront ? 'border-emerald-400 bg-emerald-400/20' : 'border-blue-400 bg-blue-400/20'
        } z-30 pointer-events-none shadow-2xl animate-pulse`}
      >
        <div className="absolute -top-7 left-0 bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700 shadow flex items-center gap-1.5 whitespace-nowrap">
          <Pencil className="w-3 h-3 text-amber-400" />
          <span className="font-bold text-amber-300">Drawing {isFront ? 'Front' : 'Back'} Box</span>
          <span>•</span>
          <span className="text-emerald-300 font-semibold">{rawW.toFixed(1)}% × {rawH.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Top Toolbar: Active Box Selector, Manual Draw, Smart Snap, Ratio Lock, Password & Zoom */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active Box Selector (Front vs Back) */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              id="select-front-box-btn"
              onClick={() => onActiveBoxChange('front')}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1.5 ${
                activeBoxId === 'front'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
              <span>Front Side</span>
              <kbd className="hidden sm:inline-block text-[9px] opacity-70 bg-black/30 px-1 rounded">F</kbd>
            </button>

            {isDualSided && (
              <button
                id="select-back-box-btn"
                onClick={() => onActiveBoxChange('back')}
                className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1.5 ${
                  activeBoxId === 'back'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                <span>Back Side</span>
                <kbd className="hidden sm:inline-block text-[9px] opacity-70 bg-black/30 px-1 rounded">B</kbd>
              </button>
            )}
          </div>

          {/* MANUAL DRAW CROP BOX BUTTON */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              id="manual-draw-crop-box-btn"
              onClick={() => {
                setIsDrawMode(!isDrawMode);
                setDrawTarget(activeBoxId);
              }}
              className={`px-2.5 py-1 rounded-md font-semibold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                isDrawMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 animate-pulse font-bold'
                  : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border border-amber-500/40'
              }`}
              title="Click and drag directly on document to manually draw a custom crop box (Press 'D')"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{isDrawMode ? 'Drawing Mode Active' : 'Draw Crop Box'}</span>
              <kbd className="hidden sm:inline-block text-[9px] bg-black/30 px-1 rounded text-amber-200">D</kbd>
            </button>

            {isDrawMode && (
              <div className="flex items-center gap-1 pl-1.5 pr-0.5">
                <button
                  onClick={() => setDrawTarget('front')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    drawTarget === 'front' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Front
                </button>
                {isDualSided && (
                  <button
                    onClick={() => setDrawTarget('back')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      drawTarget === 'back' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsDrawMode(false);
                    setIsDrawing(false);
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 rounded"
                  title="Cancel Drawing (ESC)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Swap Front / Back */}
          {isDualSided && onSwapSides && (
            <button
              id="swap-sides-btn"
              onClick={onSwapSides}
              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1 text-xs"
              title="Swap Front and Back crop boxes (Press 'S')"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Swap Sides</span>
            </button>
          )}

          {/* Smart Auto-Snap */}
          <button
            id="smart-snap-btn"
            onClick={handleSmartSnap}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-md font-medium text-xs transition active:scale-95"
            title="Auto-detect card edges and snap crop box tightly"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Smart Snap Border</span>
          </button>

          {/* Lock Aspect Ratio (85.60 × 53.98 mm) */}
          <button
            id="lock-aspect-ratio-btn"
            onClick={onToggleLockAspectRatio}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition ${
              lockAspectRatio
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Lock aspect ratio to standard ISO/IEC 7810 ID-1 PVC card (85.6 × 54 mm)"
          >
            {lockAspectRatio ? (
              <Lock className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">CR80 (85.6×54mm)</span>
          </button>

          {/* Save Template Button */}
          {onOpenSaveTemplate && (
            <button
              id="save-template-btn"
              onClick={onOpenSaveTemplate}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-md font-medium text-xs transition shadow-sm active:scale-95"
              title="Save current crop box positions as a reusable template to auto-crop future matching PDFs"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save Template</span>
            </button>
          )}

          {/* Quick PDF Password Entry Option in Toolbar */}
          {isPdf && (
            <div className="relative">
              <button
                id="canvas-pdf-password-btn"
                onClick={() => setIsPasswordPopoverOpen(!isPasswordPopoverOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition shadow-sm active:scale-95 ${
                  isPasswordLocked 
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse' 
                    : inlinePassword 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700' 
                    : 'bg-slate-850 text-slate-300 border-slate-700 hover:text-amber-300'
                }`}
                title="Enter or update PDF password for decryption (automatically forces CAPITAL LETTERS)"
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">PDF Password</span>
                {inlinePassword && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </button>

              {/* Password Popover Dropdown */}
              {isPasswordPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-amber-500/40 rounded-xl p-3.5 shadow-2xl z-50 animate-fade-in text-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      <span>PDF Document Password</span>
                    </span>
                    <button
                      onClick={() => setIsPasswordPopoverOpen(false)}
                      className="text-slate-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showPasswordText ? 'text' : 'password'}
                        value={inlinePassword}
                        onChange={(e) => setInlinePassword(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleInlineUnlock();
                            setIsPasswordPopoverOpen(false);
                          }
                        }}
                        placeholder="e.g. SAMI1994 or DDMMYYYY"
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg py-1.5 pl-2.5 pr-8 text-xs font-mono uppercase text-slate-100 tracking-wider focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                      >
                        {showPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberBatch}
                        onChange={(e) => setRememberBatch(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-amber-500 w-3 h-3"
                      />
                      <span>Remember for batch processing</span>
                    </label>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] text-slate-500">Aadhaar: NAME4+YYYY</span>
                      <button
                        onClick={() => {
                          handleInlineUnlock();
                          setIsPasswordPopoverOpen(false);
                        }}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition flex items-center gap-1 shadow"
                      >
                        <Key className="w-3 h-3" />
                        <span>Unlock</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DOCUMENT ZOOM+ ZOOM- & VIEW CONTROLS */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {/* Zoom - Button */}
          <button
            id="zoom-out-btn"
            onClick={() => setZoom((z) => Math.max(0.15, z * 0.85))}
            className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition text-xs font-semibold"
            title="Zoom Out Document (-)"
          >
            <ZoomOut className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline font-mono">Zoom -</span>
          </button>

          {/* Quick Zoom Level Selector */}
          <select
            id="zoom-level-select"
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="bg-slate-900 text-slate-200 border border-slate-700 text-[11px] rounded px-1.5 py-0.5 font-mono focus:outline-none"
          >
            <option value="25">25%</option>
            <option value="50">50%</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
            <option value="125">125%</option>
            <option value="150">150%</option>
            <option value="200">200%</option>
            <option value="300">300%</option>
          </select>

          {/* Zoom + Button */}
          <button
            id="zoom-in-btn"
            onClick={() => setZoom((z) => Math.min(4.0, z * 1.15))}
            className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition text-xs font-semibold"
            title="Zoom In Document (+)"
          >
            <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline font-mono">Zoom +</span>
          </button>

          {/* Fit to Screen */}
          <button
            id="fit-screen-btn"
            onClick={fitToScreen}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition"
            title="Fit Document to Screen"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>

          {/* Rotate Page */}
          <button
            id="rotate-page-btn"
            onClick={onRotatePage}
            className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 transition"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* PDF Page Navigator */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1 text-slate-400 disabled:opacity-30 hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1 text-slate-400 disabled:opacity-30 hover:text-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Manual Draw Mode Active Alert Banner */}
      {isDrawMode && (
        <div className="bg-amber-950/90 border-b border-amber-600/70 text-amber-200 px-4 py-2 text-xs flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="font-semibold">
              Manual Draw Active: Click and drag anywhere on the document below to draw your <strong className="text-white underline">{drawTarget === 'front' ? 'Front Side' : 'Back Side'}</strong> crop box.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleLockAspectRatio()}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                lockAspectRatio ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {lockAspectRatio ? '🔒 Lock Card Ratio (85.6×54mm)' : '🔓 Freeform Ratio'}
            </button>
            <button
              onClick={() => {
                setIsDrawMode(false);
                setIsDrawing(false);
              }}
              className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-bold border border-slate-600 transition"
            >
              Cancel (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Multi-Page PDF Front / Back Source Page Routing Bar */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-blue-900/40 text-xs gap-2">
          {/* Front & Back Page Dropdowns */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-emerald-900/60">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-[11px] font-semibold text-emerald-300">Front Page:</span>
              <select
                id="front-page-selector"
                value={frontPageNumber}
                onChange={(e) => onFrontPageChange && onFrontPageChange(Number(e.target.value))}
                className="bg-slate-900 text-slate-100 border border-slate-700 text-xs rounded px-1.5 py-0.5 focus:ring-1 focus:ring-emerald-500 font-mono"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    Page {p} {p === currentPage ? '(Current)' : ''}
                  </option>
                ))}
              </select>
              {currentPage === frontPageNumber && (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1 rounded font-medium">Active</span>
              )}
            </div>

            {isDualSided && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-blue-900/60">
                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                <span className="text-[11px] font-semibold text-blue-300">Back Page:</span>
                <select
                  id="back-page-selector"
                  value={backPageNumber}
                  onChange={(e) => onBackPageChange && onBackPageChange(Number(e.target.value))}
                  className="bg-slate-900 text-slate-100 border border-slate-700 text-xs rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 font-mono"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      Page {p} {p === currentPage ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
                {currentPage === backPageNumber && (
                  <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800 px-1 rounded font-medium">Active</span>
                )}
              </div>
            )}
          </div>

          {/* Quick Page Assignment Buttons */}
          <div className="flex items-center gap-1.5">
            {onSetCurrentPageAsFront && (
              <button
                onClick={onSetCurrentPageAsFront}
                disabled={currentPage === frontPageNumber}
                className="px-2 py-1 bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-700 rounded text-[11px] font-medium transition disabled:opacity-40"
                title={`Set current view (Page ${currentPage}) as the Front side source`}
              >
                📌 Set P{currentPage} as Front
              </button>
            )}

            {isDualSided && onSetCurrentPageAsBack && (
              <button
                onClick={onSetCurrentPageAsBack}
                disabled={currentPage === backPageNumber}
                className="px-2 py-1 bg-slate-800 hover:bg-blue-950 text-slate-300 hover:text-blue-300 border border-slate-700 hover:border-blue-700 rounded text-[11px] font-medium transition disabled:opacity-40"
                title={`Set current view (Page ${currentPage}) as the Back side source`}
              >
                📌 Set P{currentPage} as Back
              </button>
            )}

            {isDualSided && onFrontPageChange && onBackPageChange && totalPages >= 2 && (
              <button
                onClick={() => {
                  onFrontPageChange(1);
                  onBackPageChange(2);
                }}
                className="px-2 py-1 bg-blue-950/60 hover:bg-blue-900/80 text-blue-200 border border-blue-800/80 rounded text-[11px] font-semibold transition"
                title="Auto-assign Page 1 as Front Side and Page 2 as Back Side"
              >
                ⚡ P1 Front + P2 Back
              </button>
            )}

            {isDualSided && onFrontPageChange && onBackPageChange && (
              <button
                onClick={() => {
                  onFrontPageChange(1);
                  onBackPageChange(1);
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                title="Crop both Front and Back from Page 1 (e.g. e-Aadhaar)"
              >
                ⚡ Both on P1
              </button>
            )}
          </div>
        </div>
      )}

      {/* Smart Snap notification badge */}
      {smartDetectedMsg && (
        <div className="bg-amber-950/80 border-b border-amber-700/50 text-amber-200 px-4 py-1.5 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{smartDetectedMsg}</span>
          </div>
        </div>
      )}

      {/* Interactive Main Canvas Viewport */}
      <div
        ref={containerRef}
        id="canvas-viewport"
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onWheel={handleWheel}
        className={`flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center min-h-[420px] ${
          isDrawMode ? 'cursor-crosshair' : ''
        }`}
      >
        {/* CASE 1: Password Locked PDF - Prominent In-Canvas Password Box */}
        {isPasswordLocked ? (
          <div className="w-full max-w-md p-6 bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl backdrop-blur-md text-slate-100 z-30 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100">Password-Protected PDF</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    Locked
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate max-w-[280px]" title={lockedFileName}>
                  {lockedFileName || 'e-Aadhaar / ID Card Document'}
                </p>
              </div>
            </div>

            {/* Smart Password Hints */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs mb-4 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>e-Aadhaar Password Rule:</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                First 4 letters of name in <strong className="text-white">CAPITAL LETTERS</strong> + 4-digit Year of Birth (e.g. <span className="font-mono text-emerald-400 font-bold">SAMI1994</span>).
              </p>
              <div className="pt-1 text-[10px] text-slate-400 flex items-center gap-2">
                <span>PAN Card: <strong className="text-slate-300">DDMMYYYY</strong></span>
                <span>•</span>
                <span>Voter/EPIC: <strong className="text-slate-300">EPIC No / Mobile</strong></span>
              </div>
            </div>

            {/* Password Entry Form */}
            <form onSubmit={handleInlineUnlock} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter Password to Unlock:
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={inlinePassword}
                    onChange={(e) => {
                      setInlinePassword(e.target.value.toUpperCase());
                      setPasswordError(false);
                    }}
                    placeholder="e.g. SAMI1994 or DDMMYYYY"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl p-3 text-sm text-slate-100 font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white p-0.5"
                    title={showPasswordText ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Please enter a password</span>
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rememberBatch}
                  onChange={(e) => setRememberBatch(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Remember password for remaining batch documents</span>
              </label>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2 mt-2 active:scale-98"
              >
                <Key className="w-4 h-4" />
                <span>Unlock & Render Document</span>
              </button>
            </form>
          </div>
        ) : sourceCanvas ? (
          /* CASE 2: Loaded Canvas */
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              width: sourceCanvas.width,
              height: sourceCanvas.height,
            }}
            className="absolute top-0 left-0 shadow-2xl transition-transform duration-75"
          >
            {/* Background PDF Direct Canvas Rendering - 100% Vector & QR Sharpness */}
            <canvas
              ref={(el) => {
                mainCanvasRef.current = el;
                drawToMainCanvas(el);
              }}
              width={sourceCanvas.width}
              height={sourceCanvas.height}
              className="w-full h-full pointer-events-none select-none block bg-white"
            />

            {/* Conditional Crop Box Overlays for Multi-Page Awareness */}
            {frontPageNumber === backPageNumber ? (
              // Both on same page
              <>
                {renderCropBoxOverlay(frontBox, activeBoxId === 'front')}
                {isDualSided && backBox && renderCropBoxOverlay(backBox, activeBoxId === 'back')}
              </>
            ) : (
              // Front & Back are on separate pages
              <>
                {currentPage === frontPageNumber && renderCropBoxOverlay(frontBox, activeBoxId === 'front')}
                {currentPage === backPageNumber && isDualSided && backBox && renderCropBoxOverlay(backBox, activeBoxId === 'back')}
              </>
            )}

            {/* Live Drawn Crop Box Preview */}
            {renderDrawnBoxPreview()}
          </div>
        ) : (
          /* CASE 3: Empty State */
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 z-10">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
              <FolderOpen className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No Document Loaded</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              Upload an e-Aadhaar, Voter ID, Ration Card, or PAN PDF to automatically extract PVC-ready CR80 card cuts.
            </p>
            {onOpenFileClick && (
              <button
                onClick={onOpenFileClick}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition active:scale-95"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Open PDF / Image Document</span>
              </button>
            )}
          </div>
        )}

        {/* Floating Zoom & Canvas View Controls HUD */}
        {sourceCanvas && (
          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-2xl flex items-center gap-1 z-30">
            <button
              onClick={() => setZoom((z) => Math.min(4.0, z * 1.15))}
              className="p-1.5 hover:bg-slate-800 text-emerald-400 rounded-lg transition"
              title="Zoom In Document (Zoom +)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setZoom(1.0)}
              className="px-2 py-1 font-mono text-[11px] text-slate-200 font-bold bg-slate-950 rounded-md border border-slate-800 hover:border-slate-600 transition"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={() => setZoom((z) => Math.max(0.15, z * 0.85))}
              className="p-1.5 hover:bg-slate-800 text-blue-400 rounded-lg transition"
              title="Zoom Out Document (Zoom -)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="w-px h-4 bg-slate-700 mx-0.5"></div>

            <button
              onClick={fitToScreen}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
              title="Fit Document to Screen"
            >
              <Maximize className="w-4 h-4" />
            </button>

            <button
              onClick={onRotatePage}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
              title="Rotate Page 90° Clockwise"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Source Page Info Pill */}
        {sourceCanvas && totalPages > 1 && (
          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm border border-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 z-20 shadow-md">
            <span className="font-semibold text-blue-400">Viewing Page {currentPage} of {totalPages}</span>
            {currentPage === frontPageNumber && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                Front Source
              </span>
            )}
            {currentPage === backPageNumber && isDualSided && (
              <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">
                Back Source
              </span>
            )}
          </div>
        )}

        {/* Floating Pan/Zoom Helper */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-800 text-slate-400 px-2.5 py-1 rounded-md text-[11px] flex items-center gap-2 pointer-events-none z-10">
          <Move className="w-3 h-3 text-slate-400" />
          <span>Middle-Click / Alt+Drag to Pan • Press 'D' to Draw Crop Box • Press 'F' / 'B' / 'S' • Zoom +/-</span>
        </div>
      </div>

      {/* Bottom Fine Nudge & Position Bar */}
      <div className="px-4 py-2 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
        {/* Fine Nudge Controls & Draw Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setIsDrawMode(!isDrawMode);
              setDrawTarget(activeBoxId);
            }}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition ${
              isDrawMode
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-750'
            }`}
          >
            <Pencil className="w-3 h-3 text-amber-400" />
            <span>{isDrawMode ? 'Exit Draw Mode' : '✏️ Draw Custom Crop Box'}</span>
          </button>

          <span className="text-slate-400 font-medium">Fine Nudge ({activeBoxId === 'front' ? 'Front' : 'Back'}):</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              onClick={() => handleNudge(-nudgeStep, 0)}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              title="Move Left"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleNudge(0, -nudgeStep)}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              title="Move Up"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleNudge(0, nudgeStep)}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              title="Move Down"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleNudge(nudgeStep, 0)}
              className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded"
              title="Move Right"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setNudgeStep(0.2)}
              className={`px-1.5 py-0.5 rounded ${nudgeStep === 0.2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              0.2%
            </button>
            <button
              onClick={() => setNudgeStep(0.5)}
              className={`px-1.5 py-0.5 rounded ${nudgeStep === 0.5 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              0.5%
            </button>
            <button
              onClick={() => setNudgeStep(1.0)}
              className={`px-1.5 py-0.5 rounded ${nudgeStep === 1.0 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              1.0%
            </button>
          </div>
        </div>

        {/* Real-time Position & Size Display */}
        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${activeBoxId === 'front' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <span className="text-slate-200 font-semibold">{activeBoxId.toUpperCase()}:</span>
          </div>
          <div>
            <span className="text-slate-500">X: </span>
            <span className="text-slate-200">{activeBox.x}%</span>
          </div>
          <div>
            <span className="text-slate-500">Y: </span>
            <span className="text-slate-200">{activeBox.y}%</span>
          </div>
          <div>
            <span className="text-slate-500">W: </span>
            <span className="text-slate-200">{activeBox.width}%</span>
          </div>
          <div>
            <span className="text-slate-500">H: </span>
            <span className="text-slate-200">{activeBox.height}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
