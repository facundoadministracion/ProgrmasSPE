
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dniToFind = searchParams.get('dni');

  if (!dniToFind) {
    return NextResponse.json({ error: 'DNI no proporcionado' }, { status: 400 });
  }

  const { db } = getFirebaseAdmin();

  try {
    // Para estar 100% seguros, buscamos el DNI con y sin puntos.
    const dottedDni = dniToFind.replace(/(\d{2})(\d{3})(\d{3})/, '$1.$2.$3');
    const participantsRef = db.collection('participants');
    
    const snapshot = await participantsRef.where('dni', 'in', [dniToFind, dottedDni]).get();

    if (snapshot.empty) {
      return NextResponse.json({
        found: false,
        message: `El DNI ${dniToFind} no fue encontrado en la base de datos (ni con puntos ni sin ellos).`,
      });
    }

    const results: any[] = [];
    snapshot.forEach(doc => {
      const { dni, nombre, apellido } = doc.data();
      results.push({ dni, nombre, apellido });
    });

    return NextResponse.json({
      found: true,
      message: '¡Encontrado! Así es como el DNI está guardado en la base de datos:',
      data: results,
    });

  } catch (error: any) {
    console.error('Error en la búsqueda de DNI:', error);
    return NextResponse.json({ error: 'Error en el servidor al buscar el DNI', details: error.message }, { status: 500 });
  }
}
