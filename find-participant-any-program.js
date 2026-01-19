
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

async function findParticipantAnyProgram() {
  const { db } = getFirebaseAdmin();
  const targetDni = "33883745"; // The DNI we know was in the October batch
  // Also trying as a number, just in case.
  const targetDniAsNumber = parseInt(targetDni, 10);

  try {
    console.log(`Buscando al participante con DNI ${targetDni} (como string y número) en TODOS los programas...`);

    const participantsRef = db.collection('participantes');
    
    // Firestore does not allow 'OR' queries on different fields, so we do two separate queries.
    const stringQuery = participantsRef.where('dni', '==', targetDni).get();
    const numberQuery = participantsRef.where('dni', '==', targetDniAsNumber).get();

    const [stringSnapshot, numberSnapshot] = await Promise.all([stringQuery, numberQuery]);

    const allResults = [];
    stringSnapshot.forEach(doc => allResults.push({ id: doc.id, ...doc.data() }));
    numberSnapshot.forEach(doc => allResults.push({ id: doc.id, ...doc.data() }));

    if (allResults.length === 0) {
      console.log('------------------------------------------------------------------');
      console.error('RESULTADO: No se encontró NINGÚN participante con ese DNI en toda la base de datos.');
      console.error('Esto confirma que los registros de los participantes fueron eliminados por completo.');
      console.log('------------------------------------------------------------------');
      return;
    }

    console.log('------------------------------------------------------------------');
    console.log(`¡PARTICIPANTE ENCONTRADO! Se encontraron ${allResults.length} registro(s):`);
    console.log('------------------------------------------------------------------');
    allResults.forEach(participantData => {
      console.log(JSON.stringify(participantData, null, 2));
      console.log('---');
    });

  } catch (error) {
    console.error('Ocurrió un error durante la búsqueda global del participante:', error);
    process.exit(1);
  }
}

findParticipantAnyProgram();
