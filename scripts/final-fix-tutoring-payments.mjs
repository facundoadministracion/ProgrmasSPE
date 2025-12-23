
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

// --- Configuration ---
const MONTH_TO_FIX = '10';       // Month as a STRING, per frontend code
const YEAR_TO_FIX = '2025';        // Year as a STRING, per frontend code
const PROGRAM_TO_FIX = 'Tutorías';
const INCORRECT_CATEGORY = 'MONTO NO COINCIDE';
// --- End Configuration ---

const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Helper to find the right configuration for a given date
function findConfigForDate(configs, mes, ano) {
    const targetDateValue = parseInt(ano) * 100 + parseInt(mes);
    const sortedConfigs = configs.sort((a, b) => {
        const dateA = a.anoVigencia * 100 + a.mesVigencia;
        const dateB = b.anoVigencia * 100 + b.mesVigencia;
        return dateB - dateA; // Sort descending
    });
    return sortedConfigs.find(c => (c.anoVigencia * 100 + c.mesVigencia) <= targetDateValue) || null;
}

async function finalFixTutoringPayments() {
  console.log(`Iniciando corrección FINAL de pagos para ${PROGRAM_TO_FIX} del mes ${MONTH_TO_FIX}/${YEAR_TO_FIX}.`);

  // 1. Fetch all configurations
  console.log('Obteniendo configuraciones de montos...');
  const configSnapshot = await db.collection('configuracionMontos').get();
  if (configSnapshot.empty) {
    console.error('Error: No se encontraron configuraciones de montos. No se puede continuar.');
    return;
  }
  const allConfigs = configSnapshot.docs.map(doc => doc.data());

  // 2. Find the correct configuration for the target month and year
  const activeConfig = findConfigForDate(allConfigs, MONTH_TO_FIX, YEAR_TO_FIX);
  if (!activeConfig || !activeConfig.montos) {
    console.error(`Error: No se encontró una configuración de montos válida para ${MONTH_TO_FIX}/${YEAR_TO_FIX}.`);
    return;
  }
  console.log(`Configuración encontrada para la fecha: Acto ${activeConfig.actoAdministrativo}`);
  const correctAmounts = activeConfig.montos;

  // 3. Find all incorrect payments using STRING values for month and year
  console.log(`Buscando pagos con categoría "${INCORRECT_CATEGORY}" usando MES y AÑO como STRING...`);
  const paymentsQuery = db.collection('pagosRegistrados')
    .where('programa', '==', PROGRAM_TO_FIX)
    .where('mes', '==', MONTH_TO_FIX)       // CRITICAL: Use string
    .where('anio', '==', YEAR_TO_FIX)      // CRITICAL: Use string
    .where('categoria', '==', INCORRECT_CATEGORY);

  const paymentsSnapshot = await paymentsQuery.get();
  if (paymentsSnapshot.empty) {
    console.log('No se encontraron pagos con la categoría incorrecta bajo las condiciones exactas. El trabajo podría estar ya hecho o los datos son diferentes a lo esperado.');
    return;
  }

  console.log(`¡Éxito! Se encontraron ${paymentsSnapshot.size} pagos para corregir.`);
  
  // 4. Get all unique participant IDs from the incorrect payments
  const participantIds = [...new Set(paymentsSnapshot.docs.map(doc => doc.data().participantId))];

  // 5. Fetch the participants to find their real category
  console.log('Obteniendo la categoría real de los participantes...');
  const participantsMap = new Map();
  // Firestore 'in' query limit is 30
  const participantChunks = [];
  for (let i = 0; i < participantIds.length; i += 30) {
      participantChunks.push(participantIds.slice(i, i + 30));
  }

  for (const chunk of participantChunks) {
      const participantsQuery = db.collection('participants').where('__name__', 'in', chunk);
      const participantsSnapshot = await participantsQuery.get();
      participantsSnapshot.forEach(doc => {
          participantsMap.set(doc.id, doc.data());
      });
  }
  
  // 6. Prepare and execute batch update
  console.log('Preparando la actualización en lote...');
  const batch = db.batch();
  let correctedCount = 0;
  let skippedCount = 0;

  paymentsSnapshot.forEach(doc => {
    const payment = doc.data();
    const participant = participantsMap.get(payment.participantId);

    if (participant && participant.categoria && correctAmounts[participant.categoria]) {
      const newCategory = participant.categoria;
      const newAmount = correctAmounts[newCategory];
      
      batch.update(doc.ref, {
        categoria: newCategory,
        montoPagado: newAmount
      });
      correctedCount++;
    } else {
      console.warn(`No se pudo corregir el pago ${doc.id} para el participante ${payment.participantId}. Motivo: Participante no encontrado o categoría "${participant?.categoria}" no tiene un monto definido en la configuración.`);
      skippedCount++;
    }
  });

  if (correctedCount > 0) {
    await batch.commit();
    console.log(`¡ÉXITO TOTAL! Se corrigieron ${correctedCount} registros de pago.`);
  }

  if (skippedCount > 0) {
    console.log(`Se omitieron ${skippedCount} registros que no pudieron ser corregidos automáticamente.`);
  }

  console.log('Proceso de corrección finalizado.');
}

finalFixTutoringPayments().catch(console.error);
