
const admin = require('firebase-admin');

function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (e) {
      console.log('Initializing admin app with default Google Application Credentials');
      admin.initializeApp();
    }
  }
  return { db: admin.firestore() };
}

async function fixCounters() {
    const { db } = getFirebaseAdmin();
    try {
        console.log('Iniciando corrección de contadores por programa...');

        const participantsRef = db.collection('participants');
        const participantsSnapshot = await participantsRef.get();
        
        const pagosRef = db.collection('pagosRegistrados');
        const pagosSnapshot = await pagosRef.get();

        const correctCountsByParticipant = new Map();
        pagosSnapshot.forEach(pagoDoc => {
            const pago = pagoDoc.data();
            if (pago.participantId && pago.programa) {
                const program = pago.programa;
                const currentCounts = correctCountsByParticipant.get(pago.participantId) || {};
                currentCounts[program] = (currentCounts[program] || 0) + 1;
                correctCountsByParticipant.set(pago.participantId, currentCounts);
            }
        });

        const batch = db.batch();
        let updatesNeeded = 0;

        const areObjectsEqual = (obj1, obj2) => {
            const o1 = obj1 || {};
            const o2 = obj2 || {};
            const keys1 = Object.keys(o1);
            const keys2 = Object.keys(o2);
            if (keys1.length !== keys2.length) return false;
            for (const key of keys1) {
                if (!o2.hasOwnProperty(key) || o1[key] !== o2[key]) {
                    return false;
                }
            }
            return true;
        };

        participantsSnapshot.forEach(doc => {
            const participantId = doc.id;
            const participantData = doc.data();
            const storedCounts = participantData.pagosPorPrograma;
            const correctCounts = correctCountsByParticipant.get(participantId);

            if (!areObjectsEqual(storedCounts, correctCounts)) {
                batch.update(doc.ref, { pagosPorPrograma: correctCounts || {} });
                updatesNeeded++;
            }
        });

        if (updatesNeeded > 0) {
            await batch.commit();
            console.log(`¡Corrección Completada! Se han actualizado los contadores por programa de ${updatesNeeded} participante(s).`);
        } else {
            console.log('Diagnóstico Finalizado. Todos los contadores por programa ya estaban sincronizados.');
        }
    } catch (error) {
        console.error('Error al corregir los pagos por programa:', error);
        process.exit(1);
    }
}

fixCounters();
