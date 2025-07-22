import { NextRequest, NextResponse } from 'next/server';
import { checkUserCooldown } from '@/lib/database';

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const cooldownCheck = await checkUserCooldown(userId);
    
    return NextResponse.json({
      canPlace: cooldownCheck.canPlace,
      cooldownEnd: cooldownCheck.cooldownEnd
    });
  } catch (error) {
    console.error('Error checking cooldown:', error);
    return NextResponse.json(
      { error: 'Failed to check cooldown' },
      { status: 500 }
    );
  }
}