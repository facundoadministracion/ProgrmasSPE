// Importa las funciones que necesitas de los SDKs que necesitas
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from "firebase/functions";

// La configuracion de tu proyecto Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa Firebase de forma segura para SSR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

// Solo inicializa los servicios del lado del cliente
if (typeof window !== 'undefined') {
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'southamerica-east1');
}

// Exporta las instancias para que puedan ser usadas en otras partes de tu aplicacion
// En el servidor, db, storage, y functions seran null, lo cual es manejado
// por los hooks que ya hemos corregido.
export { app, db, storage, functions, firebaseConfig };
