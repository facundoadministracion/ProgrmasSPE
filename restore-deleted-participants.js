
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

async function getFullParticipantDataFromPreviousBatch(db, dni) {
    // We need to find a batch where this DNI existed and was complete
    // Let's assume the September batch is the best source of truth.
    const septemberBatchId = "Tecnoempleo-2025-09"; // Assuming this is the ID format
    const septemberBatchRef = db.collection('paymentHistory').doc(septemberBatchId);
    const septemberBatchDoc = await septemberBatchRef.get();

    if (!septemberBatchDoc.exists) return null;

    // This is inefficient, but we have no other way. We must find the participant data.
    // In a real scenario, we'd have backups. Here, we use old payment batches as a pseudo-backup.
    // This part of the code is a placeholder for the logic to find the full data.
    // For this script, we will have to assume we can't recover full data and just restore the core essentials.
    return null; // Placeholder
}


async function restoreDeletedParticipants() {
  const { db } = getFirebaseAdmin();
  const octoberBatchId = "mSGDvy9y7BkGarX4bSiN";

  console.log('Iniciando el proceso de restauración de participantes eliminados...');

  try {
    const writeBatch = db.batch();
    let restoredCount = 0;

    console.log(`Paso 1: Obteniendo todos los registros de pago del lote de Octubre (${octoberBatchId})...`);
    const paymentsSnapshot = await db.collection('pagosRegistrados').where('batchId', '==', octoberBatchId).get();
    
    if (paymentsSnapshot.empty) {
        console.error('Error Crítico: No se encontraron registros de pago individuales para el lote de Octubre. No se puede continuar.');
        return;
    }

    console.log(`Se encontraron ${paymentsSnapshot.size} registros de pago a procesar.\n`);

    for (const paymentDoc of paymentsSnapshot.docs) {
      const paymentData = paymentDoc.data();
      const { participantId, dni, programa } = paymentData;
      
      // This is the reference to the document that was deleted
      const participantRef = db.collection('participantes').doc(participantId);

      // Let's confirm it's truly deleted before restoring
      const checkDoc = await participantRef.get();
      if (checkDoc.exists) {
          console.log(`[OMITIDO] El participante con ID ${participantId} ya existe. No se necesita restauración.`);
          continue;
      }

      console.log(`[RESTAURANDO] Participante con ID: ${participantId}, DNI: ${dni}`);

      // We don't have the full participant data. We will restore the bare minimum to make the system consistent.
      // The UI will likely show missing data, but the core payment logic will work.
      const restoredParticipantData = {
          dni: dni, // Critical field
          programa: programa, // Critical field
          activo: true, // Mark as active
          estado: 'Activo',
          ultimoPago: '10/2025',
          pagosPorPrograma: {
              [programa]: 5 // Jun, Jul, Aug, Sep, Oct
          },
          // Add placeholder for other potential required fields so the UI doesn't crash
          nombre: 'DATOS PENDIENTES DE RESTAURACIÓN',
          apellido: 'DATOS PENDIENTES DE RESTAURACIÓN',
          cuil: '00-00000000-0',
          fechaNacimiento: new Date(),
          // ... other fields would be needed here
      };

      writeBatch.set(participantRef, restoredParticipantData);
      restoredCount++;
    }
    
    console.log(`\nSe han preparado ${restoredCount} participantes para ser restaurados en la base de datos.`);
    console.log('Aplicando los cambios...');

    await writeBatch.commit();

    console.log('------------------------------------------------------------');
    console.log('¡PROCESO DE RESTAURACIÓN COMPLETADO!');
    console.log(`- ${restoredCount} participantes han sido restaurados en la base de datos.`);
    console.log('- Los datos personales (nombre, etc.) deben ser completados manualmente.');
    console.log('- Se recomienda una auditoría para determinar la causa raíz de la eliminación.');
    console.log('------------------------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error catastrófico durante la restauración:', error);
    process.exit(1);
  }
}

restoreDeletedParticipants();
