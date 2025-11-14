import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Listing } from "@/types";

export interface SavedListing {
  id: string; // Firestore document ID
  userId: string;
  listingId: string; // The listing's ID from the listings collection
  listing: Listing; // Full listing data
  savedAt: any; // Firestore timestamp
}

export const savedListingsService = {
  /**
   * Save a listing for a user
   */
  async saveListing(userId: string, listing: Listing): Promise<void> {
    if (!userId || !listing.id) {
      throw new Error("Missing userId or listing.id");
    }

    // Use listing.id as the document ID to prevent duplicates
    const savedListingRef = doc(db, "savedListings", `${userId}_${listing.id}`);
    
    await setDoc(savedListingRef, {
      userId,
      listingId: listing.id,
      listing: listing,
      savedAt: serverTimestamp(),
    });
  },

  /**
   * Remove a saved listing
   */
  async unsaveListing(userId: string, listingId: string): Promise<void> {
    if (!userId || !listingId) {
      throw new Error("Missing userId or listingId");
    }

    const savedListingRef = doc(db, "savedListings", `${userId}_${listingId}`);
    await deleteDoc(savedListingRef);
  },

  /**
   * Get all saved listings for a user
   */
  async getSavedListings(userId: string): Promise<SavedListing[]> {
    if (!userId) {
      throw new Error("Missing userId");
    }

    const q = query(
      collection(db, "savedListings"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    const savedListings: SavedListing[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      savedListings.push({
        id: doc.id,
        userId: data.userId,
        listingId: data.listingId,
        listing: data.listing as Listing,
        savedAt: data.savedAt,
      });
    });

    // Sort by savedAt (most recent first)
    savedListings.sort((a, b) => {
      if (!a.savedAt || !b.savedAt) return 0;
      return b.savedAt.toMillis() - a.savedAt.toMillis();
    });

    return savedListings;
  },

  /**
   * Check if a listing is saved by a user
   */
  async isListingSaved(userId: string, listingId: string): Promise<boolean> {
    if (!userId || !listingId) {
      return false;
    }

    const savedListingRef = doc(db, "savedListings", `${userId}_${listingId}`);
    const docSnap = await getDoc(savedListingRef);
    return docSnap.exists();
  },
};

