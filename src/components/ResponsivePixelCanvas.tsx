'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface PixelData {
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

interface ResponsivePixelCanvasProps {
  width?: number;
  height?: number;
  onPixelPlace?: (x: number, y: number, color: string) => void;
  selectedColor: string;
  canPlace: boolean;
  canvas?: string[][];
}

export default function ResponsivePixelCanvas({
  width = 64,
  height = 64,
  onPixelPlace,
  selectedColor,
  canPlace,
  canvas: externalCanvas
}: ResponsivePixelCanvasProps) {
  const [localCanvas, setLocalCanvas] = useState<string[][]>([]);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number} | null>(null);
  const [pixelSize, setPixelSize] = useState(8);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const canvas = externalCanvas || localCanvas;

  useEffect(() => {
    if (!externalCanvas) {
      const initialCanvas = Array(height).fill(null).map(() => 
        Array(width).fill('#FFFFFF')
      );
      setLocalCanvas(initialCanvas);
    }
  }, [width, height, externalCanvas]);

  const calculatePixelSize = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Account for container padding and margins
    const availableWidth = rect.width - 64; // Account for padding and margins
    const availableHeight = rect.height - 100; // Account for padding, margins, and info text

    // Calculate the maximum pixel size that fits in the container
    const maxPixelWidth = Math.floor(availableWidth / width);
    const maxPixelHeight = Math.floor(availableHeight / height);
    
    // Use the smaller dimension to ensure the canvas fits, with min/max bounds
    const newPixelSize = Math.max(1, Math.min(maxPixelWidth, maxPixelHeight, 20));
    
    const canvasWidth = width * newPixelSize;
    const canvasHeight = height * newPixelSize;
    
    setPixelSize(newPixelSize);
    setDimensions({ width: canvasWidth, height: canvasHeight });
  }, [width, height]);

  useEffect(() => {
    calculatePixelSize();
    
    // Use ResizeObserver for better performance
    if (containerRef.current && !resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(calculatePixelSize);
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    // Fallback to window resize event
    const handleResize = () => {
      requestAnimationFrame(calculatePixelSize);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [calculatePixelSize]);

  const handlePixelClick = useCallback((x: number, y: number) => {
    if (!canPlace) return;
    
    if (!externalCanvas) {
      setLocalCanvas(prev => {
        const newCanvas = [...prev];
        newCanvas[y] = [...newCanvas[y]];
        newCanvas[y][x] = selectedColor;
        return newCanvas;
      });
    }
    
    onPixelPlace?.(x, y, selectedColor);
  }, [canPlace, selectedColor, onPixelPlace, externalCanvas]);

  const handleMouseEnter = useCallback((x: number, y: number) => {
    if (canPlace) {
      setHoveredPixel({x, y});
    }
  }, [canPlace]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPixel(null);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center w-full h-full min-h-0 p-4"
    >
      <div className="flex flex-col items-center gap-2 sm:gap-4 max-w-full max-h-full">
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-lg transition-all duration-300">
          <svg
            width={dimensions.width || width * pixelSize}
            height={dimensions.height || height * pixelSize}
            className={`block ${canPlace ? 'cursor-crosshair' : 'cursor-not-allowed'} transition-all duration-300`}
            style={{ 
              imageRendering: 'pixelated',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto'
            }}
            viewBox={`0 0 ${dimensions.width || width * pixelSize} ${dimensions.height || height * pixelSize}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {canvas.map((row, y) =>
              row.map((color, x) => {
                const isHovered = hoveredPixel?.x === x && hoveredPixel?.y === y;
                const displayColor = isHovered ? selectedColor : color;
                
                return (
                  <rect
                    key={`${x}-${y}`}
                    x={x * pixelSize}
                    y={y * pixelSize}
                    width={pixelSize}
                    height={pixelSize}
                    fill={displayColor}
                    stroke={isHovered ? '#000' : 'none'}
                    strokeWidth={isHovered ? Math.max(0.1, pixelSize * 0.02) : 0}
                    onClick={() => handlePixelClick(x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    onMouseLeave={handleMouseLeave}
                    className={`transition-all duration-100 ${
                      canPlace ? 'hover:opacity-80' : ''
                    }`}
                  />
                );
              })
            )}
          </svg>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center whitespace-nowrap">
          {width}×{height} pixels • {pixelSize}px each • {dimensions.width}×{dimensions.height}
        </div>
      </div>
    </div>
  );
}