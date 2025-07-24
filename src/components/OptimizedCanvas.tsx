'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface OptimizedCanvasProps {
  width?: number;
  height?: number;
  onPixelPlace?: (x: number, y: number, color: string) => void;
  selectedColor: string;
  canPlace: boolean;
  canvas?: string[][];
  highlightedPixel?: { x: number; y: number } | null;
}

export default function OptimizedCanvas({
  width = 64,
  height = 64,
  onPixelPlace,
  selectedColor,
  canPlace,
  canvas: externalCanvas,
  highlightedPixel
}: OptimizedCanvasProps) {
  const [localCanvas, setLocalCanvas] = useState<string[][]>([]);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number} | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{x: number, y: number} | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const panTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const canvas = externalCanvas || localCanvas;

  useEffect(() => {
    if (!externalCanvas) {
      const initialCanvas = Array(height).fill(null).map(() => 
        Array(width).fill('#FFFFFF')
      );
      setLocalCanvas(initialCanvas);
    }
  }, [width, height, externalCanvas]);

  const getPixelSize = useCallback(() => {
    if (!containerRef.current) {
      return 2; // Default fallback that ensures visibility
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const maxPixelSize = Math.min(containerRect.width / width, containerRect.height / height) * 0.9;
    return Math.max(1, Math.min(zoom * maxPixelSize, maxPixelSize * 50));
  }, [zoom, width, height]);

  const pixelSize = getPixelSize();

  // Simple, reliable canvas rendering
  const drawCanvas = useCallback(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement || !canvas.length || pixelSize <= 0) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Always set white background first
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // Draw all pixels - simple and reliable approach
    try {
      for (let y = 0; y < height && y < canvas.length; y++) {
        const row = canvas[y];
        if (!row) continue;
        
        for (let x = 0; x < width && x < row.length; x++) {
          const color = row[x];
          if (color && color !== '#FFFFFF') {
            ctx.fillStyle = color;
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          }
        }
      }
    } catch (error) {
      console.error('Error drawing canvas:', error);
    }
  }, [canvas, pixelSize, width, height]);

  // Draw overlay (hover, highlight)
  const drawOverlay = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    // Clear overlay
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.imageSmoothingEnabled = false;

    // Draw hovered pixel
    if (hoveredPixel && !isPanning && canPlace) {
      ctx.fillStyle = selectedColor;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(hoveredPixel.x * pixelSize, hoveredPixel.y * pixelSize, pixelSize, pixelSize);
      ctx.globalAlpha = 1;
    }

    // Draw highlighted pixel
    if (highlightedPixel) {
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = Math.max(2, pixelSize * 0.15);
      ctx.strokeRect(
        highlightedPixel.x * pixelSize + ctx.lineWidth / 2,
        highlightedPixel.y * pixelSize + ctx.lineWidth / 2,
        pixelSize - ctx.lineWidth,
        pixelSize - ctx.lineWidth
      );
    }
  }, [hoveredPixel, highlightedPixel, isPanning, canPlace, selectedColor, pixelSize]);

  // Animation frame-based rendering
  const scheduleRedraw = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      drawCanvas();
      drawOverlay();
      animationFrameRef.current = null;
    });
  }, [drawCanvas, drawOverlay]);

  // Immediate redraw for urgent updates
  const immediateRedraw = useCallback(() => {
    drawCanvas();
    drawOverlay();
  }, [drawCanvas, drawOverlay]);

  // Update canvas size and trigger redraw when needed
  useEffect(() => {
    const canvasElement = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvasElement || !overlayCanvas) return;

    const canvasWidth = width * pixelSize;
    const canvasHeight = height * pixelSize;


    // Update canvas dimensions
    canvasElement.width = canvasWidth;
    canvasElement.height = canvasHeight;
    canvasElement.style.width = `${canvasWidth}px`;
    canvasElement.style.height = `${canvasHeight}px`;
    
    overlayCanvas.width = canvasWidth;
    overlayCanvas.height = canvasHeight;
    overlayCanvas.style.width = `${canvasWidth}px`;
    overlayCanvas.style.height = `${canvasHeight}px`;

    // Force immediate redraw after canvas resize
    setTimeout(() => {
      immediateRedraw();
    }, 0);
  }, [width, height, pixelSize, immediateRedraw]);

  // Redraw when canvas data or states change
  useEffect(() => {
    scheduleRedraw();
  }, [canvas, hoveredPixel, highlightedPixel, zoom, pan, scheduleRedraw]);

  const updateHoverFromMouse = useCallback((clientX: number, clientY: number) => {
    if (!canPlace || !containerRef.current || !canvasRef.current) return;
    
    // Get the actual canvas element position (accounts for flex centering + transform)
    const canvasElement = canvasRef.current;
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Calculate position relative to the actual canvas element
    const canvasX = clientX - canvasRect.left;
    const canvasY = clientY - canvasRect.top;
    
    // Calculate pixel coordinates
    const x = Math.floor(canvasX / pixelSize);
    const y = Math.floor(canvasY / pixelSize);
    
    // Simple bounds checking - just ensure we're within the logical canvas
    if (x >= 0 && x < width && y >= 0 && y < height) {
      if (!hoveredPixel || hoveredPixel.x !== x || hoveredPixel.y !== y) {
        setHoveredPixel({ x, y });
      }
    } else {
      if (hoveredPixel) {
        setHoveredPixel(null);
      }
    }
  }, [canPlace, pixelSize, width, height, hoveredPixel]);

  useEffect(() => {
    if (lastMousePos && !isPanning) {
      updateHoverFromMouse(lastMousePos.x, lastMousePos.y);
    }
  }, [zoom, pan, lastMousePos, isPanning, updateHoverFromMouse]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    if (e.buttons === 4 || e.shiftKey || isPanning) {
      if (panTimeoutRef.current) {
        clearTimeout(panTimeoutRef.current);
      }
      
      setPan(prev => ({
        x: prev.x - e.deltaX * 0.5,
        y: prev.y - e.deltaY * 0.5
      }));
      
      panTimeoutRef.current = setTimeout(() => {
        if (lastMousePos) {
          updateHoverFromMouse(lastMousePos.x, lastMousePos.y);
        }
      }, 100);
    } else {
      // Zoom to cursor
      setIsZooming(true);
      
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      const containerRect = containerRef.current?.getBoundingClientRect();
      
      if (containerRect) {
        // Get mouse position relative to container
        const mouseX = e.clientX - containerRect.left;
        const mouseY = e.clientY - containerRect.top;
        
        // Get current canvas center in container coordinates
        const containerCenterX = containerRect.width / 2;
        const containerCenterY = containerRect.height / 2;
        const currentCanvasCenterX = containerCenterX + pan.x;
        const currentCanvasCenterY = containerCenterY + pan.y;
        
        // Calculate mouse position relative to current canvas center
        const mouseOffsetX = mouseX - currentCanvasCenterX;
        const mouseOffsetY = mouseY - currentCanvasCenterY;
        
        setZoom(prevZoom => {
          const newZoom = Math.max(1, Math.min(prevZoom * zoomFactor, 50));
          
          // Calculate how much the canvas will grow/shrink
          const scaleDelta = newZoom / prevZoom - 1;
          
          // Adjust pan so that the point under the cursor stays in place
          setPan(prev => ({
            x: prev.x - mouseOffsetX * scaleDelta,
            y: prev.y - mouseOffsetY * scaleDelta
          }));
          
          return newZoom;
        });
      } else {
        setZoom(prev => Math.max(1, Math.min(prev * zoomFactor, 50)));
      }
      
      zoomTimeoutRef.current = setTimeout(() => {
        setIsZooming(false);
        if (lastMousePos) {
          updateHoverFromMouse(lastMousePos.x, lastMousePos.y);
        }
      }, 150);
    }
  }, [isPanning, updateHoverFromMouse, lastMousePos, width, height, pixelSize, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setLastMousePos({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    updateHoverFromMouse(e.clientX, e.clientY);
  }, [isPanning, lastPanPoint, updateHoverFromMouse]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPixel(null);
    setIsPanning(false);
    setLastMousePos(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canPlace || isPanning || !canvasRef.current) return;
    
    // Get the actual canvas element position (accounts for flex centering + transform)
    const canvasElement = canvasRef.current;
    const canvasRect = canvasElement.getBoundingClientRect();
    
    // Calculate position relative to the actual canvas element
    const canvasX = e.clientX - canvasRect.left;
    const canvasY = e.clientY - canvasRect.top;
    
    // Calculate pixel coordinates
    const x = Math.floor(canvasX / pixelSize);
    const y = Math.floor(canvasY / pixelSize);
    
    console.log('Click debug:', {
      canPlace,
      isPanning,
      canvasX,
      canvasY,
      pixelSize,
      x,
      y,
      width,
      height,
      inBounds: x >= 0 && x < width && y >= 0 && y < height
    });
    
    // Simple bounds checking - just ensure we're within the logical canvas
    if (x >= 0 && x < width && y >= 0 && y < height) {
      console.log('Placing pixel at:', x, y);
      if (!externalCanvas) {
        setLocalCanvas(prev => {
          const newCanvas = [...prev];
          newCanvas[y] = [...newCanvas[y]];
          newCanvas[y][x] = selectedColor;
          return newCanvas;
        });
      }
      onPixelPlace?.(x, y, selectedColor);
    } else {
      console.log('Click out of bounds');
    }
  }, [canPlace, isPanning, pixelSize, width, height, externalCanvas, selectedColor, onPixelPlace]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      if (panTimeoutRef.current) {
        clearTimeout(panTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handleWheel]);

  const canvasWidth = width * pixelSize;
  const canvasHeight = height * pixelSize;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isPanning ? 'grabbing' : canPlace ? 'crosshair' : 'not-allowed' }}
    >
      <div 
        className="relative"
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          transformOrigin: 'center center'
        }}
      >
        {/* Main canvas for pixels */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block"
          onClick={handleCanvasClick}
          style={{ 
            imageRendering: 'pixelated',
            willChange: isZooming || isPanning ? 'transform' : 'auto',
            cursor: isPanning ? 'grabbing' : canPlace ? 'crosshair' : 'not-allowed'
          }}
        />
        
        {/* Overlay canvas for hover and highlight effects */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 block pointer-events-none"
          style={{ 
            imageRendering: 'pixelated'
          }}
        />
      </div>
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2">
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.2, 50))}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          +
        </button>
        <div className="text-xs text-center text-gray-600 dark:text-gray-400 w-8">
          {Math.round(zoom)}x
        </div>
        <button
          onClick={() => setZoom(prev => Math.max(prev * 0.8, 1))}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          -
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
        >
          ⌂
        </button>
      </div>

      {/* Help text */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 rounded px-3 py-2">
        Scroll: Zoom • Shift+Scroll: Pan • Middle-click: Drag
      </div>
    </div>
  );
}