'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CanvasState, PixelData } from '@/types/canvas';

export function useCanvasSync() {
  const [canvas, setCanvas] = useState<string[][]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);

  const initializeCanvas = useCallback(() => {
    return Array(64).fill(null).map(() => Array(64).fill('#FFFFFF'));
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
        const canvasState: CanvasState = await response.json();
        setCanvas(canvasState.pixels);
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

  const placePixel = useCallback(async (x: number, y: number, color: string, userId: string): Promise<boolean> => {
    try {
      // Optimistic update - immediately show the pixel
      updatePixel(x, y, color);
      
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y, color, userId }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update with server state to ensure consistency
        setCanvas(result.canvasState.pixels);
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
        console.log('Connected to canvas stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'pixel-update' && data.data) {
            const pixel: PixelData = data.data;
            updatePixel(pixel.x, pixel.y, pixel.color);
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
    placePixel,
    updatePixel,
    disconnect
  };
}