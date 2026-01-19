
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

async function getAllPaymentsForDni() {
  const { db } = getFirebaseAdmin();
  const dniToFind = '33883745'; // DNI as a string, which is how it was in the batch

  try {
    console.log(`Buscando TODOS los pagos registrados para el DNI: ${dniToFind}...`);

    const pagosRef = db.collection('pagosRegistrados');
    const query = pagosRef.where('dni', '==', dniToFind);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`No se encontró ningún pago registrado para el DNI ${dniToFind} en la colección 'pagosRegistrados'.`);
      return;
    }

    console.log(`¡Se encontraron ${snapshot.size} pagos para el DNI ${dniToFind}!`);
    console.log('-------------------------------------------');
    snapshot.forEach(doc => {
      console.log(`ID del Pago: ${doc.id}`);
      console.log('Datos del pago:', JSON.stringify(doc.data(), null, 2));
      console.log('---');
    });
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error al buscar los pagos:', error);
    process.exit(1);
  }
}

getAllPaymentsForDni();
