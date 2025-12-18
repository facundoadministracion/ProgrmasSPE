
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Let's find the latest payment uploads to see what was actually processed.
async function findLatestUploads() {
  console.log('Buscando los 10 registros de carga de pagos más recientes...');

  const historyQuery = db.collection('paymentHistory')
    .orderBy('uploadedAt', 'desc')
    .limit(10);

  const historySnapshot = await historyQuery.get();

  if (historySnapshot.empty) {
    console.log('No se encontraron registros de historial de cargas.');
    return;
  }

  console.log('--- Últimas 10 Cargas de Pagos ---');
  historySnapshot.forEach(doc => {
    const data = doc.data();
    const uploadDate = data.uploadedAt.toDate(); // Convert Firestore Timestamp to JS Date
    console.log(`
      ID de Carga: ${doc.id}
      Fecha de Carga: ${uploadDate.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
      Programa: ${data.programa}
      Período: ${data.mesLiquidacion}/${data.anoLiquidacion}
      Pagos Creados: ${data.cantidadPagos}
      Monto Total: ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.montoTotalLiquidado)}
    `);
  });
  console.log('-----------------------------------');
  console.log('Por favor, revisa la lista de arriba y confirma cuál es la carga que debemos corregir.');

}

findLatestUploads().catch(console.error);
