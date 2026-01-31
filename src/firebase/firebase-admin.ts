
import * as admin from 'firebase-admin';

// MODIFICADO: Importamos las credenciales directamente del archivo JSON.
// Esto es más robusto para este entorno que depender de variables de entorno.
import serviceAccount from '../../service-account.json';

// Evitamos reinicializar la app si ya existe una instancia (importante en entornos de desarrollo).
if (!admin.apps.length) {
  try {
    // Nos aseguramos de que el objeto de credenciales es compatible con el tipo que espera el SDK.
    const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
    
    admin.initializeApp({
      credential,
    });
    console.log('Firebase Admin SDK inicializado correctamente desde service-account.json.');
    
  } catch (error: any) {
    console.error('Error al inicializar Firebase Admin SDK:', error.stack);
  }
}

// Exportamos las instancias de los servicios de Firebase que usaremos en el backend.
export const db = admin.firestore();
export const auth = admin.auth();
