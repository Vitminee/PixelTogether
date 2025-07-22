export interface PixelData {
  x: number;
  y: number;
  color: string;
  userId: string;
  timestamp: number;
}

export interface CanvasState {
  pixels: string[][];
  lastUpdate: number;
}

export interface User {
  id: string;
  username: string;
  lastPlacement: number;
  isConnected: boolean;
}