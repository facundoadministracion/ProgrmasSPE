
'use client';

import React, { useMemo } from 'react';
import type { Participant } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface DataQualityReportCardProps {
  participants: Participant[];
  onSelectParticipant: (participant: Participant) => void;
}

// --- AJUSTE AQUÍ ---
const DEPARTMENTS_TO_CHECK = ["ROSARIO VERA PEALOZA"];

const DataQualityReportCard: React.FC<DataQualityReportCardProps> = ({ participants, onSelectParticipant }) => {

  const inconsistentParticipants = useMemo(() => {
    // Comparación estricta (sensible a mayúsculas)
    return participants.filter(p => p.departamento && DEPARTMENTS_TO_CHECK.includes(p.departamento));
  }, [participants]);

  if (inconsistentParticipants.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-500">
      <CardHeader className="flex-row items-start gap-4">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <div>
          <CardTitle>Informe de Calidad de Datos</CardTitle>
          <CardDescription>
            Se han encontrado {inconsistentParticipants.length} participantes con el departamento "ROSARIO VERA PEALOZA" que podrían requerir normalización a "Rosario Vera Peñaloza".
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Participante</TableHead>
              <TableHead>Departamento Registrado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inconsistentParticipants.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>{p.departamento}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" onClick={() => onSelectParticipant(p)}>
                    Gestionar Legajo
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DataQualityReportCard;
