
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

async function getParticipantData() {
  const { db } = getFirebaseAdmin();
  try {
    const dniToFind = '33883745';

    console.log(`Buscando al participante con DNI "${dniToFind}" en la base de datos de producción...`);

    const participantsRef = db.collection('participantes');
    const query = participantsRef.where('dni', '==', dniToFind);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('No se encontró ningún participante con ese DNI en la base de datos de producción.');
      return;
    }

    if (snapshot.size > 1) {
      console.log(`Advertencia: Se encontraron ${snapshot.size} participantes con el mismo DNI. Mostrando el primero.`);
    }

    const participantDoc = snapshot.docs[0];
    console.log('-------------------------------------------');
    console.log(`¡Participante Encontrado! (ID: ${participantDoc.id}):`);
    console.log(JSON.stringify(participantDoc.data(), null, 2));
    console.log('-------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error al obtener los datos del participante:', error);
    process.exit(1);
  }
}

getParticipantData();
