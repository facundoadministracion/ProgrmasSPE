import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardContent } from '@/components/app/DashboardContent';
import { getFirebaseAdmin } from '@/firebase-admin';
import { PROGRAMAS } from '@/lib/constants';

// Importa las imágenes directamente
import logoTutorias from '../../../public/logos/tutorias.png';
import logoEmpleoJoven from '../../../public/logos/empleo joven.png';
import logoTecnoempleo from '../../../public/logos/tecnoempleo.png';

async function getDashboardData() {
  const { db } = getFirebaseAdmin();
  const liquidacionesSnapshot = await db.collection('paymentHistory').get();
  
  const liquidacionesPorPrograma = {
    [PROGRAMAS.TUTORIAS]: {},
    [PROGRAMAS.EMPLEO_JOVEN]: {},
    [PROGRAMAS.TECNOEMPLEO]: {},
  };

  liquidacionesSnapshot.forEach(doc => {
    const data = doc.data();
    const key = `${data.anoLiquidacion}-${data.mesLiquidacion}`;
    if (liquidacionesPorPrograma[data.programa]) {
      liquidacionesPorPrograma[data.programa][key] = {
        ...data,
        id: doc.id
      };
    }
  });

  return liquidacionesPorPrograma;
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const dashboardData = await getDashboardData();

  const programLogos = {
    [PROGRAMAS.TUTORIAS]: logoTutorias,
    [PROGRAMAS.EMPLEO_JOVEN]: logoEmpleoJoven,
    [PROGRAMAS.TECNOEMPLEO]: logoTecnoempleo,
  };

  return (
    <DashboardContent 
      user={session.user} 
      initialData={dashboardData}
      programLogos={programLogos} // Pasa los logos importados al componente cliente
    />
  );
}
