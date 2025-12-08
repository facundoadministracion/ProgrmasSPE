
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

export function initializeAdminApp() {
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

    // --- FINAL, EXPLICIT METHOD ---
    // Manually reconstruct the credential to avoid issues with newline characters in the private key.
    const credential = admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      // This replace is crucial. It ensures that the literal \n characters from the JSON
      // are converted into actual newline characters, which the PEM format requires.
      privateKey: serviceAccount.private_key.replace(/\n/g, '\n'),
    });
    
    return admin.initializeApp({ credential });
    // --- END FINAL METHOD ---

  } catch (error: any) {
    // Log the detailed, underlying error to the server console for better debugging
    console.error('CRITICAL-FINAL: Firebase Admin initialization failed unexpectedly. Raw Error:', error);
    // Provide a clear error message to the front-end
    throw new Error('Could not initialize Firebase Admin SDK. Please check service account credentials file and server logs for critical errors.');
  }
}
