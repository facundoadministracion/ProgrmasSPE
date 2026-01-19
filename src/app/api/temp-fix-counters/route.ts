
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase-admin';

export async function POST() {
    const { db } = getFirebaseAdmin();

    try {
        console.log('Iniciando corrección de contadores por programa...');

        // 1. Fetch all participants and map them by ID
        const participantsRef = db.collection('participants');
        const participantsSnapshot = await participantsRef.get();
        const participantsMap = new Map();
        participantsSnapshot.forEach(doc => {
            participantsMap.set(doc.id, doc.data());
        });

        // 2. Fetch all payments
        const pagosRef = db.collection('pagosRegistrados');
        const pagosSnapshot = await pagosRef.get();

        // 3. Calculate correct counts for each participant and program
        const correctCountsByParticipant = new Map<string, { [program: string]: number }>();
        pagosSnapshot.forEach(pagoDoc => {
            const pago = pagoDoc.data();
            if (pago.participantId && pago.programa) {
                const program = pago.programa;
                const currentCounts = correctCountsByParticipant.get(pago.participantId) || {};
                currentCounts[program] = (currentCounts[program] || 0) + 1;
                correctCountsByParticipant.set(pago.participantId, currentCounts);
            }
        });

        // 4. Compare with stored data and batch update if necessary
        const batch = db.batch();
        let updatesNeeded = 0;

        const areObjectsEqual = (obj1: any, obj2: any) => {
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

        // 5. Commit batch and provide feedback
        if (updatesNeeded > 0) {
            await batch.commit();
            console.log(`¡Corrección Completada! Se han actualizado los contadores por programa de ${updatesNeeded} participante(s).`);
            return NextResponse.json({ message: `¡Corrección Completada! Se han actualizado los contadores por programa de ${updatesNeeded} participante(s).` });
        } else {
            console.log('Diagnóstico Finalizado. Todos los contadores por programa ya estaban sincronizados.');
            return NextResponse.json({ message: 'Diagnóstico Finalizado. Todos los contadores por programa ya estaban sincronizados.' });
        }

    } catch (error) {
        console.error('Error al corregir los pagos por programa:', error);
        return NextResponse.json({ message: 'Ocurrió un error inesperado. Revisa la consola.' }, { status: 500 });
    }
}
