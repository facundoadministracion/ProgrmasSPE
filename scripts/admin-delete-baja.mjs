
import admin from 'firebase-admin';
import { createInterface } from 'readline';

// --- CONFIGURACIÓN DEL SCRIPT ---
const DNI_TO_DELETE = '39906437';
const SERVICE_ACCOUNT_PATH = '../serviceAccountKey.json'; // CAMBIA ESTO por la ruta a tu archivo de credenciales
const PROJECT_ID = 'programas-de-empleo-lr'; // Asegúrate que este es tu ID de proyecto
// --------------------------------

// Carga las credenciales de la cuenta de servicio
let serviceAccount;
try {
  serviceAccount = await import(SERVICE_ACCOUNT_PATH, { assert: { type: 'json' } });
} catch (e) {
  console.error(`Error: No se pudo encontrar el archivo de credenciales en la ruta: ${SERVICE_ACCOUNT_PATH}`);
  console.error('Por favor, descarga el archivo JSON de la cuenta de servicio desde la consola de Firebase y colócalo en la ruta correcta.');
  process.exit(1);
}

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount.default),
  projectId: PROJECT_ID,
});

const db = admin.firestore();
const rl = createInterface({ input: process.stdin, output: process.stdout });

async function deleteBajaNovedadByDni() {
  console.log(`Iniciando búsqueda de participante con DNI: ${DNI_TO_DELETE}`);

  const participantsRef = db.collection('participants');
  const qParticipant = participantsRef.where('dni', '==', DNI_TO_DELETE);
  const participantSnapshot = await qParticipant.get();

  if (participantSnapshot.empty) {
    console.log(`No se encontró ningún participante con el DNI ${DNI_TO_DELETE}.`);
    return;
  }

  const participantDoc = participantSnapshot.docs[0];
  const participantId = participantDoc.id;
  console.log(`Participante encontrado: ${participantDoc.data().name} (ID: ${participantId})`);

  const novedadesRef = db.collection('novedades');
  const qNovedades = novedadesRef.where('participantId', '==', participantId).where('type', '==', 'BAJA_DEFINITIVA');
  const novedadesSnapshot = await qNovedades.get();

  if (novedadesSnapshot.empty) {
    console.log(`No se encontraron registros de BAJA para el participante.`);
    return;
  }
  
  console.log(`Se encontraron ${novedadesSnapshot.size} registro(s) de baja para este participante.`);
  novedadesSnapshot.docs.forEach(doc => {
      console.log(`  - ID de la novedad a eliminar: ${doc.id}`);
  });

  rl.question('\n¿Estás seguro de que quieres eliminar estos registros de forma permanente? (s/n) ', async (answer) => {
    if (answer.toLowerCase() === 's') {
      const batch = db.batch();
      novedadesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      try {
        await batch.commit();
        console.log(`\n¡Éxito! Se eliminaron ${novedadesSnapshot.size} registro(s) de baja.`);
      } catch (error) {
        console.error('Error al intentar eliminar los registros:', error);
      }
    } else {
      console.log('Operación cancelada por el usuario.');
    }
    rl.close();
  });
}

deleteBajaNovedadByDni().catch(e => {
  console.error('Ocurrió un error inesperado:', e);
  rl.close();
});
