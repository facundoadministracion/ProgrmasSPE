
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

async function finalFixOctober2025() {
  const { db } = getFirebaseAdmin();

  const batchId = "mSGDvy9y7BkGarX4bSiN";
  const programa = "Tecnoempleo";
  const mes = "10";
  const anio = "2025";
  const paymentMonthStr = "Octubre/2025";
  const correctPaymentCount = 5; // Junio, Julio, Agosto, Septiembre, Octubre

  let successCount = 0;
  let notFoundCount = 0;
  let alreadyExistsCount = 0;

  try {
    console.log(`--- INICIANDO CORRECCIÓN DEFINITIVA PARA ${programa} ${paymentMonthStr} ---`);

    const batchDoc = await db.collection('paymentHistory').doc(batchId).get();
    if (!batchDoc.exists) {
      console.error(`Error: No se pudo encontrar el lote de pago con ID ${batchId}.`);
      return;
    }

    const dnisToProcess = batchDoc.data().dnisProcesados;
    console.log(`Se procesarán ${dnisToProcess.length} DNIs del lote ${batchId}.`);

    const participantsCollection = db.collection('participants');
    const paymentsCollection = db.collection('pagosRegistrados'); 

    for (const dni of dnisToProcess) {
      const participantQuery = participantsCollection.where('dni', '==', dni).limit(1);
      const participantSnapshot = await participantQuery.get();

      if (participantSnapshot.empty) {
        console.warn(`- DNI ${dni}: No encontrado en la colección de participantes.`);
        notFoundCount++;
        continue;
      }

      const participantDoc = participantSnapshot.docs[0];
      const participantRef = participantDoc.ref;
      const participantId = participantDoc.id;

      // 1. CREAR EL REGISTRO DE PAGO EN LA COLECCIÓN RAÍZ 'pagosRegistrados'
      const paymentRecordId = `${participantId}_${anio}-${mes}`;
      const paymentRecordRef = paymentsCollection.doc(paymentRecordId);
      const existingPaymentDoc = await paymentRecordRef.get();

      if (existingPaymentDoc.exists) {
        console.log(`- DNI ${dni}: El registro de pago en 'pagosRegistrados' ya existe. Omitiendo creación.`);
        alreadyExistsCount++;
      } else {
        const newPaymentRecord = {
          participantId: participantId,
          programa: programa,
          mes: mes,
          anio: anio,
          paymentBatchId: batchId,
          fechaLiquidacion: admin.firestore.Timestamp.fromDate(new Date(`${anio}-${mes}-28`))
        };
        await paymentRecordRef.set(newPaymentRecord);
        console.log(`- DNI ${dni}: Registro de pago creado en 'pagosRegistrados'.`);
      }

      // 2. ACTUALIZAR EL CONTADOR EN EL DOCUMENTO DEL PARTICIPANTE
      const counterField = `pagosPorPrograma.${programa}`;
      const updateData = {
        [counterField]: correctPaymentCount, // Seteamos el valor correcto directamente
        ultimoPago: paymentMonthStr
      };

      await participantRef.update(updateData);
      console.log(`- DNI ${dni}: Contador en participante actualizado a ${correctPaymentCount}.`);
      
      successCount++;
    }

    console.log('-------------------------------------------');
    console.log('¡PROCESO DE CORRECCIÓN DEFINITIVA COMPLETADO!');
    console.log(`- ${successCount} participantes procesados exitosamente.`);
    console.log(`- ${alreadyExistsCount} participantes ya tenían el registro de pago correcto.`);
    console.log(`- ${notFoundCount} participantes no fueron encontrados.`);
    console.log('¡El problema debería estar solucionado!');
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error GRAVE durante el proceso de corrección final:', error);
  }
}

finalFixOctober2025();
