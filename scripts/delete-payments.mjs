
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAIAoyr8-zy0_TpU3jvXZ52e3Rfza_ViCc",
  authDomain: "programas-de-empleo-lr.firebaseapp.com",
  projectId: "programas-de-empleo-lr",
  storageBucket: "programas-de-empleo-lr.appspot.com",
  messagingSenderId: "193300807292",
  appId: "1:193300807292:web:02fb904b08c8fe045cd3f9",
  measurementId: "G-XFH1Y6MKEV"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deletePaymentsByMonth(mes, anio) {
  if (!mes || !anio) {
    console.error('Error: Por favor, proporciona el mes y el año como argumentos.');
    console.error('Uso: node scripts/delete-payments.mjs <mes> <anio>');
    process.exit(1);
  }

  console.log(`Buscando pagos para eliminar del período: ${mes}/${anio}...`);

  const paymentsCollectionRef = collection(db, 'pagosRegistrados');
  // Las queries de Firestore necesitan que los valores coincidan en tipo.
  // En `PaymentUploadWizard.tsx` se guardan como string.
  const q = query(paymentsCollectionRef, where('mes', '==', String(mes)), where('anio', '==', String(anio)));
  
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log(`No se encontraron pagos registrados para ${mes}/${anio}.`);
    return;
  }

  // Firestore limita los batches a 500 operaciones.
  const batchSize = 500;
  const batches = [];
  let currentBatch = writeBatch(db);
  let operationsInBatch = 0;

  querySnapshot.docs.forEach((doc) => {
    currentBatch.delete(doc.ref);
    operationsInBatch++;
    if (operationsInBatch >= batchSize) {
      batches.push(currentBatch);
      currentBatch = writeBatch(db);
      operationsInBatch = 0;
    }
  });

  if (operationsInBatch > 0) {
    batches.push(currentBatch);
  }
  
  console.log(`Se encontraron ${querySnapshot.size} pagos. Se procederá a eliminar en ${batches.length} lote(s).`);

  try {
    await Promise.all(batches.map(batch => batch.commit()));
    console.log(`¡Éxito! Se eliminaron ${querySnapshot.size} pagos del período ${mes}/${anio}.`);
  } catch (error) {
    console.error('Error al eliminar los pagos en lotes:', error);
  }
}

// Obtener mes y año de los argumentos de la línea de comandos
const args = process.argv.slice(2);
const mes = args[0];
const anio = args[1];

deletePaymentsByMonth(mes, anio).catch(error => {
  console.error("Se produjo un error inesperado:", error);
});
