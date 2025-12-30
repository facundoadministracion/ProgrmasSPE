'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Users, DollarSign, AlertTriangle, Briefcase, UserCheck, UserPlus, UserX } from 'lucide-react';

import type { Participant } from '@/lib/types';
import { PROGRAMAS, ALERT_MESSAGES } from '@/lib/constants';
import { getAlertStatus } from '@/lib/logic';

import { DashboardCard } from '@/components/app/DashboardCard';
import ProgramAnalytics from '@/components/app/ProgramAnalytics';

// Tipos
type ParticipantFilter = 'requiresAttention' | 'ageAlert' | 'paymentDue' | 'renewalRequired' | 'finalized';

interface ProgramData {
    count: number;
    amount: number; 
    date: string;
}

// FIX: Definir un tipo para los registros del historial para evitar el error de 'any' implícito.
interface PaymentHistoryRecord {
    anoLiquidacion: string;
    mesLiquidacion: string;
    programa: string;
    montoTotalLiquidado?: number;
    cantidadPagos: number;
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
    onSetFilter: (filter: any) => void;
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
            try {
                // 1. Fetch all history records in one query.
                const historyQuery = query(collection(firestore, 'paymentHistory'));
                const historySnapshot = await getDocs(historyQuery);
                // FIX: Asignar el tipo PaymentHistoryRecord a los datos recuperados.
                const allHistoryData = historySnapshot.docs.map(doc => doc.data() as PaymentHistoryRecord);

                // 2. Group records by program.
                // FIX: Usar el tipo PaymentHistoryRecord en el acumulador para mantener el tipado.
                const historyByProgram = allHistoryData.reduce((acc, record) => {
                    const programName = record.programa;
                    if (programName) {
                        if (!acc[programName]) {
                            acc[programName] = [];
                        }
                        acc[programName].push(record);
                    }
                    return acc;
                }, {} as { [key: string]: PaymentHistoryRecord[] });

                const data: { [key: string]: ProgramData } = {};

                // 3. Process each program to find the latest record.
                for (const prog of Object.values(PROGRAMAS)) {
                    const programHistory = historyByProgram[prog];

                    if (!programHistory || programHistory.length === 0) {
                        data[prog] = { count: 0, amount: 0, date: 'N/A' };
                        continue;
                    }

                    // 4. Sort the records for the current program to find the most recent one.
                    // El error de tipado se resuelve aquí gracias a las correcciones anteriores.
                    programHistory.sort((a, b) => {
                        const yearA = parseInt(a.anoLiquidacion, 10);
                        const monthA = parseInt(a.mesLiquidacion, 10);
                        const yearB = parseInt(b.anoLiquidacion, 10);
                        const monthB = parseInt(b.mesLiquidacion, 10);

                        if (yearB !== yearA) return yearB - yearA;
                        return monthB - monthA;
                    });

                    const latestRecord = programHistory[0];
                    
                    const settlementAmount = latestRecord.montoTotalLiquidado || 0;
                    const latestMes = latestRecord.mesLiquidacion;
                    const latestAnio = latestRecord.anoLiquidacion;
                    
                    const monthIndex = parseInt(latestMes, 10) - 1;
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

            } catch (error) {
                console.error("Error fetching dashboard program data:", error);
            } finally {
                setIsProgramDataLoading(false);
            }
        };

        fetchProgramData();

    }, [firestore]);

    const { 
        attentionRequiredCount, 
        ageAlertCount, 
        aVencerCount, 
        renewalRequiredCount,
        finalizedCount
    } = useMemo(() => {
        const getParticipantPayments = (p: Participant) => {
            if (!p.programa || !p.pagosPorPrograma) return 0;
            return p.pagosPorPrograma[p.programa] || 0;
        };

        const participantAlerts = (participants || [])
            .map(p => ({ 
                ...p, 
                alert: getAlertStatus(p),
                payments: getParticipantPayments(p)
            }));

        return {
            attentionRequiredCount: (participants || []).filter(p => p.estado === 'Requiere Atención').length,
            ageAlertCount: participantAlerts.filter(p => p.alert.msg.includes('Límite de Edad')).length,
            aVencerCount: participantAlerts.filter(p => p.alert.msg === ALERT_MESSAGES.PROXIMO_VENCIMIENTO).length,
            renewalRequiredCount: participantAlerts.filter(p => p.alert.msg === ALERT_MESSAGES.REQUIERE_AUTORIZACION && p.payments < 12).length,
            finalizedCount: participantAlerts.filter(p => p.alert.msg === ALERT_MESSAGES.REQUIERE_AUTORIZACION && p.payments >= 12).length,
        };
    }, [participants]);

    if (selectedProgramDetail) {
        return <ProgramAnalytics programName={selectedProgramDetail} participants={participants || []} onBack={() => setSelectedProgramDetail(null)} onSelectParticipant={onSelectParticipant}/>
    }
    
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
              color="gray" 
              isLoading={isProgramDataLoading} 
            />
            <DashboardCard title="Requiere Atención" value={attentionRequiredCount} icon={AlertTriangle} color="red" subtitle="Participantes con alertas" isLoading={participantsLoading} onClick={() => onSetFilter('requiresAttention')} actionText="Ver Lista" />
            <DashboardCard title="Alerta de Edad" value={ageAlertCount} icon={UserCheck} color="yellow" subtitle="Límite de edad alcanzado" isLoading={participantsLoading} onClick={() => onSetFilter('ageAlert')} actionText="Ver Lista" />
            <DashboardCard title="Próximos a Vencer" value={aVencerCount} icon={DollarSign} color="yellow" subtitle="A 1 pago de necesitar renovación" isLoading={participantsLoading} onClick={() => onSetFilter('paymentDue')} actionText="Ver Lista" />
            <DashboardCard title="Requieren Continuidad" value={renewalRequiredCount} icon={UserPlus} color="green" subtitle="Necesitan acto de renovación" isLoading={participantsLoading} onClick={() => onSetFilter('renewalRequired')} actionText="Ver Lista" />
            <DashboardCard title="Finalizados" value={finalizedCount} icon={UserX} color="gray" subtitle="Completaron 12 pagos o más" isLoading={participantsLoading} onClick={() => onSetFilter('finalized')} actionText="Ver Lista" />
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
                            color="gray" 
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
