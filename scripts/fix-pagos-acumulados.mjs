'use client';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Script de diagnóstico para verificar los pagos de un participante.
async function diagnoseParticipantPayments() {
  if (getApps().length === 0) {
    initializeApp();
  }

  const db = getFirestore();
  const participantsRef = db.collection('participants');
  const paymentsRef = db.collection('pagosRegistrados');

  console.log('--- INICIO DEL DIAGNÓSTICO DE PAGOS ---');

  // 1. Usar el primer participante que se encuentre como caso de prueba.
  const firstParticipantSnapshot = await participantsRef.limit(1).get();
  if (firstParticipantSnapshot.empty) {
    console.log('ERROR: No se encontraron participantes para realizar el diagnóstico.');
    return;
  }
  const participantDoc = firstParticipantSnapshot.docs[0];
  const participantId = participantDoc.id;
  const participantData = participantDoc.data();
  const participantName = participantData.nombre;
  const currentCountInProfile = participantData.pagosAcumulados;

  console.log(`- Participante seleccionado para el análisis: ${participantName} (ID: ${participantId})`);
  console.log(`- Valor actual de 'pagosAcumulados' en su perfil: ${currentCountInProfile}`);

  // 2. Buscar en la base de datos todos los pagos registrados para ese participante.
  const paymentsSnapshot = await paymentsRef.where('participantId', '==', participantId).get();
  const foundPayments = [];
  paymentsSnapshot.forEach(doc => {
    const payment = doc.data();
    foundPayments.push(`${payment.mes}/${payment.anio}`);
  });

  // 3. Mostrar los resultados del diagnóstico.
  console.log(`- Búsqueda en 'pagosRegistrados': Se encontraron ${paymentsSnapshot.size} registros de pago.`);
  
  if (paymentsSnapshot.size > 0) {
    console.log('- Detalle de los meses encontrados: ', foundPayments.sort().join(', '));
  }

  console.log('--- CONCLUSIÓN DEL DIAGNÓSTICO ---');
  if (currentCountInProfile === paymentsSnapshot.size) {
    console.log('El contador del perfil COINCIDE con los pagos encontrados. Si el número es incorrecto (5), el problema es que los pagos de los otros meses no están en la base de datos.');
  } else {
    console.log('¡DISCREPANCIA ENCONTRADA! El contador del perfil NO COINCIDE con los pagos reales en la base de datos. El script de corrección debería poder arreglarlo.');
  }
  console.log('--- FIN DEL DIAGNÓSTICO ---');
}

diagnoseParticipantPayments().catch(e => {
    console.error("Error crítico durante la ejecución del diagnóstico:", e);
});
