import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Listing } from '../types';
import { User } from '../types';
import { aiService, ExtractedPreferences, ListingAnalysis } from './aiService';
import { MatchResult } from '../types';

export interface MatchFilters {
  maxRent?: number;
  minRooms?: number;
  maxRooms?: number;
  districts?: string[];
  types?: string[];
}

export const matchService = {
  
  // This function is called from the client-side
  async findMatches(
    user: User, 
    filters: MatchFilters = {}, 
    limitResults: number = 20
  ): Promise<MatchResult[]> {
    try {
      const response = await fetch('/api/find-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, filters, limit: limitResults }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch matches from API.');
      }
      return await response.json();
    } catch (error) {
      console.error("Error calling find-matches API:", error);
      return [];
    }
  },

  // This function is now for server-side use ONLY
  async findMatchesOnServer(
    user: User, 
    filters: MatchFilters = {}, 
    limitResults: number = 20
  ): Promise<MatchResult[]> {
    try {
      console.log('🔍 Starting match search...');
      console.log('User data:', user);
      console.log('Filters:', filters);
      console.log('Limit:', limitResults);
      
      // Build Firestore query
      let q = query(collection(db, 'listings'));
      
      // Apply filters
      if (filters.maxRent) {
        q = query(q, where('coldRent', '<=', filters.maxRent));
        console.log('Applied maxRent filter:', filters.maxRent);
      }
      if (filters.minRooms) {
        q = query(q, where('rooms', '>=', filters.minRooms));
        console.log('Applied minRooms filter:', filters.minRooms);
      }
      if (filters.maxRooms) {
        q = query(q, where('rooms', '<=', filters.maxRooms));
        console.log('Applied maxRooms filter:', filters.maxRooms);
      }
      if (filters.districts && filters.districts.length > 0) {
        q = query(q, where('district', 'in', filters.districts));
        console.log('Applied districts filter:', filters.districts);
      }
      if (filters.types && filters.types.length > 0) {
        q = query(q, where('type', 'in', filters.types));
        console.log('Applied types filter:', filters.types);
      }
      
      // Limit results (no ordering by createdAt since imported listings don't have it)
      // Request more results to filter by minimum score later
      const requestedLimit = Math.max(limitResults * 2, 30); // Get more to filter down
      q = query(q, limit(requestedLimit));
      
      console.log('Executing Firestore query...');
      const querySnapshot = await getDocs(q);
      console.log('Query completed. Found documents:', querySnapshot.size);
      
      const listings: Listing[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Document data:', { id: doc.id, district: data.district, coldRent: data.coldRent, rooms: data.rooms });
        listings.push({ id: doc.id, ...data } as Listing);
      });
      
      console.log('Total listings processed:', listings.length);
      
      if (listings.length === 0) {
        console.log('❌ No listings found in Firestore');
        return [];
      }
      
      // Try AI-powered matching first, fallback to traditional only
      let userPrefs;
      let useAIScoring = true;
      
      try {
        const userDescription = this.createUserDescription(user);
        userPrefs = await aiService.extractPreferences(userDescription);
        console.log('✅ AI preferences extracted successfully');
      } catch (error) {
        console.log('⚠️ AI service failed, using traditional scoring only');
        useAIScoring = false;
        userPrefs = this.createFallbackPreferences(user);
        console.log('✅ Fallback preferences created:', userPrefs);
      }
      
      // Calculate match scores for each listing (BATCHED)
      let batchResults: Array<{ id: string; score: number; whatYouWantAndTheyHave: string[]; whatYouHaveAndTheyWant: string[] }> = [];
      if (useAIScoring && listings.length > 0) {
        try {
          // Get descriptions from correct locations
          const userLookingFor = user.lookingFor?.lookingForDescription || user.lookingForDescription || '';
          const userOffered = user.myApartment?.myApartmentDescription || user.offeredDescription || user.description || '';
          
          // Get structured data to help GPT understand what the user actually has
          const userHasRooms = user.myApartment?.rooms || '';
          const userHasSize = user.myApartment?.squareMeters || '';
          const userHasRent = user.myApartment?.coldRent || '';
          const userHasBalcony = user.myApartment?.balcony;
          const userHasPets = user.myApartment?.petsAllowed;
          
          // Only call GPT if we have meaningful descriptions
          // Lowered threshold to be more inclusive - even short descriptions can have useful info
          // But we can also use structured data if descriptions are minimal
          const hasUserDescriptions = userLookingFor.trim().length > 5 || userOffered.trim().length > 5;
          const listingsWithDescriptions = listings.filter(l => 
            (l.offeredDescription || l.description || '').trim().length > 5 || 
            (l.lookingForDescription || '').trim().length > 5
          );
          
          console.log('🔍 GPT Call Decision:');
          console.log('  User looking for length:', userLookingFor.trim().length, '- Text:', userLookingFor.substring(0, 100));
          console.log('  User offered length:', userOffered.trim().length, '- Text:', userOffered.substring(0, 100));
          console.log('  Total listings:', listings.length);
          console.log('  Listings with descriptions:', listingsWithDescriptions.length);
          console.log('  Has user descriptions:', hasUserDescriptions);
          console.log('  Will call GPT:', hasUserDescriptions && listingsWithDescriptions.length > 0);
          
          // Always try to call GPT if we have ANY data, even if minimal
          // GPT can work with structured data alone or make inferences
          if (hasUserDescriptions && listingsWithDescriptions.length > 0) {
            console.log('🔍 Calling GPT batch with:');
            batchResults = await aiService.batchCalculateCombinedScoreAndReasons(
              userLookingFor,
              userOffered,
              listingsWithDescriptions.map(listing => ({
                id: listing.id,
                offeredDescription: listing.offeredDescription || listing.description || '',
                lookingForDescription: listing.lookingForDescription || ''
              })),
              {
                rooms: userHasRooms,
                squareMeters: userHasSize,
                coldRent: userHasRent,
                balcony: userHasBalcony,
                petsAllowed: userHasPets
              }
            );
            
            console.log('✅ GPT batch results received:', batchResults.length);
            if (batchResults.length > 0) {
              console.log('  Sample result:', {
                id: batchResults[0].id,
                score: batchResults[0].score,
                whatYouWantCount: batchResults[0].whatYouWantAndTheyHave?.length || 0,
                whatYouWantSample: batchResults[0].whatYouWantAndTheyHave?.[0]?.substring(0, 50) || 'none',
                whatYouHaveCount: batchResults[0].whatYouHaveAndTheyWant?.length || 0,
                whatYouHaveSample: batchResults[0].whatYouHaveAndTheyWant?.[0]?.substring(0, 50) || 'none'
              });
            }
            
            // Create empty results for listings without descriptions
            const describedIds = new Set(batchResults.map(r => r.id));
            for (const listing of listings) {
              if (!describedIds.has(listing.id)) {
                batchResults.push({ id: listing.id, score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] });
              }
            }
          } else {
            console.log('⚠️ Skipping GPT call - insufficient descriptions');
            console.log('  Reason: hasUserDescriptions =', hasUserDescriptions, ', listingsWithDescriptions =', listingsWithDescriptions.length);
            console.log('  User lookingFor length:', userLookingFor.trim().length);
            console.log('  User offered length:', userOffered.trim().length);
            console.log('  This means all matches will have semanticScore = 1 and empty semantic reasons');
            batchResults = listings.map(listing => ({ id: listing.id, score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] }));
          }
        } catch (error) {
          console.error('❌ Batch AI scoring failed:', error);
          console.error(error);
          batchResults = listings.map(listing => ({ id: listing.id, score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] }));
        }
      }

      // Assign results to each listing
      const matchResults: MatchResult[] = [];
