import * as admin from 'firebase-admin';

// Función para inicializar la app de Firebase Admin. Es "lazy", solo se ejecuta si no hay apps inicializadas.
const initializeAdmin = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        // CORRECCIÓN: Se añade el bucket de almacenamiento para que App Hosting funcione.
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase Admin SDK inicializado correctamente.');
    } catch (error: any) {
      console.error('Error al inicializar Firebase Admin SDK:', error);
      // Si el error es por duplicación de app (algo común en entornos de desarrollo), no relanzamos la excepción.
      if (error.code !== 'app/duplicate-app') {
        throw error;
      }
    }
  }
};

// Se llama a la inicialización al cargar el módulo.
initializeAdmin();

// FUNCIÓN RESTAURADA: Esta es la función que las rutas de la API esperan encontrar.
export const getFirebaseAdmin = () => {
  // La inicialización ya se ha hecho, así que solo devolvemos los servicios.
  return {
    auth: admin.auth(),
    db: admin.firestore(),
    storage: admin.storage(),
  };
};

// EXPORTS RESTAURADOS: También exportamos las instancias directamente por si alguna parte del código las usa.
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
