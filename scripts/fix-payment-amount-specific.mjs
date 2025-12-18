
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Correction values based on the investigation
const WRONG_AMOUNT = 25750000; // This was the actual error (25.750.000)
const CORRECT_AMOUNT = 275500;   // This is the intended correct amount
const PROGRAMA = 'Empleo Joven';
const MES = '3';
const ANIO = '2025';
const HISTORY_ID = '1NwzcfSfyMCAVSQ18Isj'; // The specific upload batch to fix

async function fixSpecificPaymentBatch() {
  console.log(`Iniciando corrección para la carga ${HISTORY_ID}...`);
  console.log(`Buscando pagos para ${PROGRAMA} de ${MES}/${ANIO} con monto ${WRONG_AMOUNT}.`);

  const paymentsToFixQuery = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAMA)
    .where('mes', '==', MES)
    .where('anio', '==', ANIO)
    .where('montoPagado', '==', WRONG_AMOUNT);

  const paymentsToFixSnapshot = await paymentsToFixQuery.get();

  if (paymentsToFixSnapshot.empty) {
    console.log('No se encontraron pagos que coincidan con los criterios exactos. Verificando el ID de historial...');
    // As a fallback, let's check using the history ID if DNIs are available
    const historyDoc = await db.collection('paymentHistory').doc(HISTORY_ID).get();
    if (!historyDoc.exists) {
        console.log('El ID del historial no existe. No se puede continuar.');
        return;
    }
    const dnisToFix = historyDoc.data()?.dnisProcesados;
    if (!dnisToFix || dnisToFix.length === 0) {
        console.log('El registro de historial no contiene DNIs. No se puede continuar por esta vía.');
        return;
    }
     console.log(`Se encontraron ${dnisToFix.length} DNIs en el historial. Procediendo a corregir por DNI.`);
    
    const batch = db.batch();
    let correctedCount = 0;

    // Firestore 'in' query is limited to 30 items, so we chunk it.
    const chunkSize = 30;
    for (let i = 0; i < dnisToFix.length; i += chunkSize) {
        const chunkDnis = dnisToFix.slice(i, i + chunkSize);
        const chunkQuery = db.collection('pagosRegistrados')
            .where('programa', '==', PROGRAMA)
            .where('mes', '==', MES)
            .where('anio', '==', ANIO)
            .where('dni', 'in', chunkDnis);
        
        const chunkSnapshot = await chunkQuery.get();
        chunkSnapshot.forEach(doc => {
            // We add an extra check for the wrong amount just in case
            if (doc.data().montoPagado === WRONG_AMOUNT) {
                 batch.update(doc.ref, { montoPagado: CORRECT_AMOUNT });
                 correctedCount++;
            }
        });
    }

     if (correctedCount > 0) {
        await batch.commit();
        console.log(`${correctedCount} pagos han sido actualizados al monto correcto de ${CORRECT_AMOUNT}.`);
    } else {
        console.log('No se encontraron pagos con el monto incorrecto, incluso buscando por DNI en el historial.');
        return; // Exit if no payments were actually updated
    }

  } else {
      console.log(`Se encontraron ${paymentsToFixSnapshot.size} pagos para corregir.`);
      const batch = db.batch();
      paymentsToFixSnapshot.forEach(doc => {
        batch.update(doc.ref, { montoPagado: CORRECT_AMOUNT });
      });
      await batch.commit();
      console.log(`${paymentsToFixSnapshot.size} pagos han sido actualizados al monto correcto de ${CORRECT_AMOUNT}.`);
  }

  // Now, let's fix the summary in paymentHistory
  console.log('Actualizando el registro de historial de la carga...');
  
  const historyDocRef = db.collection('paymentHistory').doc(HISTORY_ID);
  const historyDoc = await historyDocRef.get();
  const dnisProcesados = historyDoc.data()?.dnisProcesados || [];

  if (dnisProcesados.length === 0) {
       console.warn('ADVERTENCIA: No se pudieron encontrar los DNIs en el historial. El monto total no se puede recalcular automáticamente.');
       return;
  }

  const newTotalAmount = dnisProcesados.length * CORRECT_AMOUNT;

  await historyDocRef.update({
    montoTotalLiquidado: newTotalAmount
  });

  console.log(`El historial de la carga ha sido actualizado. Nuevo monto total liquidado: ${newTotalAmount}.`);
  console.log('¡Corrección completada con éxito!');
}

fixSpecificPaymentBatch().catch(console.error);
