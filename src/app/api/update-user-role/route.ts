
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase-admin';

export async function POST(request: Request) {
  const { auth, db } = getFirebaseAdmin();

  try {
    const { uid, role, name } = await request.json();

    if (!uid || !role || !name) {
      return NextResponse.json({ error: 'UID, rol y nombre son requeridos.' }, { status: 400 });
    }

    // 1. Actualizar Custom Claims en Firebase Auth
    await auth.setCustomUserClaims(uid, { role });

    // 2. Actualizar el documento en Firestore
    const userRef = db.collection('users').doc(uid);
    await userRef.update({ role, name });

    return NextResponse.json({ message: 'Usuario actualizado exitosamente' }, { status: 200 });

  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
