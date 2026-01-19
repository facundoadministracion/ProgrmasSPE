
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

async function fixOctober2025CountersFinal() {
  const { db } = getFirebaseAdmin();
  const FieldValue = admin.firestore.FieldValue;
  const batchId = "mSGDvy9y7BkGarX4bSiN";
  const programa = "Tecnoempleo";
  let successCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  try {
    console.log(`Iniciando la corrección FINAL de contadores para el lote de pago ${batchId}...`);

    const batchDoc = await db.collection('paymentHistory').doc(batchId).get();
    if (!batchDoc.exists) {
      console.error(`Error: No se pudo encontrar el lote de pago con ID ${batchId}.`);
      return;
    }
    const dnisToProcessAsString = batchDoc.data().dnisProcesados;
    console.log(`Se procesarán ${dnisToProcessAsString.length} DNIs.`);

    const fieldToUpdate = `pagosPorPrograma.${programa}`;
    const writeBatch = db.batch();
    const participantsCollection = db.collection('participantes');

    for (const dniString of dnisToProcessAsString) {
      // CRITICAL FIX: Convert DNI string to number for the query
      const dniNumber = parseInt(dniString, 10);
      if (isNaN(dniNumber)) {
        console.warn(`ADVERTENCIA: El DNI '${dniString}' no es un número válido y será omitido.`);
        notFoundCount++;
        continue;
      }

      const participantQuery = participantsCollection.where('dni', '==', dniNumber).limit(1);
      const participantSnapshot = await participantQuery.get();

      if (participantSnapshot.empty) {
        console.warn(`ADVERTENCIA: No se encontró ningún participante con el DNI: ${dniNumber}.`);
        notFoundCount++;
        continue;
      }

      const participantRef = participantSnapshot.docs[0].ref;
      writeBatch.update(participantRef, { [fieldToUpdate]: FieldValue.increment(1) });
      successCount++;
    }

    console.log("Aplicando las actualizaciones a la base de datos...");
    await writeBatch.commit();

    console.log('-------------------------------------------');
    console.log('¡PROCESO COMPLETADO!');
    console.log(`- ${successCount} participantes actualizados correctamente.`);
    if (notFoundCount > 0) {
      console.log(`- ${notFoundCount} participantes no fueron encontrados o tenían DNI inválido.`);
    }
    console.log('Los contadores para el lote de Tecnoempleo de Octubre 2025 han sido corregidos.');
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error grave durante el proceso de corrección masiva:', error);
    process.exit(1);
  }
}

fixOctober2025CountersFinal();
