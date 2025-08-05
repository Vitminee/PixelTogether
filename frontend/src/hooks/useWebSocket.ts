import { useEffect, useRef, useState, useCallback } from 'react';
import type { Pixel, Stats, Canvas } from '@/types/canvas';

interface UseWebSocketOptions {
  url: string;
  onPixelUpdate?: (pixel: Pixel) => void;
  onStatsUpdate?: (stats: Stats) => void;
  onRecentChanges?: (changes: Pixel[]) => void;
  onCanvasUpdate?: (canvas: Canvas) => void;
  onCooldownActive?: (data: { cooldownEnd: string; message: string }) => void;
  onOnlineCount?: (count: number) => void;
  onError?: (error: string) => void;
}

interface WSMessage {
  type: string;
  data: unknown;
}

export function useWebSocket({
  url,
  onPixelUpdate,
  onStatsUpdate,
  onRecentChanges,
  onCanvasUpdate,
  onCooldownActive,
  onOnlineCount,
  onError,
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;


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

  // API methods
  const placePixel = useCallback((x: number, y: number, color: string, userId: string, username: string, size: number) => {
    console.log('=== FRONTEND SENDING PIXEL ===');
    console.log(`Sending pixel: x=${x}, y=${y}, color=${color}, userId=${userId}, size=${size}`);
    return sendMessage({
      type: 'place_pixel',
      data: { x, y, color, userId, username, size }
    });
  }, [sendMessage]);

  const getCanvas = useCallback((size: number) => {
    return sendMessage({
      type: 'get_canvas',
      data: { size }
    });
  }, [sendMessage]);

  const checkCooldown = useCallback((userId: string) => {
    return sendMessage({
      type: 'check_cooldown',
      data: { userId }
    });
  }, [sendMessage]);

  const updateUsername = useCallback((userId: string, username: string) => {
    return sendMessage({
      type: 'update_username',
      data: { userId, username }
    });
  }, [sendMessage]);

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

    console.log('Connecting to WebSocket:', url);
    setIsConnecting(true);
    
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttempts.current = 0;
        console.log('WebSocket connected to:', url);
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
          
          // Debug logging for all messages
          console.log('WebSocket raw message:', message.type, message);
          console.log('WebSocket message received:', message.type);
          
          switch (message.type) {
            case 'connected':
              console.log('WebSocket connection confirmed');
              break;
            case 'pixel_update':
              onPixelUpdate?.(message.data as Pixel);
              break;
            case 'stats_update':
              onStatsUpdate?.(message.data as Stats);
              break;
            case 'recent_changes':
              onRecentChanges?.(message.data as Pixel[]);
              break;
            case 'canvas_data':
            case 'canvas_update':
              console.log('Canvas data message received, calling onCanvasUpdate');
              console.log('Message data:', message.data);
              onCanvasUpdate?.(message.data as Canvas);
              break;
            case 'cooldown_active':
              onCooldownActive?.(message.data as { cooldownEnd: string; message: string });
              break;
            case 'cooldown_status':
              break;
            case 'pixel_placed':
              break;
            case 'username_updated':
              break;
            case 'online_count':
              const countData = message.data as { count: number };
              onOnlineCount?.(countData.count);
              break;
            case 'error':
              onError?.((message.data as { message?: string })?.message || 'Unknown error');
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
          url: url
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
          onError?.('Connection lost. Please refresh the page.');
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
        onError?.(`WebSocket connection error: ${error.type || 'Unknown error'}`);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnecting(false);
      onError?.('Failed to create WebSocket connection');
    }
  }, [url, isConnecting, onPixelUpdate, onStatsUpdate, onRecentChanges, onCanvasUpdate, onCooldownActive, onOnlineCount, onError]);

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

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [url]); // Only depend on URL

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    placePixel,
    getCanvas,
    checkCooldown,
    updateUsername,
  };
}