
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
      // Fallback to default credentials
      admin.initializeApp();
    }
  }
  return { db: admin.firestore() };
}

async function scanForDepartment() {
  const { db } = getFirebaseAdmin();
  
  // The string to search for, converted to lower case for case-insensitive matching
  const searchString = "peñaloza"; 
  const alternativeSearchString = "pealoza";

  try {
    console.log(`Iniciando escaneo de todos los participantes...`);
    console.log(`Buscando departamento que contenga: '${searchString}' o '${alternativeSearchString}'`);

    const participantsRef = db.collection('participants');
    const querySnapshot = await participantsRef.get();

    if (querySnapshot.empty) {
      console.log('La colección de participantes está vacía.');
      return;
    }

    let foundParticipants = [];

    querySnapshot.forEach(doc => {
        const participantData = doc.data();
        const department = participantData.departamento;
        
        // Check if department exists and includes the search string (case-insensitive)
        if (department && (department.toLowerCase().includes(searchString) || department.toLowerCase().includes(alternativeSearchString))) {
            foundParticipants.push({ id: doc.id, ...participantData });
        }
    });

    if (foundParticipants.length === 0) {
      console.log('------------------------------------------------------------------');
      console.log(`RESULTADO: No se encontró NINGÚN participante cuyo departamento contenga "${searchString}" o "${alternativeSearchString}".`);
      console.log('------------------------------------------------------------------');
      return;
    }

    console.log('------------------------------------------------------------------');
    console.log(`¡PARTICIPANTES ENCONTRADOS! Se encontraron ${foundParticipants.length} registro(s) que coinciden con la búsqueda:`);
    console.log('------------------------------------------------------------------');
    
    foundParticipants.forEach(participant => {
        console.log(`ID del Documento: ${participant.id}`);
        console.log(JSON.stringify(participant, null, 2));
        console.log('---');
    });

  } catch (error) {
    console.error('Ocurrió un error durante el escaneo de participantes:', error);
    process.exit(1);
  }
}

scanForDepartment();
