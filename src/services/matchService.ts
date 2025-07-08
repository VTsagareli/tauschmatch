import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Listing } from '../types';
import { User } from '../types';
import { aiService, ExtractedPreferences, ListingAnalysis } from './aiService';

export interface MatchResult {
  listing: Listing;
  score: number;
  semanticScore: number;
  traditionalScore: number;
  matchReasons: string[];
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
  async findMatches(
    user: User, 
    filters: MatchFilters = {}, 
    limitResults: number = 20
  ): Promise<MatchResult[]> {
    try {
      console.log('Finding matches for user:', user.uid);
      console.log('User lookingFor preferences:', user.lookingFor);
      // Build Firestore query
      let q = query(collection(db, 'listings'));
      
      // Apply filters
      if (filters.maxRent) {
        q = query(q, where('coldRent', '<=', filters.maxRent));
      }
      if (filters.minRooms) {
        q = query(q, where('rooms', '>=', filters.minRooms));
      }
      if (filters.maxRooms) {
        q = query(q, where('rooms', '<=', filters.maxRooms));
      }
      if (filters.districts && filters.districts.length > 0) {
        q = query(q, where('district', 'in', filters.districts));
      }
      if (filters.types && filters.types.length > 0) {
        q = query(q, where('type', 'in', filters.types));
      }
      
      // Limit results (no ordering by createdAt since imported listings don't have it)
      q = query(q, limit(limitResults));
      
      console.log('Firestore query filters:', filters);
      console.log('Query limit:', limitResults);
      
      const querySnapshot = await getDocs(q);
      const listings: Listing[] = [];
      
      querySnapshot.forEach((doc) => {
        listings.push({ id: doc.id, ...doc.data() } as Listing);
      });
      
      console.log(`Found ${listings.length} listings from Firestore`);
      if (listings.length === 0) {
        console.log('No listings found - this might be the issue');
        return [];
      }
      
      // Extract user preferences using AI
      // Create a description from user's lookingFor preferences
      const userDescription = this.createUserDescription(user);
      const userPrefs = await aiService.extractPreferences(userDescription);
      
      // Calculate match scores for each listing
      const matchResults: MatchResult[] = [];
      
      for (const listing of listings) {
        const traditionalScore = this.calculateTraditionalScore(user, listing);
        const semanticScore = await this.calculateSemanticScore(userPrefs, listing);
        const totalScore = (traditionalScore * 0.6) + (semanticScore * 0.4);
        
        const matchReasons = this.generateMatchReasons(user, listing, userPrefs);
        
        matchResults.push({
          listing,
          score: Math.round(totalScore),
          semanticScore: Math.round(semanticScore),
          traditionalScore: Math.round(traditionalScore),
          matchReasons,
        });
      }
      
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

  async calculateSemanticScore(userPrefs: ExtractedPreferences, listing: Listing): Promise<number> {
    if (!listing.description) return 0;
    
    try {
      const listingAnalysis = await aiService.analyzeListingDescription(listing.description);
      return await aiService.calculateSemanticMatchScore(userPrefs, listingAnalysis);
    } catch (error) {
      console.error('Error calculating semantic score:', error);
      return 0;
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
  }
}; 