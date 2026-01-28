const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// --- Inicialización Segura de Firebase Admin ---
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const firestore = admin.firestore();

const diagnose = async () => {
    console.log('--- Iniciando diagnóstico de DNI ---');

    try {
        // 1. Obtener un pago de ejemplo
        console.log('\n[Paso 1] Obteniendo un documento de "pagosRegistrados"...');
        const paymentQuery = firestore.collection('pagosRegistrados')
            .where('mes', '==', '12')
            .where('anio', '==', '2025')
            .limit(1);
        const paymentSnapshot = await paymentQuery.get();

        if (paymentSnapshot.empty) {
            console.log('!! No se encontró ningún pago de ejemplo para 12/2025. No se puede continuar.');
            return;
        }
        const paymentDoc = paymentSnapshot.docs[0];
        const paymentData = paymentDoc.data();
        console.log('>> Documento de pago encontrado:');
        console.log(paymentData);
        console.log(`>> TIPO de DNI en pago: ${typeof paymentData.dni}`);
        const sampleDni = paymentData.dni;

        // 2. Intentar encontrar un participante con ese DNI
        console.log(`\n[Paso 2] Buscando un participante con el DNI de muestra: ${sampleDni}`);
        const participantQuery = firestore.collection('participantes').where('dni', '==', sampleDni);
        const participantSnapshot = await participantQuery.get();
        
        if (participantSnapshot.empty) {
             console.log('!! NO SE ENCONTRÓ un participante con ese DNI exacto.');
             console.log('>> Intentando buscar un participante cualquiera para comparar estructuras...');
             const anyParticipantQuery = firestore.collection('participantes').limit(1);
             const anyParticipantSnapshot = await anyParticipantQuery.get();
             if (anyParticipantSnapshot.empty) {
                 console.log('!!! No se encontraron participantes en la colección "participantes".');
             } else {
                const participantDoc = anyParticipantSnapshot.docs[0];
                const participantData = participantDoc.data();
                console.log('>> Documento de participante de muestra (aleatorio):');
                console.log(participantData);
                console.log(`>> TIPO de DNI en participante: ${typeof participantData.dni}`);
             }
        } else {
            console.log('>> ¡ÉXITO! Se encontró un participante coincidente:');
            const participantDoc = participantSnapshot.docs[0];
            const participantData = participantDoc.data();
            console.log(participantData);
            console.log(`>> TIPO de DNI en participante: ${typeof participantData.dni}`);
        }

    } catch (error) {
        console.error('\n!! Ocurrió un error durante el diagnóstico:', error);
    }
    console.log('\n--- Diagnóstico Finalizado ---');
};

diagnose();
