
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

async function fixLastPaymentDates() {
  const { db } = getFirebaseAdmin();
  try {
    console.log('Iniciando corrección de la fecha del último pago...');

    const participantsRef = db.collection('participants');
    const pagosRef = db.collection('pagosRegistrados');
    const participantsSnapshot = await participantsRef.get();

    const batch = db.batch();
    let updatesNeeded = 0;

    // Use a for...of loop to handle async operations inside the loop correctly.
    for (const participantDoc of participantsSnapshot.docs) {
      const participantId = participantDoc.id;
      const participantData = participantDoc.data();

      // Find all payments for the current participant
      const paymentsQuery = pagosRef.where('participantId', '==', participantId);
      const paymentsSnapshot = await paymentsQuery.get();

      if (paymentsSnapshot.empty) {
        continue;
      }

      let latestPayment = { anio: 0, mes: 0 };

      // Find the latest payment date among all payments for this participant
      paymentsSnapshot.forEach(pagoDoc => {
        const pago = pagoDoc.data();
        const anio = parseInt(pago.anio, 10);
        const mes = parseInt(pago.mes, 10);

        if (anio > latestPayment.anio) {
          latestPayment = { anio, mes };
        } else if (anio === latestPayment.anio && mes > latestPayment.mes) {
          latestPayment = { anio, mes };
        }
      });
      
      if (latestPayment.anio === 0) {
        continue;
      }

      // Format the date as YYYY-MM-DD
      const lastPaymentDate = `${latestPayment.anio}-${String(latestPayment.mes).padStart(2, '0')}-01`;
      
      // Check if an update is needed
      if (participantData.lastPaymentDate !== lastPaymentDate) {
        batch.update(participantDoc.ref, { lastPaymentDate: lastPaymentDate });
        updatesNeeded++;
      }
    }

    if (updatesNeeded > 0) {
      await batch.commit();
      console.log(`¡Corrección Completada! Se ha actualizado la fecha del último pago para ${updatesNeeded} participante(s).`);
    } else {
      console.log('Diagnóstico Finalizado. Todas las fechas de último pago ya estaban sincronizadas.');
    }

  } catch (error) {
    console.error('Error al corregir las fechas de último pago:', error);
    process.exit(1);
  }
}

fixLastPaymentDates();