for (const listing of listings) {
  // Calculate structured score (traditional matching)
  const traditionalScoreRaw = this.calculateTraditionalScore(user, listing); // 0–100
  const structuredScore = Math.round(traditionalScoreRaw / 10); // Normalize to 0–10

  // Calculate semantic score (AI matching)
  let semanticScore = 1;
  let whatYouWantAndTheyHave: string[] = [];
  let whatYouHaveAndTheyWant: string[] = [];

  if (useAIScoring) {
    const result = batchResults.find(r => r.id === listing.id);
    if (result) {
      semanticScore = result.score;
      whatYouWantAndTheyHave = result.whatYouWantAndTheyHave || [];
      whatYouHaveAndTheyWant = result.whatYouHaveAndTheyWant || [];
      
      // Debug first match
      if (matchResults.length === 0) {
        console.log('📊 Semantic score assignment for first listing:');
        console.log('  Listing ID:', listing.id);
        console.log('  Found in batchResults:', !!result);
        console.log('  Semantic score:', semanticScore);
        console.log('  whatYouWantAndTheyHave count:', whatYouWantAndTheyHave.length);
        console.log('  whatYouHaveAndTheyWant count:', whatYouHaveAndTheyWant.length);
        if (whatYouWantAndTheyHave.length > 0) {
          console.log('  Sample whatYouWant:', whatYouWantAndTheyHave[0]);
        }
        if (whatYouHaveAndTheyWant.length > 0) {
          console.log('  Sample whatYouHave:', whatYouHaveAndTheyWant[0]);
        }
      }
    } else {
      // Debug why result not found
      if (matchResults.length === 0) {
        console.log('⚠️ No batch result found for listing:', listing.id);
        console.log('  Available batch result IDs:', batchResults.map(r => r.id));
        console.log('  Batch results count:', batchResults.length);
      }
    }
  }

  // Calculate combined score: 60% structured data, 40% semantic (AI)
  // Both scores are on 0-10 scale, so result is also 0-10
  const combinedScore = Math.round((0.6 * structuredScore) + (0.4 * semanticScore));

  // Generate structured reasons (from traditional matching)
  const structuredTheirReasons = this.generateStructuredMatchReasons(user, listing, userPrefs);
  const structuredYourReasons = this.generateUserApartmentStructuredReasons(user, listing);

  // Semantic reasons (from AI analysis)
  const semanticTheirReasons = whatYouWantAndTheyHave || [];
  const semanticYourReasons = whatYouHaveAndTheyWant || [];

  // Debug first match
  if (matchResults.length === 0) {
    console.log('📊 First match debug:');
    console.log('  Listing ID:', listing.id);
    console.log('  Structured Score:', structuredScore, '/10');
    console.log('  Semantic Score:', semanticScore, '/10');
    console.log('  Combined Score:', combinedScore, '/10');
    console.log('  Listing has lookingForDescription:', !!(listing.lookingForDescription || '').trim());
    console.log('  Listing lookingForDescription length:', (listing.lookingForDescription || '').length);
    console.log('  Structured their reasons:', structuredTheirReasons.length);
    console.log('  Structured your reasons:', structuredYourReasons.length);
    console.log('  Semantic whatYouWant count:', semanticTheirReasons.length);
    console.log('  Semantic whatYouHave count:', semanticYourReasons.length);
    if (structuredYourReasons.length > 0) {
      console.log('  Sample structured your reasons:', structuredYourReasons.slice(0, 2));
    }
    if (semanticYourReasons.length > 0) {
      console.log('  Sample semantic your reasons:', semanticYourReasons.slice(0, 2));
    }
  }

  matchResults.push({
    listing,
    score: combinedScore, // Combined score (60% structured + 40% semantic)
    structuredScore, // Structured match score (0-10)
    semanticScore, // Semantic/AI match score (0-10)
    traditionalScore: structuredScore, // Keep for backwards compatibility
    reasonBreakdown: {
      theirApartment: {
        structured: structuredTheirReasons, // Structured reasons
        descriptions: semanticTheirReasons, // Semantic reasons
      },
      yourApartment: {
        structured: structuredYourReasons, // Structured reasons
        descriptions: semanticYourReasons, // Semantic reasons
      },
    },
    whyThisMatches: structuredTheirReasons,
    whatYouWantAndTheyHave: semanticTheirReasons,
    whatYouHaveAndTheyWant: semanticYourReasons,
  });
}
      
      console.log('✅ Scoring completed. Found', matchResults.length, 'matches before filtering');
      
      // Filter by minimum score of 6 (can be adjusted)
      const MIN_SCORE = 5; // Lowered to show more matches for testing
      const filteredResults = matchResults.filter(match => match.score >= MIN_SCORE);
      
      console.log(`✅ Filtered to ${filteredResults.length} matches with score >= ${MIN_SCORE}`);
      
      // Debug: Log AI reasons count for first few matches
      if (filteredResults.length > 0) {
        console.log('📊 AI Reasons Debug (first 3 matches):');
        filteredResults.slice(0, 3).forEach((match, idx) => {
          console.log(`  Match ${idx + 1} (score: ${match.score}):`);
          console.log(`    whatYouWantAndTheyHave (red): ${match.whatYouWantAndTheyHave?.length || 0} items`);
          console.log(`    whatYouHaveAndTheyWant (red): ${match.whatYouHaveAndTheyWant?.length || 0} items`);
          if ((match.whatYouWantAndTheyHave?.length || 0) > 0) {
            console.log(`    Sample whatYouWant: "${match.whatYouWantAndTheyHave?.[0]?.substring(0, 60)}..."`);
          }
          if ((match.whatYouHaveAndTheyWant?.length || 0) > 0) {
            console.log(`    Sample whatYouHave: "${match.whatYouHaveAndTheyWant?.[0]?.substring(0, 60)}..."`);
          }
        });
      }
      
      // Sort by total score (highest first) and limit to requested number
      const sortedResults = filteredResults.sort((a, b) => b.score - a.score);
      const limitedResults = sortedResults.slice(0, limitResults);
      
      console.log(`✅ Returning ${limitedResults.length} matches (limited to ${limitResults})`);
      
      // Log score distribution
      if (limitedResults.length > 0) {
        const scores = limitedResults.map(m => m.score);
        console.log(`  Score range: ${Math.min(...scores)} - ${Math.max(...scores)}`);
        console.log(`  Average score: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}`);
      }
      
      return limitedResults;
      
    } catch (error) {
      console.error('Error finding matches:', error);
      return [];
    }
  },

  calculateTraditionalScore(user: User, listing: Listing): number {
    let score = 0;
    let maxPossibleScore = 0;
    
    // Budget matching (35% weight) - more generous scoring
    if (user.lookingFor?.maxColdRent && listing.coldRent) {
      maxPossibleScore += 35;
      const userMaxRent = parseInt(user.lookingFor.maxColdRent);
      const rentRatio = userMaxRent / listing.coldRent;
      if (rentRatio >= 1.2) score += 35; // Well within budget (20%+ buffer)
      else if (rentRatio >= 1.0) score += 30; // Within budget
      else if (rentRatio >= 0.9) score += 22; // Slightly over (10% over) - still good
      else if (rentRatio >= 0.8) score += 12; // Over budget (20% over) but reasonable
      else if (rentRatio >= 0.7) score += 5; // Quite over (30% over) but acceptable
      else score += 0; // Too far over budget
    } else if (listing.coldRent) {
      maxPossibleScore += 35; // If user didn't specify, we can't score it
    }
    
    // Room matching (30% weight) - favor more rooms
    if (user.lookingFor?.minRooms && listing.rooms) {
      maxPossibleScore += 30;
      const userMinRooms = parseInt(user.lookingFor.minRooms);
      const roomDiff = listing.rooms - userMinRooms;
      if (roomDiff === 0) score += 30; // Exact match
      else if (roomDiff === 1) score += 28; // One more room (better!)
      else if (roomDiff === 2) score += 24; // Two more rooms (much better!)
      else if (roomDiff >= 3) score += 20; // Three+ more rooms (very spacious!)
      else if (roomDiff === -1) score += 18; // One less room (acceptable)
      else if (roomDiff === -2) score += 8; // Two less rooms (poor but might work)
      else score += 0; // Too far off
    } else if (listing.rooms) {
      maxPossibleScore += 30;
    }
    
    // District preference (20% weight)
    if (user.lookingFor?.districts && user.lookingFor.districts.length > 0) {
      maxPossibleScore += 20;
      if (user.lookingFor.districts.includes(listing.district)) {
        score += 20; // Preferred district
      } else {
        // Check for related districts (e.g., "Friedrichshain-Kreuzberg" relates to "Kreuzberg")
        const listingLower = listing.district.toLowerCase();
        const preferredLower = user.lookingFor.districts.map(d => d.toLowerCase());
        const related = preferredLower.some(d => {
          const dParts = d.split(/[- ]/);
          const lParts = listingLower.split(/[- ]/);
          return dParts.some(dp => lParts.includes(dp)) || lParts.some(lp => dParts.includes(lp));
        });
        if (related) {
          score += 12; // Related district (e.g., Kreuzberg vs Friedrichshain-Kreuzberg)
        } else {
          score += 3; // Other district
        }
      }
    } else if (listing.district) {
      maxPossibleScore += 20;
    }
    
    // Type preference (10% weight)
    if (user.lookingFor?.type && listing.type) {
      maxPossibleScore += 10;
      if (user.lookingFor.type === listing.type) {
        score += 10; // Preferred type
      } else {
        score += 2; // Other type
      }
    } else if (listing.type) {
      maxPossibleScore += 10;
    }
    
    // Size matching (5% weight) - bonus if size matches or exceeds
    if (user.lookingFor?.minSquareMeters && listing.squareMeters) {
      maxPossibleScore += 5;
      const userMinSize = parseInt(user.lookingFor.minSquareMeters);
      if (listing.squareMeters >= userMinSize) {
        const sizeRatio = listing.squareMeters / userMinSize;
        if (sizeRatio >= 1.3) score += 5; // Much larger (30%+)
        else if (sizeRatio >= 1.1) score += 4; // Larger (10%+)
        else if (sizeRatio >= 1.0) score += 4; // Meets requirement
        else score += 1; // Slightly under
      }
    } else if (listing.squareMeters) {
      maxPossibleScore += 5;
    }
    
    // Normalize to 0-100 scale (then will be converted to 0-10)
    if (maxPossibleScore === 0) return 0;
    
    const percentageScore = (score / maxPossibleScore) * 100;
    return Math.min(Math.max(percentageScore, 0), 100);
  },

  generateStructuredMatchReasons(user: User, listing: Listing, userPrefs: ExtractedPreferences): string[] {
    const reasons: string[] = [];
    
      // Budget reasons (be more generous)
      if (user.lookingFor?.maxColdRent && listing.coldRent) {
        const userMaxRent = parseInt(user.lookingFor.maxColdRent);
        const rentRatio = userMaxRent / listing.coldRent;
        const formattedRent = new Intl.NumberFormat('de-DE').format(listing.coldRent);
        const formattedMax = new Intl.NumberFormat('de-DE').format(userMaxRent);
        if (rentRatio >= 1.2) {
          reasons.push(`Well within your budget: €${formattedRent} (your max: €${formattedMax})`);
        } else if (rentRatio >= 1.0) {
          reasons.push(`Within your budget: €${formattedRent} (your max: €${formattedMax})`);
        } else if (rentRatio >= 0.85) {
          reasons.push(`Slightly over budget: €${formattedRent} (your max: €${formattedMax})`);
        }
      }
    
      // Room reasons (be more flexible)
      if (user.lookingFor?.minRooms && listing.rooms) {
        const userMinRooms = parseInt(user.lookingFor.minRooms);
        const roomDiff = listing.rooms - userMinRooms;
        if (roomDiff === 0) {
          reasons.push(`Exact room match: ${listing.rooms} rooms`);
        } else if (roomDiff === 1) {
          reasons.push(`One more room than you requested: ${listing.rooms} rooms (you need min ${userMinRooms})`);
        } else if (roomDiff === 2) {
          reasons.push(`More spacious than you requested: ${listing.rooms} rooms (you need min ${userMinRooms})`);
        } else if (roomDiff === -1) {
          reasons.push(`Close to your room preference: ${listing.rooms} rooms (you need min ${userMinRooms})`);
        }
      }
    
    // District reasons
    if (user.lookingFor?.districts && user.lookingFor.districts.length > 0) {
      if (user.lookingFor.districts.includes(listing.district)) {
        reasons.push(`Located in your preferred district: ${listing.district}`);
      } else {
        // Check for related districts
        const listingLower = listing.district.toLowerCase();
        const preferredLower = user.lookingFor.districts.map(d => d.toLowerCase());
        const related = preferredLower.some(d => 
          listingLower.includes(d.split('-')[0]) || 
          d.includes(listingLower.split('-')[0]) ||
          listingLower.includes(d.split(' ')[0])
        );
        if (related) {
          reasons.push(`Near your preferred districts: ${listing.district}`);
        }
      }
    }
    
    // Type reasons
    if (user.lookingFor?.type && listing.type) {
      if (user.lookingFor.type === listing.type) {
        reasons.push(`Matches your preferred apartment type: ${listing.type}`);
      }
    }
    
    // Size reasons
    if (user.lookingFor?.minSquareMeters && listing.squareMeters) {
      const userMinSize = parseInt(user.lookingFor.minSquareMeters);
      if (listing.squareMeters >= userMinSize) {
        reasons.push(`Meets your size requirement: ${listing.squareMeters} sqm (you need min ${userMinSize} sqm)`);
      }
    }
    
    // Feature matching
    if (user.lookingFor?.balcony && listing.balconyOrTerrace) {
      reasons.push('Has balcony/terrace as requested');
    }
    if (user.lookingFor?.petsAllowed && listing.petsAllowed) {
      reasons.push('Pet-friendly as requested');
    }
    
    // AI-extracted preference reasons
    if (userPrefs.nearPublicTransport) {
      reasons.push('Near public transportation');
    }
    if (userPrefs.nearParks) {
      reasons.push('Close to parks and green spaces');
    }
    if (userPrefs.quiet) {
      reasons.push('Quiet neighborhood');
    }
    if (userPrefs.familyFriendly) {
      reasons.push('Family-friendly area');
    }
    
    return reasons.slice(0, 6); // Limit to top 6 reasons
  },

  generateUserApartmentStructuredReasons(user: User, listing: Listing): string[] {
    const reasons: string[] = [];
    const myApartment = user.myApartment;

    if (!myApartment) {
      return reasons;
    }

    // Try to extract structured criteria from listing's lookingForDescription
    // or use searchCriteria if it exists
    const listingCriteria = listing.searchCriteria;
    const lookingForDescription = (listing.lookingForDescription || '').trim();
    
    // Fallback: Use basic listing fields to infer what they might want
    // Compare user's apartment to listing's current apartment (they might want something similar)
    if (!listingCriteria && lookingForDescription.length === 0) {
      // If they have a 2-room apartment, they might want 2+ rooms
      if (myApartment.rooms && listing.rooms) {
        const myRooms = parseInt(myApartment.rooms);
        const theirRooms = listing.rooms;
        // If they have 2 rooms, they probably want at least 2 rooms (or more)
        // If we have 3 rooms and they have 2, we can offer more
        if (myRooms >= theirRooms) {
          reasons.push(`You have ${myRooms} rooms, and they want at least ${theirRooms} rooms`);
        }
      }
      
      // Compare rent - if their rent is similar or higher, they might accept ours
      if (myApartment.coldRent && listing.coldRent) {
        const myRent = parseInt(myApartment.coldRent);
        const theirRent = listing.coldRent;
        const rentDiff = Math.abs(myRent - theirRent);
        const rentRatio = myRent / theirRent;
        // If our rent is within 20% of theirs, it's reasonable
        if (rentRatio >= 0.8 && rentRatio <= 1.2) {
          reasons.push(`Your rent (€${myRent}) is similar to theirs (€${theirRent})`);
        } else if (myRent < theirRent) {
          reasons.push(`Your rent (€${myRent}) is lower than theirs (€${theirRent})`);
        }
      }
      
      // Compare size
      if (myApartment.squareMeters && listing.squareMeters) {
        const mySize = parseInt(myApartment.squareMeters);
        if (!Number.isNaN(mySize) && mySize >= listing.squareMeters) {
          reasons.push(`Your ${mySize} sqm apartment is at least as large as theirs (${listing.squareMeters} sqm)`);
        }
      }
      
      // Check pets
      if (myApartment.petsAllowed && listing.petsAllowed) {
        reasons.push('Your pet-friendly apartment matches their pet-friendly listing');
      }
      
      // Check balcony - only if they explicitly want it or we infer from their current apartment
      // Since they have a balcony, they probably want one too
      if (myApartment.balcony && listing.balconyOrTerrace) {
        reasons.push('You have a balcony, and they want outdoor space');
      }
    }
    
    // If no searchCriteria but we have lookingForDescription, try to extract info
    // For now, we'll compare basic fields that are likely mentioned
    if (!listingCriteria && lookingForDescription.length > 0) {
      // Extract room requirements from description (simple heuristic)
      const lookingFor = listing.lookingForDescription.toLowerCase();
      
      // Check rooms (if user has enough rooms mentioned in their looking for)
      if (myApartment.rooms) {
        const myRooms = parseInt(myApartment.rooms);
        // Common patterns: "at least X rooms", "X rooms", "X+ rooms"
        const roomMatch = lookingFor.match(/(?:at least|minimum|min)[\s]*(\d+)[\s]*room/i) || 
                          lookingFor.match(/(\d+)[\s]*\+[\s]*room/i) ||
                          lookingFor.match(/(\d+)[\s]*room/i);
        if (roomMatch && !Number.isNaN(myRooms)) {
          const wantedRooms = parseInt(roomMatch[1]);
          if (myRooms >= wantedRooms) {
            reasons.push(`You have ${myRooms} rooms, and they want at least ${wantedRooms} rooms`);
          }
        }
      }

      // Check size
      if (myApartment.squareMeters) {
        const mySize = parseInt(myApartment.squareMeters);
        const sizeMatch = lookingFor.match(/(?:at least|minimum|min)[\s]*(\d+)[\s]*(?:sqm|m²|square meters?)/i) ||
                          lookingFor.match(/(\d+)[\s]*(?:sqm|m²|square meters?)/i);
        if (sizeMatch && !Number.isNaN(mySize)) {
          const wantedSize = parseInt(sizeMatch[1]);
          if (mySize >= wantedSize) {
            reasons.push(`Your ${mySize} sqm apartment meets their size requirement (${wantedSize} sqm)`);
          }
        }
      }

      // Check rent
      if (myApartment.coldRent) {
        const myRent = parseInt(myApartment.coldRent);
        const rentMatch = lookingFor.match(/(?:max|maximum|up to|under|below)[\s]*€?(\d+)/i) ||
                          lookingFor.match(/€?(\d+)[\s]*(?:max|maximum|budget)/i);
        if (rentMatch && !Number.isNaN(myRent)) {
          const maxRent = parseInt(rentMatch[1]);
          if (myRent <= maxRent) {
            reasons.push(`Your rent (€${myRent}) fits their budget (under €${maxRent})`);
          }
        }
      }

      // Check districts
      if (myApartment.city || myApartment.street) {
        const userLocation = (myApartment.city || '').toLowerCase();
        // Common district mentions
        const districtPatterns = ['neukölln', 'kreuzberg', 'prenzlauer berg', 'friedrichshain', 'mitte', 'charlottenburg', 'schöneberg', 'tempelhof', 'pankow', 'wedding', 'moabit'];
        const mentionedDistricts = districtPatterns.filter(d => lookingFor.includes(d));
        if (mentionedDistricts.length > 0 && userLocation) {
          // Check if user's location might match
          const matchesDistrict = mentionedDistricts.some(d => userLocation.includes(d.toLowerCase()));
          if (matchesDistrict) {
            reasons.push(`Your apartment is in ${userLocation}, which they mentioned`);
          }
        }
      }

      // Check pets
      if (myApartment.petsAllowed !== undefined) {
        const wantsPets = lookingFor.includes('pet') || lookingFor.includes('dog') || lookingFor.includes('cat');
        if (wantsPets && myApartment.petsAllowed) {
          reasons.push('Your pet-friendly apartment matches their requirement');
        }
      }

      // Check balcony
      if (myApartment.balcony !== undefined) {
        const wantsBalcony = lookingFor.includes('balcony') || lookingFor.includes('terrace') || lookingFor.includes('terrasse');
        if (wantsBalcony && myApartment.balcony) {
          reasons.push('You have a balcony/terrace, which they want');
        }
      }
    }

    // Also check searchCriteria if it exists (legacy support)
    if (listingCriteria) {
      if (listingCriteria.districts && listingCriteria.districts.length > 0) {
        const userDistricts = myApartment.districts && Array.isArray(myApartment.districts) && myApartment.districts.length > 0
          ? myApartment.districts
          : user.lookingFor?.districts || [];
        const overlap = userDistricts.filter(d => listingCriteria.districts!.includes(d));
        if (overlap.length > 0) {
          reasons.push(`Located in a district they requested (${overlap.join(', ')})`);
        }
      }

      if (listingCriteria.minRooms && myApartment.rooms) {
        const myRooms = parseInt(myApartment.rooms);
        if (!Number.isNaN(myRooms) && myRooms >= Number(listingCriteria.minRooms)) {
          reasons.push(`Offers at least ${listingCriteria.minRooms} rooms they want`);
        }
      }

      if (listingCriteria.minSquareMeters && myApartment.squareMeters) {
        const mySize = parseInt(myApartment.squareMeters);
        if (!Number.isNaN(mySize) && mySize >= Number(listingCriteria.minSquareMeters)) {
          reasons.push(`Your ${mySize} sqm apartment meets their size needs`);
        }
      }

      if (listingCriteria.maxColdRent && myApartment.coldRent) {
        const myRent = parseInt(myApartment.coldRent);
        if (!Number.isNaN(myRent) && myRent <= Number(listingCriteria.maxColdRent)) {
          reasons.push(`Rent (€${myRent}) fits the budget they listed`);
        }
      }

      if (listingCriteria.petsAllowed !== undefined && myApartment.petsAllowed !== undefined) {
        const listingPets = typeof listingCriteria.petsAllowed === 'string'
          ? listingCriteria.petsAllowed.toLowerCase() === 'true'
          : Boolean(listingCriteria.petsAllowed);
        if (listingPets && myApartment.petsAllowed) {
          reasons.push('Pet-friendly apartment matches their requirement');
        } else if (!listingPets && !myApartment.petsAllowed) {
          reasons.push('No pets aligns with their preference');
        }
      }
    }

    return reasons;
  },

  async getDetailedMatchAnalysis(listing: Listing): Promise<ListingAnalysis | null> {
    if (!listing.description) return null;
    
    try {
      return await aiService.analyzeListingDescription(listing.description);
    } catch (error) {
      console.error('Error getting detailed analysis:', error);
      return null;
    }
  },

  createUserDescription(user: User): string {
    const lookingFor = user.lookingFor;
    if (!lookingFor) return '';

    const parts: string[] = [];
    
    // Add apartment type
    if (lookingFor.type) {
      parts.push(`Looking for a ${lookingFor.type.toLowerCase()}`);
    }
    
    // Add room requirements
    if (lookingFor.minRooms) {
      parts.push(`with at least ${lookingFor.minRooms} rooms`);
    }
    
    // Add size requirements
    if (lookingFor.minSquareMeters) {
      parts.push(`minimum ${lookingFor.minSquareMeters} square meters`);
    }
    
    // Add budget
    if (lookingFor.maxColdRent) {
      parts.push(`maximum rent €${lookingFor.maxColdRent}`);
    }
    
    // Add districts
    if (lookingFor.districts && lookingFor.districts.length > 0) {
      parts.push(`in districts: ${lookingFor.districts.join(', ')}`);
    }
    
    // Add floor preference
    if (lookingFor.floor && lookingFor.floor !== 'any') {
      parts.push(`preferably ${lookingFor.floor === '0' ? 'ground floor' : `${lookingFor.floor}th floor`}`);
    }
    
    // Add amenities
    if (lookingFor.balcony) {
      parts.push('with balcony or terrace');
    }
    
    if (lookingFor.petsAllowed) {
      parts.push('pet-friendly');
    }
    
    return parts.join(', ') + '.';
  },

  createFallbackPreferences(user: User): ExtractedPreferences {
    const lookingFor = user.lookingFor;
    if (!lookingFor) {
      return {
        quiet: false,
        nearParks: false,
        familyFriendly: false,
        petFriendly: false,
        nearPublicTransport: false,
        nearShopping: false,
        nearRestaurants: false,
        budget: null,
        minRooms: null,
        maxRent: null,
        preferredDistricts: [],
        lifestyle: [],
      };
    }

    // Extract preferences from user's lookingFor data
    const preferences: ExtractedPreferences = {
      quiet: false,
      nearParks: false,
      familyFriendly: false,
      petFriendly: lookingFor.petsAllowed || false,
      nearPublicTransport: false,
      nearShopping: false,
      nearRestaurants: false,
      budget: lookingFor.maxColdRent ? parseInt(lookingFor.maxColdRent) : null,
      minRooms: lookingFor.minRooms ? parseInt(lookingFor.minRooms) : null,
      maxRent: lookingFor.maxColdRent ? parseInt(lookingFor.maxColdRent) : null,
      preferredDistricts: lookingFor.districts || [],
      lifestyle: [],
    };

    // Infer lifestyle based on preferences
    if (lookingFor.minRooms && parseInt(lookingFor.minRooms) >= 3) {
      preferences.lifestyle.push('family');
      preferences.familyFriendly = true;
    } else if (lookingFor.minRooms && parseInt(lookingFor.minRooms) <= 1) {
      preferences.lifestyle.push('student');
    } else {
      preferences.lifestyle.push('professional');
    }

    // Infer transport preference if not specified
    preferences.nearPublicTransport = true; // Most people want this

    return preferences;
  },

  async calculateCombinedScore(userPrefs: ExtractedPreferences, listing: Listing, userOfferedDescription: string, listingLookingForDescription: string): Promise<number> {
    if (!listing.description) return 1;
    try {
      const listingAnalysis = await aiService.analyzeListingDescription(listing.description);
      return await aiService.calculateCombinedMatchScore(userPrefs, listingAnalysis, userOfferedDescription, listingLookingForDescription);
    } catch (error) {
      console.error('Error calculating combined score:', error);
      return 1;
    }
  },

  // Add a helper to get the combined score and semantic reasons from AI
  async getCombinedScoreAndReasons(userPrefs: ExtractedPreferences, listing: Listing, userLookingForDescription: string, listingLookingForDescription: string, listingOfferedDescription: string, userOfferedDescription: string): Promise<{ score: number; whatYouWantAndTheyHave: string[]; whatYouHaveAndTheyWant: string[] }> {
    if (!listing.description) return { score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] };
    try {
      const listingAnalysis = await aiService.analyzeListingDescription(listing.description);
      const { score, reasons } = await aiService.calculateCombinedScoreAndReasons(
        userPrefs,
        listingAnalysis,
        userLookingForDescription,
        listingLookingForDescription,
        listingOfferedDescription,
        userOfferedDescription
      );
      
      return {
        score,
        whatYouWantAndTheyHave: reasons ?? [],
        whatYouHaveAndTheyWant: [],
      };
          } catch (error) {
      console.error('Error getting combined score and reasons:', error);
      return { score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] };
    }
  }
}; 
