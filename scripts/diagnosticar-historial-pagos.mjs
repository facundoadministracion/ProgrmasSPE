
import admin from 'firebase-admin';

// --- CONFIGURACIÓN ---
const PROGRAMA_A_DIAGNOSTICAR = 'Tutorias'; // CORREGIDO
const SERVICE_ACCOUNT_PATH = '../serviceAccountKey.json';
const PROJECT_ID = 'programas-de-empleo-lr';
// ---------------------

async function main() {
    // Carga las credenciales
    let serviceAccount;
    try {
        serviceAccount = await import(SERVICE_ACCOUNT_PATH, { assert: { type: 'json' } });
    } catch (e) {
        console.error(`Error: No se pudo encontrar el archivo de credenciales en la ruta: ${SERVICE_ACCOUNT_PATH}`);
        process.exit(1);
    }

    // Inicializa Firebase Admin SDK, solo si no existe una app inicializada
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount.default),
            projectId: PROJECT_ID,
        });
        console.log('Firebase Admin SDK inicializado.');
    } else {
        console.log('Firebase Admin SDK ya estaba inicializado.');
    }

    const db = admin.firestore();

    console.log(`\nRealizando diagnóstico en 'paymentHistory' para el programa "${PROGRAMA_A_DIAGNOSTICAR}"...`);
    console.log('Se buscarán los 5 registros más recientes ordenados por fecha de carga.');

    const historyRef = db.collection('paymentHistory');
    const q = historyRef
        .where('programa', '==', PROGRAMA_A_DIAGNOSTICAR)
        .orderBy('uploadedAt', 'desc')
        .limit(5);

    try {
        const snapshot = await q.get();

        if (snapshot.empty) {
            console.log('\nRESULTADO: No se encontró ningún registro en el historial de pagos para este programa.');
            return;
        }

        console.log(`\nRESULTADO: Se encontraron ${snapshot.size} registro(s). Aquí están los datos:`);
        console.log('==================================================');

        snapshot.docs.forEach((doc, index) => {
            console.log(`\n--- DOCUMENTO ${index + 1} (ID: ${doc.id}) ---`);
            const data = doc.data();
            // Convertir Timestamp a fecha legible si existe
            if (data.uploadedAt && typeof data.uploadedAt.toDate === 'function') {
                data.uploadedAt = data.uploadedAt.toDate().toISOString();
            }
            console.log('Contenido:', JSON.stringify(data, null, 2)); // Pretty print
            console.log(`\n  >> Tipos de datos detectados:`);
            console.log(`     - mesLiquidacion: ${typeof data.mesLiquidacion}`);
            console.log(`     - anoLiquidacion: ${typeof data.anoLiquidacion}`);
            console.log('--------------------------------------------------');
        });
        console.log('==================================================');

    } catch (error) {
        console.error('\nError al ejecutar la consulta:', error);
    }
}

main().catch(e => {
    console.error('Ocurrió un error inesperado durante la ejecución:', e);
});
