import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { aiService } from '../../../services/aiService';

export async function POST(request: NextRequest) {
  try {
    const { listingId, description } = await request.json();
    
    let descriptionToAnalyze = description;
    
    // If listingId is provided, get description from Firestore
    if (listingId && !description) {
      const listingDoc = await getDoc(doc(db, 'listings', listingId));
      
      if (!listingDoc.exists()) {
        return NextResponse.json(
          { error: 'Listing not found' },
          { status: 404 }
        );
      }

      const listing = listingDoc.data();
      
      if (!listing.description) {
        return NextResponse.json(
          { error: 'No description available for analysis' },
          { status: 400 }
        );
      }
      
      descriptionToAnalyze = listing.description;
    }
    
    if (!descriptionToAnalyze) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Analyze the listing description using AI
    const analysis = await aiService.analyzeListingDescription(descriptionToAnalyze);
    
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('Error analyzing listing:', error);
    return NextResponse.json(
      { error: 'Failed to analyze listing' },
      { status: 500 }
    );
  }
} 