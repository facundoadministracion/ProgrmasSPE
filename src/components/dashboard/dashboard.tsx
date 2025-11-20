'use client';

import {
  Users,
  AlertTriangle,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { InfoCard } from '@/components/info-card';
import {
  collection,
  getCountFromServer,
  getDocs,
  FirestoreError,
} from 'firebase/firestore';
import { Participant, ProgramName } from '@/lib/types';
import { PROGRAMAS } from '@/lib/constants';
import { getAlertStatus } from '@/lib/alerts';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useEffect, useState } from 'react';

type DashboardData = {
  totalParticipants: number;
  totalAlerts: number;
  totalPayments: number;
  programCounts: Record<ProgramName, number>;
};

export function Dashboard() {
  const { firestore } = useFirebase();
  const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    async function getDashboardData() {
      setLoading(true);
      const participantsColl = collection(
        firestore,
        'artifacts',
        appId,
        'public',
        'data',
        'participants'
      );
      const paymentsColl = collection(
        firestore,
        'artifacts',
        appId,
        'public',
        'data',
        'payments'
      );

      try {
        const participantsSnapshot = await getDocs(participantsColl);
        const participants = participantsSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Participant)
        );

        const paymentsCountSnapshot = await getCountFromServer(paymentsColl);
        const paymentsCount = paymentsCountSnapshot.data().count;

        const alerts = (
          await Promise.all(participants.map((p) => getAlertStatus(p)))
        ).filter((status) => status.type === 'red' || status.type === 'yellow');

        const programCounts = {
          [PROGRAMAS.TUTORIAS]: participants.filter(
            (p) => p.programa === PROGRAMAS.TUTORIAS
          ).length,
          [PROGRAMAS.JOVEN]: participants.filter(
            (p) => p.programa === PROGRAMAS.JOVEN
          ).length,
          [PROGRAMAS.TECNO]: participants.filter(
            (p) => p.programa === PROGRAMAS.TECNO
          ).length,
        };

        setData({
          totalParticipants: participants.length,
          totalAlerts: alerts.length,
          totalPayments: paymentsCount,
          programCounts,
        });
      } catch (error) {
        if (error instanceof FirestoreError && error.code === 'permission-denied') {
            const participantsError = new FirestorePermissionError({
                path: participantsColl.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', participantsError);

            // Also check payments collection if participants failed
            getDocs(paymentsColl).catch((paymentsError) => {
                if (paymentsError instanceof FirestoreError && paymentsError.code === 'permission-denied') {
                    const paymentsPermError = new FirestorePermissionError({
                        path: paymentsColl.path,
                        operation: 'list',
                    });
                    errorEmitter.emit('permission-error', paymentsPermError);
                }
            });
        }
      } finally {
        setLoading(false);
      }
    }

    getDashboardData();
  }, [firestore, appId]);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  const programEntries = Object.entries(data.programCounts) as [
    ProgramName,
    number
  ][];

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

function DashboardSkeleton() {
    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Resumen General
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCardSkeleton />
            <InfoCardSkeleton />
            <InfoCardSkeleton />
          </div>
        </div>
        <div className="border-t pt-6">
          <h2 className="text-xl font-bold text-gray-700 mb-6">
            Detalle por Programas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCardSkeleton />
            <InfoCardSkeleton />
            <InfoCardSkeleton />
          </div>
        </div>
      </div>
    );
  }
  
  function InfoCardSkeleton() {
    return (
      <div className="border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col justify-between h-full bg-white">
          <div className="flex items-center">
              <div className="bg-gray-200 p-3 rounded-full mr-4">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
              </div>
              <div>
                  <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
          </div>
          <div className="mt-auto pt-4">
            <div className="h-3 bg-gray-300 rounded w-32 mb-2"></div>
            <div className="h-9 bg-gray-200 rounded w-full"></div>
          </div>
      </div>
    );
  }
  
