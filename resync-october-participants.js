
const admin = require('firebase-admin');

// Initialize Firebase Admin
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (e) {
      console.error('Failed to initialize admin app with service account, trying default credentials.', e);
      admin.initializeApp();
    }
  }
  return { db: admin.firestore() };
}

async function resyncOctoberParticipants() {
  const { db } = getFirebaseAdmin();
  const batchId = "mSGDvy9y7BkGarX4bSiN";
  const programa = "Tecnoempleo";
  const expectedPaymentCount = 5; // Junio, Julio, Agosto, Septiembre, Octubre

  let successCount = 0;
  let notFoundCount = 0;
  let alreadyCorrectCount = 0;

  try {
    console.log(`Iniciando la re-sincronización de datos para los participantes del lote: ${batchId}`);

    const batchDoc = await db.collection('paymentHistory').doc(batchId).get();
    if (!batchDoc.exists) {
      console.error(`Error Crítico: No se pudo encontrar el lote de pago con ID ${batchId}.`);
      return;
    }
    
    const dnisAsString = batchDoc.data().dnisProcesados;
    if (!dnisAsString || dnisAsString.length === 0) {
        console.error(`Error: No hay DNIs en el lote de pago ${batchId}.`);
        return;
    }

    console.log(`Se procesarán ${dnisAsString.length} DNIs del lote de Octubre 2025.`);

    const writeBatch = db.batch();
    const participantsCollection = db.collection('participantes');

    for (const dniString of dnisAsString) {
      const dniNumber = parseInt(dniString, 10);
      if (isNaN(dniNumber)) {
        console.warn(`[OMITIDO] El DNI '${dniString}' no es un número válido.`);
        notFoundCount++;
        continue;
      }

      // Find participant by the numeric DNI, as we suspect that's the current corrupt state
      const participantQuery = participantsCollection.where('dni', '==', dniNumber).limit(1);
      const participantSnapshot = await participantQuery.get();

      if (participantSnapshot.empty) {
        console.warn(`[NO ENCONTRADO] No se encontró participante con DNI numérico: ${dniNumber}`);
        notFoundCount++;
        continue;
      }

      const participantDoc = participantSnapshot.docs[0];
      const participantRef = participantDoc.ref;
      const participantData = participantDoc.data();

      const currentDniType = typeof participantData.dni;
      const currentPaymentCount = participantData.pagosPorPrograma?.[programa] || 0;

      // Check if a fix is needed
      if (currentDniType === 'string' && currentPaymentCount === expectedPaymentCount) {
        alreadyCorrectCount++;
        continue;
      }

      // Prepare the update
      const updateData = {
        // CRITICAL FIX: Ensure DNI is a string to match payment system logic
        dni: dniString,
        // Fix the counter as it was likely not updated correctly
        [`pagosPorPrograma.${programa}`]: expectedPaymentCount,
        // Restore last payment date
        ultimoPago: "10/2025"
      };

      writeBatch.update(participantRef, updateData);
      successCount++;
      console.log(`[CORRECCIÓN PENDIENTE] DNI: ${dniString}. Tipo actual: ${currentDniType} -> string. Pagos: ${currentPaymentCount} -> ${expectedPaymentCount}`);
    }

    console.log("\nAplicando las correcciones a la base de datos...");
    await writeBatch.commit();

    console.log('-------------------------------------------');
    console.log('¡PROCESO DE RE-SINCRONIZACIÓN COMPLETADO!');
    console.log(`- ${successCount} participantes fueron corregidos y sincronizados.`);
    console.log(`- ${alreadyCorrectCount} participantes ya tenían los datos correctos.`);
    console.log(`- ${notFoundCount} participantes no fueron encontrados en la base de datos.`);
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error grave durante el proceso de re-sincronización:', error);
    process.exit(1);
  }
}

resyncOctoberParticipants();
