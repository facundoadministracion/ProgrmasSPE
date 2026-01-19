
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

async function getParticipantById() {
  const { db } = getFirebaseAdmin();
  const participantId = "ZO694RasjLOGYb7klskm"; // The ID we know is correct from previous payments

  try {
    console.log(`Buscando al participante directamente por su ID: ${participantId}...`);

    const participantRef = db.collection('participantes').doc(participantId);
    const doc = await participantRef.get();

    if (!doc.exists) {
      console.log('-------------------------------------------');
      console.error('¡ERROR CRÍTICO! No se encontró ningún participante con este ID.');
      console.log('Esto no debería ser posible si existen pagos anteriores para este ID.');
      console.log('-------------------------------------------');
      return;
    }

    console.log('-------------------------------------------');
    console.log('¡Participante Encontrado!');
    const participantData = doc.data();
    console.log('Datos del participante:', JSON.stringify(participantData, null, 2));
    console.log('-------------------------------------------');


  } catch (error) {
    console.error('Ocurrió un error al obtener el participante por ID:', error);
    process.exit(1);
  }
}

getParticipantById();
