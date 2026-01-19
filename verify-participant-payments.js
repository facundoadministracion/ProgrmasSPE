
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

async function getFullParticipantData() {
  const { db } = getFirebaseAdmin();
  const dniToVerify = "43612091";

  try {
    console.log(`Buscando al participante con DNI: ${dniToVerify}...`);

    const participantsCollection = db.collection('participants');
    const participantQuery = participantsCollection.where('dni', '==', dniToVerify).limit(1);
    const participantSnapshot = await participantQuery.get();

    if (participantSnapshot.empty) {
      console.error(`ERROR: No se encontró ningún participante con el DNI: ${dniToVerify}.`);
      return;
    }

    const participantDoc = participantSnapshot.docs[0];
    const participantData = participantDoc.data();

    console.log('------------------------------------------------------------');
    console.log(`DATOS COMPLETOS DEL DOCUMENTO PARA EL DNI: ${dniToVerify}`);
    console.log('------------------------------------------------------------');
    console.log(JSON.stringify(participantData, null, 2));
    console.log('------------------------------------------------------------');

  } catch (error) {
    console.error('Ocurrió un error grave durante la verificación:', error);
    process.exit(1);
  }
}

getFullParticipantData();
