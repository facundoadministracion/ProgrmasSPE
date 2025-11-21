'use server';
import { initializeFirebase } from '@/firebase';

const { firestore, auth, firebaseApp } = initializeFirebase();

// It's a good practice to use a generic app ID for Firestore collections
// unless you have a specific multi-tenant requirement.
const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';

export { firebaseApp as app, auth, firestore as db, appId };