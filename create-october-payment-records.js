
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

async function createOctoberPaymentRecords() {
  const { db } = getFirebaseAdmin();
  const FieldValue = admin.firestore.FieldValue;

  const batchId = "mSGDvy9y7BkGarX4bSiN";
  const programa = "Tecnoempleo";
  const mes = "10";
  const anio = "2025";
  const paymentMonthStr = "Octubre/2025";
  let successCount = 0;
  let notFoundCount = 0;
  let alreadyExistsCount = 0;

  try {
    console.log(`Iniciando la creación de registros de pago para ${programa} ${mes}/${anio}`);

    const batchDoc = await db.collection('paymentHistory').doc(batchId).get();
    if (!batchDoc.exists) {
      console.error(`Error: No se pudo encontrar el lote de pago con ID ${batchId}.`);
      return;
    }

    const dnisToProcess = batchDoc.data().dnisProcesados;
    console.log(`Se procesarán ${dnisToProcess.length} DNIs del lote.`);

    const counterField = `pagosPorPrograma.${programa}`;
    const participantsCollection = db.collection('participants');

    for (const dni of dnisToProcess) {
      const participantQuery = participantsCollection.where('dni', '==', dni).limit(1);
      const participantSnapshot = await participantQuery.get();

      if (participantSnapshot.empty) {
        console.warn(`- DNI ${dni}: No encontrado.`);
        notFoundCount++;
        continue;
      }

      const participantRef = participantSnapshot.docs[0].ref;
      const participantHistoryRef = participantRef.collection('paymentHistory');

      // Check if this payment record already exists to avoid duplicates
      const paymentId = `${anio}-${mes}`;
      const existingPaymentDoc = await participantHistoryRef.doc(paymentId).get();

      if (existingPaymentDoc.exists) {
        console.log(`- DNI ${dni}: El registro de pago para ${paymentMonthStr} ya existe. Omitiendo.`);
        alreadyExistsCount++;
        continue;
      }

      // 1. Create the new payment document in the subcollection
      const newPaymentRecord = {
          programa: programa,
          mes: mes,
          anio: anio,
          paymentBatchId: batchId,
          fechaLiquidacion: new Date(`${anio}-${mes}-28`)
      };
      
      // 2. Prepare the updates for the main participant document
      const participantUpdates = {
          [counterField]: FieldValue.increment(1),
          pagosAcumulados: FieldValue.increment(1),
          ultimoPago: paymentMonthStr,
          estado: 'Activo',
      };

      // Use a batch to perform both writes atomically
      const writeBatch = db.batch();
      writeBatch.set(participantHistoryRef.doc(paymentId), newPaymentRecord);
      writeBatch.update(participantRef, participantUpdates);
      await writeBatch.commit();

      console.log(`- DNI ${dni}: Registro de pago creado y contador actualizado.`);
      successCount++;
    }

    console.log('-------------------------------------------');
    console.log('¡PROCESO DE CREACIÓN DE REGISTROS COMPLETADO!');
    console.log(`- ${successCount} participantes actualizados con el nuevo registro de pago.`);
    console.log(`- ${alreadyExistsCount} participantes ya tenían el registro.`);
    console.log(`- ${notFoundCount} participantes no fueron encontrados.`);
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error grave durante el proceso:', error);
  }
}

createOctoberPaymentRecords();
