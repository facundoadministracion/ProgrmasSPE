
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

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
  console.error('Error: Debes completar la configuración de Firebase en scripts/fix-pagos-acumulados.mjs antes de ejecutarlo.');
  process.exit(1);
}

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixPagosAcumulados() {
  const participantsCollection = collection(db, 'participants');
  const paymentsCollection = collection(db, 'payments');

  const participantsSnapshot = await getDocs(participantsCollection);
  const paymentsSnapshot = await getDocs(paymentsCollection);

  const paymentsByParticipant = {};

  paymentsSnapshot.docs.forEach(doc => {
    const payment = doc.data();
    if (!paymentsByParticipant[payment.participantId]) {
      paymentsByParticipant[payment.participantId] = [];
    }
    paymentsByParticipant[payment.participantId].push(payment);
  });

  const batch = writeBatch(db);

  participantsSnapshot.docs.forEach(doc => {
    const participant = doc.data();
    const participantId = doc.id;
    const paymentCount = paymentsByParticipant[participantId] ? paymentsByParticipant[participantId].length : 0;

    if (participant.pagosAcumulados !== paymentCount) {
      console.log(`Fixing participant ${participantId}: from ${participant.pagosAcumulados} to ${paymentCount}`);
      const participantRef = doc.ref;
      batch.update(participantRef, { pagosAcumulados: paymentCount });
    }
  });

  try {
    await batch.commit();
    console.log('¡El contador de pagos acumulados ha sido corregido con éxito!');
  } catch (error) {
    console.error('Error al corregir el contador de pagos acumulados:', error);
  }
}

fixPagosAcumulados().then(() => {
  // Cierra la conexión o el proceso si es necesario.
  // En un script simple, el proceso terminará automáticamente.
}).catch(e => {
    console.error(e)
});
