import { CanvasState } from '@/types/canvas';

class CanvasStore {
  private canvas: string[][] = [];
  private readonly CANVAS_WIDTH = 64;
  private readonly CANVAS_HEIGHT = 64;

  constructor() {
    this.initializeCanvas();
  }

  private initializeCanvas() {
    this.canvas = Array(this.CANVAS_HEIGHT)
      .fill(null)
      .map(() => Array(this.CANVAS_WIDTH).fill('#FFFFFF'));
  }

  getCanvas(): string[][] {
    return this.canvas.map(row => [...row]);
  }

  setPixel(x: number, y: number, color: string): boolean {
    if (x < 0 || x >= this.CANVAS_WIDTH || y < 0 || y >= this.CANVAS_HEIGHT) {
      return false;
    }
    
    this.canvas[y][x] = color;
    return true;
  }

  getCanvasState(): CanvasState {
    return {
      pixels: this.getCanvas(),
      lastUpdate: Date.now()
    };
  }

  loadCanvasState(state: CanvasState) {
    if (state.pixels && state.pixels.length === this.CANVAS_HEIGHT) {
      this.canvas = state.pixels.map(row => [...row]);
    }
  }
}

export const canvasStore = new CanvasStore();