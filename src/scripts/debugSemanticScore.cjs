// src/scripts/debugSemanticScore.cjs
require('dotenv').config({ path: './.env.local' }); // Load .env.local
const OpenAI = require('openai');
const fs = require('fs');

// This script will test the AI semantic scoring by taking a sample user preference
// and a sample listing description, running them through the analysis functions,
// and showing the final calculated score.

// Make sure your OPENAI_API_KEY is available as an environment variable
// You can run this script using: node src/scripts/debugSemanticScore.cjs

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- COPIED FROM aiService.ts FOR DIRECT TESTING ---

async function extractPreferences(userDescription) {
  try {
    if (!openai) throw new Error('OpenAI not initialized');
    const prompt = `
      Extract apartment preferences from this user description: "${userDescription}"
      
      Return a JSON object with these fields:
      - quiet: boolean
      - nearParks: boolean
      - familyFriendly: boolean
      - petFriendly: boolean
      - nearPublicTransport: boolean
      - nearShopping: boolean
      - nearRestaurants: boolean
      - budget: number or null
      - minRooms: number or null
      - maxRent: number or null
      - preferredDistricts: string[]
      - lifestyle: string[] (e.g., "student", "professional", "family", "young", "creative", "social")
      
      Only return valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from GPT');
    return JSON.parse(response);
  } catch (error) {
    console.error('[AI] extractPreferences error:', error);
    return {};
  }
}

async function analyzeListingDescription(description) {
  try {
    if (!openai) throw new Error('OpenAI not initialized');
    const prompt = `
      Analyze this apartment listing description: "${description}"
      
      Return a JSON object with these fields:
      - features: string[] (e.g., "balcony", "garden", "elevator")
      - amenities: string[] (e.g., "park", "metro", "shops")
      - neighborhood: string
      - atmosphere: string
      - accessibility: string[]
      - suitability: string[] (e.g., "students", "families", "professionals", "young people")
      
      Only return valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from GPT');
    return JSON.parse(response);
  } catch (error) {
    console.error('[AI] analyzeListingDescription error:', error);
    return {};
  }
}



// --- TEST DATA ---

// This is the ideal user text we want to test
const userDescription = `
  I'm looking for a smaller, more affordable apartment—ideally 1 or 2 rooms—in a lively area with a younger crowd. 
  I’d love to live somewhere where it’s okay to play music, have friends over, and enjoy a social atmosphere. 
  Proximity to bars, cafes, and public transport is important. 
  I’m open to neighborhoods known for their vibrant nightlife, creative communities, or student life. 
  A place that’s pet-friendly and not too strict about noise would be perfect.
`;

// This is a description from a real listing in Friedrichshain that mentions nightlife and bars.
const listingDescription = `
  Die Wohnung befindet sich direkt an der Warschauer Straße (Friedrichshain).
  Sämtliche Fast-Food-Restaurants (Pizza, Pasta, Burger, Döner, etc.), Bars, Cafés sowie das Berghain und andere Clubs 
  findest Du auch in fußläufiger Umgebung.
`;


// --- EXECUTION ---

async function runTest() {
  console.log("--- 1. USER DESCRIPTION ---");
  console.log(userDescription);

  const userPrefs = await extractPreferences(userDescription);
  console.log("\n--- 2. EXTRACTED USER PREFERENCES (from GPT) ---");
  console.log(userPrefs);

  console.log("\n--- 3. LISTING DESCRIPTION ---");
  console.log(listingDescription);
  
  const listingAnalysis = await analyzeListingDescription(listingDescription);
  console.log("\n--- 4. ANALYZED LISTING (from GPT) ---");
  console.log(listingAnalysis);

  const { score, reasons } = await calculateSemanticMatchScore(userPrefs, listingAnalysis);
  console.log(`\n\n--- 5. FINAL SEMANTIC SCORE: ${score}% ---`);
  console.log("--- REASONS ---");
  console.log(reasons.join('\n'));
}

runTest().catch(console.error); 