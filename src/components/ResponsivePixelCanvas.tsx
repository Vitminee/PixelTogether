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
  const containerRef = useRef<HTMLDivElement>(null);

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
    const containerWidth = container.clientWidth - 32; // Account for padding
    const containerHeight = container.clientHeight - 32; // Account for padding

    // Calculate the maximum pixel size that fits in the container
    const maxPixelWidth = Math.floor(containerWidth / width);
    const maxPixelHeight = Math.floor(containerHeight / height);
    
    // Use the smaller dimension to ensure the canvas fits
    const newPixelSize = Math.max(2, Math.min(maxPixelWidth, maxPixelHeight, 12));
    setPixelSize(newPixelSize);
  }, [width, height]);

  useEffect(() => {
    calculatePixelSize();
    
    const handleResize = () => {
      calculatePixelSize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const canvasWidth = width * pixelSize;
  const canvasHeight = height * pixelSize;

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center w-full h-full min-h-0"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-lg">
          <svg
            width={canvasWidth}
            height={canvasHeight}
            className={`block ${canPlace ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
            style={{ imageRendering: 'pixelated', maxWidth: '100%', height: 'auto' }}
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
                    strokeWidth={isHovered ? Math.max(0.5, pixelSize * 0.05) : 0}
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
        
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {width}×{height} pixels • Size: {pixelSize}px
        </div>
      </div>
    </div>
  );
}