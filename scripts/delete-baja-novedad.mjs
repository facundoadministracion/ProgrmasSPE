
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

// ADVERTENCIA DE SEGURIDAD:
// Rellena esta configuración con tus credenciales de Firebase para ejecutar el script.
// NO subas este archivo con las credenciales al repositorio de código.
const firebaseConfig = {
  apiKey: "AIzaSyAIAoyr8-zy0_TpU3jvXZ52e3Rfza_ViCc",
  authDomain: "programas-de-empleo-lr.firebaseapp.com",
  projectId: "programas-de-empleo-lr",
  storageBucket: "programas-de-empleo-lr.firebasestorage.app",
  messagingSenderId: "193300807292",
  appId: "1:193300807292:web:02fb904b08c8fe045cd3f9",
};

// --- CONFIGURACIÓN DEL SCRIPT ---
const DNI_TO_DELETE = '39906437';
// --------------------------------

if (firebaseConfig.apiKey === "TU_API_KEY") {
  console.error('Error: Debes completar la configuración de Firebase en este script antes de ejecutarlo.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteBajaNovedadByDni() {
  console.log(`Iniciando búsqueda de participante con DNI: ${DNI_TO_DELETE}`);

  // 1. Encontrar al participante por su DNI para obtener su ID de documento
  const participantsRef = collection(db, 'participants');
  const qParticipant = query(participantsRef, where('dni', '==', DNI_TO_DELETE));
  const participantSnapshot = await getDocs(qParticipant);

  if (participantSnapshot.empty) {
    console.log(`No se encontró ningún participante con el DNI ${DNI_TO_DELETE}.`);
    return;
  }

  const participantIds = participantSnapshot.docs.map(doc => doc.id);
  console.log(`Participante(s) encontrado(s) con ID(s): ${participantIds.join(', ')}`);

  // 2. Buscar y eliminar las novedades de baja para ese/os ID(s)
  const novedadesRef = collection(db, 'novedades');
  const qNovedades = query(novedadesRef, where('participantId', 'in', participantIds), where('type', '==', 'BAJA_DEFINITIVA'));
  const novedadesSnapshot = await getDocs(qNovedades);

  if (novedadesSnapshot.empty) {
    console.log(`No se encontraron registros de BAJA para el participante con DNI ${DNI_TO_DELETE}.`);
    return;
  }

  const batch = writeBatch(db);
  novedadesSnapshot.docs.forEach(doc => {
    console.log(`- Preparando para eliminar la novedad de baja con ID: ${doc.id}`);
    batch.delete(doc.ref);
  });

  try {
    await batch.commit();
    console.log(`\n¡Éxito! Se eliminaron ${novedadesSnapshot.size} registro(s) de baja para el DNI ${DNI_TO_DELETE}.`);
  } catch (error) {
    console.error('Error al intentar eliminar los registros de baja:', error);
  }
}

deleteBajaNovedadByDni().then(() => {
  console.log('\nScript finalizado.');
}).catch(e => {
    console.error('Ocurrió un error inesperado:', e);
});
