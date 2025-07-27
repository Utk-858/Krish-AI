
'use client';

import type { Profile } from '@/lib/types';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  isAuthenticated: boolean;
  user: Profile | null;
  firebaseUser: User | null;
  isLoading: boolean;
  login: (fUser: User, profile: Profile) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      if (currentUser) {
        setFirebaseUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as Profile;
          setUser(userData);
          localStorage.setItem('krishak_mitra_user', JSON.stringify(userData));
        } else {
            // If user exists in auth but not in firestore, create a default profile
            const defaultProfile: Profile = { name: 'New Farmer', location: '', language: 'en', avatarUrl: `https://placehold.co/100x100.png` };
            await setDoc(userDocRef, defaultProfile);
            setUser(defaultProfile);
            localStorage.setItem('krishak_mitra_user', JSON.stringify(defaultProfile));
        }
        setIsAuthenticated(true);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('krishak_mitra_user');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (fUser: User, profile: Profile) => {
    setIsLoading(true);
    try {
        setFirebaseUser(fUser);
        
        const userDocRef = doc(db, 'users', fUser.uid);
        await setDoc(userDocRef, profile, { merge: true });

        setUser(profile);
        localStorage.setItem('krishak_mitra_user', JSON.stringify(profile));
        setIsAuthenticated(true);

    } catch (error) {
        console.error("Error during login:", error)
    } finally {
        setIsLoading(false);
    }
  };

  const logout = async () => {
    await auth.signOut();
    localStorage.removeItem('krishak_mitra_user');
    setUser(null);
    setFirebaseUser(null);
    setIsAuthenticated(false);
  };
  
  const updateProfile = async (profileUpdate: Partial<Profile>) => {
    if (!firebaseUser) throw new Error("User not authenticated");
    
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    await updateDoc(userDocRef, profileUpdate);

    const updatedUser = { ...user, ...profileUpdate } as Profile;
    setUser(updatedUser);
    localStorage.setItem('krishak_mitra_user', JSON.stringify(updatedUser));
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, firebaseUser, isLoading, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
