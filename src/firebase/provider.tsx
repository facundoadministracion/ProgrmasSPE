'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  signOut: () => Promise<void>;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser extends Omit<FirebaseContextState, 'areServicesAvailable'> {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  signOut: () => Promise<void>;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  const servicesAvailable = !!(firebaseApp && firestore && auth);

  useEffect(() => {
    // PREVENT onSnapshot from running on the server
    if (typeof window === 'undefined') {
      setUserAuthState({ user: null, isUserLoading: false, userError: null });
      return;
    }

    if (!auth || !servicesAvailable) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not available.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null });

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, [auth, servicesAvailable, setUserAuthState]);

  const handleSignOut = useCallback(async () => {
    if (!auth) {
      console.error("FirebaseProvider: signOut error: Auth service not available.");
      return;
    }
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("FirebaseProvider: signOut error:", error);
    }
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => ({
    areServicesAvailable: servicesAvailable,
    firebaseApp: servicesAvailable ? firebaseApp : null,
    firestore: servicesAvailable ? firestore : null,
    auth: servicesAvailable ? auth : null,
    signOut: handleSignOut,
    user: userAuthState.user,
    isUserLoading: userAuthState.isUserLoading,
    userError: userAuthState.userError,
  }), [firebaseApp, firestore, auth, userAuthState, servicesAvailable, handleSignOut]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    signOut: context.signOut,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError, signOut } = useFirebase();
  return { user, isUserLoading, userError, signOut };
};
