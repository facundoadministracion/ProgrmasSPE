
const admin = require('firebase-admin');

// Initialize Firebase Admin
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      // This will fail in this environment, but the catch block will initialize 
      // with default credentials, which is what's needed.
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (e) {
      admin.initializeApp();
    }
  }
  return { db: admin.firestore() };
}

async function findParticipantByDepartment() {
  const { db } = getFirebaseAdmin();
  
  const targetDepartment = "General San Martín";

  try {
    console.log(`Buscando participantes en el departamento: '${targetDepartment}'`);

    // Based on the security rules, the collection is 'participants'.
    const participantsRef = db.collection('participants');
    const querySnapshot = await participantsRef
      .where('departamento', '==', targetDepartment)
      .get();

    if (querySnapshot.empty) {
      console.log('------------------------------------------------------------------');
      console.log(`RESULTADO: No se encontró NINGÚN participante en el departamento "${targetDepartment}".`);
      console.log('------------------------------------------------------------------');
      return;
    }

    console.log('------------------------------------------------------------------');
    console.log(`¡PARTICIPANTES ENCONTRADOS! Se encontraron ${querySnapshot.size} registro(s):`);
    console.log('------------------------------------------------------------------');
    querySnapshot.forEach(doc => {
        const participantData = doc.data();
        console.log(`ID del Documento: ${doc.id}`);
        console.log(JSON.stringify(participantData, null, 2));
        console.log('---');
    });

  } catch (error) {
    console.error('Ocurrió un error durante la búsqueda por departamento:', error);
    process.exit(1);
  }
}

findParticipantByDepartment();
