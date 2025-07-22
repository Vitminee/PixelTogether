'use client';

import { useState } from 'react';
import ResponsivePixelCanvas from '@/components/ResponsivePixelCanvas';
import ColorPalette from '@/components/ColorPalette';
import CooldownTimer from '@/components/CooldownTimer';
import UserInfo from '@/components/UserInfo';
import { useCooldown } from '@/hooks/useCooldown';
import { useUserSession } from '@/hooks/useUserSession';
import { useCanvasSync } from '@/hooks/useCanvasSync';

const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#000000',
  '#FFFFFF', '#90EE90', '#FFB6C1', '#DDA0DD'
];

export default function Home() {
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const { canPlace, cooldownEndTime, startCooldown, endCooldown } = useCooldown();
  const { user, isLoading: userLoading, updateUsername, updateLastPlacement } = useUserSession();
  const { canvas, isLoading: canvasLoading, isConnected, placePixel } = useCanvasSync();

  const handlePixelPlace = async (x: number, y: number, color: string) => {
    if (!user || !canPlace) return;

    console.log(`Pixel placed at position ${x}, ${y} with color ${color}`);
    
    const success = await placePixel(x, y, color, user.id);
    if (success) {
      startCooldown();
      updateLastPlacement(Date.now());
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-shrink">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              PixelTogether
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
              Collaborative pixel art canvas
            </p>
          </div>
          <div className="hidden md:block flex-shrink-0">
            <CooldownTimer
              cooldownEndTime={cooldownEndTime}
              onCooldownEnd={endCooldown}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Color Palette */}
        <aside className="w-80 lg:w-80 md:w-72 sm:w-64 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 p-4 lg:p-6 overflow-y-auto flex-shrink-0">
          <ColorPalette
            colors={COLORS}
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            vertical={true}
          />
          
          <div className="mt-6">
            <UserInfo
              user={user}
              isConnected={isConnected}
              onUsernameChange={updateUsername}
            />
          </div>
          
          {/* Mobile Cooldown Timer */}
          <div className="md:hidden mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-gray-700">
              <CooldownTimer
                cooldownEndTime={cooldownEndTime}
                onCooldownEnd={endCooldown}
              />
            </div>
          </div>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 flex items-center justify-center p-2 sm:p-4 lg:p-6 min-w-0">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700 w-full max-w-none flex flex-col items-center">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                  Canvas
                </h2>
                {canvasLoading && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {canPlace ? 'Click any pixel to place your color' : 'Wait for cooldown to place another pixel'}
              </p>
            </div>
            
            <ResponsivePixelCanvas
              width={64}
              height={64}
              selectedColor={selectedColor}
              canPlace={canPlace && !userLoading}
              onPixelPlace={handlePixelPlace}
              canvas={canvas.length > 0 ? canvas : undefined}
            />
          </div>
        </main>
      </div>
    </div>
  );
}