
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';

export async function POST() {
    try {
        const { firestore } = getFirebaseAdmin();
        const participantsRef = firestore.collection('participants');
        
        // --- Búsqueda optimizada por programa ---
        const querySnapshot = await participantsRef.where('programa', '==', 'Tutorias').get();

        if (querySnapshot.empty) {
            return NextResponse.json({ message: "No se encontraron participantes en el programa 'Tutorias'." });
        }

        const batch = firestore.batch();
        let updatedCount = 0;
        const currentYear = new Date().getFullYear();

        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            let needsUpdate = false;
            const updates: { [key: string]: any } = {};

            const checkAndFixField = (fieldName: string) => {
                if (data[fieldName] && typeof data[fieldName] === 'string') {
                    const parts = data[fieldName].split('/');
                    if (parts.length === 2) {
                        const year = parseInt(parts[1], 10);
                        if (!isNaN(year) && year > currentYear) {
                            updates[fieldName] = "";
                            needsUpdate = true;
                        }
                    }
                }
            };

            checkAndFixField('ultimoPago');
            checkAndFixField('mesAusencia');

            if (needsUpdate) {
                const partRef = participantsRef.doc(doc.id);
                batch.update(partRef, updates);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            return NextResponse.json({ message: `Se limpiaron las fechas anómalas de ${updatedCount} participantes en el programa 'Tutorias'.` });
        } else {
            return NextResponse.json({ message: "No se encontraron participantes con fechas anómalas en el programa 'Tutorias'." });
        }

    } catch (error: any) {
        console.error('[ERROR CLEANUP BY PROGRAM]', error);
        return NextResponse.json({ message: `Error durante la limpieza por programa: ${error.message}` }, { status: 500 });
    }
}
