
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

async function createMissingPayment() {
  const { db } = getFirebaseAdmin();

  // Data inferred from our investigation
  const missingPaymentData = {
    participantId: "ZO694RasjLOGYb7klskm", // Found in previous queries
    dni: "33883745",
    nombre: "ALBA MARIA FERNANDA", // Found in previous queries
    montoPagado: 302000, // Calculated from the payment batch (and matches previous month)
    mes: "10", // The missing month
    anio: "2025",
    programa: "Tecnoempleo",
    categoria: "N/A", // Same as other payments
    ownerId: "C946AWBG78PWvjvfyEFeGxDCRsa2", // Same as other payments
    fechaCarga: new Date() // Use current date for the load date
  };

  try {
    console.log("Creando el registro de pago faltante para Octubre 2025...");
    console.log("Datos a insertar:", JSON.stringify(missingPaymentData, null, 2));

    const pagosRef = db.collection('pagosRegistrados');
    const newPaymentRef = await pagosRef.add(missingPaymentData);

    console.log('-------------------------------------------');
    console.log('¡ÉXITO!');
    console.log(`Se ha creado el registro de pago faltante con el ID: ${newPaymentRef.id}`);
    console.log('El historial del participante ahora debería estar completo.');
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error al crear el registro de pago faltante:', error);
    process.exit(1);
  }
}

createMissingPayment();
