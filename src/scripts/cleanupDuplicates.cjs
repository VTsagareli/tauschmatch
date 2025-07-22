// Cleanup duplicate listings in Firestore by 'link', keeping only one (preferably with image)
const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf-8"));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

async function cleanupDuplicates() {
  console.log("Starting duplicate cleanup...");
  const snapshot = await db.collection("listings").get();
  const listingsByLink = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.link) return;
    if (!listingsByLink[data.link]) listingsByLink[data.link] = [];
    listingsByLink[data.link].push({ id: doc.id, ...data });
  });
  let deleted = 0;
  let kept = 0;
  for (const link in listingsByLink) {
    const group = listingsByLink[link];
    if (group.length > 1) {
      // Prefer to keep the one with an image
      group.sort((a, b) => {
        const aHasImage = a.images && a.images.length > 0 && a.images[0];
        const bHasImage = b.images && b.images.length > 0 && b.images[0];
        return (bHasImage ? 1 : 0) - (aHasImage ? 1 : 0);
      });
      // Keep the first, delete the rest
      for (let i = 1; i < group.length; i++) {
        await db.collection("listings").doc(group[i].id).delete();
        deleted++;
        console.log(`Deleted duplicate: ${group[i].id} (${link})`);
      }
      kept++;
    }
  }
  console.log(`Done. Deleted ${deleted} duplicates. Kept ${kept} unique listings.`);
}

cleanupDuplicates().catch(console.error); 