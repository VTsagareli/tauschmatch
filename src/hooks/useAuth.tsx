"use client";

import { useEffect, useState, useContext, createContext, ReactNode } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, createUserWithEmailAndPassword, updateEmail, updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { app } from "@/lib/firebase";
import { userService } from "@/services/userService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<User>;
  updateUserEmail: (newEmail: string, password: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserDisplayName: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    // Create or update user document in Firestore
    await userService.createOrUpdateUser({
      uid: cred.user.uid,
      email: cred.user.email || "",
      displayName: cred.user.displayName || "",
    });
    setLoading(false);
    return cred.user;
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setLoading(false);
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    setLoading(true);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update Firebase Auth profile with display name
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    
    setUser(cred.user);
    // Create user document in Firestore
    await userService.createOrUpdateUser({
      uid: cred.user.uid,
      email: cred.user.email || "",
      displayName: displayName || "",
    });
    setLoading(false);
    return cred.user;
  };

  const updateUserEmail = async (newEmail: string, password: string) => {
    if (!user) throw new Error("User not authenticated");
    setLoading(true);
    try {
      // Reauthenticate user before changing email
      const credential = EmailAuthProvider.credential(user.email || "", password);
      await reauthenticateWithCredential(user, credential);
      // Update email
      await updateEmail(user, newEmail);
      // Update Firestore
      await userService.updateUserEmail(user.uid, newEmail);
      // The onAuthStateChanged will automatically update the user state
    } finally {
      setLoading(false);
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error("User not authenticated");
    setLoading(true);
    try {
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email || "", currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Update password
      await updatePassword(user, newPassword);
    } finally {
      setLoading(false);
    }
  };

  const updateUserDisplayName = async (displayName: string) => {
    if (!user) throw new Error("User not authenticated");
    setLoading(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName });
      // Update Firestore
      await userService.updateDisplayName(user.uid, displayName);
      // The onAuthStateChanged will automatically update the user state
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup, updateUserEmail, updateUserPassword, updateUserDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 