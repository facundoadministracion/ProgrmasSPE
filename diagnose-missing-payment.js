
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

async function diagnoseMissingPayment() {
  const { db } = getFirebaseAdmin();
  try {
    const dniToFind = '33883745';

    console.log(`Iniciando diagnóstico para el participante con DNI "${dniToFind}"...`);

    // Find payments for the participant using DNI
    const pagosRef = db.collection('pagosRegistrados');
    const paymentsQuery = pagosRef
      .where('dni', '==', dniToFind)
      .where('anio', '==', '2025')
      .where('mes', 'in', ['septiembre', 'octubre']);

    const paymentsSnapshot = await paymentsQuery.get();

    if (paymentsSnapshot.empty) {
      console.log('No se encontraron pagos para septiembre u octubre de 2025 para este DNI.');
      return;
    }

    console.log('Se encontraron los siguientes pagos. Comparando datos:');
    
    // Print details for comparison
    paymentsSnapshot.forEach(doc => {
      console.log('-------------------------------------------');
      console.log(`ID del Pago: ${doc.id}`);
      console.log(`Mes: ${doc.data().mes}, Año: ${doc.data().anio}`);
      console.log('Datos completos del pago:', JSON.stringify(doc.data(), null, 2));
      console.log('-------------------------------------------');
    });

    console.log('Diagnóstico finalizado. Por favor, revise la diferencia en los datos entre los pagos.');

  } catch (error) {
    console.error('Ocurrió un error durante el diagnóstico:', error);
    process.exit(1);
  }
}

diagnoseMissingPayment();
