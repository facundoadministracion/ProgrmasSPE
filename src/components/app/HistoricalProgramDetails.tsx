'use client';
import React, { useMemo } from 'react';
import type { Participant, PagoRegistrado } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MONTHS } from '@/lib/constants';

const HistoricalProgramDetails = ({ participant, allPayments }: { participant: Participant, allPayments: PagoRegistrado[] }) => {
    
    const historicalProgramsData = useMemo(() => {
        const paymentsByProgram = allPayments.reduce((acc, payment) => {
            const { programa } = payment;
            if (!acc[programa]) {
                acc[programa] = [];
            }
            acc[programa].push(payment);
            return acc;
        }, {} as Record<string, PagoRegistrado[]>);

        const historicalProgramNames = Object.keys(paymentsByProgram).filter(p => p !== participant.programa);

        const programsFromHistoryField = participant.historialProgramas ? Object.keys(participant.historialProgramas) : [];
        
        const allHistoricalProgramNames = [...new Set([...historicalProgramNames, ...programsFromHistoryField])];

        if (allHistoricalProgramNames.length === 0) {
            return [];
        }

        return allHistoricalProgramNames.map(programa => {
            const programDateData = participant.historialProgramas?.[programa];
            const payments = paymentsByProgram[programa] || [];

            const groupedPayments = payments.reduce((acc, payment) => {
                const year = payment.anio;
                if (!acc[year]) acc[year] = [];
                acc[year].push(parseInt(payment.mes, 10));
                return acc;
            }, {} as { [year: string]: number[] });

            const description = programDateData 
                ? `Participó desde ${new Date(programDateData.fechaInicio + 'T00:00:00').toLocaleDateString('es-AR')} hasta ${new Date(programDateData.fechaFin + 'T00:00:00').toLocaleDateString('es-AR')}`
                : `Se encontraron pagos en este programa, pero las fechas de participación no están registradas.`;

            return {
                programa,
                payments,
                groupedPayments,
                description
            };
        });
    }, [participant, allPayments]);

    if (!historicalProgramsData || historicalProgramsData.length === 0) {
        return <p>No se encontraron pagos registrados en programas anteriores para este participante.</p>;
    }

    return (
        <div className="space-y-6">
            {historicalProgramsData.map(hist => (
                <Card key={hist.programa}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{hist.programa}</CardTitle>
                                <CardDescription>
                                    {hist.description}
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="text-lg">
                                Total de Pagos: {hist.payments.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {hist.payments.length > 0 ? (
                            <div className="space-y-3">
                                {Object.keys(hist.groupedPayments).sort((a, b) => parseInt(b) - parseInt(a)).map(year => (
                                    <div key={year}>
                                        <h4 className="font-semibold text-md mb-2">{year}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {hist.groupedPayments[year].sort((a, b) => a - b).map(month => (
                                                <Badge key={`${year}-${month}`} variant="outline" className="font-normal">
                                                    {MONTHS[month - 1]}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No se encontraron pagos registrados para este programa.</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default HistoricalProgramDetails;