"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAdminApp = initializeAdminApp;
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function initializeAdminApp() {
    if (admin.apps.length > 0) {
        // App already initialized, return the firestore service
        return admin.firestore();
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
        // Initialize the app
        admin.initializeApp({ credential });
        // Return the firestore service from the new app
        return admin.firestore();
    }
    catch (error) {
        console.error('CRITICAL-FINAL: Firebase Admin initialization failed unexpectedly. Raw Error:', error);
        throw new Error('Could not initialize Firebase Admin SDK. Please check service account credentials file and server logs for critical errors.');
    }
}
