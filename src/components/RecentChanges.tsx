'use client';

import { useState, useEffect } from 'react';

interface PixelChange {
  x: number;
  y: number;
  color: string;
  user_id: string;
  username?: string;
  timestamp: number;
}

interface RecentChangesProps {
  changes: PixelChange[];
  isConnected: boolean;
  colorSize?: number;
  onPixelHover?: (x: number, y: number) => void;
  onPixelHoverEnd?: () => void;
}

export default function RecentChanges({ changes, isConnected, colorSize = 40, onPixelHover, onPixelHoverEnd }: RecentChangesProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatTime = (timestamp: number) => {
    if (!isMounted) return 'Loading...';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Recent Changes</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {changes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-xs">
            No recent changes
          </div>
        ) : (
          <div className="space-y-1">
            {changes.map((change, index) => (
              <div 
                key={`${change.timestamp}-${index}`} 
                className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 cursor-pointer transition-colors"
                onMouseEnter={() => onPixelHover?.(change.x, change.y)}
                onMouseLeave={() => onPixelHoverEnd?.()}
                title={`${change.username} placed ${change.color} at (${change.x}, ${change.y})`}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
                    style={{ 
                      backgroundColor: change.color,
                      width: `${Math.max(12, colorSize * 0.3)}px`,
                      height: `${Math.max(12, colorSize * 0.3)}px`
                    }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {change.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      ({change.x}, {change.y}) • {formatTime(change.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}