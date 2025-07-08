import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types";

export const userService = {
  async createOrUpdateUser({ uid, email, displayName, myApartment, lookingFor }: {
    uid: string;
    email: string;
    displayName?: string;
    myApartment?: any;
    lookingFor?: any;
  }) {
    if (!uid || !email) throw new Error("Missing uid or email");
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      // Create new user document with empty apartment info, limited to Berlin
      await setDoc(userRef, {
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
      });
    } else {
      // Update user preferences if provided
      const updateData: any = { updatedAt: serverTimestamp() };
      if (myApartment) updateData.myApartment = myApartment;
      if (lookingFor) updateData.lookingFor = lookingFor;
      await setDoc(userRef, updateData, { merge: true });
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
}; 