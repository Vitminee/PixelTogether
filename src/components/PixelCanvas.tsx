'use client';

import { useState, useEffect, useCallback } from 'react';

interface PixelData {
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

interface PixelCanvasProps {
  width?: number;
  height?: number;
  pixelSize?: number;
  onPixelPlace?: (x: number, y: number, color: string) => void;
  selectedColor: string;
  canPlace: boolean;
  canvas?: string[][];
}

export default function PixelCanvas({
  width = 64,
  height = 64,
  pixelSize = 8,
  onPixelPlace,
  selectedColor,
  canPlace,
  canvas: externalCanvas
}: PixelCanvasProps) {
  const [localCanvas, setLocalCanvas] = useState<string[][]>([]);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number} | null>(null);

  const canvas = externalCanvas || localCanvas;

  useEffect(() => {
    if (!externalCanvas) {
      const initialCanvas = Array(height).fill(null).map(() => 
        Array(width).fill('#FFFFFF')
      );
      setLocalCanvas(initialCanvas);
    }
  }, [width, height, externalCanvas]);

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
    <div className="inline-block border-2 border-gray-300 dark:border-gray-600 rounded overflow-hidden">
      <svg
        width={width * pixelSize}
        height={height * pixelSize}
        className={`block ${canPlace ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        style={{ imageRendering: 'pixelated' }}
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
                strokeWidth={isHovered ? 0.5 : 0}
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
  );
}