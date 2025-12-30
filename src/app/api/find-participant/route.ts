
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';

export async function GET() {
    try {
        const { firestore } = getFirebaseAdmin();
        const participantsRef = firestore.collection('participants');
        const snapshot = await participantsRef.get();

        if (snapshot.empty) {
            return NextResponse.json({ message: "La colección 'participants' está vacía." });
        }

        const targetDNI = "38222143"; // DNI proporcionado por el usuario
        let participantData = null;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // --- CORREGIDO: Buscando por DNI --- 
            const participantDNI = data.dni ? String(data.dni).trim() : "";
            if (participantDNI === targetDNI) {
                participantData = { id: doc.id, ...data };
            }
        });

        if (!participantData) {
            return NextResponse.json({ message: `No se encontró a ningún participante con el DNI '${targetDNI}'.` }, { status: 404 });
        }

        return NextResponse.json({ message: "Participante encontrado por DNI.", data: participantData });

    } catch (error: any) {
        console.error('[ERROR FIND PARTICIPANT BY DNI]', error);
        return NextResponse.json({ message: `Error en el servidor durante la búsqueda por DNI: ${error.message}` }, { status: 500 });
    }
}
