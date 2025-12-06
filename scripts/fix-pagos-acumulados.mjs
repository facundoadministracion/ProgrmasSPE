'use client';

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Esta función ahora corrige los montos faltantes en el historial de pagos.
async function fixMissingPaymentAmounts() {
  // Asegúrate de que la app de Firebase no se inicialice varias veces
  if (getApps().length === 0) {
    initializeApp(); // Asume que la configuración de Admin se carga de variables de entorno
  }

  const db = getFirestore();
  console.log('Iniciando la búsqueda de historiales de pago sin monto total...');

  const historyRef = db.collection('paymentHistory');
  // Busca documentos donde el campo montoTotalLiquidado NO exista
  const snapshot = await historyRef.where('montoTotalLiquidado', '==', null).get();

  if (snapshot.empty) {
    console.log('¡Excelente! No hay historiales de pago que necesiten ser corregidos.');
    return;
  }

  const batch = db.batch();
  console.log(`Se encontraron ${snapshot.docs.length} historiales de pago para actualizar.`);

  for (const doc of snapshot.docs) {
    const historyData = doc.data();
    const { mesLiquidacion, anoLiquidacion, programa } = historyData;

    if (!mesLiquidacion || !anoLiquidacion || !programa) {
      console.log(`- Saltando historial con ID ${doc.id} por falta de datos (mes, año o programa).`);
      continue;
    }

    console.log(`- Procesando: ${programa} de ${mesLiquidacion}/${anoLiquidacion}...`);

    const paymentsRef = db.collection('pagosRegistrados');
    const paymentsSnapshot = await paymentsRef
      .where('mes', '==', mesLiquidacion)
      .where('anio', '==', anoLiquidacion)
      .where('programa', '==', programa)
      .get();

    const totalAmount = paymentsSnapshot.docs.reduce((acc, curr) => {
      return acc + (curr.data().montoPagado || 0);
    }, 0);

    console.log(`  -> Monto total calculado: ${totalAmount}. Actualizando...`);
    batch.update(doc.ref, { montoTotalLiquidado: totalAmount });
  }

  try {
    await batch.commit();
    console.log('¡Éxito! Todos los historiales de pago han sido actualizados con su monto total.');
  } catch (error) {
    console.error('Error al intentar actualizar los historiales de pago:', error);
  }
}

// Ejecuta la función de corrección
fixMissingPaymentAmounts().catch(e => {
    console.error("Se produjo un error inesperado durante la ejecución del script:", e);
});
