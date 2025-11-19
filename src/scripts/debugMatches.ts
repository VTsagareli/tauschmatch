import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Listing } from '../types';

async function debugMatches() {
  try {
    console.log('=== DEBUGGING MATCHES ===');
    
    // 1. Check if we can access Firestore at all
    console.log('1. Testing Firestore connection...');
    const testQuery = query(collection(db, 'listings'), limit(5));
    const testSnapshot = await getDocs(testQuery);
    console.log(`Found ${testSnapshot.size} listings in total`);
    
    if (testSnapshot.size === 0) {
      console.log('❌ No listings found in Firestore!');
      return;
    }
    
    // 2. Show some sample listings
    console.log('\n2. Sample listings:');
    testSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Listing ${index + 1}:`, {
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
    
    // 4. Test with some basic filters
    console.log('\n4. Testing with basic filters...');
    const filterQuery = query(
      collection(db, 'listings'),
      limit(10)
    );
    const filterSnapshot = await getDocs(filterQuery);
    console.log(`Filtered query returned ${filterSnapshot.size} listings`);
    
    // 5. Check field types
    console.log('\n5. Checking field types...');
    const firstDoc = testSnapshot.docs[0];
    if (firstDoc) {
      const data = firstDoc.data();
      console.log('Field types:', {
        coldRent: typeof data.coldRent,
        rooms: typeof data.rooms,
        squareMeters: typeof data.squareMeters,
        district: typeof data.district,
        type: typeof data.type
      });
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Error debugging matches:', error);
  }
}

debugMatches(); 