import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Download, Maximize2, X, Crop, Image, FileText } from 'lucide-react';
import { Language } from '../types';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayOptions {
  includeLogo: boolean;
  includeLegend: boolean;
}

interface LightshotCaptureOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (action: 'copy' | 'save', rect?: CropRect, options?: OverlayOptions) => void;
  language: Language;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  isProcessing?: boolean;
  theme?: 'light' | 'dark';
  legendText?: string;
}

type DragMode = 'draw' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w' | null;

export const LightshotCaptureOverlay: React.FC<LightshotCaptureOverlayProps> = ({
  isOpen,
  onClose,
  onCapture,
  language,
  containerRef,
  isProcessing = false,
  theme = 'dark',
  legendText,
}) => {
  const [rect, setRect] = useState<CropRect | null>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);

  // Overlay options: Logo & Legend (watermark is permanently present on the map)
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);

  const dragStartRef = useRef<{ x: number; y: number; initialRect: CropRect | null }>({
    x: 0,
    y: 0,
    initialRect: null,
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  const getContainer = useCallback(() => {
    return containerRef?.current || overlayRef.current;
  }, [containerRef]);

  // Initialize or reset when opening
  useEffect(() => {
    if (isOpen) {
      setRect(null);
      setDragMode(null);
    }
  }, [isOpen]);

  // Handle Full Map Selection
  const handleSelectFullMap = useCallback(() => {
    const container = getContainer();
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    setRect({
      x: 0,
      y: 0,
      width: clientWidth,
      height: clientHeight,
    });
  }, [getContainer]);

  // Get pointer coordinates relative to the map container
  const getRelativeCoords = (clientX: number, clientY: number) => {
    const container = getContainer();
    if (!container) return { x: 0, y: 0, bounds: { width: 0, height: 0, left: 0, top: 0 } };
    const bounds = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - bounds.left, bounds.width));
    const y = Math.max(0, Math.min(clientY - bounds.top, bounds.height));
    return { x, y, bounds };
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    mode: DragMode = 'draw'
  ) => {
    if (isProcessing) return;
    e.stopPropagation();
    // Only left click / single touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const { x, y } = getRelativeCoords(e.clientX, e.clientY);
    dragStartRef.current = {
      x,
      y,
      initialRect: rect ? { ...rect } : null,
    };
    setDragMode(mode);

    if (mode === 'draw') {
      setRect({
        x,
        y,
        width: 0,
        height: 0,
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragMode || isProcessing) return;
    e.stopPropagation();

    const { x: currentX, y: currentY, bounds } = getRelativeCoords(e.clientX, e.clientY);
    const { x: startX, y: startY, initialRect } = dragStartRef.current;
    const dx = currentX - startX;
    const dy = currentY - startY;

    if (dragMode === 'draw') {
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      setRect({ x: left, y: top, width, height });
    } else if (dragMode === 'move' && initialRect) {
      const newX = Math.max(0, Math.min(bounds.width - initialRect.width, initialRect.x + dx));
      const newY = Math.max(0, Math.min(bounds.height - initialRect.height, initialRect.y + dy));
      setRect({
        ...initialRect,
        x: newX,
        y: newY,
      });
    } else if (initialRect) {
      // Handle corner and edge resizing
      let newX = initialRect.x;
      let newY = initialRect.y;
      let newW = initialRect.width;
      let newH = initialRect.height;

      if (dragMode.includes('w')) {
        const potentialW = initialRect.width - dx;
        if (potentialW >= 20) {
          newX = initialRect.x + dx;
          newW = potentialW;
        }
      }
      if (dragMode.includes('e')) {
        newW = Math.max(20, Math.min(bounds.width - newX, initialRect.width + dx));
      }
      if (dragMode.includes('n')) {
        const potentialH = initialRect.height - dy;
        if (potentialH >= 20) {
          newY = initialRect.y + dy;
          newH = potentialH;
        }
      }
      if (dragMode.includes('s')) {
        newH = Math.max(20, Math.min(bounds.height - newY, initialRect.height + dy));
      }

      setRect({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
        width: Math.max(20, newW),
        height: Math.max(20, newH),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragMode) return;
    e.stopPropagation();
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }

    if (dragMode === 'draw' && rect) {
      if (rect.width < 15 || rect.height < 15) {
        setRect(null);
      }
    }
    setDragMode(null);
  };

  const triggerCapture = useCallback((action: 'copy' | 'save') => {
    window.focus();
    const currentOptions: OverlayOptions = {
      includeLogo,
      includeLegend,
    };
    const validTargetRect = rect && rect.width >= 15 && rect.height >= 15 ? rect : undefined;
    onCapture(action, validTargetRect, currentOptions);
  }, [includeLogo, includeLegend, onCapture, rect]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        triggerCapture('copy');
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        triggerCapture('save');
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        triggerCapture('copy');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, triggerCapture]);

  if (!isOpen) return null;

  const container = getContainer();
  const containerW = container?.clientWidth || window.innerWidth;
  const containerH = container?.clientHeight || window.innerHeight;

  const validRect = rect && rect.width >= 10 && rect.height >= 10 ? rect : null;

  // Calculate toolbar positioning so it stays on-screen
  const toolbarTop = validRect
    ? validRect.y + validRect.height + 12 > containerH - 70
      ? Math.max(12, validRect.y - 56)
      : validRect.y + validRect.height + 10
    : 0;

  const toolbarRight = validRect
    ? Math.max(12, Math.min(containerW - 380, containerW - (validRect.x + validRect.width)))
    : 0;

  return (
    <div
      ref={overlayRef}
      id="lightshot-capture-overlay"
      className="screenshot-exclude absolute inset-0 z-[9999] select-none overflow-hidden touch-none"
      onPointerDown={(e) => handlePointerDown(e, 'draw')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        cursor: dragMode === 'draw' ? 'crosshair' : validRect ? 'crosshair' : 'crosshair',
      }}
    >
      {/* Background Dim Backdrop */}
      {!validRect && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1.5px] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-200">
          <div className="bg-slate-900/90 border border-cyan-500/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex flex-col items-center gap-2 max-w-sm text-center animate-fade-in pointer-events-auto">
            <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Crop className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-slate-100">
              {language === 'uk'
                ? 'Виділіть область на мапі'
                : 'Select an area on the map'}
            </p>
            <p className="text-xs text-slate-400">
              {language === 'uk'
                ? 'Клікніть і потягніть мишкою, щоб вибрати зону, після чого автоматично накладуться водяний знак, логотип та легенда.'
                : 'Click and drag to select an area; watermark, logo, and legend will be overlaid onto your selection.'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleSelectFullMap}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md"
              >
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{language === 'uk' ? 'Вся мапа' : 'Full Map'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{language === 'uk' ? 'Скасувати (Esc)' : 'Cancel (Esc)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Area Highlight and Cutout Box: Clean area showing only map, markers, alerts, watermark, lines */}
      {validRect && (
        <>
          <div
            className="absolute border-2 border-cyan-400 pointer-events-auto overflow-hidden"
            style={{
              left: `${validRect.x}px`,
              top: `${validRect.y}px`,
              width: `${validRect.width}px`,
              height: `${validRect.height}px`,
              boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.58)',
              cursor: 'move',
            }}
            onPointerDown={(e) => handlePointerDown(e, 'move')}
          >
            {/* Dimension Badge (Lightshot Style) */}
            <div className="absolute -top-7 left-0 bg-slate-950/90 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-tight shadow-md select-none pointer-events-none whitespace-nowrap z-[10]">
              {Math.round(validRect.width)} × {Math.round(validRect.height)} px
            </div>

            {/* Corner Resize Handles */}
            <div
              className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-nwse-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 'nw')}
            />
            <div
              className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-nesw-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 'ne')}
            />
            <div
              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-nwse-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 'se')}
            />
            <div
              className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-nesw-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 'sw')}
            />

            {/* Edge Resize Handles */}
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-ns-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 'n')}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-4 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-ew-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 'e')}
            />
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-ns-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 's')}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-4 bg-white border border-cyan-500 shadow-sm rounded-xs cursor-ew-resize z-[10]"
              onPointerDown={(e) => handlePointerDown(e, 'w')}
            />
          </div>

          {/* Floating Action Toolbar with Overlay Toggles: Logo & Legend (Watermark button removed) */}
          <div
            className="absolute z-[10000] flex flex-wrap items-center gap-1.5 bg-slate-900/95 border border-slate-700/80 rounded-xl p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-md pointer-events-auto animate-fade-in"
            style={{
              top: `${toolbarTop}px`,
              right: `${toolbarRight}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Overlay Toggles: Logo & Legend */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 mr-1">
              <button
                type="button"
                onClick={() => setIncludeLogo((prev) => !prev)}
                title={language === 'uk' ? 'Накласти логотип на результат' : 'Overlay logo on result'}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  includeLogo
                    ? 'bg-amber-600/90 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <Image className="w-3 h-3" />
                <span className="hidden sm:inline">{language === 'uk' ? 'Лого' : 'Logo'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeLegend((prev) => !prev)}
                title={language === 'uk' ? 'Накласти легенду на результат' : 'Overlay legend on result'}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  includeLegend
                    ? 'bg-emerald-600/90 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">{language === 'uk' ? 'Легенда' : 'Legend'}</span>
              </button>
            </div>

            {/* Copy Button (Cyan High-Contrast - primary action) */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                window.focus();
                triggerCapture('copy');
              }}
              title={language === 'uk' ? 'Копіювати в буфер (Ctrl+C або Enter)' : 'Copy to clipboard (Ctrl+C or Enter)'}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-4 h-4 stroke-[2.5]" />
              <span>{language === 'uk' ? 'Копіювати' : 'Copy'}</span>
            </button>

            {/* Save PNG Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => triggerCapture('save')}
              title={language === 'uk' ? 'Зберегти як PNG (Ctrl+S)' : 'Save as PNG (Ctrl+S)'}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>{language === 'uk' ? 'Зберегти' : 'Save'}</span>
            </button>

            {/* Full Map Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSelectFullMap}
              title={language === 'uk' ? 'Виділити всю мапу' : 'Select full map'}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'uk' ? 'Вся мапа' : 'Full'}</span>
            </button>

            {/* Cancel Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              title={language === 'uk' ? 'Скасувати (Esc)' : 'Cancel (Esc)'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer ml-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
