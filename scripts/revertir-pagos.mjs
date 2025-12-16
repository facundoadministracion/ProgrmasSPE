
import admin from 'firebase-admin';
import { createInterface } from 'readline';

// --- CONFIGURACIÓN DEL SCRIPT ---
const PROGRAMA_A_REVERTIR = 'TUTORIAS';
const MES_A_REVERTIR = 'noviembre';
const ANIO_A_REVERTIR = 2025;
const MES_ANTERIOR = 'octubre';
const ANIO_ANTERIOR = 2025;
const SERVICE_ACCOUNT_PATH = '../serviceAccountKey.json'; 
const PROJECT_ID = 'programas-de-empleo-lr';
// --------------------------------

// Carga las credenciales de la cuenta de servicio
let serviceAccount;
try {
  serviceAccount = await import(SERVICE_ACCOUNT_PATH, { assert: { type: 'json' } });
} catch (e) {
  console.error(`Error: No se pudo encontrar el archivo de credenciales en la ruta: ${SERVICE_ACCOUNT_PATH}`);
  console.error('Por favor, descarga el archivo JSON de la cuenta de servicio desde la consola de Firebase y colócalo en la ruta correcta.');
  process.exit(1);
}

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount.default),
  projectId: PROJECT_ID,
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;
const rl = createInterface({ input: process.stdin, output: process.stdout });

async function revertPayments() {
  console.log(`Iniciando reversión de pagos de ${MES_A_REVERTIR} ${ANIO_A_REVERTIR} para el programa "${PROGRAMA_A_REVERTIR}".`);
  
  const paymentRecordsRef = db.collection('paymentRecords');
  const paymentsToRevertSnapshot = await paymentRecordsRef
    .where('programa', '==', PROGRAMA_A_REVERTIR)
    .where('mesLiquidacion', '==', MES_A_REVERTIR)
    .where('anoLiquidacion', '==', ANIO_A_REVERTIR)
    .get();

  if (paymentsToRevertSnapshot.empty) {
    console.log('No se encontraron pagos para los criterios especificados.');
    rl.close();
    return;
  }

  console.log(`Se encontraron ${paymentsToRevertSnapshot.size} pagos para revertir.`);
  console.log('Estos registros de pago serán ELIMINADOS y el estado de los participantes será ACTUALIZADO.');

  rl.question('\n¿Estás seguro de que quieres ejecutar esta reversión? Esta acción es irreversible. (s/n) ', async (answer) => {
    if (answer.toLowerCase() === 's') {
      const batch = db.batch();
      
      console.log('Procesando documentos...');

      for (const doc of paymentsToRevertSnapshot.docs) {
        const payment = doc.data();
        const { participantId, programa } = payment;

        if (!participantId || !programa) {
          console.warn(` - Registro de pago ${doc.id} no tiene participantId o programa. Omitiendo.`);
          continue;
        }

        // 1. Marcar el registro de pago para eliminación
        batch.delete(doc.ref);

        // 2. Preparar la actualización para el participante
        const participantRef = db.collection('participants').doc(participantId);
        const programPaymentField = `pagosPorPrograma.${programa}`;
        
        const updateData = {
          pagosAcumulados: FieldValue.increment(-1),
          [programPaymentField]: FieldValue.increment(-1),
          ultimoPago: `${MES_ANTERIOR}/${ANIO_ANTERIOR}`,
          updatedAt: FieldValue.serverTimestamp(),
        };
        
        batch.update(participantRef, updateData);
      }

      try {
        await batch.commit();
        console.log('\n--------------------------------------------------');
        console.log('¡Reversión completada exitosamente!');
        console.log(`Se han eliminado ${paymentsToRevertSnapshot.size} registros de pago.`);
        console.log('Los contadores y último mes de pago de los participantes han sido actualizados.');
        console.log('--------------------------------------------------');
      } catch (error) {
        console.error('\nError al ejecutar la reversión en lote:', error);
      }

    } else {
      console.log('Operación cancelada por el usuario.');
    }
    rl.close();
  });
}

revertPayments().catch(e => {
  console.error('Ocurrió un error inesperado durante la ejecución del script:', e);
  rl.close();
});
