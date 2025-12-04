import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string;

export function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const credential = admin.credential.cert(JSON.parse(serviceAccount));
    return admin.initializeApp({ credential });
  } catch (error: any) {
    // Log the detailed error, but be careful in production
    console.error('Firebase Admin initialization error:', error.message);
    // Provide a more generic error to the outside world
    throw new Error('Could not initialize Firebase Admin SDK. Please check service account credentials.');
  }
}
