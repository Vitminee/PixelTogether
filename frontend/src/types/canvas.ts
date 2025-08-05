export interface PixelData {
  x: number;
  y: number;
  color: string;
  user_id: string;
  username?: string;
  timestamp: number;
}

export type Pixel = PixelData;

export interface Stats {
  total_pixels?: number;
  totalPixels?: number;
  unique_users?: number;
  uniqueUsers?: number;
  pixels_placed_now?: number;
  pixelsPlacedNow?: number;
}

export interface SparsePixel {
  x: number;
  y: number;
  color: string;
}

export interface Canvas {
  pixels?: string[][]; // Full canvas (for backward compatibility)
  sparse_pixels?: SparsePixel[]; // Optimized format
  sparsePixels?: SparsePixel[]; // Alternative naming
  size: number;
  last_update?: string;
  lastUpdate?: string;
  stats: Stats;
  recent_changes?: PixelData[];
  recentChanges?: PixelData[];
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