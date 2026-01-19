
import * as admin from 'firebase-admin';

// --- CONFIGURACIÓN ---
const MES_LIQUIDACION = "10"; // Octubre
const ANO_LIQUIDACION = "2025";
const PROGRAMA = "Tecnoempleo";

// --- INICIALIZACIÓN DE FIREBASE ---
let firestore: admin.firestore.Firestore;
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
  });
  firestore = admin.firestore();
  console.log('✅ Conexión con Firebase Admin establecida.');
} catch (error: any) {
  if (error.code !== 'app/duplicate-app') {
    console.error('❌ Error al inicializar Firebase Admin:', error.message);
    process.exit(1);
  } else {
    firestore = admin.app().firestore();
    console.log('✅ Conexión con Firebase Admin reutilizada.');
  }
}

/**
 * Script para encontrar el ID de un lote de pago específico en la colección paymentHistory.
 */
async function findPaymentBatchId() {
  console.log(`--- BUSCANDO EL ID DEL LOTE DE PAGO ---`);
  console.log(`Programa: ${PROGRAMA}`);
  console.log(`Período: ${MES_LIQUIDACION}/${ANO_LIQUIDACION}`);

  const historyRef = firestore.collection('paymentHistory');

  try {
    const query = historyRef
      .where('programa', '==', PROGRAMA)
      .where('mesLiquidacion', '==', MES_LIQUIDACION)
      .where('anoLiquidacion', '==', ANO_LIQUIDACION);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('\n❌ No se encontró ningún lote de pago que coincida con los criterios.');
      console.log('Es posible que ya haya sido eliminado o que los parámetros de búsqueda sean incorrectos.');
      console.log('--- BÚSQUEDA FINALIZADA ---');
      return;
    }

    if (snapshot.size > 1) {
        console.warn('\n⚠️ ADVERTENCIA: Se encontraron múltiples lotes de pago para el mismo período y programa.');
        console.log('Se mostrarán todos los IDs encontrados. Es probable que solo necesites el más reciente.');
    }

    console.log('\n🎉 ¡Lote(s) de pago encontrado(s)!\n');
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ID del Lote: ${doc.id}`);
        console.log(`    - Fecha de Carga: ${data.uploadedAt.toDate().toLocaleString('es-AR')}`);
        console.log(`    - Subido por: ${data.uploadedBy}`);
        console.log(`    - Cantidad de Pagos: ${data.cantidadPagos}`);
        console.log('---');
    });
    console.log('\nUtiliza este ID en la interfaz de la aplicación o para llamar a la API de reversión.');
    console.log('--- BÚSQUEDA FINALIZADA ---');

  } catch (error: any) {
    console.error('\n❌ ERROR CRÍTICO DURANTE LA BÚSQUEDA:', error);
    console.log('--- SCRIPT INTERRUMPIDO POR ERROR ---');
    process.exit(1);
  }
}

// Ejecutar la función principal
findPaymentBatchId();
