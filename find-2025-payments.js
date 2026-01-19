
const admin = require('firebase-admin');

// Initialize Firebase Admin
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

async function findSpecificPaymentByMonthNumber() {
  const { db } = getFirebaseAdmin();
  try {
    console.log("Buscando el pago de mes 10, año 2025 para el programa Tecnoempleo...");

    const pagosRef = db.collection('pagosRegistrados');
    const query = pagosRef
      .where('mes', '==', 10)
      .where('anio', '==', 2025)
      .where('programa', '==', 'Tecnoempleo');

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('No se encontró ningún pago que coincida con los criterios (buscando mes como número).');
      return;
    }

    console.log(`¡Pago encontrado! Se encontraron ${snapshot.size} registros. Mostrando el primero:`);
    snapshot.forEach(doc => {
      console.log('-------------------------------------------');
      console.log(`ID del Pago: ${doc.id}`);
      console.log('Datos completos del pago:', JSON.stringify(doc.data(), null, 2));
      console.log('-------------------------------------------');
    });

  } catch (error) {
    console.error('Ocurrió un error durante la búsqueda del pago:', error);
    process.exit(1);
  }
}

findSpecificPaymentByMonthNumber();
