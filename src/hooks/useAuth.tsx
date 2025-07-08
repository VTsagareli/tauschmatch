"use client";

import { useEffect, useState, useContext, createContext, ReactNode } from "react";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User, createUserWithEmailAndPassword } from "firebase/auth";
import { app } from "@/lib/firebase";
import { userService } from "@/services/userService";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<User>;
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

  const signup = async (email: string, password: string) => {
    setLoading(true);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    setUser(cred.user);
    // Create user document in Firestore
    await userService.createOrUpdateUser({
      uid: cred.user.uid,
      email: cred.user.email || "",
      displayName: cred.user.displayName || "",
    });
    setLoading(false);
    return cred.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 