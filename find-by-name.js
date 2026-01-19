
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

async function findParticipantByName() {
  const { db } = getFirebaseAdmin();
  
  const targetName = "ALBA MARIA";
  const targetLastName = "FERNANDA";

  try {
    console.log(`Buscando a la participante con nombre: '${targetName}' y apellido: '${targetLastName}'`);

    const participantsRef = db.collection('participantes');
    const querySnapshot = await participantsRef
      .where('nombre', '==', targetName)
      .where('apellido', '==', targetLastName)
      .get();

    if (querySnapshot.empty) {
      console.log('------------------------------------------------------------------');
      console.error('RESULTADO: No se encontró NINGÚN participante con ese nombre y apellido.');
      console.log('------------------------------------------------------------------');
      return;
    }

    console.log('------------------------------------------------------------------');
    console.log(`¡PARTICIPANTE ENCONTRADO! Se encontraron ${querySnapshot.size} registro(s):`);
    console.log('------------------------------------------------------------------');
    querySnapshot.forEach(doc => {
        const participantData = doc.data();
        console.log(`ID del Documento (Nuevo Participant ID): ${doc.id}`);
        console.log(JSON.stringify(participantData, null, 2));
        console.log('---');
    });

  } catch (error) {
    console.error('Ocurrió un error durante la búsqueda por nombre:', error);
    process.exit(1);
  }
}

findParticipantByName();
