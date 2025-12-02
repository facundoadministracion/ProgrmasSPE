
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

// ADVERTENCIA DE SEGURIDAD:
// No almacenes la configuración de Firebase directamente en este fichero.
// Si necesitas ejecutar este script, completa la configuración de forma temporal
// y asegúrate de no subirla al repositorio de código.
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "TU_MEASUREMENT_ID"
};

// Antes de ejecutar, asegúrate de que firebaseConfig esté correctamente completado.
if (firebaseConfig.apiKey === "TU_API_KEY") {
  console.error('Error: Debes completar la configuración de Firebase en scripts/delete-payments.mjs antes de ejecutarlo.');
  process.exit(1);
}

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllPayments() {
  const paymentsCollection = collection(db, 'payments');
  const paymentsSnapshot = await getDocs(paymentsCollection);
  
  if (paymentsSnapshot.empty) {
    console.log("No se encontraron pagos para eliminar.");
    return;
  }

  const batchSize = 500;
  const batches = [];
  let currentBatch = writeBatch(db);
  let currentBatchSize = 0;

  paymentsSnapshot.docs.forEach((doc, index) => {
    currentBatch.delete(doc.ref);
    currentBatchSize++;
    if (currentBatchSize === batchSize) {
      batches.push(currentBatch);
      currentBatch = writeBatch(db);
      currentBatchSize = 0;
    }
  });

  if (currentBatchSize > 0) {
    batches.push(currentBatch);
  }

  console.log(`Eliminando ${paymentsSnapshot.size} pagos en ${batches.length} lotes...`);

  try {
    await Promise.all(batches.map(batch => batch.commit()));
    console.log('¡Todos los pagos han sido eliminados con éxito!');
  } catch (error) {
    console.error('Error al eliminar los pagos:', error);
  }
}

deleteAllPayments().then(() => {
  // Cierra la conexión o el proceso si es necesario.
  // En un script simple, el proceso terminará automáticamente.
}).catch(e => {
    console.error(e)
});
