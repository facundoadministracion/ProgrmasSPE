
import * as admin from 'firebase-admin';
import { App } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

    if (!fs.existsSync(serviceAccountPath)) {
      console.error('CRITICAL: Service account file not found at:', serviceAccountPath);
      throw new Error(`serviceAccountKey.json not found at ${serviceAccountPath}.`);
    }

    const serviceAccountString = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountString);

    if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
        throw new Error('Service account file is missing one of the required fields: private_key, client_email, or project_id.');
    }

    const credential = admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    });
    
    return admin.initializeApp({ credential });

  } catch (error: any) {
    console.error('CRITICAL-FINAL: Firebase Admin initialization failed unexpectedly. Raw Error:', error);
    throw new Error('Could not initialize Firebase Admin SDK. Please check service account credentials file and server logs for critical errors.');
  }
}

export function getAdminApp(): App {
    return initializeFirebase();
}

export function initializeAdminApp() {
    const app = initializeFirebase();
    return admin.firestore(app);
}
