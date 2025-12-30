import { getFirebaseAdmin } from '@/firebase-admin';
import Dashboard from '@/components/app/Dashboard';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return null;
    
    const adminAuth = getFirebaseAdmin().auth;
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <Dashboard />;
}
