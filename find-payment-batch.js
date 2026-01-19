
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
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

async function findPaymentBatch() {
  const { db } = getFirebaseAdmin();
  const programa = "Tecnoempleo";
  const mes = "10";
  const anio = "2025";

  try {
    console.log(`Buscando lote de pago para ${programa} en ${mes}/${anio}...`);

    const snapshot = await db.collection('paymentHistory')
      .where('programa', '==', programa)
      .where('mesLiquidacion', '==', mes)
      .where('anoLiquidacion', '==', anio)
      .get();

    if (snapshot.empty) {
      console.log('No se encontraron lotes de pago que coincidan con los criterios.');
      return;
    }

    console.log(`Se encontraron ${snapshot.size} lotes de pago:`);
    snapshot.forEach(doc => {
      console.log('--------------------');
      console.log(`ID del Lote: ${doc.id}`);
      const data = doc.data();
      console.log(`  - Cantidad de Pagos: ${data.cantidadPagos}`);
      console.log(`  - Monto Total: ${data.montoTotalLiquidado}`);
      console.log(`  - Fecha de Carga: ${data.uploadedAt.toDate()}`);
      console.log(`  - DNIs Procesados: ${data.dnisProcesados.length}`);
      console.log('--------------------');
    });

  } catch (error) {
    console.error('Error buscando el lote de pago:', error);
  }
}

findPaymentBatch();
