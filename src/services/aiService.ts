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
        max_tokens: 2000, // Limit response tokens to save on total token usage
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
        
        1. YOU (the webapp user):
        - What YOU have to offer:
        """
        ${userOfferedDescription}
        """
        - What YOU are looking for:
        """
        ${userLookingForDescription}
        """
        
        2. THE LISTING AUTHOR (they/their):
        - What THEY have to offer:
        """
        ${offeredDescription}
        """
        - What THEY are looking for:
        """
        ${listingLookingForDescription}
        """

        Return a JSON object with three keys:
        - "score" (an integer from 1 to 10, where 10 is a perfect two-way match and 1 is a poor match)
        - "whatYouWantAndTheyHave" (an array of bullet points describing: WHAT YOU WANT from "What YOU are looking for" that MATCHES WHAT THEY HAVE from "What THEY have to offer")
        - "whatYouHaveAndTheyWant" (an array of bullet points describing: WHAT YOU HAVE from "What YOU have to offer" that MATCHES WHAT THEY WANT from "What THEY are looking for")
        
        EXAMPLES:
        If YOUR "looking for" says "I want a balcony" and THEIR "offered" says "I have a balcony with garden view", then "whatYouWantAndTheyHave" should include: "You want a balcony, and they offer a balcony with garden view"
        
        If YOUR "offered" says "I have a 3-room apartment for €1100" and THEIR "looking for" says "Looking for at least 3 rooms under €1200", then "whatYouHaveAndTheyWant" should include: "You have a 3-room apartment, and they want at least 3 rooms" OR "You offer €1100 rent, which fits their budget under €1200"
        
        CRITICAL RULES:
        1. "whatYouWantAndTheyHave" = What YOU (the USER) WANT matched with what THEY (LISTING AUTHOR) HAVE/OFFER
        2. "whatYouHaveAndTheyWant" = What YOU (the USER) HAVE/OFFER matched with what THEY (LISTING AUTHOR) WANT/LOOKING FOR
        3. NEVER describe the listing's apartment in "whatYouHaveAndTheyWant" - only describe YOUR apartment
        4. NEVER describe your apartment in "whatYouWantAndTheyHave" - only describe what YOU want
        5. Always start bullet points with "You want...", "You have...", "You offer...", "They have...", "They want..." to make it clear
        6. Only use information explicitly stated in the descriptions above
        7. Ignore structured fields like budget numbers, room numbers, or location - focus on descriptive features
        8. Make bullet points short (max 15 words each) and user-friendly
        9. Use the full range from 1 (very poor match) to 10 (excellent match). Only give a very low score if there is a major, obvious mismatch.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000, // Limit response tokens to save on total token usage
      });
      
      const response = completion.choices[0]?.message?.content;
      if (!response) return { score: 1, reasons: [] };
      
      const result = JSON.parse(response);
      return {
        score: result.score || 1,
        reasons: result.reasons || []
      };
    } catch (error: any) {
      console.error('Error in calculateCombinedScoreAndReasons:', error);
      
      // Check for OpenAI billing/quota errors
      if (error?.code === 'insufficient_quota' || 
          error?.code === 'billing_not_active' || 
          error?.status === 429 ||
          error?.message?.includes('quota') ||
          error?.message?.includes('billing')) {
        console.error('❌ OpenAI API quota/billing error - credits may be exhausted');
        // You could throw this to show user a message, or return empty results
      }
      
      return { score: 1, reasons: [] };
    }
  },

  async batchCalculateCombinedScoreAndReasons(
    userLookingForDescription: string,
    userOfferedDescription: string,
    listings: Array<{ offeredDescription: string; lookingForDescription: string; id: string }>,
    userStructuredData?: { rooms?: string; squareMeters?: string; coldRent?: string; balcony?: boolean; petsAllowed?: boolean }
  ): Promise<Array<{ id: string; score: number; whatYouWantAndTheyHave: string[]; whatYouHaveAndTheyWant: string[] }>> {
    // Truncate descriptions to prevent token limit issues
    // Keep first 500 characters per description (roughly 125 tokens each)
    const truncateDescription = (text: string, maxLength: number = 500) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };
    
    const truncatedUserLookingFor = truncateDescription(userLookingForDescription, 500);
    const truncatedUserOffered = truncateDescription(userOfferedDescription, 500);
    
    // Batch listings into smaller groups to avoid token limit
    // GPT-3.5-turbo has ~16k tokens, we need to stay well under that
    // Each listing adds ~200-400 tokens, so we'll process 5-8 at a time
    const BATCH_SIZE = 8; // Slightly larger batch size to reduce API calls and speed up matching
    const allResults: Array<{ id: string; score: number; whatYouWantAndTheyHave: string[]; whatYouHaveAndTheyWant: string[] }> = [];
    
    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing GPT batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(listings.length / BATCH_SIZE)} with ${batch.length} listings`);
      
      // Truncate batch listing descriptions
      const truncatedBatch = batch.map(listing => ({
        id: listing.id,
        offeredDescription: truncateDescription(listing.offeredDescription, 400),
        lookingForDescription: truncateDescription(listing.lookingForDescription, 400)
      }));
      
      try {
        const batchResults = await this.processBatch(truncatedUserLookingFor, truncatedUserOffered, truncatedBatch, userStructuredData);
        allResults.push(...batchResults);
      } catch (error: any) {
        console.error(`❌ Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        
        // Check for OpenAI billing/quota errors
        if (error?.code === 'insufficient_quota' || 
            error?.code === 'billing_not_active' || 
            error?.status === 429 ||
            error?.message?.includes('quota') ||
            error?.message?.includes('billing')) {
          console.error('❌ OpenAI API quota/billing error - stopping batch processing. Credits may be exhausted.');
          // Break the loop to avoid wasting remaining credits on more failed calls
          // Fill remaining listings with default scores
          for (let j = i; j < listings.length; j++) {
            allResults.push({ 
              id: listings[j].id, 
              score: 1, 
              whatYouWantAndTheyHave: [], 
              whatYouHaveAndTheyWant: [] 
            });
          }
          break; // Exit the batch loop early
        }
        
        // Add empty results for this batch on error
        batch.forEach(listing => {
          allResults.push({ id: listing.id, score: 1, whatYouWantAndTheyHave: [], whatYouHaveAndTheyWant: [] });
        });
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < listings.length) {
        await new Promise(resolve => setTimeout(resolve, 150)); // Reduced delay slightly for faster processing
      }
    }
    
    console.log(`✅ Processed ${allResults.length} listings in ${Math.ceil(listings.length / BATCH_SIZE)} batches`);
    return allResults;
  },

  async processBatch(
    userLookingForDescription: string,
    userOfferedDescription: string,
    listings: Array<{ offeredDescription: string; lookingForDescription: string; id: string }>,
    userStructuredData?: { rooms?: string; squareMeters?: string; coldRent?: string; balcony?: boolean; petsAllowed?: boolean }
  ): Promise<Array<{ id: string; score: number; whatYouWantAndTheyHave: string[]; whatYouHaveAndTheyWant: string[] }>> {
    try {
      if (!openai) throw new Error('OpenAI not initialized on server');

      const prompt = `
        You are matching a user with multiple apartment listings for a home swap. For each listing, analyze TWO SEPARATE AND INDEPENDENT matches:

        ================================================================================
        PART 1: WHAT YOU WANT vs WHAT THEY HAVE
        ================================================================================
        
        DATA FOR PART 1:
        - What YOU (the USER) are LOOKING FOR/WANT in your next apartment:
        """
        ${userLookingForDescription}
        """
        
        - What EACH LISTING AUTHOR currently HAS/OFFERS (their actual apartment):
        ${listings.map((l, i) => `Listing ${i + 1} (id: ${l.id}):
        """${l.offeredDescription || '(no description provided)'}"""
        `).join('\n')}
        
        FOR EACH LISTING, create "whatYouWantAndTheyHave" by:
        1. Look at what YOU WANT from the "LOOKING FOR" text above
        2. Look at what THEY HAVE from that listing's "offers/have" text
        3. Find matches between what you want and what they have
        4. Example: If you want "a balcony" and they have "a balcony with garden view", write: "You want a balcony, and they offer a balcony with garden view"
        5. DO NOT use any information about what you currently have - only use what you WANT
        6. DO NOT use any information about what they want - only use what they HAVE
        
        ================================================================================
        PART 2: WHAT YOU HAVE vs WHAT THEY WANT
        ================================================================================
        
        DATA FOR PART 2:
        - What YOU (the USER) currently HAVE/OFFER (your actual apartment):
        """
        ${userOfferedDescription}
        """
        ${userStructuredData ? `
        YOUR APARTMENT - STRUCTURED FACTS (THIS IS THE TRUTH ABOUT WHAT YOU HAVE):
        - Rooms: ${userStructuredData.rooms || 'not specified'}
        - Size: ${userStructuredData.squareMeters || 'not specified'} sqm  
        - Rent: €${userStructuredData.coldRent || 'not specified'}
        - Balcony: ${userStructuredData.balcony ? 'Yes' : 'No'}
        - Pets allowed: ${userStructuredData.petsAllowed ? 'Yes' : 'No'}
        
        CRITICAL FOR PART 2: When writing about what YOU HAVE, ALWAYS use the STRUCTURED FACTS above.
        - If STRUCTURED FACTS say "Rooms: 3", you MUST say "You have a 3-room apartment" or "You have 3 rooms"
        - NEVER say you have a different number of rooms than what the STRUCTURED FACTS say
        - If STRUCTURED FACTS say "Balcony: Yes", you MUST say "You have a balcony"
        - IGNORE any room count mentioned in the description text if it conflicts with STRUCTURED FACTS
        ` : ''}
        
        - What EACH LISTING AUTHOR is LOOKING FOR/WANTS (what they want in their next apartment):
        ${listings.map((l, i) => `Listing ${i + 1} (id: ${l.id}):
        """${l.lookingForDescription || '(no specific requirements listed - you should infer what they might want based on what they currently have or what the user offers)'}"""
        `).join('\n')}
        
        FOR EACH LISTING, create "whatYouHaveAndTheyWant" by:
        1. Look at what YOU HAVE using ONLY the STRUCTURED FACTS above (Rooms, Size, Rent, Balcony, Pets)
        2. If STRUCTURED FACTS say "Rooms: 3", write "You have a 3-room apartment" or "You have 3 rooms" - DO NOT use any other number
        3. Look at what THEY WANT from that listing's "looking for/want" text
        4. Find matches between what you have and what they want
        5. Example: If you have 3 rooms (from STRUCTURED FACTS) and they want "at least 3 rooms", write: "You have a 3-room apartment, and they want at least 3 rooms"
        6. DO NOT use any information about what you want - only use what you HAVE (from STRUCTURED FACTS)
        7. DO NOT use any information about what they currently have - only use what they WANT
        8. NEVER say "they currently have" - only say "they want" or "they are looking for"
        
        ================================================================================
        SUMMARY
        ================================================================================
        
        PROCESS EACH LISTING INDEPENDENTLY:
        
        For each listing, return a JSON object with:
        - "id" (the listing id - must match one of the ids above)
        - "score" (integer 1-10, where 10 is perfect match, 1 is poor match)
        - "whatYouWantAndTheyHave" (array: use PART 1 data ONLY - what you WANT matched with what they HAVE)
        - "whatYouHaveAndTheyWant" (array: use PART 2 data ONLY - what you HAVE matched with what they WANT)
        
        ================================================================================
        FINAL CRITICAL RULES
        ================================================================================
        
        FOR "whatYouWantAndTheyHave" (PART 1):
        - ONLY use: Your "LOOKING FOR" text + Their "offers/have" text
        - NEVER mention: What you currently have, what they want
        
        FOR "whatYouHaveAndTheyWant" (PART 2):
        - ONLY use: Your STRUCTURED FACTS (Rooms, Size, Rent, Balcony, Pets) + Their "looking for/want" text
        - If STRUCTURED FACTS say "Rooms: 3", you MUST write "You have 3 rooms" or "You have a 3-room apartment"
        - NEVER use: A different room count, what you want, what they currently have
        - NEVER say: "they currently have" - only say "they want" or "they are looking for"
        
        EXAMPLES OF CORRECT "whatYouHaveAndTheyWant":
        ✅ CORRECT: "You have a 3-room apartment, and they want at least 3 rooms" (using STRUCTURED FACTS: Rooms: 3)
        ✅ CORRECT: "You have a balcony, and they want outdoor space" (using STRUCTURED FACTS: Balcony: Yes)
        ❌ WRONG: "You have a 2-room apartment, and they want 2 rooms" (if STRUCTURED FACTS say Rooms: 3)
        ❌ WRONG: "You have a balcony, and they currently have a balcony" (never compare to what they have!)
        
        EXAMPLES OF CORRECT "whatYouWantAndTheyHave":
        ✅ CORRECT: "You want a balcony, and they offer a balcony with garden view"
        ✅ CORRECT: "You want a lively area, and they offer an apartment in Kreuzberg"
        
        WORKFLOW FOR EACH LISTING:
        
        Step 1: Read PART 1 data for this listing
        Step 2: Create "whatYouWantAndTheyHave" using ONLY PART 1 data
        Step 3: Read PART 2 data for this listing  
        Step 4: Create "whatYouHaveAndTheyWant" using ONLY PART 2 data (use STRUCTURED FACTS for your apartment!)
        Step 5: Calculate score (1-10) based on how well both parts match
        SCORING GUIDELINES:
        - 10/10: Exceptional two-way match - both parties clearly want what the other offers, all criteria align
        - 8-9/10: Very good match - strong compatibility on most criteria, clear mutual interest
        - 6-7/10: Good match - reasonable compatibility, some matches found in both directions
        - 4-5/10: Mediocre match - some compatibility but major gaps or mismatches
        - 1-3/10: Poor match - major incompatibilities, little to no match
        - Be generous! If there are reasonable matches, give at least 6-7/10. Only go below 5 if there are clear incompatibilities.
        Step 6: Move to next listing and repeat
        
        FINAL VALIDATION BEFORE RETURNING:
        - For "whatYouHaveAndTheyWant": If STRUCTURED FACTS say "Rooms: 3", verify you wrote "3 rooms" or "3-room apartment", NOT any other number
        - For "whatYouHaveAndTheyWant": Verify you never wrote "they currently have" - only "they want" or "they are looking for"
        - For "whatYouWantAndTheyHave": Verify you never mentioned what you currently have
        
        IMPORTANT - BE GENEROUS WITH REASONS:
        - You MUST return at least 1-2 items in EACH array (whatYouWantAndTheyHave AND whatYouHaveAndTheyWant) for EVERY listing
        - Even if the match is not perfect, find ANY reasonable connection and write it down
        - If a listing's "looking for" is empty, infer what they might want based on what they currently have or what you offer
        - Think creatively and infer meaning: 
          * "You want a quiet place, and they describe their area as peaceful" → "You want a quiet area, and they offer a peaceful neighborhood"
          * "You want a good location, and they mention being near U-Bahn" → "You want good public transport, and they offer proximity to U-Bahn"
          * "You have 3 rooms, and they want 'at least 2 rooms' or mention 'room for family'" → "You have 3 rooms, and they want at least 2 rooms"
          * "You have a balcony, and they mention wanting 'outdoor space' or 'fresh air'" → "You have a balcony, and they want outdoor space"
        - Compare ANYTHING that could be related - location features, lifestyle, amenities, atmosphere
        - If the user's description mentions preferences and the listing mentions similar things, that's a match!
        - Make bullet points short (max 15 words each) and user-friendly
        - Always start bullet points with "You want...", "You have...", "You offer...", "They have...", "They want..." to make it clear
        - CRITICAL: If you return empty arrays, the user will see "No matches yet" - always return at least 1-2 reasons per array!
        
        Return a JSON array, one object per listing, in the same order as listings appear above. The response must be valid JSON only, no markdown, no explanations.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 2000, // Limit response tokens to save on total token usage
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        console.error('❌ GPT returned empty response');
        return [];
      }
      
      // Try to parse JSON response
      let parsed;
      try {
        // Sometimes GPT wraps JSON in markdown code blocks
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        console.error('❌ Failed to parse GPT response as JSON:');
        console.error('  Response:', response.substring(0, 500));
        console.error('  Error:', parseError);
        return [];
      }
      
      // Validate the response structure
      if (!Array.isArray(parsed)) {
        console.error('❌ GPT response is not an array:', typeof parsed);
        console.error('  Response:', parsed);
        return [];
      }
      
      // Log first result to debug
      if (parsed.length > 0) {
        const firstResult = parsed[0];
        console.log('✅ GPT first result structure:', {
          hasId: !!firstResult.id,
          hasScore: typeof firstResult.score === 'number',
          hasWhatYouWant: Array.isArray(firstResult.whatYouWantAndTheyHave),
          hasWhatYouHave: Array.isArray(firstResult.whatYouHaveAndTheyWant),
          whatYouWantLength: Array.isArray(firstResult.whatYouWantAndTheyHave) ? firstResult.whatYouWantAndTheyHave.length : 0,
          whatYouHaveLength: Array.isArray(firstResult.whatYouHaveAndTheyWant) ? firstResult.whatYouHaveAndTheyWant.length : 0
        });
        
        // Always log the first result structure for debugging
        console.log('🔍 Full first GPT result:', JSON.stringify(firstResult, null, 2));
        
        if (Array.isArray(firstResult.whatYouWantAndTheyHave) && firstResult.whatYouWantAndTheyHave.length === 0) {
          console.warn('⚠️ GPT returned empty whatYouWantAndTheyHave array');
          console.warn('  This means GPT did not find matches between what you want and what they have');
          console.warn('  Check if user has a lookingFor description and listings have offeredDescription');
        }
        if (Array.isArray(firstResult.whatYouHaveAndTheyWant) && firstResult.whatYouHaveAndTheyWant.length === 0) {
          console.warn('⚠️ GPT returned empty whatYouHaveAndTheyWant array');
          console.warn('  This means GPT did not find matches between what you have and what they want');
          console.warn('  Check if user has an offeredDescription and listings have lookingForDescription');
        }
        
        // Show sample of what we sent to GPT
        console.log('📤 What we sent to GPT:');
        console.log('  User looking for length:', userLookingForDescription.length);
        console.log('  User offered length:', userOfferedDescription.length);
        console.log('  Number of listings:', listings.length);
        if (listings.length > 0) {
          console.log('  First listing offeredDescription length:', listings[0].offeredDescription?.length || 0);
          console.log('  First listing lookingForDescription length:', listings[0].lookingForDescription?.length || 0);
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('Error in batchCalculateCombinedScoreAndReasons:', error);
      return [];
    }
  },
}; 