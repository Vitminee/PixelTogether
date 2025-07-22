import { NextRequest, NextResponse } from 'next/server';
import { canvasStore } from '@/lib/canvas-store';
import { broadcastPixelUpdate } from '@/app/api/canvas/stream/route';

export async function GET() {
  try {
    const canvasState = canvasStore.getCanvasState();
    return NextResponse.json(canvasState);
  } catch (error) {
    console.error('Error fetching canvas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { x, y, color, userId } = await request.json();

    if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'string' || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const success = canvasStore.setPixel(x, y, color);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid pixel coordinates' },
        { status: 400 }
      );
    }

    const canvasState = canvasStore.getCanvasState();
    const pixel = { x, y, color, userId, timestamp: Date.now() };
    
    // Broadcast update to all connected clients
    broadcastPixelUpdate(pixel);
    
    return NextResponse.json({
      success: true,
      canvasState,
      pixel
    });
  } catch (error) {
    console.error('Error updating canvas:', error);
    return NextResponse.json(
      { error: 'Failed to update canvas' },
      { status: 500 }
    );
  }
}