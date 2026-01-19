
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

async function findParticipantByCorrectName() {
  const { db } = getFirebaseAdmin();
  
  // Corrected based on user feedback.
  const targetName = "MARIA FERNANDA";
  const targetLastName = "ALBA";

  try {
    console.log(`Buscando a la participante con APELLIDO: '${targetLastName}' y NOMBRE: '${targetName}'`);

    const participantsRef = db.collection('participantes');
    const querySnapshot = await participantsRef
      .where('apellido', '==', targetLastName)
      .where('nombre', '==', targetName)
      .get();

    if (querySnapshot.empty) {
      console.log('------------------------------------------------------------------');
      console.error('RESULTADO: No se encontró NINGÚN participante con esa combinación.');
      console.error('Por favor, verifique si hay espacios extra o variaciones en el nombre/apellido en la base de datos.');
      console.log('------------------------------------------------------------------');
      return;
    }

    console.log('------------------------------------------------------------------');
    console.log(`¡PARTICIPANTE ENCONTRADO! Se encontraron ${querySnapshot.size} registro(s):`);
    console.log('------------------------------------------------------------------');
    querySnapshot.forEach(doc => {
        const participantData = doc.data();
        console.log(`ID del Documento (NUEVO Participant ID): ${doc.id}`);
        console.log(JSON.stringify(participantData, null, 2));
        console.log('---');
    });

  } catch (error) {
    console.error('Ocurrió un error durante la búsqueda por nombre corregido:', error);
    process.exit(1);
  }
}

findParticipantByCorrectName();
