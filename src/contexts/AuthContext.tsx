'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, UserSettings } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const defaultSettings: UserSettings = {
  darkMode: true,
  moduleVisibility: {
    dreams: true,
    highlights: true,
    tags: true,
    people: true,
    notes: true,
    wisdom: true,
    ideas: true,
    focus: false,
  },
  language: 'en',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    const updated = await getDoc(userRef);
    if (updated.exists()) {
      setUserProfile({ ...userProfile, ...updated.data() } as UserProfile);
    }
  };

  const updateUserSettings = async (settings: Partial<UserSettings>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { settings: { ...user?.displayName, ...settings }, updatedAt: serverTimestamp() }, { merge: true });
    setUserProfile(prev => prev ? { ...prev, settings: { ...prev.settings, ...settings } } : null);
  };

  const createGuestUser = async () => {
    const guestEmail = `guest_${Date.now()}@asa-journey.local`;
    const result = await createUserWithEmailAndPassword(auth, guestEmail, `guest_${Math.random().toString(36)}`);
    await updateProfile(result.user, { displayName: 'Guest' });
    const userProfileData: UserProfile = {
      uid: result.user.uid,
      email: null,
      displayName: 'Guest',
      photoURL: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      settings: defaultSettings,
      streak: { current: 0, longest: 0, lastEntryDate: null },
    };
    const userRef = doc(db, 'users', result.user.uid);
    await setDoc(userRef, userProfileData);
    setUserProfile(userProfileData);
    setIsGuest(true);
  };

  const saveUserProfile = async (firebaseUser: User) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const userProfileData: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        settings: defaultSettings,
        streak: { current: 0, longest: 0, lastEntryDate: null },
      };
      await setDoc(userRef, userProfileData);
      setUserProfile(userProfileData);
    } else {
      const data = userDoc.data();
      setUserProfile({ ...data, createdAt: data.createdAt?.toDate() || new Date(), lastLoginAt: data.lastLoginAt?.toDate() || new Date() } as UserProfile);
      await setDoc(userRef, { lastLoginAt: serverTimestamp() }, { merge: true });
    }
    setIsGuest(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await saveUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await saveUserProfile(result.user);
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await saveUserProfile(result.user);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    await saveUserProfile(result.user);
  };

  const signInAsGuest = async () => {
    await createGuestUser();
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      isGuest,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInAsGuest,
      signOut,
      updateUserProfile,
      updateUserSettings,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
