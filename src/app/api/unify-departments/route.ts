
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';
import { DEPARTAMENTOS } from '@/lib/constants';

export async function POST(request: Request) {
    try {
        const { firestore } = getFirebaseAdmin();
        const { from, to } = await request.json();

        if (!from || !to) {
            return NextResponse.json({ message: "Los parámetros 'from' (departamento origen) y 'to' (departamento destino) son requeridos." }, { status: 400 });
        }

        if (!DEPARTAMENTOS.includes(to)) {
            return NextResponse.json({ message: `El departamento destino '${to}' no es un valor válido.` }, { status: 400 });
        }

        console.log(`Iniciando unificación de departamentos: De '${from}' a '${to}'`);

        const snapshot = await firestore.collection('participants').where('departamento', '==', from).get();

        if (snapshot.empty) {
            console.log("No se encontraron participantes para actualizar.");
            return NextResponse.json({ message: `No se encontraron participantes con el departamento '${from}'. No se realizó ninguna acción.` });
        }

        const batch = firestore.batch();
        snapshot.docs.forEach(doc => {
            const partRef = firestore.collection('participants').doc(doc.id);
            batch.update(partRef, { departamento: to });
        });

        await batch.commit();

        const count = snapshot.size;
        console.log(`Se unificaron exitosamente ${count} participantes.`);
        
        return NextResponse.json({ 
            message: `¡Éxito! Se actualizaron ${count} legajos.`,
            from,
            to,
            count
        });

    } catch (error: any) {
        console.error('[ERROR UNIFY_DEPARTMENTS]', error);
        return NextResponse.json({ message: `Error al unificar los departamentos: ${error.message}` }, { status: 500 });
    }
}
