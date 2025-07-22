import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Listing } from '../types';
import { User } from '../types';
import { aiService, ExtractedPreferences, ListingAnalysis } from './aiService';

export interface MatchResult {
  listing: Listing;
  score: number; // single combined score (1-10)
  whyThisMatches: string[];
  aiAnalysis?: ListingAnalysis;
}

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
      q = query(q, limit(limitResults));
      
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
          batchResults = await aiService.batchCalculateCombinedScoreAndReasons(
            user.lookingForDescription || '',
            user.offeredDescription || user.description || '',
            listings.map(listing => ({
              id: listing.id,
              offeredDescription: listing.offeredDescription || listing.description || '',
              lookingForDescription: listing.lookingForDescription || ''
            }))
          );
        } catch (error) {
          console.log('Batch AI scoring failed, using minimum scores');
          batchResults = listings.map(listing => ({ id: listing.id, score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] }));
        }
      }

      // Assign results to each listing
      const matchResults: MatchResult[] = [];
      for (const listing of listings) {
        let score = 1;
        let whatYouWantAndTheyHave: string[] = [];
        let whatYouHaveAndTheyWant: string[] = [];
        const matchReasons = this.generateMatchReasons(user, listing, userPrefs);
        if (useAIScoring) {
          const result = batchResults.find(r => r.id === listing.id);
          if (result) {
            score = result.score;
            whatYouWantAndTheyHave = result.whatYouWantAndTheyHave;
            whatYouHaveAndTheyWant = result.whatYouHaveAndTheyWant;
          }
        }
        // Always include traditional match reasons
        const whyThisMatches = [...matchReasons];
        matchResults.push({
          listing,
          score,
          whyThisMatches,
          whatYouWantAndTheyHave,
          whatYouHaveAndTheyWant,
        });
      }
      
      console.log('✅ Scoring completed. Returning', matchResults.length, 'matches');
      // Sort by total score (highest first)
      return matchResults.sort((a, b) => b.score - a.score);
      
    } catch (error) {
      console.error('Error finding matches:', error);
      return [];
    }
  },

  calculateTraditionalScore(user: User, listing: Listing): number {
    let score = 0;
    
    // Budget matching (40% weight)
    if (user.lookingFor?.maxColdRent && listing.coldRent) {
      const rentRatio = parseInt(user.lookingFor.maxColdRent) / listing.coldRent;
      if (rentRatio >= 1.2) score += 40; // Well within budget
      else if (rentRatio >= 1.0) score += 30; // Within budget
      else if (rentRatio >= 0.8) score += 15; // Slightly over budget
      else score += 0; // Over budget
    }
    
    // Room matching (30% weight)
    if (user.lookingFor?.minRooms && listing.rooms) {
      const userMinRooms = parseInt(user.lookingFor.minRooms);
      const roomDiff = Math.abs(userMinRooms - listing.rooms);
      if (roomDiff === 0) score += 30; // Exact match
      else if (roomDiff === 1) score += 20; // Close match
      else if (roomDiff === 2) score += 10; // Acceptable match
      else score += 0; // Poor match
    }
    
    // District preference (20% weight)
    if (user.lookingFor?.districts && user.lookingFor.districts.length > 0) {
      if (user.lookingFor.districts.includes(listing.district)) {
        score += 20; // Preferred district
      } else {
        score += 5; // Other district
      }
    }
    
    // Type preference (10% weight)
    if (user.lookingFor?.type && listing.type) {
      if (user.lookingFor.type === listing.type) {
        score += 10; // Preferred type
      } else {
        score += 2; // Other type
      }
    }
    
    return Math.min(score, 100);
  },

  async calculateSemanticScore(userPrefs: ExtractedPreferences, listing: Listing, userOfferedDescription: string, listingLookingForDescription: string): Promise<{ score: number; reasons: { forYou: string[]; forThem: string[] } }> {
    if (!listing.description) return { score: 0, reasons: { forYou: [], forThem: [] } };
    
    try {
      const listingAnalysis = await aiService.analyzeListingDescription(listing.description);
      return await aiService.calculateSemanticMatchScore(userPrefs, listingAnalysis, userOfferedDescription, listingLookingForDescription);
    } catch (error) {
      console.error('Error calculating semantic score:', error);
      return { score: 0, reasons: { forYou: [], forThem: [] } };
    }
  },

  generateMatchReasons(user: User, listing: Listing, userPrefs: ExtractedPreferences): string[] {
    const reasons: string[] = [];
    
    // Budget reasons
    if (user.lookingFor?.maxColdRent && listing.coldRent && listing.coldRent <= parseInt(user.lookingFor.maxColdRent)) {
      reasons.push(`Within your budget (€${listing.coldRent} vs €${user.lookingFor.maxColdRent} max)`);
    }
    
    // Room reasons
    if (user.lookingFor?.minRooms && listing.rooms && Math.abs(parseInt(user.lookingFor.minRooms) - listing.rooms) <= 1) {
      reasons.push(`Room count matches your preference (${listing.rooms} rooms)`);
    }
    
    // District reasons
    if (user.lookingFor?.districts && user.lookingFor.districts.includes(listing.district)) {
      reasons.push(`Located in your preferred district: ${listing.district}`);
    }
    
    // Type reasons
    if (user.lookingFor?.type && user.lookingFor.type === listing.type) {
      reasons.push(`Matches your preferred apartment type: ${listing.type}`);
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
    
    return reasons.slice(0, 5); // Limit to top 5 reasons
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
      return await aiService.calculateCombinedScoreAndReasons(userPrefs, listingAnalysis, userLookingForDescription, listingLookingForDescription, listingOfferedDescription, userOfferedDescription);
    } catch (error) {
      console.error('Error getting combined score and reasons:', error);
      return { score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] };
    }
  }
}; 