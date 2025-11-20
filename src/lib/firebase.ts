import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Replace this with your actual Firebase configuration
// You can find this in your Firebase project settings.
// It's recommended to store these values in environment variables.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// It's a good practice to use a generic app ID for Firestore collections
// unless you have a specific multi-tenant requirement.
const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';

export { app, auth, db, appId };
