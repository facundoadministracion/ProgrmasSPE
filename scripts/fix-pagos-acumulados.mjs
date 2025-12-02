
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

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
