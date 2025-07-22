// USAGE:
// Run with: npm run run:script --name=cleanupIncompleteListings
// Convert to CommonJS
const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf-8"));
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

async function cleanupIncompleteListings() {
  console.log("Starting cleanup of incomplete listings...");
  const snapshot = await db.collection("listings").get();
  let deleted = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!hasRequiredFields(data)) {
      await doc.ref.delete();
      deleted++;
      console.log(`Deleted incomplete listing: ${doc.id} (${data.link || "no link"})`);
    }
  }
  console.log(`Done. Deleted ${deleted} incomplete listings.`);
}

// === DELETE ALL LISTINGS SCRIPT ===
async function deleteAllListings() {
  console.log("Starting deletion of ALL listings...");
  const snapshot = await db.collection("listings").get();
  let deleted = 0;
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
    deleted++;
    console.log(`Deleted listing: ${doc.id}`);
  }
  console.log(`Done. Deleted ${deleted} listings.`);
}

deleteAllListings().catch(console.error);
// cleanupIncompleteListings().catch(console.error); 