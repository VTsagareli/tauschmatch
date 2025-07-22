// USAGE:
// 1. Add Firebase Admin SDK environment variables to .env.local:
//    FIREBASE_PROJECT_ID=your_project_id
//    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
// 2. Run this script with: npm run run:script --name=importListingsToFirestore

// Convert to CommonJS
const admin = require("firebase-admin");
const fs = require("fs");

// Use serviceAccountKey.json for Firebase Admin SDK
const serviceAccount = JSON.parse(require('fs').readFileSync('serviceAccountKey.json', 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const REQUIRED_FIELDS = ["link", "coldRent", "rooms", "squareMeters", "title", "district", "type"];

function hasRequiredFields(listing) {
  return REQUIRED_FIELDS.every(field => listing[field] !== undefined && listing[field] !== null && listing[field] !== "");
}

function sanitize(obj) {
  if (Array.isArray(obj)) {
    const arr = obj.map(sanitize).filter(
      (v) => v !== undefined && v !== null && !(typeof v === "number" && isNaN(v)) && v !== Infinity && v !== -Infinity
    );
    return arr.length > 0 ? arr : undefined;
  } else if (typeof obj === "object" && obj !== null) {
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
      const v = sanitize(value);
      if (
        v !== undefined &&
        v !== null &&
        !(typeof v === "number" && isNaN(v)) &&
        v !== Infinity &&
        v !== -Infinity
      ) {
        clean[key] = v;
      }
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
  } else {
    return obj;
  }
}

async function importListings() {
  const data = fs.readFileSync("berlin_listings.json", "utf-8");
  const listings = JSON.parse(data);
  let success = 0;
  let failed = 0;
  console.log("Starting import with Admin SDK (including descriptions for AI analysis, 7 required fields)...");
  for (const listing of listings) {
    if (!hasRequiredFields(listing)) {
      console.log("Skipping incomplete listing:", listing.link);
      continue;
    }
    // Keep description field for AI analysis
    const sanitized = sanitize(listing);
    console.log("Attempting to import:", JSON.stringify(sanitized, null, 2));
    try {
      // Check if a listing with the same link already exists
      const existing = await db.collection("listings").where("link", "==", sanitized.link).get();
      if (!existing.empty) {
        // If the new listing has an image and the old one does not, update it
        const doc = existing.docs[0];
        const oldData = doc.data();
        const newHasImage = sanitized.images && sanitized.images.length > 0 && sanitized.images[0];
        const oldHasImage = oldData.images && oldData.images.length > 0 && oldData.images[0];
        if (newHasImage && !oldHasImage) {
          await doc.ref.update(sanitized);
          console.log(`Updated existing listing with image: ${sanitized.link}`);
        } else {
          console.log(`Listing already exists, skipping: ${sanitized.link}`);
        }
      } else {
        await db.collection("listings").add(sanitized);
        success++;
        console.log(`Imported: ${sanitized.link}`);
      }
    } catch (e) {
      failed++;
      console.error("Failed to import the above listing.");
      console.error(e);
      break;
    }
  }
  console.log(`Done. Imported ${success}, failed ${failed}.`);
}

importListings().catch(console.error); 