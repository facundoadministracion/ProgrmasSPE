import { getFirebaseAdmin } from '@/firebase-admin';
import Dashboard from '@/components/app/Dashboard'; // FIX: Corrected import statement
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
    // Session cookie is invalid or expired. 
    // This is an expected condition during logout or session expiry.
    // console.error('Error verifying session cookie:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // The Dashboard component is a client component and will fetch its own data.
  // The server-side part here is primarily for protecting the route.
  return <Dashboard />;
}
