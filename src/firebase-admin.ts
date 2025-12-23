import * as admin from 'firebase-admin';
import { App, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// A function to lazily initialize Firebase Admin SDK.
function getFirebaseAdmin() {
  let app: App;

  // Check if the app is already initialized to avoid re-initializing.
  if (getApps().length === 0) {
    // In a cloud environment (like App Hosting), service account credentials
    // are automatically discovered. For local development, we load them from a file.
    try {
      // This will succeed in local dev if the serviceAccountKey.json file exists.
      // Using eval('require') prevents the bundler from trying to package this sensitive file.
      const serviceAccount = eval('require')('../serviceAccountKey.json');
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (e) {
      // This branch is taken in the cloud environment (and during the build process).
      // It initializes the app using the default credentials provided by the environment.
      console.log('Initializing admin app with default Google Application Credentials');
      app = admin.initializeApp();
    }
  } else {
    // If already initialized, get the existing app instance.
    app = getApp();
  }

  // Return the initialized Firestore and Auth services.
  return {
    db: getFirestore(app),
    auth: getAuth(app),
    app: app
  };
}

// Export the lazy initialization function.
export { getFirebaseAdmin };
