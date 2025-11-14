import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types";

// Recursively remove undefined values from objects (Firestore doesn't allow undefined)
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

export const userService = {
  async createOrUpdateUser({ uid, email, displayName, myApartment, lookingFor }: {
    uid: string;
    email: string;
    displayName?: string;
    myApartment?: any;
    lookingFor?: any;
  }) {
    if (!uid) throw new Error("Missing uid");
    // Email can be empty for anonymous/guest users
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      // Create new user document with empty apartment info, limited to Berlin
      const newUserData = {
        email,
        displayName: displayName || "",
        myApartment: myApartment || {
          type: "Apartment",
          location: "Berlin",
          rooms: "",
          squareMeters: "",
          coldRent: "",
          floor: "",
          balcony: false,
          petsAllowed: false,
        },
        lookingFor: lookingFor || {
          type: "Apartment",
          location: "Berlin",
          minRooms: "",
          minSquareMeters: "",
          maxColdRent: "",
          floor: "",
          balcony: false,
          petsAllowed: false,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, removeUndefined(newUserData));
    } else {
      // Update user preferences if provided - sanitize to remove undefined values
      const updateData: any = { updatedAt: serverTimestamp() };
      if (myApartment) {
        updateData.myApartment = removeUndefined(myApartment);
      }
      if (lookingFor) {
        updateData.lookingFor = removeUndefined(lookingFor);
      }
      await setDoc(userRef, removeUndefined(updateData), { merge: true });
    }
  },

  async getUser(uid: string) {
    if (!uid) throw new Error("Missing uid");
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return null;
    }
    return { uid, ...userSnap.data() } as User;
  },

  async updateDisplayName(uid: string, displayName: string) {
    if (!uid) throw new Error("Missing uid");
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { displayName, updatedAt: serverTimestamp() }, { merge: true });
  },

  async updateUserEmail(uid: string, email: string) {
    if (!uid || !email) throw new Error("Missing uid or email");
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { email, updatedAt: serverTimestamp() }, { merge: true });
  },
}; 