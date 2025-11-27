
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

// Copia la configuración de tu proyecto de Firebase aquí
const firebaseConfig = {
  apiKey: "AIzaSyAIAoyr8-zy0_TpU3jvXZ52e3Rfza_ViCc",
  authDomain: "programas-de-empleo-lr.firebaseapp.com",
  projectId: "programas-de-empleo-lr",
  storageBucket: "programas-de-empleo-lr.firebasestorage.app",
  messagingSenderId: "193300807292",
  appId: "1:193300807292:web:a7e93290204796e65cd3f9",
  measurementId: "G-9381S3P20H"
};

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
