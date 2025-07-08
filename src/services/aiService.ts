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
        return await response.json();
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

      return JSON.parse(response);
    } catch (error) {
      console.error('Error extracting preferences:', error);
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
        return await response.json();
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

      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing listing:', error);
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

  async calculateSemanticMatchScore(userPrefs: ExtractedPreferences, listingAnalysis: ListingAnalysis): Promise<number> {
    let score = 0;
    
    // Lifestyle matching
    const lifestyleMatch = userPrefs.lifestyle.some(lifestyle => 
      listingAnalysis.suitability.includes(lifestyle)
    );
    if (lifestyleMatch) score += 20;
    
    // Neighborhood preferences
    if (userPrefs.quiet && listingAnalysis.atmosphere.toLowerCase().includes('quiet')) score += 15;
    if (userPrefs.nearParks && listingAnalysis.amenities.some(a => a.toLowerCase().includes('park'))) score += 15;
    if (userPrefs.nearPublicTransport && listingAnalysis.amenities.some(a => a.toLowerCase().includes('metro'))) score += 15;
    if (userPrefs.nearShopping && listingAnalysis.amenities.some(a => a.toLowerCase().includes('shop'))) score += 10;
    if (userPrefs.nearRestaurants && listingAnalysis.amenities.some(a => a.toLowerCase().includes('restaurant'))) score += 10;
    
    // Family/pet friendly
    if (userPrefs.familyFriendly && listingAnalysis.suitability.includes('family')) score += 15;
    if (userPrefs.petFriendly && listingAnalysis.features.some(f => f.toLowerCase().includes('pet'))) score += 10;
    
    return Math.min(score, 100); // Cap at 100
  }
}; 