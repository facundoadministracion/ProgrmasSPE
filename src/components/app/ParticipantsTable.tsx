
"use client";

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Participant } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';

interface ParticipantsTableProps {
  participants: Participant[];
}

export const ParticipantsTable: React.FC<ParticipantsTableProps> = ({ participants }) => {
  const router = useRouter();

  if (participants.length === 0) {
    return <p className="text-center text-gray-500">No hay participantes que coincidan con el filtro actual.</p>;
  }
  
  const handleRowClick = (participantId: string) => {
    // This will be implemented in a future step
    // router.push(`/participantes/${participantId}`);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="hidden md:table-cell">Programa</TableHead>
            <TableHead className="hidden lg:table-cell">Contacto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead><span className="sr-only">Actions</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {participants.map((p) => {
            const alert = getAlertStatus(p);
            return (
              <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleRowClick(p.id)}>
                <TableCell className="font-medium">
                  <div>{p.nombre}</div>
                  <div className="text-sm text-gray-500 md:hidden">{p.programa}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{p.programa}</TableCell>
                <TableCell className="hidden lg:table-cell">
                    <div>{p.telefono}</div>
                    <div className="text-sm text-gray-500">{p.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={alert.type === 'green' ? 'default' : 'destructive'}>{alert.msg}</Badge>
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); /* Implement edit routing */ }}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
