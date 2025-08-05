'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PixelData, Stats, Canvas } from '@/types/canvas';
import { debug } from '@/utils/debug';

interface WSMessage {
  type: string;
  data: unknown;
}

export function useCanvasSync(canvasSize: number = 64) {
  const [canvas, setCanvas] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentChanges, setRecentChanges] = useState<PixelData[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [stats, setStats] = useState({ totalEdits: 0, uniqueUsers: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // WebSocket refs
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8081/ws';
  


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

  // WebSocket messaging
  const sendMessage = useCallback((message: WSMessage) => {
    debug.log('Attempting to send message, WebSocket state:', ws.current?.readyState);
    if (ws.current?.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      debug.log('Sending WebSocket message');
      ws.current.send(messageStr);
      return true;
    } else {
      debug.log('WebSocket not open, cannot send message. State:', ws.current?.readyState);
    }
    return false;
  }, []);

  // WebSocket API methods
  const wsPlacePixel = useCallback((x: number, y: number, color: string, userId: string, username: string, size: number) => {
    debug.log('=== FRONTEND SENDING PIXEL ===');
    debug.log(`Sending pixel: x=${x}, y=${y}, size=${size}`);
    return sendMessage({
      type: 'place_pixel',
      data: { x, y, color, userId, username, size }
    });
  }, [sendMessage]);

  const wsGetCanvas = useCallback((size: number) => {
    return sendMessage({
      type: 'get_canvas',
      data: { size }
    });
  }, [sendMessage]);

  const wsUpdateUsername = useCallback((userId: string, username: string) => {
    return sendMessage({
      type: 'update_username',
      data: { userId, username }
    });
  }, [sendMessage]);

  // WebSocket event handlers
  const handlePixelUpdate = useCallback((pixel: PixelData) => {
    debug.log('Pixel update received');
    updatePixel(pixel.x, pixel.y, pixel.color);
  }, [updatePixel]);

  const handleStatsUpdate = useCallback((newStats: Stats) => {
    debug.log('Stats update received');
    setStats({
      totalEdits: newStats.total_pixels || newStats.totalPixels || 0,
      uniqueUsers: newStats.unique_users || newStats.uniqueUsers || 0
    });
  }, []);

  const handleRecentChanges = useCallback((changes: PixelData[]) => {
    debug.log('Recent changes received:', changes.length, 'items');
    setRecentChanges(changes);
  }, []);

  const handleCanvasUpdate = useCallback((canvasData: Canvas) => {
    debug.log('Canvas update received');
    
    // Handle sparse pixel format for efficiency
    if (canvasData.sparse_pixels || canvasData.sparsePixels) {
      const sparsePixels = canvasData.sparse_pixels || canvasData.sparsePixels || [];
      debug.log('Processing sparse canvas with', sparsePixels.length, 'non-white pixels');
      
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
      debug.log('Processing full canvas format');
      setCanvas(canvasData.pixels);
    } else {
      debug.warn('No canvas pixel data received');
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


  const handleCooldownActive = useCallback(() => {
    debug.log('Cooldown active');
  }, []);

  const handleOnlineCount = useCallback((count: number) => {
    debug.log('Online count update received:', count);
    setOnlineCount(count);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('WebSocket error:', error);
  }, []);

  // WebSocket connection management
  const connect = useCallback(() => {
    // Force close any existing connection before creating new one
    if (ws.current) {
      debug.log('Closing existing WebSocket connection');
      ws.current.close();
      ws.current = null;
    }

    if (isConnecting) {
      return;
    }

    debug.log('Connecting to WebSocket:', wsUrl);
    setIsConnecting(true);
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
        debug.log('WebSocket connected to:', wsUrl);
        debug.log('WebSocket readyState:', ws.current?.readyState);
      };

      ws.current.onmessage = (event) => {
        debug.log('Raw WebSocket event received, data type:', typeof event.data, 'length:', event.data?.length);
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          debug.log('WebSocket message received');
          
          switch (message.type) {
            case 'connected':
              debug.log('WebSocket connection confirmed');
              break;
            case 'pixel_update':
              handlePixelUpdate(message.data as PixelData);
              break;
            case 'stats_update':
              handleStatsUpdate(message.data as Stats);
              break;
            case 'recent_changes':
              handleRecentChanges(message.data as PixelData[]);
              break;
            case 'canvas_data':
            case 'canvas_update':
              debug.log('Canvas data message received, calling handleCanvasUpdate');
              handleCanvasUpdate(message.data as Canvas);
              break;
            case 'cooldown_active':
              handleCooldownActive();
              break;
            case 'online_count':
              const countData = message.data as { count: number };
              handleOnlineCount(countData.count);
              break;
            case 'error':
              handleError((message.data as { message?: string })?.message || 'Unknown error');
              break;
            default:
              debug.log('Unknown message type received');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        debug.log('WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          url: wsUrl
        });
        
        // Only reconnect if it was an unexpected close and we haven't exceeded max attempts
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect(); // Recursive call to reconnect
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached. Giving up.');
          handleError('Connection lost. Please refresh the page.');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', {
          error,
          readyState: ws.current?.readyState,
          url: ws.current?.url,
          type: error.type
        });
        setIsConnecting(false);
        handleError(`WebSocket connection error: ${error.type || 'Unknown error'}`);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnecting(false);
      handleError('Failed to create WebSocket connection');
    }
  }, [wsUrl, isConnecting, handlePixelUpdate, handleStatsUpdate, handleRecentChanges, handleCanvasUpdate, handleCooldownActive, handleOnlineCount, handleError]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

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

  // Initialize WebSocket connection
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]); // Include the functions as dependencies

  // Load initial canvas data when WebSocket connects or canvas size changes
  useEffect(() => {
    debug.log('Canvas sync effect triggered - isConnected:', isConnected, 'isConnecting:', isConnecting, 'canvasSize:', canvasSize);
    
    // More aggressive approach - try to request on any connection state change
    const tryRequest = () => {
      debug.log('Attempting aggressive canvas request - wsGetCanvas available:', !!wsGetCanvas);
      const success = wsGetCanvas(canvasSize);
      debug.log('Aggressive canvas request result:', success);
      return success;
    };
    
    if (isConnected) {
      debug.log('WebSocket connected, requesting canvas data for size:', canvasSize);
      setIsLoading(true);
      
      // Add a small delay to ensure WebSocket readPump is ready
      setTimeout(() => {
        debug.log('Sending canvas request after connection delay');
        if (!tryRequest()) {
          debug.log('Initial delayed request failed, trying with more delays...');
          
          // Try with multiple delays to catch connection timing
          setTimeout(() => {
            debug.log('Retry attempt #1 (200ms)');
            if (!tryRequest()) {
              setTimeout(() => {
                debug.log('Retry attempt #2 (500ms)');
                if (!tryRequest()) {
                  setTimeout(() => {
                    debug.log('Retry attempt #3 (1000ms)');
                    tryRequest();
                  }, 500);
                }
              }, 300);
            }
          }, 100);
        }
      }, 50); // Small initial delay to let backend readPump start
    } else {
      debug.log('WebSocket not connected - isConnected:', isConnected, 'isConnecting:', isConnecting);
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