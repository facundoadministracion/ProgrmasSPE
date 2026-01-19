
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

async function scanForDni() {
  const { db } = getFirebaseAdmin();
  try {
    const targetDni = '33883745';
    console.log(`Escaneando la colección 'participantes' en busca de un DNI similar a "${targetDni}"...`);

    const participantsRef = db.collection('participantes');
    const snapshot = await participantsRef.get();

    if (snapshot.empty) {
      console.log('La colección \'participantes\' está vacía.');
      return;
    }

    let foundParticipant = false;
    snapshot.forEach(doc => {
      const data = doc.data();
      // Trim whitespace and compare
      if (data.dni && typeof data.dni === 'string' && data.dni.trim() === targetDni) {
        console.log('-------------------------------------------');
        console.log(`¡Participante encontrado con DNI problemático!`);
        console.log(`ID del Documento: ${doc.id}`);
        console.log(`DNI Original en la BD: "${data.dni}" (notar las posibles comillas o espacios)`);
        console.log('-------------------------------------------');
        foundParticipant = true;
      }
    });

    if (!foundParticipant) {
      console.log(`Escaneo finalizado. No se encontró ningún participante con un DNI que coincida con "${targetDni}" después de limpiar los datos.`);
    }

  } catch (error) {
    console.error('Ocurrió un error durante el escaneo de DNIs:', error);
    process.exit(1);
  }
}

scanForDni();
