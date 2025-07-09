// USAGE:
// 1. Add Firebase Admin SDK environment variables to .env.local:
//    FIREBASE_PROJECT_ID=your_project_id
//    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
// 2. Run this script with: npm run run:script --name=importListingsToFirestore

import admin from "firebase-admin";

// Use environment variables for Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const REQUIRED_FIELDS = ["link", "coldRent", "rooms", "squareMeters", "title", "district", "type"];

function hasRequiredFields(listing: any) {
  return REQUIRED_FIELDS.every(field => listing[field] !== undefined && listing[field] !== null && listing[field] !== "");
}

function sanitize(obj: any): any {
  if (Array.isArray(obj)) {
    const arr = obj.map(sanitize).filter(
      (v) => v !== undefined && v !== null && !(typeof v === "number" && isNaN(v)) && v !== Infinity && v !== -Infinity
    );
    return arr.length > 0 ? arr : undefined;
  } else if (typeof obj === "object" && obj !== null) {
    const clean: any = {};
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
      await db.collection("listings").add(sanitized);
      success++;
      console.log(`Imported: ${sanitized.link}`);
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