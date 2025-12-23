
// scripts/revert-payment-batch.mjs
import admin from 'firebase-admin';
import { createRequire } from 'module';

// --- INITIALIZATION ---
const require = createRequire(import.meta.url);
const serviceAccount = require('../serviceAccountKey.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
// --- END INITIALIZATION ---

const getMonthNumber = (monthName) => {
    const months = {
        'enero': '1', 'febrero': '2', 'marzo': '3', 'abril': '4', 'mayo': '5', 'junio': '6',
        'julio': '7', 'agosto': '8', 'septiembre': '9', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    return months[monthName.toLowerCase().trim()] || '0';
};

async function revertPaymentBatch(programa, anio, mesNombre) {
    console.log('--- Iniciando Reversión de Carga de Pagos ---');
    console.log(`- Programa: ${programa}`);
    console.log(`- Año: ${anio}`);
    console.log(`- Mes: ${mesNombre}`);

    const mesStr = getMonthNumber(mesNombre);
    if (mesStr === '0') {
        console.error(`Error: El nombre del mes '${mesNombre}' no es válido.`);
        return;
    }

    const anioStr = String(anio);
    const mesNumero = parseInt(mesStr, 10);

    let revertedPayments = 0;
    let revertedHistory = 0;
    let revertedNovedades = 0;

    try {
        await db.runTransaction(async (transaction) => {
            // Definir todas las consultas de LECTURA primero
            const paymentsQuery = db.collection('pagosRegistrados')
                .where('programa', '==', programa)
                .where('mes', '==', mesNumero)
                .where('anio', '==', parseInt(anioStr, 10));

            const novedadesQuery = db.collection('novedades')
                .where('programa', '==', programa)
                .where('anoEvento', '==', anioStr)
                .where('mesEvento', '==', String(mesNumero));

            const historyQuery = db.collection('paymentHistory')
                .where('programa', '==', programa)
                .where('anoLiquidacion', '==', anioStr)
                .where('mesLiquidacion', '==', String(mesNumero));

            // Ejecutar todas las LECTURAS
            const paymentsSnapshot = await transaction.get(paymentsQuery);
            const novedadesSnapshot = await transaction.get(novedadesQuery);
            const historySnapshot = await transaction.get(historyQuery);

            // Ahora, ejecutar todas las ESCRITURAS (borrados)
            revertedPayments = paymentsSnapshot.size;
            paymentsSnapshot.forEach(doc => transaction.delete(doc.ref));

            revertedNovedades = novedadesSnapshot.size;
            novedadesSnapshot.forEach(doc => transaction.delete(doc.ref));

            revertedHistory = historySnapshot.size;
            historySnapshot.forEach(doc => transaction.delete(doc.ref));
        });

        console.log('\n--- Transacción completada ---');
        console.log(`\nResultados de la reversión para ${programa} ${mesNombre} ${anio}:`);
        console.log(`- Registros de pago eliminados: ${revertedPayments}`);
        console.log(`- Registros de historial eliminados: ${revertedHistory}`);
        console.log(`- Novedades eliminadas: ${revertedNovedades}`);
        console.log('\n¡Reversión completada con éxito!');

    } catch (error) {
        console.error('\n--- Error Crítico durante la Transacción ---');
        console.error('La operación de reversión falló.');
        console.error('Mensaje de error:', error.message);
    }
}

// --- Bloque de ejecución principal ---
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.error('Error: Se requieren 3 argumentos: programa, año y mes.');
  console.error('Ejemplo: node scripts/revert-payment-batch.mjs Tutorias 2025 Septiembre');
  process.exit(1);
}

const [programa, anio, mesNombre] = args;
revertPaymentBatch(programa, anio, mesNombre);

