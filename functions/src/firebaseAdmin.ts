'use strict';

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Comprueba si la app de Admin ya está inicializada para evitar errores.
if (getApps().length === 0) {
  // Apunta al bucket de almacenamiento correcto y autogenerado por Firebase.
  initializeApp({
    storageBucket: 'gestion-de-programas-lr.firebasestorage.app'
  });
}

// Exporta los servicios de Firestore y Storage ya inicializados.
const firestoreInstance = getFirestore();

export const firestore = firestoreInstance;
export const db = firestoreInstance; // Alias para compatibilidad hacia atrás
export const storage = getStorage();
