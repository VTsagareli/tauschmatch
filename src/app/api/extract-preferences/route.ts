import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '../../../services/aiService';

export async function POST(request: NextRequest) {
  try {
    const { userDescription } = await request.json();
    
    if (!userDescription) {
      return NextResponse.json(
        { error: 'User description is required' },
        { status: 400 }
      );
    }

    // Extract preferences using AI
    const preferences = await aiService.extractPreferences(userDescription);
    
    return NextResponse.json(preferences);
    
  } catch (error) {
    console.error('Error extracting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to extract preferences' },
      { status: 500 }
    );
  }
} 