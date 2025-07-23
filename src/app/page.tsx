'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ZoomPanCanvas from '@/components/ZoomPanCanvas';
import ColorPalette from '@/components/ColorPalette';
import CooldownTimer from '@/components/CooldownTimer';
import UserInfo from '@/components/UserInfo';
// Import RecentChanges as client-only component
const RecentChanges = dynamic(() => import('@/components/RecentChanges'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Recent Changes</h3>
          <div className="w-2 h-2 rounded-full bg-gray-500"></div>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs">
          Loading...
        </div>
      </div>
    </div>
  )
});
import { useCooldown } from '@/hooks/useCooldown';
import { useUserSession } from '@/hooks/useUserSession';
import { useCanvasSync } from '@/hooks/useCanvasSync';
import { useResponsive } from '@/hooks/useResponsive';

const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000000',
  '#FFFFFF', '#90EE90', '#FFB6C1', '#DDA0DD'
];

export default function Home() {
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const [highlightedPixel, setHighlightedPixel] = useState<{x: number, y: number} | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const { canPlace, cooldownEndTime, startCooldown, endCooldown } = useCooldown();
  const { user, isLoading: userLoading, updateUsername, updateLastPlacement } = useUserSession();
  const { canvas, isLoading: canvasLoading, isConnected, recentChanges, onlineCount, stats, placePixel } = useCanvasSync();
  const responsive = useResponsive();

  const handlePixelPlace = async (x: number, y: number, color: string) => {
    if (!user || !canPlace || isPlacing) return;

    setIsPlacing(true);
    setErrorMessage(null);

    console.log(`Pixel placed at position ${x}, ${y} with color ${color}`);
    
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
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="min-w-0 flex-shrink overflow-hidden">
            <h1 className={`${responsive.titleSize} font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate`}>
              PixelTogether
            </h1>
            <div className="flex items-center gap-2">
              <p className={`${responsive.subtitleSize} text-gray-600 dark:text-gray-300 truncate`}>
                Collaborative pixel art canvas
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                    {onlineCount} online
                  </span>
                </div>
                <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                  •
                </span>
                <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                  {stats.totalEdits.toLocaleString()} edits
                </span>
                <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                  •
                </span>
                <span className={`${responsive.subtitleSize} text-gray-500 dark:text-gray-400`}>
                  {stats.uniqueUsers} artists
                </span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div style={{ transform: `scale(${responsive.scale})`, transformOrigin: 'top right' }}>
              <CooldownTimer
                cooldownEndTime={cooldownEndTime}
                onCooldownEnd={endCooldown}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
          
          <div style={{ marginTop: `${responsive.padding}px` }}>
            <UserInfo
              user={user}
              isConnected={isConnected}
              onUsernameChange={updateUsername}
            />
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
                  Canvas
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
              <ZoomPanCanvas
                width={64}
                height={64}
                selectedColor={selectedColor}
                canPlace={canPlace && !userLoading && !isPlacing}
                onPixelPlace={handlePixelPlace}
                canvas={canvas.length > 0 ? canvas : undefined}
                highlightedPixel={highlightedPixel}
              />
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