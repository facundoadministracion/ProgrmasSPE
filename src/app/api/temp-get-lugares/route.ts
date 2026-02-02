
import { NextResponse } from 'next/server';
import { db } from '@/firebase/firebase-admin';

export async function GET() {
  try {
    // 1. Find all payments for Tutorias in Nov 2023
    const paymentsSnapshot = await db.collection('pagosRegistrados')
      .where('programa', '==', 'Tutorias')
      .where('mes', '==', '11')
      .where('anio', '==', '2023')
      .get();

    if (paymentsSnapshot.empty) {
      return NextResponse.json({ error: 'No se encontraron pagos para Tutorías en Noviembre de 2023.' }, { status: 404 });
    }

    // 2. Get unique DNIs from payments
    const dnis = [...new Set(paymentsSnapshot.docs.map((doc: any) => doc.data().dni))];

    // 3. Get participant profiles in chunks
    const participants: any[] = [];
    for (let i = 0; i < dnis.length; i += 30) {
        const chunk = dnis.slice(i, i + 30);
        const participantsSnapshot = await db.collection('participants')
            .where('dni', 'in', chunk)
            .get();
        participants.push(...participantsSnapshot.docs.map((doc: any) => doc.data()));
    }

    // 4. Extract, unify, and sort "lugarTrabajo"
    const lugaresDeTrabajo = [...new Set(
        participants
            .map(p => p.lugarTrabajo)
            .filter(lugar => lugar && lugar.trim() !== '')
    )].sort();

    // 5. Return the list as a JSON response
    return NextResponse.json(lugaresDeTrabajo);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
