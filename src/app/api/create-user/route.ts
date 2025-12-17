
import { NextResponse } from 'next/server';
// Import the initialized auth and db services directly
import { auth, db } from '@/firebase-admin';

export async function POST(request: Request) {
  try {
    // No need for the old getAdminServices() function
    const { name, email, password, role } = await request.json();

    // 1. Create user in Firebase Authentication using the imported auth service
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // 2. Set custom claim for the user's role
    await auth.setCustomUserClaims(uid, { role: role });

    // 3. Create user document in Firestore 'users' collection using the imported db service
    await db.collection('users').doc(uid).set({
      uid: uid,
      name: name,
      email: email,
      role: role,
    });

    return NextResponse.json({ message: 'Usuario creado exitosamente', uid }, { status: 201 });

  } catch (error: any) {
    console.error('Error creando usuario:', error);
    
    let errorMessage = 'Ocurrió un error inesperado al crear el usuario.';
    let statusCode = 500;

    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'El correo electrónico ya está en uso por otra cuenta.';
      statusCode = 409; // Conflict
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = 'La contraseña no es válida. Debe tener al menos 6 caracteres.';
      statusCode = 400; // Bad Request
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
