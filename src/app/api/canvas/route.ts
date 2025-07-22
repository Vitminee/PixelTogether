import { NextRequest, NextResponse } from 'next/server';
import { canvasStore } from '@/lib/canvas-store';
import { statsStore } from '@/lib/stats-store';
import { broadcastPixelUpdate, broadcastStatsUpdate } from '@/app/api/canvas/stream/route';

export async function GET() {
  try {
    const canvasState = canvasStore.getCanvasState();
    const stats = statsStore.getStats();
    return NextResponse.json({ ...canvasState, stats });
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
    const { x, y, color, userId, username } = await request.json();

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

    // Update stats
    statsStore.addEdit(userId);

    const canvasState = canvasStore.getCanvasState();
    const stats = statsStore.getStats();
    const pixel = { x, y, color, userId, username: username || `User ${userId.slice(0, 6)}`, timestamp: Date.now() };
    
    // Broadcast update to all connected clients
    broadcastPixelUpdate(pixel);
    broadcastStatsUpdate(stats);
    
    return NextResponse.json({
      success: true,
      canvasState,
      stats,
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