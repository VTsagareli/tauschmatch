import { NextResponse } from 'next/server';
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
  };

  const configInfo = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    apiKeyExists: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomainExists: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    fullConfig: firebaseConfig
  };

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    return NextResponse.json({
      success: true,
      config: configInfo,
      appName: app.name,
      projectId: app.options.projectId
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      config: configInfo,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 