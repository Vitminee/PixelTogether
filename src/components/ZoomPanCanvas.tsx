'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ZoomPanCanvasProps {
  width?: number;
  height?: number;
  onPixelPlace?: (x: number, y: number, color: string) => void;
  selectedColor: string;
  canPlace: boolean;
  canvas?: string[][];
  highlightedPixel?: { x: number; y: number } | null;
}

export default function ZoomPanCanvas({
  width = 64,
  height = 64,
  onPixelPlace,
  selectedColor,
  canPlace,
  canvas: externalCanvas,
  highlightedPixel
}: ZoomPanCanvasProps) {
  const [localCanvas, setLocalCanvas] = useState<string[][]>([]);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number} | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{x: number, y: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomTimeoutRef = useRef<NodeJS.Timeout>();
  const panTimeoutRef = useRef<NodeJS.Timeout>();

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
    if (!containerRef.current) return 1;
    const containerRect = containerRef.current.getBoundingClientRect();
    const maxPixelSize = Math.min(containerRect.width / width, containerRect.height / height) * 0.9;
    return Math.max(1, Math.min(zoom * maxPixelSize, maxPixelSize * 50));
  }, [zoom, width, height]);

  const pixelSize = getPixelSize();

  const updateHoverFromMouse = useCallback((clientX: number, clientY: number) => {
    if (!canPlace || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - containerRect.left;
    const relativeY = clientY - containerRect.top;
    
    // Calculate canvas center offset
    const canvasWidth = width * pixelSize;
    const canvasHeight = height * pixelSize;
    const centerX = containerRect.width / 2 - canvasWidth / 2;
    const centerY = containerRect.height / 2 - canvasHeight / 2;
    
    // Calculate pixel position accounting for pan and centering
    const x = Math.floor((relativeX - centerX - pan.x) / pixelSize);
    const y = Math.floor((relativeY - centerY - pan.y) / pixelSize);
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      // Only update if different from current hovered pixel to reduce artifacts
      if (!hoveredPixel || hoveredPixel.x !== x || hoveredPixel.y !== y) {
        setHoveredPixel({ x, y });
      }
    } else {
      if (hoveredPixel) {
        setHoveredPixel(null);
      }
    }
  }, [canPlace, pan, pixelSize, width, height, hoveredPixel]);

  // Update hover position when zoom or pan changes
  useEffect(() => {
    if (lastMousePos && !isPanning) {
      updateHoverFromMouse(lastMousePos.x, lastMousePos.y);
    }
  }, [zoom, pan, lastMousePos, isPanning, updateHoverFromMouse]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    if (e.buttons === 4 || e.shiftKey || isPanning) {
      // Pan with middle mouse button held or shift key
      if (panTimeoutRef.current) {
        clearTimeout(panTimeoutRef.current);
      }
      
      setPan(prev => ({
        x: prev.x - e.deltaX * 0.5,
        y: prev.y - e.deltaY * 0.5
      }));
      
      panTimeoutRef.current = setTimeout(() => {
        // Pan operation completed - update hover position if mouse was tracked
        if (lastMousePos) {
          updateHoverFromMouse(lastMousePos.x, lastMousePos.y);
        }
      }, 100);
    } else {
      // Zoom with regular scroll
      setIsZooming(true);
      
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
      setZoom(prev => Math.max(1, Math.min(prev * zoomFactor, 50)));
      
      zoomTimeoutRef.current = setTimeout(() => {
        setIsZooming(false);
        // Zoom operation completed - update hover position if mouse was tracked
        if (lastMousePos) {
          updateHoverFromMouse(lastMousePos.x, lastMousePos.y);
        }
      }, 150);
    }
  }, [isPanning, updateHoverFromMouse, lastMousePos]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) { // Only middle mouse button
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Always track mouse position
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

    // Handle pixel hover using the shared function
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

  const handlePixelClick = useCallback((e: React.MouseEvent) => {
    if (!canPlace || isPanning) return;
    
    if (!svgRef.current) return;
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    // Calculate position relative to the container, accounting for pan
    const relativeX = e.clientX - containerRect.left;
    const relativeY = e.clientY - containerRect.top;
    
    // Calculate canvas center offset
    const canvasWidth = width * pixelSize;
    const canvasHeight = height * pixelSize;
    const centerX = containerRect.width / 2 - canvasWidth / 2;
    const centerY = containerRect.height / 2 - canvasHeight / 2;
    
    // Calculate pixel position accounting for pan and centering
    const x = Math.floor((relativeX - centerX - pan.x) / pixelSize);
    const y = Math.floor((relativeY - centerY - pan.y) / pixelSize);
    
    if (x >= 0 && x < width && y >= 0 && y < height) {
      if (!externalCanvas) {
        setLocalCanvas(prev => {
          const newCanvas = [...prev];
          newCanvas[y] = [...newCanvas[y]];
          newCanvas[y][x] = selectedColor;
          return newCanvas;
        });
      }
      onPixelPlace?.(x, y, selectedColor);
    }
  }, [canPlace, isPanning, pan, pixelSize, width, height, externalCanvas, selectedColor, onPixelPlace]);

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
        <svg
          ref={svgRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block"
          onClick={handlePixelClick}
          style={{ 
            imageRendering: 'pixelated',
            willChange: isZooming || isPanning ? 'transform' : 'auto'
          }}
        >
          {canvas.map((row, y) =>
            row.map((color, x) => (
              <rect
                key={`${x}-${y}`}
                x={x * pixelSize}
                y={y * pixelSize}
                width={pixelSize}
                height={pixelSize}
                fill={color}
                stroke="none"
                style={{ 
                  shapeRendering: 'crispEdges'
                }}
              />
            ))
          )}
          {/* Hover overlay - separate from pixels to avoid artifacts */}
          {hoveredPixel && !isPanning && canPlace && (
            <rect
              x={hoveredPixel.x * pixelSize}
              y={hoveredPixel.y * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={selectedColor}
              fillOpacity="0.7"
              stroke="none"
              style={{ 
                pointerEvents: 'none',
                shapeRendering: 'crispEdges'
              }}
            />
          )}
          {/* Highlighted pixel from recent changes */}
          {highlightedPixel && (
            <rect
              x={highlightedPixel.x * pixelSize}
              y={highlightedPixel.y * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill="none"
              stroke="#ff6b35"
              strokeWidth={Math.max(2, pixelSize * 0.15)}
              style={{ 
                pointerEvents: 'none',
                shapeRendering: 'crispEdges'
              }}
            />
          )}
        </svg>
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