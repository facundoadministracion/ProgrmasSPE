
const admin = require('firebase-admin');

// La configuración se toma de las variables de entorno de Firebase, que ya están configuradas en el entorno.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Error inicializando Firebase Admin en script:', e);
}


const firestore = admin.firestore();

async function findParticipantsByDepartments() {
  const departmentsToFind = ['CAPITAL', 'LA RIOJA'];
  
  try {
    const snapshot = await firestore.collection('participants')
                                    .where('departamento', 'in', departmentsToFind)
                                    .get();

    if (snapshot.empty) {
      console.log('No se encontraron participantes con los departamentos "CAPITAL" o "LA RIOJA".');
      return;
    }

    console.log('Participantes encontrados:');
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- Nombre: ${data.nombre}, Departamento: ${data.departamento}`);
    });

  } catch (error) {
    console.error('Error al buscar participantes:', error);
  }
}

findParticipantsByDepartments();
