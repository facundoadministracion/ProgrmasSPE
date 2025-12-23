
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

// --- Configuration ---
const MONTH_TO_INSPECT = '10';   // Month as a STRING
const YEAR_TO_INSPECT = '2025';    // Year as a STRING
const PROGRAM_TO_INSPECT = 'Tutorías';
// --- End Configuration ---

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function inspectCategories() {
  console.log(`Iniciando inspección de categorías para ${PROGRAM_TO_INSPECT} del mes ${MONTH_TO_INSPECT}/${YEAR_TO_INSPECT}.`);

  const paymentsQuery = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAM_TO_INSPECT)
    .where('mes', '==', MONTH_TO_INSPECT)
    .where('anio', '==', YEAR_TO_INSPECT);

  const paymentsSnapshot = await paymentsQuery.get();
  if (paymentsSnapshot.empty) {
    console.log('No se encontraron pagos para este período. No se puede inspeccionar.');
    return;
  }

  console.log(`Se encontraron ${paymentsSnapshot.size} registros de pago. Analizando el campo 'categoria'...`);

  const categoryCounts = new Map();

  paymentsSnapshot.forEach(doc => {
    const payment = doc.data();
    const category = payment.categoria || 'Sin Categoría';
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  });

  console.log('\n--- Resumen de Categorías Encontradas ---');
  if (categoryCounts.size === 0) {
    console.log('No se encontraron categorías en los registros.');
  } else {
    categoryCounts.forEach((count, category) => {
      console.log(`- [${count} veces] \"${category}\"`);
      // For the problematic category, log its character codes to uncover hidden characters
      if(category.toString().includes('NO COINCIDE')){
        const charCodes = Array.from(category).map(c => c.charCodeAt(0));
        console.log(`    (Códigos de caracteres: ${charCodes.join(', ')})`);
      }
    });
  }

  console.log('\nProceso de inspección finalizado.');
}

inspectCategories().catch(console.error);
