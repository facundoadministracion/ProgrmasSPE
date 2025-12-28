// Importa las funciones que necesitas de los SDKs que necesitas
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// La configuración de tu proyecto Firebase
// (Es seguro tenerla en el cliente, Firebase está diseñado para esto)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializa Firebase
// Comprobamos si ya existe una app inicializada para evitar errores
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializa y exporta los servicios de Firebase que necesitas
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'southamerica-east1');

// Exporta las instancias para que puedan ser usadas en otras partes de tu aplicación
export { app, db, storage, functions, firebaseConfig };
