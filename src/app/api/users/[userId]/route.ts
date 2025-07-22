import { NextRequest, NextResponse } from 'next/server';
import { updateUsernameInChanges, getUser } from '@/lib/database';
import { broadcastRecentChanges } from '@/lib/sse-broadcaster';
import { getRecentChanges } from '@/lib/database';

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { username } = await request.json();
    const { userId } = params;

    if (typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { error: 'Invalid username' },
        { status: 400 }
      );
    }

    // Update username and all associated changes
    await updateUsernameInChanges(userId, username.trim());
    
    // Get updated user
    const user = await getUser(userId);
    
    // Broadcast updated recent changes to reflect new username
    const recentChanges = await getRecentChanges(20);
    broadcastRecentChanges(recentChanges);
    
    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    
    const user = await getUser(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}