'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Users, DollarSign, AlertTriangle, Briefcase, UserCheck, UserPlus, UserX } from 'lucide-react';

import type { Participant } from '@/lib/types';
import { PROGRAMAS } from '@/lib/constants';
import { getAlertStatus } from '@/lib/logic';

import { DashboardCard } from '@/components/app/DashboardCard';
import ProgramAnalytics from '@/components/app/ProgramAnalytics';

type ParticipantFilter = 'requiresAttention' | 'paymentAlert' | 'ageAlert' | 'paymentDue' | 'payment6' | 'payment12' | null;

interface ProgramData {
    count: number;
    amount: number; 
    date: string;
}

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};

const Dashboard = ({ 
    participants, 
    participantsLoading, 
    onSetFilter, 
    onSelectParticipant 
} : {
    participants: Participant[];
    participantsLoading: boolean;
    onSetFilter: (filter: ParticipantFilter) => void;
    onSelectParticipant: (participant: Participant) => void;
}) => {
    const firestore = useFirestore();
    const [selectedProgramDetail, setSelectedProgramDetail] = useState<string | null>(null);
    const [programData, setProgramData] = useState<{ [key: string]: ProgramData }>({});
    const [isProgramDataLoading, setIsProgramDataLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchProgramData = async () => {
            setIsProgramDataLoading(true);
            const data: { [key: string]: ProgramData } = {};

            for (const prog of Object.values(PROGRAMAS)) {
                const recordsQuery = query(
                    collection(firestore, 'paymentHistory'),
                    where('programa', '==', prog),
                    orderBy('uploadedAt', 'desc'),
                    limit(1)
                );

                const recordSnapshot = await getDocs(recordsQuery);

                if (recordSnapshot.empty) {
                    data[prog] = { count: 0, amount: 0, date: 'N/A' };
                    continue;
                }

                const latestRecord = recordSnapshot.docs[0].data();
                const settlementAmount = latestRecord.montoTotalLiquidado || 0;
                const latestMes = latestRecord.mesLiquidacion;
                const latestAnio = latestRecord.anoLiquidacion;
                
                const monthIndex = typeof latestMes === 'string' ? parseInt(latestMes, 10) - 1 : latestMes - 1;
                let dateString;
                if (monthIndex >= 0 && monthIndex < 12) {
                    const monthName = MESES[monthIndex];
                    dateString = `${monthName} de ${latestAnio}`;
                } else {
                    dateString = `${String(latestMes).padStart(2, '0')}/${latestAnio}`;
                }

                data[prog] = { count: latestRecord.cantidadPagos, amount: settlementAmount, date: dateString };
            }
            setProgramData(data);
            setIsProgramDataLoading(false);
        };

        fetchProgramData().catch(console.error);

    }, [firestore]);

    if (selectedProgramDetail) {
        return <ProgramAnalytics programName={selectedProgramDetail} participants={participants || []} onBack={() => setSelectedProgramDetail(null)} onSelectParticipant={onSelectParticipant}/>
    }
    
    const attentionRequiredCount = (participants || []).filter(p => p.estado === 'Requiere Atención').length;
    const ageAlertCount = (participants || []).filter(p => p.activo && p.programa === PROGRAMAS.JOVEN && getAlertStatus(p).msg.includes('Límite de Edad')).length;
    
    const aVencerCount = (participants || []).filter(p => p.activo && (p.programa === PROGRAMAS.JOVEN || p.programa === PROGRAMAS.TECNO) && (p.pagosAcumulados === 5 || p.pagosAcumulados === 11)).length;
    const seisPagosCount = (participants || []).filter(p => p.activo && (p.programa === PROGRAMAS.JOVEN || p.programa === PROGRAMAS.TECNO) && p.pagosAcumulados === 6).length;
    const docePagosCount = (participants || []).filter(p => p.activo && (p.programa === PROGRAMAS.JOVEN || p.programa === PROGRAMAS.TECNO) && p.pagosAcumulados === 12).length;

    const totalParticipants = Object.values(programData).reduce((sum, data) => sum + (data?.count ?? 0), 0);
    const totalSettledAmount = Object.values(programData).reduce((sum, data) => sum + (data?.amount ?? 0), 0);

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard 
              title="Total Padrón Liquidado" 
              value={totalParticipants} 
              secondaryValue={formatCurrency(totalSettledAmount)}
              icon={Users} 
              color="blue" 
              isLoading={isProgramDataLoading} 
            />
            <DashboardCard title="Requiere Atención" value={attentionRequiredCount} icon={AlertTriangle} color="red" subtitle="Participantes con alertas" isLoading={participantsLoading} onClick={() => onSetFilter('requiresAttention')} actionText="Ver Lista" />
            <DashboardCard title="Alerta de Edad" value={ageAlertCount} icon={UserCheck} color="orange" subtitle="Límite de edad alcanzado" isLoading={participantsLoading} onClick={() => onSetFilter('ageAlert')} actionText="Ver Lista" />
            <DashboardCard title="Próximos a Vencer" value={aVencerCount} icon={DollarSign} color="yellow" subtitle="Participantes con 5 u 11 pagos" isLoading={participantsLoading} onClick={() => onSetFilter('paymentDue')} actionText="Ver Lista" />
            <DashboardCard title="Continuidad (6 Pagos)" value={seisPagosCount} icon={UserPlus} color="green" subtitle="Elegibles para renovación" isLoading={participantsLoading} onClick={() => onSetFilter('payment6')} actionText="Ver Lista" />
            <DashboardCard title="Finalizados (12 Pagos)" value={docePagosCount} icon={UserX} color="gray" subtitle="Completaron el ciclo" isLoading={participantsLoading} onClick={() => onSetFilter('payment12')} actionText="Ver Lista" />
        </div>
        <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-700 mb-4">Liquidación Mensual</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(PROGRAMAS).map(prog => {
                    const data = programData[prog];
                    const subtitle = data && data.date !== 'N/A' ? `Liquidado en ${data.date}` : 'Sin datos de liquidación';
                    return (
                        <DashboardCard 
                            key={prog} 
                            title={prog} 
                            value={data?.count ?? 0} 
                            secondaryValue={data ? formatCurrency(data.amount) : undefined}
                            icon={Briefcase} 
                            subtitle={subtitle}
                            onClick={() => setSelectedProgramDetail(prog)}
                            actionText="Ver Análisis Mensual" 
                            color="indigo" 
                            isLoading={isProgramDataLoading}
                        />
                    );
                })}
            </div>
        </div>
      </div>
    );
};

export default Dashboard;
