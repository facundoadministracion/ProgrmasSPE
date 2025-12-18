
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const WRONG_AMOUNT = 257500.00;
const CORRECT_AMOUNT = 275500;
const PROGRAMA = 'Empleo Joven';
const MES = '3'; // March
const ANIO = '2025';

async function fixPaymentBatch() {
  console.log(`Buscando pagos para ${PROGRAMA} de ${MES}/${ANIO} con monto incorrecto de ${WRONG_AMOUNT}...`);

  const paymentsToFixQuery = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAMA)
    .where('mes', '==', MES)
    .where('anio', '==', ANIO)
    .where('montoPagado', '==', WRONG_AMOUNT);

  const paymentsToFixSnapshot = await paymentsToFixQuery.get();

  if (paymentsToFixSnapshot.empty) {
    console.log('No se encontraron pagos que coincidan con los criterios para la corrección.');
    return;
  }

  console.log(`Se encontraron ${paymentsToFixSnapshot.size} pagos para corregir.`);

  const batch = db.batch();
  paymentsToFixSnapshot.forEach(doc => {
    batch.update(doc.ref, { montoPagado: CORRECT_AMOUNT });
  });

  await batch.commit();
  console.log(`${paymentsToFixSnapshot.size} pagos han sido actualizados al monto correcto de ${CORRECT_AMOUNT}.`);

  // Now, let's fix the summary in paymentHistory
  console.log('Actualizando el registro de historial de la carga...');
  
  const paymentHistoryQuery = db.collection('paymentHistory')
    .where('programa', '==', PROGRAMA)
    .where('mesLiquidacion', '==', MES)
    .where('anoLiquidacion', '==', ANIO)
    .orderBy('uploadedAt', 'desc')
    .limit(1);

  const paymentHistorySnapshot = await paymentHistoryQuery.get();

  if (paymentHistorySnapshot.empty) {
    console.warn('ADVERTENCIA: No se encontró un registro de historial para este lote. El monto total liquidado no fue actualizado.');
    return;
  }
  
  const historyDoc = paymentHistorySnapshot.docs[0];
  const historyData = historyDoc.data();
  const dnisProcesados = historyData.dnisProcesados || [];

  // We need to recalculate the total amount for the batch
   const allPaymentsInBatchQuery = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAMA)
    .where('mes', '==', MES)
    .where('anio', '==', ANIO)
    .where('dni', 'in', dnisProcesados);

  const allPaymentsInBatchSnapshot = await allPaymentsInBatchQuery.get();
  
  const newTotalAmount = allPaymentsInBatchSnapshot.docs.reduce((sum, doc) => {
    return sum + (doc.data().montoPagado || 0);
  }, 0);

  await db.collection('paymentHistory').doc(historyDoc.id).update({
    montoTotalLiquidado: newTotalAmount
  });

  console.log(`El historial de la carga ha sido actualizado. Nuevo monto total liquidado: ${newTotalAmount}.`);
  console.log('¡Corrección completada con éxito!');
}

fixPaymentBatch().catch(console.error);
