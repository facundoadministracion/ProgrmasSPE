import { getFirebaseAdmin } from '@/firebase-admin';
import { Dashboard } from '@/components/app/Dashboard';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getSession() {
  try {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    
    const adminAuth = getFirebaseAdmin().auth;
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Aquí, en el futuro, podrías cargar los datos iniciales del dashboard 
  // del lado del servidor si es necesario. Por ahora, el componente Dashboard
  // los carga del lado del cliente.

  return <Dashboard />;
}
