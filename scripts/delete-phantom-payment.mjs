
// Importamos las herramientas necesarias de Firebase, usando la sintaxis correcta para el entorno de servidor.
import { initializeAdminApp } from '../src/firebase-admin.js';

// Inicializamos la conexión con la base de datos.
const db = initializeAdminApp();

// --- CONFIGURACIÓN DE LA ELIMINACIÓN ---
const PROGRAM_NAME = 'empleo joven';
const PAYMENT_YEAR = '2024';
const PAYMENT_MONTH = '12';

async function deletePhantomPayment() {
  console.log(`Iniciando búsqueda del pago fantasma para:`);
  console.log(`- Programa: "${PROGRAM_NAME}"`);
  console.log(`- Mes: ${PAYMENT_MONTH}`);
  console.log(`- Año: ${PAYMENT_YEAR}`);
  console.log('---');

  // 1. Apuntamos a la colección 'pagosRegistrados' usando la sintaxis correcta.
  const paymentsRef = db.collection('pagosRegistrados');

  // 2. Creamos la consulta precisa.
  const q = paymentsRef
    .where('programa', '==', PROGRAM_NAME)
    .where('anio', '==', PAYMENT_YEAR)
    .where('mes', '==', PAYMENT_MONTH);

  // 3. Ejecutamos la búsqueda.
  const querySnapshot = await q.get();

  if (querySnapshot.empty) {
    console.log('RESULTADO: No se encontró ningún registro de pago que coincida con los criterios.');
    console.log('Es posible que ya haya sido eliminado o que la corrección del botón lo haya solucionado.');
    return;
  }

  // 4. Preparamos una eliminación por lotes.
  const batch = db.batch();
  console.log(`Se encontraron ${querySnapshot.size} registro(s) de pago para eliminar:`);
  querySnapshot.forEach(doc => {
    const paymentData = doc.data();
    console.log(`- Preparando eliminación del pago con ID: ${doc.id}`);
    console.log(`  (Correspondiente al DNI: ${paymentData.dni || 'No especificado'})`);
    batch.delete(doc.ref);
  });

  // 5. Ejecutamos la eliminación.
  try {
    await batch.commit();
    console.log(`
¡Éxito! Se eliminaron permanentemente ${querySnapshot.size} registro(s) de pago fantasma.`);
  } catch (error) {
    console.error('Error al intentar ejecutar la eliminación por lotes:', error);
  }
}

deletePhantomPayment().then(() => {
  console.log('\nScript de limpieza finalizado.');
}).catch(e => {
    console.error('Ocurrió un error general durante la ejecución:', e);
});
