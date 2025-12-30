
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';

export async function POST() {
    try {
        const { firestore } = getFirebaseAdmin();
        const batch = firestore.batch();

        const historyRef = firestore.collection('paymentHistory');
        const snapshot = await historyRef.get(); // Get ALL documents

        if (snapshot.empty) {
            return NextResponse.json({ message: "La colección 'paymentHistory' está vacía." });
        }

        const docsToDelete: { id: string, data: any }[] = [];
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Flexible check, trimming strings and converting to numbers
            const programName = data.programa ? String(data.programa).trim() : '';
            const month = data.mesLiquidacion ? Number(data.mesLiquidacion) : -1;
            const year = data.anoLiquidacion ? Number(data.anoLiquidacion) : -1;

            if (programName === 'Tutorías' && month === 11 && year === 2025) {
                docsToDelete.push({ id: doc.id, data: data });
                batch.delete(doc.ref);
            }
        });

        if (docsToDelete.length === 0) {
            return NextResponse.json({ 
                message: "Análisis completo. No se encontró ningún documento coincidente en 'paymentHistory' para eliminar.",
                totalDocsScanned: snapshot.size
            });
        }

        await batch.commit();

        return NextResponse.json({ 
            message: `Limpieza completada. Se eliminaron ${docsToDelete.length} registros problemáticos.`,
            deletedDocs: docsToDelete.map(d => d.id)
        });

    } catch (error: any) {
        console.error('[ERROR FLEXIBLE CLEANUP]', error);
        return NextResponse.json({ message: `Error en el servidor durante la limpieza flexible: ${error.message}` }, { status: 500 });
    }
}
