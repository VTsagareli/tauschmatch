import { NextResponse } from 'next/server';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('=== DEBUGGING MATCHES VIA API ===');
    
    // 1. Check if we can access Firestore at all
    console.log('1. Testing Firestore connection...');
    const testQuery = query(collection(db, 'listings'), limit(5));
    const testSnapshot = await getDocs(testQuery);
    console.log(`Found ${testSnapshot.size} listings in total`);
    
    if (testSnapshot.size === 0) {
      return NextResponse.json({
        success: false,
        message: 'No listings found in Firestore!',
        listingsCount: 0
      });
    }
    
    // 2. Show some sample listings
    const sampleListings = [];
    testSnapshot.forEach((doc, index) => {
      const data = doc.data();
      sampleListings.push({
        id: doc.id,
        district: data.district,
        type: data.type,
        coldRent: data.coldRent,
        rooms: data.rooms,
        squareMeters: data.squareMeters,
        hasDescription: !!data.description
      });
    });
    
    // 3. Test a simple query without filters
    console.log('\n3. Testing simple query without filters...');
    const simpleQuery = query(collection(db, 'listings'), limit(10));
    const simpleSnapshot = await getDocs(simpleQuery);
    console.log(`Simple query returned ${simpleSnapshot.size} listings`);
    
    // 4. Check field types
    console.log('\n4. Checking field types...');
    const firstDoc = testSnapshot.docs[0];
    let fieldTypes = {};
    if (firstDoc) {
      const data = firstDoc.data();
      fieldTypes = {
        coldRent: typeof data.coldRent,
        rooms: typeof data.rooms,
        squareMeters: typeof data.squareMeters,
        district: typeof data.district,
        type: typeof data.type
      };
    }
    
    return NextResponse.json({
      success: true,
      listingsCount: testSnapshot.size,
      sampleListings,
      fieldTypes,
      simpleQueryCount: simpleSnapshot.size
    });
    
  } catch (error) {
    console.error('Error debugging matches:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 