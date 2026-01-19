import * as admin from 'firebase-admin';

// SOLUCIÓN DEFINITIVA: Se incrusta el nombre del bucket directamente.
// Esto elimina cualquier ambigüedad durante el proceso de despliegue.
const BUCKET_NAME = "gestion-de-programas-lr.appspot.com";

if (admin.apps.length === 0) {
  admin.initializeApp({
    // Pasamos el nombre del bucket explícitamente.
    storageBucket: BUCKET_NAME,
  });
}

const db = admin.firestore();
const storage = admin.storage();

// Exportar tanto el objeto admin completo como los servicios individuales
export { admin, db, storage };
