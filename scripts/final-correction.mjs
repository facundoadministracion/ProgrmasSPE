
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Final correction values, based on user feedback.
const INCORRECTLY_UPDATED_AMOUNT = 275500; // The amount I mistakenly set.
const FINAL_CORRECT_AMOUNT = 257500;       // The true correct amount.
const PROGRAMA = 'Empleo Joven';
const MES = '3';
const ANIO = '2025';
const HISTORY_ID = '1NwzcfSfyMCAVSQ18Isj';

async function fixMyMistake() {
  console.log(`Corrigiendo mi error anterior para la carga ${HISTORY_ID}...`);
  console.log(`Buscando pagos para ${PROGRAMA} de ${MES}/${ANIO} con el monto que actualicé por error (${INCORRECTLY_UPDATED_AMOUNT}).`);

  const paymentsToFixQuery = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAMA)
    .where('mes', '==', MES)
    .where('anio', '==', ANIO)
    .where('montoPagado', '==', INCORRECTLY_UPDATED_AMOUNT);

  const paymentsToFixSnapshot = await paymentsToFixQuery.get();

  if (paymentsToFixSnapshot.empty) {
    console.log('No se encontraron pagos para corregir. Es posible que la operación ya se haya realizado o los datos no coincidan.');
    return;
  }

  console.log(`Se encontraron ${paymentsToFixSnapshot.size} pagos para ajustar al monto final correcto.`);

  const batch = db.batch();
  paymentsToFixSnapshot.forEach(doc => {
    batch.update(doc.ref, { montoPagado: FINAL_CORRECT_AMOUNT });
  });

  await batch.commit();
  console.log(`${paymentsToFixSnapshot.size} pagos han sido actualizados al monto final correcto de ${FINAL_CORRECT_AMOUNT}.`);

  // Now, update the paymentHistory one last time.
  console.log('Actualizando el registro de historial con el monto total definitivo...');
  
  const historyDocRef = db.collection('paymentHistory').doc(HISTORY_ID);
  const numberOfPayments = paymentsToFixSnapshot.size;
  const finalTotalAmount = numberOfPayments * FINAL_CORRECT_AMOUNT;

  await historyDocRef.update({
    montoTotalLiquidado: finalTotalAmount
  });

  console.log(`El historial de la carga ha sido finalizado. Nuevo monto total liquidado: ${finalTotalAmount}.`);
  console.log('¡Ahora sí! Corrección definitiva completada con éxito.');
}

fixMyMistake().catch(console.error);
