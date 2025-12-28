
import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/firebase-admin';

export async function POST(request: Request) {
  const { auth, db } = getFirebaseAdmin();

  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'UID es requerido.' }, { status: 400 });
    }

    // 1. Eliminar usuario de Firebase Authentication
    await auth.deleteUser(uid);

    // 2. Eliminar documento de Firestore
    const userRef = db.collection('users').doc(uid);
    await userRef.delete();

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' }, { status: 200 });

  } catch (error: any) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json({ error: 'Ocurrió un error inesperado al eliminar el usuario.' }, { status: 500 });
  }
}
