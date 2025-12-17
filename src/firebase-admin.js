"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAdminApp = initializeAdminApp;
var admin = require("firebase-admin");
var fs = require("fs");
var path = require("path");
function initializeAdminApp() {
    if (admin.apps.length > 0) {
        // App already initialized, return the firestore service
        return admin.firestore();
    }
    try {
        var serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
        if (!fs.existsSync(serviceAccountPath)) {
            console.error('CRITICAL: Service account file not found at:', serviceAccountPath);
            throw new Error("serviceAccountKey.json not found at ".concat(serviceAccountPath, "."));
        }
        var serviceAccountString = fs.readFileSync(serviceAccountPath, 'utf8');
        var serviceAccount = JSON.parse(serviceAccountString);
        if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
            throw new Error('Service account file is missing one of the required fields: private_key, client_email, or project_id.');
        }
        var credential = admin.credential.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
        });
        // Initialize the app
        admin.initializeApp({ credential: credential });
        // Return the firestore service from the new app
        return admin.firestore();
    }
    catch (error) {
        console.error('CRITICAL-FINAL: Firebase Admin initialization failed unexpectedly. Raw Error:', error);
        throw new Error('Could not initialize Firebase Admin SDK. Please check service account credentials file and server logs for critical errors.');
    }
}
