// src/app/api/find-matches/route.ts
import { NextResponse } from 'next/server';
import { matchService } from '@/services/matchService';
import { User } from '@/types';

export async function POST(request: Request) {
  try {
    const { user, filters, limit } = await request.json() as { user: User, filters: any, limit: number };

    if (!user) {
      return NextResponse.json({ error: 'User data is required.' }, { status: 400 });
    }

    // Since this is now on the server, we need a way to call the original server-side findMatches logic.
    // Let's assume we rename the original logic to findMatchesOnServer
    const matches = await matchService.findMatchesOnServer(user, filters, limit);
    
    return NextResponse.json(matches);

  } catch (error) {
    console.error('Error in /api/find-matches:', error);
    return NextResponse.json({ error: 'Failed to find matches.' }, { status: 500 });
  }
} 