'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CanvasState, PixelData } from '@/types/canvas';

export function useCanvasSync() {
  const [canvas, setCanvas] = useState<string[][]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentChanges, setRecentChanges] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [stats, setStats] = useState({ totalEdits: 0, uniqueUsers: 0 });
  const eventSourceRef = useRef<EventSource | null>(null);

  const initializeCanvas = useCallback(() => {
    return Array(64).fill(null).map(() => Array(64).fill('#FFFFFF'));
  }, []);

  // Load recent changes from localStorage after component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Clear old data for testing
        // localStorage.removeItem('pixeltogether-recent-changes');
        
        const stored = localStorage.getItem('pixeltogether-recent-changes');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only keep changes from the last 30 minutes to see more activity
          const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
          const filtered = parsed.filter((change: any) => change.timestamp > thirtyMinutesAgo);
          setRecentChanges(filtered);
        }
      } catch (error) {
        console.error('Error loading recent changes:', error);
      }
    }
  }, []);

  const updatePixel = useCallback((x: number, y: number, color: string) => {
    setCanvas(prev => {
      const newCanvas = [...prev];
      if (newCanvas[y] && newCanvas[y][x] !== undefined) {
        newCanvas[y] = [...newCanvas[y]];
        newCanvas[y][x] = color;
      }
      return newCanvas;
    });
  }, []);

  const loadCanvas = useCallback(async () => {
    try {
      const response = await fetch('/api/canvas');
      if (response.ok) {
        const data = await response.json();
        setCanvas(data.pixels);
        if (data.stats) {
            setStats(data.stats);
        }
      } else {
        setCanvas(initializeCanvas());
      }
    } catch (error) {
      console.error('Error loading canvas:', error);
      setCanvas(initializeCanvas());
    } finally {
      setIsLoading(false);
    }
  }, [initializeCanvas]);

  const placePixel = useCallback(async (x: number, y: number, color: string, userId: string, username?: string): Promise<boolean> => {
    try {
      // Optimistic update - immediately show the pixel
      updatePixel(x, y, color);
      
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y, color, userId, username }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update with server state to ensure consistency
        if (result.canvasState) {
          setCanvas(result.canvasState.pixels);
        }
        if (result.stats) {
          setStats(result.stats);
        }
        return true;
      } else {
        // Revert optimistic update on error
        console.error('Failed to place pixel, reverting...');
        loadCanvas();
        return false;
      }
    } catch (error) {
      console.error('Error placing pixel:', error);
      // Revert optimistic update on error
      loadCanvas();
      return false;
    }
  }, [updatePixel, loadCanvas]);

  const connectToStream = useCallback(() => {
    if (eventSourceRef.current) {
      return;
    }

    try {
      const eventSource = new EventSource('/api/canvas/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log('Canvas EventSource connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE message received:', data.type, data);
          
          if (data.type === 'pixel-update' && data.data) {
            const pixel: PixelData = data.data;
            updatePixel(pixel.x, pixel.y, pixel.color);
            
            // Add to recent changes
            const newChange = {
              x: pixel.x,
              y: pixel.y,
              color: pixel.color,
              userId: pixel.userId,
              username: pixel.username || `User${pixel.userId.slice(-4)}`,
              timestamp: pixel.timestamp
            };
            
            setRecentChanges(prev => {
              const updated = [newChange, ...prev.slice(0, 19)];
              console.log('Recent changes updated:', updated.length, 'items');
              // Save to localStorage
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem('pixeltogether-recent-changes', JSON.stringify(updated));
                } catch (error) {
                  console.error('Error saving recent changes:', error);
                }
              }
              return updated;
            });
          } else if (data.type === 'user-count' && data.data) {
            setOnlineCount(data.data.count);
          } else if (data.type === 'stats-update' && data.data) {
            setStats(data.data);
          }
        } catch (error) {
          console.error('Error parsing stream message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Canvas stream error:', error);
        setIsConnected(false);
        
        eventSource.close();
        eventSourceRef.current = null;
        
        setTimeout(connectToStream, 3000);
      };
    } catch (error) {
      console.error('Error connecting to stream:', error);
    }
  }, [updatePixel]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    loadCanvas();
    connectToStream();

    return () => {
      disconnect();
    };
  }, [loadCanvas, connectToStream, disconnect]);

  return {
    canvas,
    isLoading,
    isConnected,
    recentChanges,
    onlineCount,
    stats,
    placePixel,
    updatePixel,
    disconnect
  };
}