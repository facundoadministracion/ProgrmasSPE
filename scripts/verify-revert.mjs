
// scripts/verify-revert.mjs
import admin from 'firebase-admin';
import { createRequire } from 'module';

// --- INITIALIZATION ---
// Use createRequire to import JSON files in ES module.
const require = createRequire(import.meta.url);
// Make sure the path to your service account key is correct.
const serviceAccount = require('../serviceAccountKey.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
// --- END INITIALIZATION ---

// Helper function to convert month name to month number string
const getMonthNumber = (monthName) => {
    if (!monthName) return '0';
    const months = {
        'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
        'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    return months[monthName.toLowerCase().trim()] || '0';
};


async function verifyRevert(participantId, programa, mesNombre, anio) {
  if (!participantId || !programa || !mesNombre || !anio) {
    console.error('Uso: node scripts/verify-revert.mjs <participantId> <programa> <mes> <anio>');
    console.error('Ejemplo: node scripts/verify-revert.mjs "participante-123" "Tutorias" "noviembre" 2025');
    return;
  }

  const mesNumero = parseInt(getMonthNumber(mesNombre), 10);
  const anioNumero = parseInt(anio, 10);
  const mesStr = String(mesNumero).padStart(2, '0');


  console.log(`=================================================================`);
  console.log(`Verificando estado para el participante: ${participantId}`);
  console.log(`Programa: ${programa}, Periodo: ${mesNombre} ${anio}`);
  console.log('---');

  try {
    // 1. Check for remaining payments
    const paymentsRef = db.collection('pagosRegistrados');
    const paymentQuery = paymentsRef
      .where('participantId', '==', participantId)
      .where('programa', '==', programa)
      .where('mes', '==', mesNumero)
      .where('anio', '==', anioNumero);

    const paymentSnapshot = await paymentQuery.get();

    if (paymentSnapshot.empty) {
      console.log('✅ OK: No se encontraron pagos para este período. El pago fue eliminado correctamente.');
    } else {
      console.log(`❌ ERROR: Se encontraron ${paymentSnapshot.size} pago(s) para este período. La eliminación falló.`);
      paymentSnapshot.forEach(doc => {
        console.log(`  - ID del Pago: ${doc.id}`);
      });
    }

    // 2. Check for "POSIBLE_BAJA" novelties
    const novedadesRef = db.collection('novedades');
    const noveltyQuery = novedadesRef
      .where('participantId', '==', participantId)
      .where('type', '==', 'POSIBLE_BAJA')
      .where('programa', '==', programa)
      .where('mes', '==', mesNumero) // Assuming the trigger uses 'mes'
      .where('anio', '==', anioNumero); // Assuming the trigger uses 'anio'

    const noveltySnapshot = await noveltyQuery.get();

    if (noveltySnapshot.empty) {
      console.log('✅ OK: No se encontró la novedad "POSIBLE_BAJA". ¡La corrección parece funcionar!');
    } else {
      console.log(`❌ ERROR: Se encontró ${noveltySnapshot.size} novedad(es) de "POSIBLE_BAJA" para este período.`);
      noveltySnapshot.forEach(doc => {
        console.log(`  - ID de la Novedad: ${doc.id}`);
      });
    }

    // 3. Check payment history document
    const historyDocId = `${programa}-${anio}-${mesStr}`;
    const historyDocRef = db.collection('paymentHistory').doc(historyDocId);
    const historyDoc = await historyDocRef.get();

    if (!historyDoc.exists) {
        console.log('✅ OK: El documento de historial de pagos para este lote fue eliminado correctamente.');
    } else {
        console.log(`⚠️ AVISO: El documento de historial de pagos (${historyDocId}) todavía existe. Si se revirtió el lote completo, este documento debería haberse eliminado.`);
    }


    console.log('---');
    console.log('Verificación completada.');
    console.log(`=================================================================`);


  } catch (error) {
    console.error('Ocurrió un error durante la verificación:', error);
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
verifyRevert(args[0], args[1], args[2], args[3]);
