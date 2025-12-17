
import * as admin from 'firebase-admin';
import { App, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: App;

// We check if the app is already initialized.
if (getApps().length === 0) {
  // If not, we initialize it.
  // The service account is automatically available in the App Hosting environment.
  // For local development, we use a try-catch to load it from a file.
  try {
    // This will succeed in local dev if the file exists.
    // Using eval('require') prevents the bundler from trying to package the file.
    const serviceAccount = eval('require')('../../serviceAccountKey.json');
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    // This will be caught during the build process on the server if the file is missing.
    // In the cloud (App Hosting), initializeApp() without arguments works perfectly.
    console.log('Initializing admin app with default Google Application Credentials');
    app = admin.initializeApp();
  }
} else {
  // If the app is already initialized, we get the existing app.
  app = getApp();
}

const db = getFirestore(app);
const auth = getAuth(app);

// Export the initialized services for use in other parts of the application.
export { app, db, auth };
