import { NextRequest, NextResponse } from 'next/server';
import { getCanvas, setPixel, getStats, createOrUpdateUser, getRecentChanges, checkUserCooldown, setCooldown } from '@/lib/database';
import { broadcastPixelUpdate, broadcastStatsUpdate, broadcastRecentChanges } from '@/lib/sse-broadcaster';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const canvasSize = parseInt(searchParams.get('size') || '64');
    
    const [pixels, stats, recentChanges] = await Promise.all([
      getCanvas(canvasSize),
      getStats(canvasSize),
      getRecentChanges(20, canvasSize)
    ]);
    
    return NextResponse.json({ 
      pixels, 
      stats, 
      recentChanges,
      lastUpdate: Date.now()
    });
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
    const { searchParams } = new URL(request.url);
    const canvasSize = parseInt(searchParams.get('size') || '64');
    const { x, y, color, userId, username } = await request.json();

    if (typeof x !== 'number' || typeof y !== 'number' || typeof color !== 'string' || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (x < 0 || x >= canvasSize || y < 0 || y >= canvasSize) {
      return NextResponse.json(
        { error: 'Invalid pixel coordinates' },
        { status: 400 }
      );
    }

    // Check user cooldown
    const cooldownCheck = await checkUserCooldown(userId);
    if (!cooldownCheck.canPlace) {
      return NextResponse.json(
        { 
          error: 'Cooldown active',
          cooldownEnd: cooldownCheck.cooldownEnd,
          message: 'You must wait before placing another pixel'
        },
        { status: 429 } // Too Many Requests
      );
    }

    // Create or update user
    const user = await createOrUpdateUser(userId, username || `User${userId.slice(-4)}`);
    
    // Set pixel in database
    const success = await setPixel(x, y, color, userId, canvasSize);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to set pixel' },
        { status: 500 }
      );
    }

    // Set cooldown for user
    await setCooldown(userId);

    // Get updated data
    const [pixels, stats, recentChanges] = await Promise.all([
      getCanvas(canvasSize),
      getStats(canvasSize),
      getRecentChanges(20, canvasSize)
    ]);
    const pixel = { 
      x, 
      y, 
      color, 
      user_id: userId,
      username: user.username,
      timestamp: Date.now() 
    };
    
    // Broadcast updates to all connected clients
    broadcastPixelUpdate(pixel);
    broadcastStatsUpdate(stats);
    broadcastRecentChanges(recentChanges);
    
    return NextResponse.json({
      success: true,
      pixels,
      stats,
      recentChanges,
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