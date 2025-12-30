
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';

export async function POST() {
    try {
        const { firestore } = getFirebaseAdmin();
        
        const participantId = "5zT0ACUVG5HhnqdIcK1S"; // ID de Krol Micaela Belen
        const partRef = firestore.collection('participants').doc(participantId);

        // --- CORREGIDO: Usando la sintaxis del Admin SDK ---
        await partRef.update({
            mesAusencia: "",
            ultimoPago: ""
        });

        return NextResponse.json({ message: `Se limpiaron los campos 'mesAusencia' y 'ultimoPago' para el participante ${participantId}.` });

    } catch (error: any) {
        console.error('[ERROR CORRECT PARTICIPANT]', error);
        return NextResponse.json({ message: `Error al corregir el participante: ${error.message}` }, { status: 500 });
    }
}
