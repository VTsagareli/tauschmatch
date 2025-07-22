import OpenAI from 'openai';

// Only initialize OpenAI on the server side
let openai: OpenAI | null = null;

if (typeof window === 'undefined') {
  // Server-side only
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export interface ExtractedPreferences {
  quiet: boolean;
  nearParks: boolean;
  familyFriendly: boolean;
  petFriendly: boolean;
  nearPublicTransport: boolean;
  nearShopping: boolean;
  nearRestaurants: boolean;
  budget: number | null;
  minRooms: number | null;
  maxRent: number | null;
  preferredDistricts: string[];
  lifestyle: string[];
}

export interface ListingAnalysis {
  features: string[];
  amenities: string[];
  neighborhood: string;
  atmosphere: string;
  accessibility: string[];
  suitability: string[];
}

export const aiService = {
  async extractPreferences(userDescription: string): Promise<ExtractedPreferences> {
    try {
      // If on client side, call API route
      if (typeof window !== 'undefined') {
        const response = await fetch('/api/extract-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userDescription })
        });
        
        if (!response.ok) throw new Error('API call failed');
        const result = await response.json();
        return result;
      }

      // Server-side implementation
      if (!openai) throw new Error('OpenAI not initialized');

      const prompt = `
        Extract apartment preferences from this user description: "${userDescription}"
        
        Return a JSON object with these fields:
        - quiet: boolean (if they mention quiet, peaceful, etc.)
        - nearParks: boolean (if they mention parks, green spaces, etc.)
        - familyFriendly: boolean (if they mention family, children, etc.)
        - petFriendly: boolean (if they mention pets, dogs, cats, etc.)
        - nearPublicTransport: boolean (if they mention transport, metro, etc.)
        - nearShopping: boolean (if they mention shopping, stores, etc.)
        - nearRestaurants: boolean (if they mention restaurants, cafes, etc.)
        - budget: number or null (extract budget amount)
        - minRooms: number or null (extract minimum rooms)
        - maxRent: number or null (extract maximum rent)
        - preferredDistricts: string[] (extract Berlin district names)
        - lifestyle: string[] (extract lifestyle keywords like "student", "professional", "family", etc.)
        
        Only return valid JSON, no other text.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from GPT');

      const result = JSON.parse(response);
      return result;
    } catch (error) {
      console.error('[AI] extractPreferences error:', error);
      // Return default preferences if GPT fails
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
  },

  async analyzeListingDescription(description: string): Promise<ListingAnalysis> {
    try {
      // If on client side, call API route
      if (typeof window !== 'undefined') {
        const response = await fetch('/api/analyze-listing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description })
        });
        
        if (!response.ok) throw new Error('API call failed');
        const result = await response.json();
        return result;
      }

      // Server-side implementation
      if (!openai) throw new Error('OpenAI not initialized');

      const prompt = `
        Analyze this apartment listing description: "${description}"
        
        Return a JSON object with these fields:
        - features: string[] (extract apartment features like "balcony", "garden", "elevator", etc.)
        - amenities: string[] (extract nearby amenities like "park", "metro", "shops", etc.)
        - neighborhood: string (describe the neighborhood atmosphere)
        - atmosphere: string (describe the overall atmosphere)
        - accessibility: string[] (extract accessibility features)
        - suitability: string[] (extract who this apartment is suitable for like "students", "families", "professionals", etc.)
        
        Only return valid JSON, no other text.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) throw new Error('No response from GPT');

      const result = JSON.parse(response);
      return result;
    } catch (error) {
      console.error('[AI] analyzeListingDescription error:', error);
      // Return default analysis if GPT fails
      return {
        features: [],
        amenities: [],
        neighborhood: '',
        atmosphere: '',
        accessibility: [],
        suitability: [],
      };
    }
  },

  async calculateCombinedMatchScore(userPrefs: ExtractedPreferences, listingAnalysis: ListingAnalysis, userOfferedDescription: string, listingLookingForDescription: string): Promise<number> {
    try {
      if (!openai) throw new Error('OpenAI not initialized on server');

      const prompt = `
        Based on the user's preferences, their apartment description, and the listing's analysis (including what the listing author is looking for), calculate a single overall compatibility score from 1 to 10 (where 10 is a perfect two-way match and 1 is a poor match).
        
        User Preferences: ${JSON.stringify(userPrefs)}
        User's Apartment Description: ${userOfferedDescription}
        Listing Analysis: ${JSON.stringify(listingAnalysis)}
        Listing Author's Looking For: ${listingLookingForDescription}

        Return only a JSON object with a single key: "score" (an integer from 1 to 10).
        Be strict if there is a clear mismatch. Do not include any explanations or reasons.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return 1;
      
      const result = JSON.parse(response);
      return result.score || 1;
    } catch (error) {
      console.error('Error in calculateCombinedMatchScore:', error);
      return 1;
    }
  },

  async calculateCombinedScoreAndReasons(userPrefs: ExtractedPreferences, listingAnalysis: ListingAnalysis, userLookingForDescription: string, listingLookingForDescription: string, offeredDescription: string, userOfferedDescription: string): Promise<{ score: number; reasons: string[] }> {
    try {
      if (!openai) throw new Error('OpenAI not initialized on server');

      const prompt = `
        Compare the following descriptions to determine how well these two parties match for a home swap:
        
        1. You (the webapp user):
        - What you have to offer:
        """
        ${userOfferedDescription}
        """
        - What you are looking for:
        """
        ${userLookingForDescription}
        """
        
        2. The listing author (from Tauschwohnung):
        - What they have to offer:
        """
        ${offeredDescription}
        """
        - What they are looking for:
        """
        ${listingLookingForDescription}
        """

        Only use the information in these descriptions. Ignore structured fields like budget, rooms, or location.

        Return a JSON object with three keys:
        - "score" (an integer from 1 to 10, where 10 is a perfect two-way match and 1 is a poor match)
        - "whatYouWantAndTheyHave" (an array of short, user-friendly bullet points describing what you want and they offer)
        - "whatYouHaveAndTheyWant" (an array of short, user-friendly bullet points describing what you offer and they want)
        Use the full range from 1 (very poor match) to 10 (excellent match). Only give a very low score if there is a major, obvious mismatch. Otherwise, try to differentiate between average, good, and great matches. Make the bullet points quick and easy to read.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return { score: 1, reasons: [] };
      
      const result = JSON.parse(response);
      return {
        score: result.score || 1,
        reasons: result.reasons || []
      };
    } catch (error) {
      console.error('Error in calculateCombinedScoreAndReasons:', error);
      return { score: 1, reasons: [] };
    }
  },

  async batchCalculateCombinedScoreAndReasons(
    userLookingForDescription: string,
    userOfferedDescription: string,
    listings: Array<{ offeredDescription: string; lookingForDescription: string; id: string }>
  ): Promise<Array<{ id: string; score: number; whatYouWantAndTheyHave: string[]; whatYouHaveAndTheyWant: string[] }>> {
    try {
      if (!openai) throw new Error('OpenAI not initialized on server');

      const prompt = `
        You are matching a user with multiple apartment listings for a home swap. For each listing, compare the following:
        
        User:
        - What you have to offer:
        """
        ${userOfferedDescription}
        """
        - What you are looking for:
        """
        ${userLookingForDescription}
        """
        
        Listings:
        ${listings.map((l, i) => `Listing ${i + 1} (id: ${l.id}):\nOffered: """${l.offeredDescription}"""\nLooking For: """${l.lookingForDescription}"""`).join('\n\n')}

        For each listing, return a JSON object with these keys:
        - "id" (the listing id)
        - "score" (an integer from 1 to 10, where 10 is a perfect two-way match and 1 is a poor match)
        - "whatYouWantAndTheyHave" (an array of short, user-friendly bullet points describing what you want and they offer)
        - "whatYouHaveAndTheyWant" (an array of short, user-friendly bullet points describing what you offer and they want)
        
        Return a JSON array, one object per listing, in the same order as above. Only use the information in the descriptions. Ignore structured fields like budget, rooms, or location. Make the bullet points quick and easy to read.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return [];
      return JSON.parse(response);
    } catch (error) {
      console.error('Error in batchCalculateCombinedScoreAndReasons:', error);
      return [];
    }
  },
}; 