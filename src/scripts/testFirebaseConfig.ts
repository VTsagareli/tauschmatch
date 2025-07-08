import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// This simulates what your Next.js app is doing
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

console.log('=== FIREBASE CONFIG TEST ===');
console.log('Project ID from env:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log('API Key exists:', !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log('Auth Domain exists:', !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log('Full config:', firebaseConfig);

// Try to initialize Firebase
try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
  console.log('App name:', app.name);
  console.log('Project ID:', app.options.projectId);
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
} 