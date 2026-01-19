
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

async function fixTecnoempleoCountersFinal() {
  const { db } = getFirebaseAdmin();
  const FieldValue = admin.firestore.FieldValue;

  const batchId = "mSGDvy9y7BkGarX4bSiN";
  const programa = "Tecnoempleo";
  const paymentMonthStr = "Octubre/2025";
  let successCount = 0;
  let notFoundCount = 0;

  try {
    console.log(`Iniciando la corrección final para el lote de pago de ${programa}: ${batchId}`);

    const batchDoc = await db.collection('paymentHistory').doc(batchId).get();
    if (!batchDoc.exists) {
      console.error(`Error: No se pudo encontrar el lote de pago con ID ${batchId}.`);
      return;
    }

    const dnisToProcess = batchDoc.data().dnisProcesados;
    if (!dnisToProcess || dnisToProcess.length === 0) {
        console.error(`Error: El lote de pago ${batchId} no contiene DNIs procesados.`);
        return;
    }
    console.log(`Se procesarán ${dnisToProcess.length} DNIs del lote.`);

    // The field to update is inside the pagosPorPrograma map.
    const fieldToUpdate = `pagosPorPrograma.${programa}`;

    const writeBatch = db.batch();
    const participantsCollection = db.collection('participants');

    for (const dni of dnisToProcess) {
      const participantQuery = participantsCollection.where('dni', '==', dni).limit(1);
      const participantSnapshot = await participantQuery.get();

      if (participantSnapshot.empty) {
        console.warn(`ADVERTENCIA: No se encontró ningún participante con el DNI: ${dni}.`);
        notFoundCount++;
        continue;
      }

      const participantRef = participantSnapshot.docs[0].ref;
      const updates = {
          [fieldToUpdate]: FieldValue.increment(1),
          pagosAcumulados: FieldValue.increment(1), // Also increment the general counter for consistency
          ultimoPago: paymentMonthStr,
          estado: 'Activo',
          mesAusencia: null
      };

      writeBatch.update(participantRef, updates);
      successCount++;
    }

    console.log("Aplicando las actualizaciones correctas a la base de datos...");
    await writeBatch.commit();

    console.log('-------------------------------------------');
    console.log('¡PROCESO DE CORRECCIÓN FINAL COMPLETADO!');
    console.log(`- ${successCount} participantes de ${programa} actualizados correctamente.`);
    if (notFoundCount > 0) {
      console.log(`- ${notFoundCount} participantes no fueron encontrados.`);
    }
    console.log(`El contador 'pagosPorPrograma.${programa}' ha sido corregido para el lote de Octubre 2025.`);
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error grave durante el proceso de corrección final:', error);
    process.exit(1);
  }
}

fixTecnoempleoCountersFinal();
