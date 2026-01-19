
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

async function getSampleParticipant() {
  const { db } = getFirebaseAdmin();
  try {
    console.log("Obteniendo un participante de muestra para verificar el tipo de dato del DNI...");

    const participantsRef = db.collection('participantes').limit(1);
    const snapshot = await participantsRef.get();

    if (snapshot.empty) {
      console.log('No se encontró ningún participante en la colección `participantes`.');
      return;
    }

    snapshot.forEach(doc => {
      console.log('-------------------------------------------');
      console.log(`ID del Participante: ${doc.id}`);
      const participantData = doc.data();
      console.log('Datos del participante:', JSON.stringify(participantData, null, 2));
      console.log(`\n>>> TIPO DE DATO DEL CAMPO 'dni': ${typeof participantData.dni} <<<`);
      console.log('-------------------------------------------');
    });

  } catch (error) {
    console.error('Ocurrió un error al obtener el participante de muestra:', error);
    process.exit(1);
  }
}

getSampleParticipant();
