import {
  Users,
  AlertTriangle,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { InfoCard } from '@/components/info-card';
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
} from 'firebase/firestore';
import { db, appId } from '@/lib/firebase';
import { Participant, Payment, ProgramName } from '@/lib/types';
import { PROGRAMAS } from '@/lib/constants';
import { getAlertStatus } from '@/lib/alerts';

async function getDashboardData() {
  const participantsColl = collection(db, 'artifacts', appId, 'public', 'data', 'participants');
  const paymentsColl = collection(db, 'artifacts', appId, 'public', 'data', 'payments');

  const participantsSnapshot = await getDocs(participantsColl);
  const participants = participantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
  
  const paymentsCountSnapshot = await getCountFromServer(paymentsColl);
  const paymentsCount = paymentsCountSnapshot.data().count;

  const alerts = (await Promise.all(participants.map(p => getAlertStatus(p))))
    .filter(status => status.type === 'red' || status.type === 'yellow');

  const programCounts = {
    [PROGRAMAS.TUTORIAS]: participants.filter(p => p.programa === PROGRAMAS.TUTORIAS).length,
    [PROGRAMAS.JOVEN]: participants.filter(p => p.programa === PROGRAMAS.JOVEN).length,
    [PROGRAMAS.TECNO]: participants.filter(p => p.programa === PROGRAMAS.TECNO).length,
  };

  return {
    totalParticipants: participants.length,
    totalAlerts: alerts.length,
    totalPayments: paymentsCount,
    programCounts,
  };
}

export async function Dashboard() {
  const data = await getDashboardData();
  const programEntries = Object.entries(data.programCounts) as [ProgramName, number][];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Resumen General
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard
            title="Total Activos"
            value={data.totalParticipants}
            icon={Users}
            color="blue"
            subtitle="Padrón total consolidado"
          />
          <InfoCard
            title="Alertas Admin."
            value={data.totalAlerts}
            icon={AlertTriangle}
            color="red"
            subtitle="Requieren atención urgente"
          />
          <InfoCard
            title="Pagos Registrados"
            value={data.totalPayments.toLocaleString()}
            icon={DollarSign}
            color="green"
            subtitle="Histórico total de transacciones"
          />
        </div>
      </div>
      <div className="border-t pt-6">
        <h2 className="text-xl font-bold text-gray-700 mb-6">
          Detalle por Programas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {programEntries.map(([prog, count]) => (
            <InfoCard
              key={prog}
              title={prog}
              value={count}
              icon={Briefcase}
              color="indigo"
              subtitle="Participantes activos"
              actionHref={`/analytics/${encodeURIComponent(prog)}`}
              actionText="Ver Análisis Mensual"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
