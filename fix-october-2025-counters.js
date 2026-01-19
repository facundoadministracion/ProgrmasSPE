
const admin = require('firebase-admin');

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

async function fixOctober2025Counters() {
  const { db } = getFirebaseAdmin();
  const FieldValue = admin.firestore.FieldValue;
  const batchId = "mSGDvy9y7BkGarX4bSiN";
  const programa = "Tecnoempleo";
  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  try {
    console.log(`Iniciando la corrección de contadores para el lote de pago ${batchId}...`);

    // 1. Get the list of DNIs from the payment history batch
    const batchDoc = await db.collection('paymentHistory').doc(batchId).get();
    if (!batchDoc.exists) {
      console.error(`Error: No se pudo encontrar el lote de pago con ID ${batchId}.`);
      return;
    }
    const dnisToProcess = batchDoc.data().dnisProcesados;
    console.log(`Se procesarán ${dnisToProcess.length} DNIs.`);

    const fieldToUpdate = `pagosPorPrograma.${programa}`;

    // 2. Iterate through each DNI and update the corresponding participant
    // We will use a batched write to handle this efficiently.
    const writeBatch = db.batch();
    const participantsCollection = db.collection('participantes');

    for (const dni of dnisToProcess) {
      // Find the participant by DNI
      const participantQuery = participantsCollection.where('dni', '==', dni).limit(1);
      const participantSnapshot = await participantQuery.get();

      if (participantSnapshot.empty) {
        console.warn(`ADVERTENCIA: No se encontró ningún participante con el DNI: ${dni}.`);
        notFoundCount++;
        continue;
      }

      // Get the participant's document reference and add the update to the batch
      const participantRef = participantSnapshot.docs[0].ref;
      writeBatch.update(participantRef, { [fieldToUpdate]: FieldValue.increment(1) });
      successCount++;
    }

    // 3. Commit the batched write
    console.log("Aplicando las actualizaciones a la base de datos...");
    await writeBatch.commit();

    console.log('-------------------------------------------');
    console.log('¡PROCESO COMPLETADO!');
    console.log(`- ${successCount} participantes actualizados correctamente.`);
    if (notFoundCount > 0) {
      console.log(`- ${notFoundCount} participantes no fueron encontrados.`);
    }
    if (errorCount > 0) { // Should not happen with current logic, but good practice
        console.log(`- ${errorCount} actualizaciones fallaron.`);
    }
    console.log('Los contadores para el lote de Tecnoempleo de Octubre 2025 han sido corregidos.');
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error grave durante el proceso de corrección masiva:', error);
    process.exit(1);
  }
}

fixOctober2025Counters();
