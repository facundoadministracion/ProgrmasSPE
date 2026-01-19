
const admin = require('firebase-admin');

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

async function findSeptemberBatch() {
  const { db } = getFirebaseAdmin();
  const programa = "Tecnoempleo";
  const mes = "09";
  const anio = "2025";

  try {
    console.log(`Buscando el lote de pago de ${programa} para ${mes}/${anio}...`);

    const historyRef = db.collection('paymentHistory');
    const snapshot = await historyRef
      .where('programa', '==', programa)
      .where('mes', '==', mes)
      .where('anio', '==', anio)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('-------------------------------------------');
      console.error('No se encontró ningún lote de pago para Septiembre 2025.');
      console.log('-------------------------------------------');
      return;
    }

    console.log('-------------------------------------------');
    console.log('¡Lote de pago de Septiembre Encontrado!');
    snapshot.forEach(doc => {
        console.log(`ID del Lote: ${doc.id}`);
        console.log('Datos del lote:', JSON.stringify(doc.data(), null, 2));
    });
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error al buscar el lote de pago:', error);
    process.exit(1);
  }
}

findSeptemberBatch();
