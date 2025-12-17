'use client';

import React, { useMemo } from 'react';
import type { Participant, PagoRegistrado } from '@/lib/types';
import { MONTHS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HistoricalProgramDetailsProps {
  participant: Participant;
  allPayments: PagoRegistrado[];
}

const HistoricalProgramDetails: React.FC<HistoricalProgramDetailsProps> = ({ participant, allPayments }) => {

  const historicalPayments = useMemo(() => {
    // 1. Filtra los pagos que no son del programa actual.
    const previousPayments = allPayments.filter(p => p.programa !== participant.programa);

    // 2. Agrupa por programa y luego por año.
    return previousPayments.reduce((acc, payment) => {
      const program = payment.programa || 'General';
      if (!acc[program]) {
        acc[program] = {};
      }
      const year = payment.anio;
      if (!acc[program][year]) {
        acc[program][year] = [];
      }
      acc[program][year].push(parseInt(payment.mes, 10));
      
      // Ordena los meses
      acc[program][year].sort((a, b) => a - b);

      return acc;
    }, {} as { [program: string]: { [year: string]: number[] } });
  }, [participant.programa, allPayments]);

  const programNames = useMemo(() => Object.keys(historicalPayments).sort(), [historicalPayments]);

  return (
    <div className="space-y-6">
      {programNames.length === 0 ? (
        <p className="text-gray-500 mt-4">No se encontraron pagos en programas anteriores.</p>
      ) : (
        programNames.map(programName => (
          <Card key={programName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Programa: {programName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(historicalPayments[programName]).sort((a,b) => parseInt(b) - parseInt(a)).map(year => (
                <div key={year} className="mt-2">
                  <h4 className="font-semibold text-md mb-2">{year}</h4>
                  <div className="flex flex-wrap gap-2">
                    {historicalPayments[programName][year].map(month => (
                       <Badge key={`${programName}-${year}-${month}`} variant="secondary" className="text-sm">{MONTHS[month - 1]}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default HistoricalProgramDetails;
