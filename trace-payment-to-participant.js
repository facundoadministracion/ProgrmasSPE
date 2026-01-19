
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

async function tracePaymentToParticipant() {
  const { db } = getFirebaseAdmin();
  
  const targetDni = "33883745"; // DNI of ALBA MARIA FERNANDA
  const targetMonth = "10";
  const targetYear = "2025";

  try {
    console.log(`--- PASO 1: Buscando el registro de pago para el DNI ${targetDni} en ${targetMonth}/${targetYear} ---`);

    const paymentsRef = db.collection('pagosRegistrados');
    const paymentSnapshot = await paymentsRef
      .where('dni', '==', targetDni)
      .where('mes', '==', targetMonth)
      .where('anio', '==', targetYear)
      .limit(1)
      .get();

    if (paymentSnapshot.empty) {
      console.error('\n¡ERROR CRÍTICO! No se encontró el registro de pago individual en la colección `pagosRegistrados`.\n');
      console.error('Esto implica que el proceso de carga original falló de una manera no prevista por la lógica de la API.');
      return;
    }
    
    const paymentData = paymentSnapshot.docs[0].data();
    const participantId = paymentData.participantId;
    
    console.log('¡Registro de pago encontrado!');
    console.log(`ID del Participante extraído: ${participantId}\n`);

    console.log(`--- PASO 2: Buscando al participante con el ID extraído: ${participantId} ---`);

    const participantRef = db.collection('participantes').doc(participantId);
    const participantDoc = await participantRef.get();

    if (!participantDoc.exists) {
        console.error('\n¡ERROR DE INCONSISTENCIA GRAVE! El ID del participante existe en un registro de pago, pero el participante no existe en la colección `participantes`.\n');
        return;
    }

    const participantData = participantDoc.data();
    console.log('¡Participante encontrado!\n');
    console.log('------------------- DATOS DEL PARTICIPANTE -------------------');
    console.log(JSON.stringify(participantData, null, 2));
    console.log('------------------------------------------------------------\n');

    const actualDni = participantData.dni;
    const dniType = typeof actualDni;

    console.log('****************** ANÁLISIS FINAL ******************');
    console.log(`El DNI buscado en el lote era (string): "${targetDni}"`);
    console.log(`El DNI encontrado en el registro del participante es (${dniType}): ${JSON.stringify(actualDni)}`);
    console.log('****************************************************');

  } catch (error) {
    console.error('Ocurrió un error durante el rastreo:', error);
    process.exit(1);
  }
}

tracePaymentToParticipant();
