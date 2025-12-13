'use client';

import React, { useMemo } from 'react';
import { Participant, Novedad } from '@/lib/types';
import { PROGRAMAS, MONTHS } from '@/lib/constants'; // <-- MONTHS ahora viene de constants
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp } from '@/lib/utils'; 
import { History, Ban, Check, ArrowRightLeft, FileText, FilePlus } from 'lucide-react'; 

interface HistoricalProgramDetailsProps {
  participant: Participant;
  history: Novedad[];
}

const HistoricalProgramDetails: React.FC<HistoricalProgramDetailsProps> = ({ participant, history }) => {

  // Agrupar novedades por programa y ordenar cronológicamente
  const programHistory = useMemo(() => {
    const sortedNovedades = [...history].sort((a, b) => {
      const dateA = a.fechaRealCarga?.seconds || 0;
      const dateB = b.fechaRealCarga?.seconds || 0;
      return dateA - dateB;
    });

    const programsDetails = new Map<string, {
      startDate: string;
      endDate: string | null;
      pagos: number;
      novedades: Novedad[];
    }>();

    let currentProgram = participant.programa;
    let currentStartDate = participant.fechaIngreso; 

    // Si el participante tiene pagos en el programa actual, lo incluimos
    if (participant.pagosPorPrograma && participant.pagosPorPrograma[currentProgram] !== undefined) {
      programsDetails.set(currentProgram, {
        startDate: currentStartDate,
        endDate: null, 
        pagos: participant.pagosPorPrograma[currentProgram],
        novedades: []
      });
    }


    sortedNovedades.forEach(novedad => {
      if (novedad.type === 'TRASPASO') {
        const descriptionMatch = novedad.descripcion.match(/Traspaso del programa "([^"]+)" a "([^"]+)"/);
        if (descriptionMatch) {
          const prevProgram = descriptionMatch[1];
          const nextProgram = descriptionMatch[2];
          const traspasoDate = novedad.fechaEvento || (novedad.fechaRealCarga ? new Date(novedad.fechaRealCarga.seconds * 1000).toISOString().split('T')[0] : '');

          // Finaliza el programa anterior
          if (programsDetails.has(prevProgram)) {
            const prevProgramDetail = programsDetails.get(prevProgram)!;
            prevProgramDetail.endDate = traspasoDate;
            programsDetails.set(prevProgram, prevProgramDetail);
          } else { 
             programsDetails.set(prevProgram, {
                startDate: "Desconocida", 
                endDate: traspasoDate,
                pagos: (participant.pagosPorPrograma && participant.pagosPorPrograma[prevProgram]) || 0,
                novedades: []
             });
          }


          // Inicia el nuevo programa
          if (!programsDetails.has(nextProgram)) {
            programsDetails.set(nextProgram, {
              startDate: traspasoDate,
              endDate: null,
              pagos: (participant.pagosPorPrograma && participant.pagosPorPrograma[nextProgram]) || 0,
              novedades: []
            });
          } else {
            const nextProgramDetail = programsDetails.get(nextProgram)!;
            nextProgramDetail.startDate = traspasoDate; 
            programsDetails.set(nextProgram, nextProgramDetail);
          }
        }
      }
    });

    // Asegurarse de que el programa actual esté presente
    if (!programsDetails.has(participant.programa)) {
        programsDetails.set(participant.programa, {
            startDate: participant.fechaIngreso,
            endDate: null,
            pagos: (participant.pagosPorPrograma && participant.pagosPorPrograma[participant.programa]) || 0,
            novedades: []
        });
    }
    
    history.forEach(novedad => {
        // Intenta asignar la novedad al programa vigente en la fecha de la novedad
        const novedadDate = new Date((novedad.fechaRealCarga?.seconds || 0) * 1000);
        let assigned = false;
        
        for (const [programName, details] of programsDetails.entries()) {
            const startDate = new Date(details.startDate);
            const endDate = details.endDate ? new Date(details.endDate) : new Date(); // Si no hay endDate, es el programa actual

            if (novedadDate >= startDate && novedadDate <= endDate) {
                details.novedades.push(novedad);
                assigned = true;
                break;
            }
        }
        if (!assigned) {
            // Si no se pudo asignar por fecha, lo agregamos al programa actual del participante
            programsDetails.get(participant.programa)?.novedades.push(novedad);
        }
    });


    return Array.from(programsDetails.entries()).map(([programName, details]) => ({
        programName,
        ...details,
        novedades: details.novedades.sort((a,b) => (b.fechaRealCarga?.seconds || 0) - (a.fechaRealCarga?.seconds || 0))
    })).sort((a, b) => (b.startDate ? new Date(b.startDate).getTime() : 0) - (a.startDate ? new Date(a.startDate).getTime() : 0));

  }, [participant, history]);

  const historyIcons: { [key: string]: React.ReactElement } = { 
    BAJA_DEFINITIVA: <Ban size={16}/>, 
    REACTIVACION: <Check size={16}/>, 
    ALTA: <FileText size={16}/>, 
    RENOVACION: <FilePlus size={16}/>, 
    TRASPASO: <ArrowRightLeft size={16}/>, 
    DEFAULT: <History size={16}/> 
  };

  const formatProgramDate = (dateString: string | null) => {
    if (!dateString) return 'Actualmente';
    try {
      if (dateString.length === 10) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      if (dateString.length === 7) {
        const [year, month] = dateString.split('-');
        const monthName = MONTHS[parseInt(month, 10) - 1];
        return `${monthName} ${year}`;
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  }

  return (
    <div className="space-y-6">
      {programHistory.length === 0 ? (
        <p className="text-gray-500">No hay historial de programas o traspasos para este participante.</p>
      ) : (
        programHistory.map((programDetail, index) => (
          <Card key={programDetail.programName + index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Programa: {programDetail.programName}
                <Badge variant="secondary" className="ml-2">{programDetail.pagos} pagos</Badge>
              </CardTitle>
              <p className="text-sm text-gray-500">
                Desde: {formatProgramDate(programDetail.startDate)} - Hasta: {formatProgramDate(programDetail.endDate)}
              </p>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold text-md mb-2">Eventos en este Programa:</h4>
              {programDetail.novedades.length > 0 ? (
                <ul className="space-y-2">
                  {programDetail.novedades.map((n, idx) => (
                    <li key={n.id + idx} className="flex items-start gap-2 text-sm">
                      {historyIcons[n.type] || historyIcons.DEFAULT}
                      <span>{n.descripcion} ({formatTimestamp(n.fechaRealCarga)})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No hay novedades específicas registradas para este programa.</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default HistoricalProgramDetails;
