'use client';

import { useState, useEffect, useCallback } from 'react';
import { PixelData, Stats, Canvas } from '@/types/canvas';
import { useWebSocket } from './useWebSocket';

export function useCanvasSync(canvasSize: number = 64) {
  const [canvas, setCanvas] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentChanges, setRecentChanges] = useState<PixelData[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [stats, setStats] = useState({ totalEdits: 0, uniqueUsers: 0 });
  

  const initializeCanvas = useCallback(() => {
    return Array(canvasSize).fill(null).map(() => Array(canvasSize).fill('#FFFFFF'));
  }, [canvasSize]);

  const updatePixel = useCallback((x: number, y: number, color: string) => {
    setCanvas(prev => {
      const newCanvas = [...prev];
      if (newCanvas[y] && newCanvas[y][x] !== undefined && 
          x >= 0 && x < canvasSize && y >= 0 && y < canvasSize) {
        newCanvas[y] = [...newCanvas[y]];
        newCanvas[y][x] = color;
      }
      return newCanvas;
    });
  }, [canvasSize]);

  // WebSocket event handlers
  const handlePixelUpdate = useCallback((pixel: PixelData) => {
    console.log('Pixel update received:', pixel);
    updatePixel(pixel.x, pixel.y, pixel.color);
  }, [updatePixel]);

  const handleStatsUpdate = useCallback((newStats: Stats) => {
    console.log('Stats update received:', newStats);
    setStats({
      totalEdits: newStats.total_pixels || newStats.totalPixels || 0,
      uniqueUsers: newStats.unique_users || newStats.uniqueUsers || 0
    });
  }, []);

  const handleRecentChanges = useCallback((changes: PixelData[]) => {
    console.log('Recent changes received:', changes.length, 'items');
    setRecentChanges(changes);
  }, []);

  const handleCanvasUpdate = useCallback((canvasData: Canvas) => {
    console.log('Canvas update received:', canvasData);
    
    // Handle sparse pixel format for efficiency
    if (canvasData.sparse_pixels || canvasData.sparsePixels) {
      const sparsePixels = canvasData.sparse_pixels || canvasData.sparsePixels || [];
      console.log('Processing sparse canvas with', sparsePixels.length, 'non-white pixels');
      console.log('First few pixels:', sparsePixels.slice(0, 5));
      
      // Create empty canvas
      const emptyCanvas = Array(canvasData.size).fill(null).map(() => 
        Array(canvasData.size).fill('#FFFFFF')
      );
      
      // Apply sparse pixels - use same coordinate system as updatePixel (y,x)
      sparsePixels.forEach(pixel => {
        if (pixel.x >= 0 && pixel.x < canvasData.size && 
            pixel.y >= 0 && pixel.y < canvasData.size) {
          emptyCanvas[pixel.y][pixel.x] = pixel.color;
        }
      });
      
      setCanvas(emptyCanvas);
    } else if (canvasData.pixels) {
      // Fallback to full pixel format
      console.log('Processing full canvas format');
      setCanvas(canvasData.pixels);
    } else {
      console.warn('No canvas pixel data received');
    }
    
    if (canvasData.stats) {
      setStats({
        totalEdits: canvasData.stats.total_pixels || canvasData.stats.totalPixels || 0,
        uniqueUsers: canvasData.stats.unique_users || canvasData.stats.uniqueUsers || 0
      });
    }
    if (canvasData.recent_changes || canvasData.recentChanges) {
      setRecentChanges(canvasData.recent_changes || canvasData.recentChanges || []);
    }
    setIsLoading(false);
  }, []);


  const handleCooldownActive = useCallback((data: { cooldownEnd: string; message: string }) => {
    console.log('Cooldown active:', data);
  }, []);

  const handleOnlineCount = useCallback((count: number) => {
    console.log('Online count update received:', count);
    setOnlineCount(count);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('WebSocket error:', error);
  }, []);

  // WebSocket connection
  const { 
    isConnected, 
    isConnecting, 
    placePixel: wsPlacePixel, 
    getCanvas: wsGetCanvas,
    updateUsername: wsUpdateUsername
  } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081/ws',
    onPixelUpdate: handlePixelUpdate,
    onStatsUpdate: handleStatsUpdate,
    onRecentChanges: handleRecentChanges,
    onCanvasUpdate: handleCanvasUpdate,
    onCooldownActive: handleCooldownActive,
    onOnlineCount: handleOnlineCount,
    onError: handleError,
  });

  const placePixel = useCallback(async (x: number, y: number, color: string, userId: string, username?: string): Promise<{ success: boolean; error?: string; cooldownEnd?: number }> => {
    try {
      // Optimistic update - immediately show the pixel
      updatePixel(x, y, color);
      
      // Use WebSocket to place pixel
      const success = wsPlacePixel(x, y, color, userId, username || `User${userId.slice(-4)}`, canvasSize);
      
      if (success) {
        return { success: true };
      } else {
        // Revert optimistic update if WebSocket isn't connected
        console.error('WebSocket not connected, reverting pixel placement');
        wsGetCanvas(canvasSize); // Request fresh canvas data
        return { success: false, error: 'Connection lost. Please try again.' };
      }
    } catch (error) {
      console.error('Error placing pixel:', error);
      // Revert optimistic update on error
      wsGetCanvas(canvasSize);
      return { success: false, error: 'Network error' };
    }
  }, [updatePixel, wsPlacePixel, wsGetCanvas, canvasSize]);

  // Load initial canvas data when WebSocket connects or canvas size changes
  useEffect(() => {
    console.log('Canvas sync effect triggered - isConnected:', isConnected, 'isConnecting:', isConnecting, 'canvasSize:', canvasSize);
    
    // More aggressive approach - try to request on any connection state change
    const tryRequest = () => {
      console.log('Attempting aggressive canvas request - wsGetCanvas available:', !!wsGetCanvas);
      const success = wsGetCanvas(canvasSize);
      console.log('Aggressive canvas request result:', success);
      return success;
    };
    
    if (isConnected) {
      console.log('WebSocket connected, requesting canvas data for size:', canvasSize);
      setIsLoading(true);
      
      // Add a small delay to ensure WebSocket readPump is ready
      setTimeout(() => {
        console.log('Sending canvas request after connection delay');
        if (!tryRequest()) {
          console.log('Initial delayed request failed, trying with more delays...');
          
          // Try with multiple delays to catch connection timing
          setTimeout(() => {
            console.log('Retry attempt #1 (200ms)');
            if (!tryRequest()) {
              setTimeout(() => {
                console.log('Retry attempt #2 (500ms)');
                if (!tryRequest()) {
                  setTimeout(() => {
                    console.log('Retry attempt #3 (1000ms)');
                    tryRequest();
                  }, 500);
                }
              }, 300);
            }
          }, 100);
        }
      }, 50); // Small initial delay to let backend readPump start
    } else {
      console.log('WebSocket not connected - isConnected:', isConnected, 'isConnecting:', isConnecting);
      // Initialize with empty canvas while connecting
      const emptyCanvas = Array(canvasSize).fill(null).map(() => Array(canvasSize).fill('#FFFFFF'));
      setCanvas(emptyCanvas);
      setIsLoading(true);
    }
  }, [isConnected, canvasSize, wsGetCanvas, isConnecting]);

  return {
    canvas,
    isLoading: isLoading || isConnecting,
    isConnected,
    recentChanges,
    onlineCount,
    stats,
    placePixel,
    updatePixel,
    updateUsername: wsUpdateUsername,
  };
}