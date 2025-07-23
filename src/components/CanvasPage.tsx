'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ZoomPanCanvas from '@/components/ZoomPanCanvas';
import OptimizedCanvas from '@/components/OptimizedCanvas';
import ColorPalette from '@/components/ColorPalette';
import CooldownTimer from '@/components/CooldownTimer';
import UsernameInput from '@/components/UsernameInput';
import CanvasSizeSelector from '@/components/CanvasSizeSelector';
import { useCooldown } from '@/hooks/useCooldown';
import { useUserSession } from '@/hooks/useUserSession';
import { useCanvasSync } from '@/hooks/useCanvasSync';
import { useResponsive } from '@/hooks/useResponsive';

const RecentChanges = dynamic(() => import('@/components/RecentChanges'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 h-full flex items-center justify-center">
      <div className="text-sm text-gray-500 dark:text-gray-400">Loading recent changes...</div>
    </div>
  )
});

const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#800080', '#FFA500', 
  '#FFC0CB', '#A52A2A', '#808080', '#000000',
  '#FFFFFF', '#90EE90', '#FFB6C1', '#DDA0DD'
];

interface CanvasPageProps {
  size: number;
}

export default function CanvasPage({ size }: CanvasPageProps) {
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [highlightedPixel, setHighlightedPixel] = useState<{x: number, y: number} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const { canPlace, cooldownEndTime, startCooldown, endCooldown } = useCooldown();
  const { user, isLoading: userLoading, updateUsername, updateLastPlacement } = useUserSession();
  const { canvas, isLoading: canvasLoading, isConnected, recentChanges, onlineCount, stats, placePixel } = useCanvasSync(size);
  const responsive = useResponsive();

  const handlePixelPlace = async (x: number, y: number, color: string) => {
    if (!user || !canPlace || isPlacing) return;

    setIsPlacing(true);
    setErrorMessage(null);

    console.log(`Pixel placed at position ${x}, ${y} with color ${color} on ${size}x${size} canvas`);
    
    const result = await placePixel(x, y, color, user.id, user.username);
    
    if (result.success) {
      startCooldown();
      updateLastPlacement(Date.now());
    } else {
      setErrorMessage(result.error || 'Failed to place pixel');
      if (result.cooldownEnd) {
        // Server says we're in cooldown, sync with server time
        startCooldown();
      }
      // Auto-clear error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    }
    
    setIsPlacing(false);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header 
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
        style={{ 
          height: `${responsive.headerHeight}px`,
          padding: `${responsive.padding / 2}px ${responsive.padding}px`
        }}
      >
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-6">
            <div>
              <h1 className={`${responsive.titleSize} font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent`}>
                PixelTogether
              </h1>
              <p className={`${responsive.subtitleSize} text-gray-600 dark:text-gray-400`}>
                Collaborative {size}x{size} pixel art
              </p>
            </div>
            
            <CanvasSizeSelector />
            
            <div className="flex items-center gap-4">
              <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                {stats.totalEdits.toLocaleString()} edits
              </span>
              <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                {stats.uniqueUsers} artists
              </span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                  {onlineCount} online
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {user && !userLoading && (
              <UsernameInput
                username={user.username}
                onUsernameChange={updateUsername}
                size={responsive.inputSize}
              />
            )}
            
            <CooldownTimer
              canPlace={canPlace}
              cooldownEndTime={cooldownEndTime}
              onCooldownEnd={endCooldown}
              size={responsive.timerSize}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Color Palette */}
        <aside 
          className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0"
          style={{ 
            width: `${responsive.sidebarWidth}px`,
            padding: `${responsive.padding}px`
          }}
        >
          <ColorPalette
            colors={COLORS}
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            vertical={true}
            colorSize={responsive.colorSize}
          />
          
          {/* Ko-fi Support Button */}
          <div className="mt-6 flex flex-col items-center">
            <a
              href="https://ko-fi.com/vitmine"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5E5B] hover:bg-[#FF4E4B] text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.033 11.596c.049 4.271 3.759 4.263 3.759 4.263h8.694c4.296 0 8.33-2.6 8.33-2.6s4.084-.461 2.279-8.197c-.796-3.412-5.31-5.15-5.31-5.15s5.359-1.32 5.932 5.968c.573 7.288-6.267 5.317-6.267 5.317s3.264-2.25 3.264-5.25c0-3-2.5-3-2.5-3s2.5 0 2.5 3c0 3-3.264 5.25-3.264 5.25s6.84 1.971 6.267-5.317c-.573-7.288-5.932-5.968-5.932-5.968z"/>
              </svg>
              Support on Ko-fi
            </a>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Help keep PixelTogether running!
            </p>
          </div>
          
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div 
            className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col min-h-0"
            style={{ margin: `${responsive.padding}px` }}
          >
            <div 
              className="text-center flex-shrink-0"
              style={{ padding: `${responsive.padding}px` }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <h2 className={`${responsive.titleSize} font-semibold text-gray-800 dark:text-gray-200`}>
                  Canvas ({size}x{size})
                </h2>
                {(canvasLoading || isPlacing) && (
                  <div 
                    className="border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
                    style={{ width: `${16 * responsive.scale}px`, height: `${16 * responsive.scale}px` }}
                  ></div>
                )}
              </div>
              {errorMessage ? (
                <p className={`${responsive.subtitleSize} text-red-500 dark:text-red-400 mb-1`}>
                  {errorMessage}
                </p>
              ) : null}
              <p className={`${responsive.subtitleSize} text-gray-600 dark:text-gray-400`}>
                {isPlacing 
                  ? 'Placing pixel...' 
                  : canPlace 
                    ? 'Click any pixel to place your color' 
                    : 'Wait for cooldown to place another pixel'
                }
              </p>
            </div>
            
            <div className="flex-1 min-h-0">
              {size >= 256 ? (
                <OptimizedCanvas
                  width={size}
                  height={size}
                  selectedColor={selectedColor}
                  canPlace={canPlace && !userLoading && !isPlacing}
                  onPixelPlace={handlePixelPlace}
                  canvas={canvas.length > 0 ? canvas : undefined}
                  highlightedPixel={highlightedPixel}
                />
              ) : (
                <ZoomPanCanvas
                  width={size}
                  height={size}
                  selectedColor={selectedColor}
                  canPlace={canPlace && !userLoading && !isPlacing}
                  onPixelPlace={handlePixelPlace}
                  canvas={canvas.length > 0 ? canvas : undefined}
                  highlightedPixel={highlightedPixel}
                />
              )}
            </div>
          </div>
        </main>

        {/* Right Sidebar - Recent Changes */}
        <aside 
          className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-l border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col"
          style={{ 
            width: `${responsive.sidebarWidth}px`,
            padding: `${responsive.padding}px`
          }}
        >
          <RecentChanges 
            changes={recentChanges}
            isConnected={isConnected}
            colorSize={responsive.colorSize}
            onPixelHover={(x, y) => setHighlightedPixel({ x, y })}
            onPixelHoverEnd={() => setHighlightedPixel(null)}
          />
        </aside>
      </div>
    </div>
  );
}