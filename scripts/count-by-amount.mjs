
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

// --- Configuration ---
const MONTH_TO_CHECK = '10';       // Month as a STRING
const YEAR_TO_CHECK = '2025';        // Year as a STRING
const PROGRAM_TO_CHECK = 'Tutorías';
const AMOUNT_TO_CHECK = 371450;    // Amount as a NUMBER
// --- End Configuration ---

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function countPaymentsByAmount() {
  console.log(`Buscando pagos para ${PROGRAM_TO_CHECK} en ${MONTH_TO_CHECK}/${YEAR_TO_CHECK} con el monto exacto de ${AMOUNT_TO_CHECK}.`);

  const paymentsQuery = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAM_TO_CHECK)
    .where('mes', '==', MONTH_TO_CHECK)
    .where('anio', '==', YEAR_TO_CHECK)
    .where('montoPagado', '==', AMOUNT_TO_CHECK);

  const snapshot = await paymentsQuery.count().get();
  const count = snapshot.data().count;

  console.log(`\nResultado: Se encontraron ${count} pagos que coinciden con los criterios.`);

  if (count > 0) {
    console.log('Esto indica que hay registros con ese monto, pero probablemente están asignados a una categoría incorrecta en la base de datos.');
  } else {
    console.log('Esto indica que no hay ningún registro con ese monto para el período especificado.');
  }
  
  console.log('\nBúsqueda finalizada.');
}

countPaymentsByAmount().catch(console.error);
