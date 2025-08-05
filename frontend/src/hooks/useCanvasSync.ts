'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PixelData, Stats, Canvas } from '@/types/canvas';

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

  // WebSocket messaging
  const sendMessage = useCallback((message: WSMessage) => {
    console.log('Attempting to send message:', message, 'WebSocket state:', ws.current?.readyState);
    if (ws.current?.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      console.log('Sending WebSocket message:', messageStr);
      ws.current.send(messageStr);
      return true;
    } else {
      console.log('WebSocket not open, cannot send message. State:', ws.current?.readyState);
    }
    return false;
  }, []);

  // WebSocket API methods
  const wsPlacePixel = useCallback((x: number, y: number, color: string, userId: string, username: string, size: number) => {
    console.log('=== FRONTEND SENDING PIXEL ===');
    console.log(`Sending pixel: x=${x}, y=${y}, color=${color}, userId=${userId}, size=${size}`);
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

  // WebSocket connection management
  const connect = useCallback(() => {
    // Force close any existing connection before creating new one
    if (ws.current) {
      console.log('Closing existing WebSocket connection');
      ws.current.close();
      ws.current = null;
    }

    if (isConnecting) {
      return;
    }

    console.log('Connecting to WebSocket:', wsUrl);
    setIsConnecting(true);
    
    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
        console.log('WebSocket connected to:', wsUrl);
        console.log('WebSocket readyState:', ws.current?.readyState);
      };

      ws.current.onmessage = (event) => {
        console.log('Raw WebSocket event received:', {
          data: typeof event.data,
          length: event.data?.length,
          preview: event.data?.substring(0, 100)
        });
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          console.log('WebSocket message received:', message.type);
          
          switch (message.type) {
            case 'connected':
              console.log('WebSocket connection confirmed');
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
              console.log('Canvas data message received, calling handleCanvasUpdate');
              handleCanvasUpdate(message.data as Canvas);
              break;
            case 'cooldown_active':
              handleCooldownActive(message.data as { cooldownEnd: string; message: string });
              break;
            case 'online_count':
              const countData = message.data as { count: number };
              handleOnlineCount(countData.count);
              break;
            case 'error':
              handleError((message.data as { message?: string })?.message || 'Unknown error');
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        console.log('WebSocket disconnected:', {
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
  }, [wsUrl]); // Only depend on URL

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
  }, [isConnected, canvasSize, wsGetCanvas, isConnecting, connect, disconnect]);

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