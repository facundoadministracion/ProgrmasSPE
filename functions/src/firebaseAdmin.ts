'use strict';

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

/**
 * Inicializa el SDK de Firebase Admin una sola vez, especificando explícitamente
 * el bucket de almacenamiento correcto que hemos creado manualmente.
 */
initializeApp({
  storageBucket: 'programas-lr-storage'
});

export const db = getFirestore();
export const storage = getStorage();
