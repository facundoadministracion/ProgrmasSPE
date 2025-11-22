'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // Intenta inicializar con configuración automática si está disponible (entornos de Firebase)
      firebaseApp = initializeApp();
    } catch (e) {
      // Si falla (entorno local/de desarrollo), usa el objeto de configuración explícito.
      firebaseApp = initializeApp(firebaseConfig);
    }
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Conecta explícitamente a la base de datos correcta.
  // Tu proyecto 'programas-spe' usa la base de datos '(default)'.
  // Al no especificar un segundo argumento, nos aseguramos de usar la predeterminada.
  const firestore = getFirestore(firebaseApp);
  
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
