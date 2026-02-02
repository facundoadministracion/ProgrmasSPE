
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase/admin';

export async function GET() {
  try {
    // LA CORRECCIÓN DEFINITIVA:
    // Obtenemos la propiedad `firestore` del objeto que devuelve `getFirebaseAdmin`.
    const { firestore } = getFirebaseAdmin();
    
    // Usamos la variable `firestore` (que ahora sí existe) para hacer la consulta.
    const participantsRef = firestore.collection('participants');
    
    const snapshot = await participantsRef.where('programa', '==', 'Tutorias').get();

    if (snapshot.empty) {
      return NextResponse.json([]);
    }

    const lugares = new Set<string>();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.lugarTrabajo && data.lugarTrabajo.trim() !== '') {
        lugares.add(data.lugarTrabajo.trim());
      }
    });

    const sortedLugares = Array.from(lugares).sort((a, b) => a.localeCompare(b));

    return NextResponse.json(sortedLugares);

  } catch (error) {
    console.error("Error fetching work locations:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
