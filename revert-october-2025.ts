
import * as admin from 'firebase-admin';

// --- CONFIGURACIÓN ---
const PAYMENT_TO_REVERT = "2025-10"; // El mes en formato YYYY-MM que queremos revertir
const PROGRAM_TO_REVERT = "Tecnoempleo"; // El programa específico del que queremos revertir el pago
const PAYMENT_DOC_ID = "2025-10_fix"; // El ID del documento de pago que usó el script anterior

// --- INICIALIZACIÓN DE FIREBASE ---
let firestore: admin.firestore.Firestore;
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
  });
  firestore = admin.firestore();
  console.log('✅ Conexión con Firebase Admin establecida.');
} catch (error: any) {
  // Si la app ya está inicializada (útil en entornos de re-ejecución), no lanzamos error.
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Error al inicializar Firebase Admin:', error.message);
    process.exit(1);
  } else {
    firestore = admin.app().firestore();
    console.log('✅ Conexión con Firebase Admin reutilizada.');
  }
}

/**
 * Script para revertir TODOS los cambios relacionados con un pago específico de un programa.
 * - Elimina la fecha del historialPagos.
 * - Decrementa los contadores (pagosPorPrograma y pagosAcumulados).
 * - Elimina el documento de pago de la subcolección.
 */
async function revertOctober2025Payment() {
  console.log(`--- INICIANDO REVERSIÓN DEL PAGO ${PAYMENT_TO_REVERT} PARA ${PROGRAM_TO_REVERT} ---`);

  const participantsRef = firestore.collection('participants');
  const batch = firestore.batch();
  let participantsToRevertCount = 0;

  try {
    // Obtenemos TODOS los participantes para revisar a cada uno.
    const snapshot = await participantsRef.get();
    console.log(`🔎 Encontrados ${snapshot.size} participantes en total. Verificando quién necesita reversión...`);

    for (const doc of snapshot.docs) {
      const participant = doc.data();
      const participantRef = doc.ref;
      const historialPagos: string[] = participant.historialPagos || [];

      // La condición CLAVE: solo actuamos si el pago está en el historial.
      if (historialPagos.includes(PAYMENT_TO_REVERT)) {
        
        // Verificamos que el programa existe en `pagosPorPrograma` como una doble comprobación
        // de que este participante fue probablemente afectado.
        if (participant.pagosPorPrograma && participant.pagosPorPrograma[PROGRAM_TO_REVERT] > 0) {
            console.log(`  - ⏪ Preparando reversión para: ${participant.nombre} (ID: ${doc.id})`);
            participantsToRevertCount++;

            // 1. Preparar la actualización del documento principal
            const programCounterField = `pagosPorPrograma.${PROGRAM_TO_REVERT}`;
            const updateData: { [key: string]: any } = {
              'historialPagos': admin.firestore.FieldValue.arrayRemove(PAYMENT_TO_REVERT),
              [programCounterField]: admin.firestore.FieldValue.increment(-1),
              'pagosAcumulados': admin.firestore.FieldValue.increment(-1)
            };
            batch.update(participantRef, updateData);

            // 2. Preparar la eliminación del documento de pago en la subcolección
            const paymentDocRef = participantRef.collection('payments').doc(PAYMENT_DOC_ID);
            batch.delete(paymentDocRef);
        } else {
            console.log(`  - 🤔 Saltando a ${participant.nombre} (ID: ${doc.id}). El pago existe en el historial pero el contador del programa '${PROGRAM_TO_REVERT}' es 0 o no existe. No se revierte para evitar inconsistencias.`);
        }
      }
    }

    if (participantsToRevertCount === 0) {
      console.log('\n🎉 ¡No se encontró ningún participante que requiera reversión! La base de datos parece estar limpia.');
      console.log('--- SCRIPT FINALIZADO ---');
      return;
    }

    console.log(`\n✨ Se han preparado las operaciones de reversión para ${participantsToRevertCount} participantes.`);
    console.log('--- Ejecutando la escritura en la base de datos... ---');

    await batch.commit();

    console.log(`\n✅ ¡ÉXITO! Se han revertido los cambios para ${participantsToRevertCount} participantes.`);
    console.log(`Se eliminó el pago de ${PAYMENT_TO_REVERT}, se actualizó el historial y se decrementaron los contadores.`);
    console.log('--- SCRIPT FINALIZADO ---');

  } catch (error: any) {
    console.error('\n❌ ERROR CRÍTICO DURANTE LA REVERSIÓN:', error);
    console.log('--- SCRIPT INTERRUMPIDO POR ERROR ---');
    process.exit(1);
  }
}

// Ejecutar la función principal
revertOctober2025Payment();
