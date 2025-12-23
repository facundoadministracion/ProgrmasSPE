
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

// --- Configuration ---
const MONTH_TO_CHECK = '10';
const YEAR_TO_CHECK = '2025';
const PROGRAM_TO_CHECK = 'Tutorías';
const CATEGORY_TO_CHECK = 'MONTO NO COINCIDE';
// --- End Configuration ---

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function diagnosePayments() {
  console.log('Iniciando diagnóstico de pagos...');
  console.log(`Buscando documentos con: Programa=${PROGRAM_TO_CHECK}, Mes=${MONTH_TO_CHECK}, Año=${YEAR_TO_CHECK}, Categoría=${CATEGORY_TO_CHECK}`);

  // Query 1: Using strings for month and year (as in previous scripts)
  const queryWithStringValues = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAM_TO_CHECK)
    .where('mes', '==', MONTH_TO_CHECK) // month as a string
    .where('anio', '==', YEAR_TO_CHECK)   // year as a string
    .where('categoria', '==', CATEGORY_TO_CHECK);
  
  const snapshotWithStringValues = await queryWithStringValues.count().get();
  const countWithStringValues = snapshotWithStringValues.data().count;
  console.log(`Resultados con MES y AÑO como STRING: ${countWithStringValues} documentos encontrados.`);

  // Query 2: Using numbers for month and year
  const monthAsNumber = parseInt(MONTH_TO_CHECK, 10);
  const yearAsNumber = parseInt(YEAR_TO_CHECK, 10);

  const queryWithNumberValues = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAM_TO_CHECK)
    .where('mes', '==', monthAsNumber) // month as a number
    .where('anio', '==', yearAsNumber)   // year as a number
    .where('categoria', '==', CATEGORY_TO_CHECK);

  const snapshotWithNumberValues = await queryWithNumberValues.count().get();
  const countWithNumberValues = snapshotWithNumberValues.data().count;
  console.log(`Resultados con MES y AÑO como NÚMERO: ${countWithNumberValues} documentos encontrados.`);

  if (countWithStringValues === 0 && countWithNumberValues === 0) {
    console.log('\nDiagnóstico: No se encontraron documentos que coincidan con los criterios en ninguna de las dos modalidades (string o número).');
    console.log('Esto sugiere que hay otra discrepancia en los datos que impide que los scripts encuentren los registros correctos. Puede ser un espacio extra, un caracter diferente, etc.');
  } else if (countWithNumberValues > 0) {
    console.log('\nDiagnóstico: ¡Se encontraron los documentos! El problema es que los campos MES y AÑO están guardados como NÚMEROS en la base de datos, pero los scripts los buscaban como STRINGS.');
    console.log('El próximo script de corrección deberá usar números para la búsqueda.');
  } else {
     console.log('\nDiagnóstico: Se encontraron los documentos usando STRINGS. Esto es inesperado, ya que el script de corrección debería haber funcionado. Investigando más a fondo...');
  }
  
  console.log('\nDiagnóstico finalizado.');
}

diagnosePayments().catch(console.error);
