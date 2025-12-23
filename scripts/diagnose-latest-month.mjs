
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const adminModule = require('../dist_scripts/src/firebase-admin.js');

// CORRECTED: Access the database instance from the nested 'default' export.
const db = adminModule.default.db;

const diagnoseProgram = async (programName) => {
  if (!programName) {
    console.error('ERROR: Debes proporcionar un nombre de programa. Ej: node scripts/diagnose-latest-month.mjs "Tutorias"');
    process.exit(1);
  }
  if (!db) {
      console.error('ERROR: No se pudo inicializar la conexión con la base de datos. El objeto db es undefined.');
      console.error('El módulo importado es:', adminModule);
      process.exit(1);
  }

  console.log(`
--- Diagnosticando el programa: "${programName}" ---`);

  try {
    // 1. Diagnosticar 'pagosRegistrados' (datos crudos)
    const pagosSnapshot = await db.collection('pagosRegistrados')
      .where('programa', '==', programName)
      .orderBy('anio', 'desc')
      .orderBy('mes', 'desc')
      .limit(1)
      .get();

    if (pagosSnapshot.empty) {
      console.log(`[PAGOS CRUDOS]: No se encontraron registros en 'pagosRegistrados' para ${programName}.`);
    } else {
      const latestPago = pagosSnapshot.docs[0].data();
      const mesNombre = new Date(2000, latestPago.mes - 1, 1).toLocaleString('es-AR', { month: 'long' });
      console.log(`[PAGOS CRUDOS]: El último pago registrado es de: ${mesNombre} de ${latestPago.anio}.`);
    }

    // 2. Diagnosticar 'paymentHistory' (datos de resumen para el dashboard)
    const historySnapshot = await db.collection('paymentHistory')
      .where('programa', '==', programName)
      .orderBy('anoLiquidacion', 'desc')
      .orderBy('mesLiquidacion', 'desc')
      .limit(1)
      .get();

    if (historySnapshot.empty) {
      console.log(`[RESUMEN DASHBOARD]: No se encontraron registros en 'paymentHistory' para ${programName}.`);
    } else {
      const latestHistory = historySnapshot.docs[0].data();
      const mesNombre = new Date(2000, latestHistory.mesLiquidacion - 1, 1).toLocaleString('es-AR', { month: 'long' });
      console.log(`[RESUMEN DASHBOARD]: El último resumen para el dashboard es de: ${mesNombre} de ${latestHistory.anoLiquidacion}.`);
    }

    console.log(`
--- Diagnóstico Finalizado ---`);
    console.log('Si las fechas no coinciden, el problema es que los datos de resumen no se están generando/actualizando correctamente para los últimos meses.');

  } catch (error) {
    console.error('Ocurrió un error durante el diagnóstico:', error);
    console.log('Esto puede deberse a un índice faltante en Firestore. Revisa la consola de Firebase.');
  }
};

const programToRun = process.argv[2];
diagnoseProgram(programToRun);
