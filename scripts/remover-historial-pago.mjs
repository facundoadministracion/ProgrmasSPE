
import admin from 'firebase-admin';
import { createInterface } from 'readline';

// --- CONFIGURACIÓN DEL SCRIPT ---
const PROGRAMA_A_CORREGIR = 'Tutorias';         // Corregido: Nombre exacto del programa
const MES_A_ELIMINAR = '11';                    // Corregido: Es un STRING
const ANIO_A_ELIMINAR = '2025';                 // Corregido: Es un STRING
const SERVICE_ACCOUNT_PATH = '../serviceAccountKey.json';
const PROJECT_ID = 'programas-de-empleo-lr';
// --------------------------------

// Función para inicializar Firebase
async function initializeFirebase() {
    if (admin.apps.length) {
        return admin.firestore();
    }
    let serviceAccount;
    try {
        serviceAccount = await import(SERVICE_ACCOUNT_PATH, { assert: { type: 'json' } });
    } catch (e) {
        console.error(`Error: No se pudo encontrar el archivo de credenciales en la ruta: ${SERVICE_ACCOUNT_PATH}`);
        process.exit(1);
    }
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount.default),
        projectId: PROJECT_ID,
    });
    return admin.firestore();
}

async function deletePaymentHistoryEntry() {
  const db = await initializeFirebase();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\nBuscando registro en 'paymentHistory' para el programa "${PROGRAMA_A_CORREGIR}" con fecha de liquidación ${MES_A_ELIMINAR}/${ANIO_A_ELIMINAR}...`);

  const historyRef = db.collection('paymentHistory');
  const q = historyRef
    .where('programa', '==', PROGRAMA_A_CORREGIR)
    .where('mesLiquidacion', '==', MES_A_ELIMINAR)
    .where('anoLiquidacion', '==', ANIO_A_ELIMINAR);

  let snapshot;
  try {
    snapshot = await q.get();
  } catch (error) {
    console.error("Error al realizar la consulta:", error);
    rl.close();
    return;
  }


  if (snapshot.empty) {
    console.log('No se encontró ningún registro de historial de pago que coincida con los criterios exactos.');
    console.log('Por favor, verifica que no se haya corregido ya.');
    rl.close();
    return;
  }

  console.log(`\n¡Registro encontrado! Se va a eliminar el siguiente documento (ID: ${snapshot.docs[0].id}):`);
  console.log(JSON.stringify(snapshot.docs[0].data(), null, 2));

  rl.question('\n¿Estás seguro de que quieres eliminar este registro de forma PERMANENTE? (s/n) ', async (answer) => {
    if (answer.toLowerCase() === 's') {
      const docToDelete = snapshot.docs[0];
      try {
        await docToDelete.ref.delete();
        console.log(`\n¡Éxito! Se eliminó el registro con ID: ${docToDelete.id}.`);
        console.log('El panel de control debería mostrar la información correcta después de recargar la página.');
      } catch (error) {
        console.error('\nError al intentar eliminar el registro:', error);
      }
    } else {
      console.log('\nOperación cancelada por el usuario.');
    }
    rl.close();
  });
}

deletePaymentHistoryEntry().catch(e => {
  console.error('Ocurrió un error inesperado:', e);
});
