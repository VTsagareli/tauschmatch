// src/app/api/find-matches/route.ts
import { NextResponse } from 'next/server';
import { matchService } from '@/services/matchService';
import { User } from '@/types';

export async function POST(request: Request) {
  try {
    const { user, filters, limit } = await request.json() as { user: User, filters: any, limit: number };

    console.log('📋 /api/find-matches called');
    console.log('  User:', user ? { 
      uid: user.uid, 
      hasMyApartment: !!user.myApartment,
      hasLookingFor: !!user.lookingFor,
      hasOfferedDescription: !!(user.offeredDescription || user.myApartment?.myApartmentDescription),
      hasLookingForDescription: !!(user.lookingForDescription || user.lookingFor?.lookingForDescription),
      offeredDescLength: (user.myApartment?.myApartmentDescription || user.offeredDescription || user.description || '').length,
      lookingForDescLength: (user.lookingFor?.lookingForDescription || user.lookingForDescription || '').length
    } : 'none');
    console.log('  Filters:', filters);
    console.log('  Limit:', limit);

    if (!user) {
      return NextResponse.json({ error: 'User data is required.' }, { status: 400 });
    }

    // Since this is now on the server, we need a way to call the original server-side findMatches logic.
    // Let's assume we rename the original logic to findMatchesOnServer
    const limitResults = limit || 20; // Default to 20 if not provided
    const matches = await matchService.findMatchesOnServer(user, filters, limitResults);
    
    console.log('✅ /api/find-matches returning', matches.length, 'matches');
    if (matches.length > 0) {
      const sampleMatch = matches[0];
      console.log('  Sample match:', {
        listingId: sampleMatch.listing.id,
        score: sampleMatch.score,
        structuredScore: sampleMatch.structuredScore,
        semanticScore: sampleMatch.semanticScore,
        hasWhatYouWant: (sampleMatch.whatYouWantAndTheyHave || []).length > 0,
        hasWhatYouHave: (sampleMatch.whatYouHaveAndTheyWant || []).length > 0,
        whatYouWantCount: (sampleMatch.whatYouWantAndTheyHave || []).length,
        whatYouHaveCount: (sampleMatch.whatYouHaveAndTheyWant || []).length,
        whatYouWantSample: sampleMatch.whatYouWantAndTheyHave?.[0]?.substring(0, 60),
        whatYouHaveSample: sampleMatch.whatYouHaveAndTheyWant?.[0]?.substring(0, 60),
        hasStructuredTheir: (sampleMatch.reasonBreakdown?.theirApartment?.structured || []).length > 0,
        hasStructuredYour: (sampleMatch.reasonBreakdown?.yourApartment?.structured || []).length > 0,
        structuredTheirCount: (sampleMatch.reasonBreakdown?.theirApartment?.structured || []).length,
        structuredYourCount: (sampleMatch.reasonBreakdown?.yourApartment?.structured || []).length,
        semanticTheirCount: (sampleMatch.reasonBreakdown?.theirApartment?.descriptions || []).length,
        semanticYourCount: (sampleMatch.reasonBreakdown?.yourApartment?.descriptions || []).length,
        semanticTheirSample: sampleMatch.reasonBreakdown?.theirApartment?.descriptions?.[0]?.substring(0, 60),
        semanticYourSample: sampleMatch.reasonBreakdown?.yourApartment?.descriptions?.[0]?.substring(0, 60),
      });
    }
    
    // Log summary of all matches
    const matchesWithSemantic = matches.filter(m => (m.whatYouWantAndTheyHave?.length || 0) > 0 || (m.whatYouHaveAndTheyWant?.length || 0) > 0);
    console.log(`📊 Semantic reasons summary: ${matchesWithSemantic.length}/${matches.length} matches have semantic reasons`);
    
    return NextResponse.json(matches);

  } catch (error) {
    console.error('❌ Error in /api/find-matches:', error);
    console.error(error);
    return NextResponse.json({ error: 'Failed to find matches.' }, { status: 500 });
  }
} 