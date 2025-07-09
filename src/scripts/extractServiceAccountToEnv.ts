import * as fs from "fs";

// This script extracts the service account details from serviceAccountKey.json
// and formats them for use in .env.local

try {
  const serviceAccount = JSON.parse(fs.readFileSync("serviceAccountKey.json", "utf-8"));
  
  console.log("=== FIREBASE ADMIN SDK ENVIRONMENT VARIABLES ===");
  console.log("Add these to your .env.local file:");
  console.log("");
  console.log(`FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
  console.log(`FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`);
  console.log(`FIREBASE_PRIVATE_KEY="${serviceAccount.private_key.replace(/\n/g, '\\n')}"`);
  console.log("");
  console.log("=== IMPORTANT NOTES ===");
  console.log("1. Make sure to wrap the private key in quotes");
  console.log("2. The private key should have \\n for line breaks");
  console.log("3. After adding these, you can delete serviceAccountKey.json");
  console.log("4. The serviceAccountKey.json file has been removed from git tracking");
  
} catch (error) {
  console.error("Error reading serviceAccountKey.json:", error);
  console.log("Make sure serviceAccountKey.json exists in the project root");
} 