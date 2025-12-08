
"use client";

import React, { useState, useContext } from 'react';
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
import { RenewalForm } from './RenewalForm';
import EditParticipantForm from './EditParticipantForm';
import { FirebaseContext } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ParticipantsTableProps {
  participants: Participant[];
}

export const ParticipantsTable: React.FC<ParticipantsTableProps> = ({ participants }) => {
  const router = useRouter();
  const { toast } = useToast();
  const firebaseContext = useContext(FirebaseContext);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  if (participants.length === 0) {
    return <p className="text-center text-gray-500">No hay participantes que coincidan con el filtro actual.</p>;
  }

  const handleRenewalSuccess = () => {
    router.refresh();
  };

  const handleEditClick = (participant: Participant, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingParticipant(participant);
  };

  const handleCancelEdit = () => {
    setEditingParticipant(null);
  };

  const handleSaveEdit = async (updatedData: Partial<Participant>) => {
    if (!editingParticipant || !firebaseContext?.firestore) {
        toast({ title: "Error", description: "No se pudo guardar. Intente de nuevo.", variant: "destructive" });
        return;
    }

    const participantRef = doc(firebaseContext.firestore, "participantes", editingParticipant.id);

    try {
        await updateDoc(participantRef, updatedData);
        toast({ title: "Éxito", description: "Los datos del participante han sido actualizados." });
        setEditingParticipant(null);
        router.refresh();
    } catch (error) {
        console.error("Error updating participant: ", error);
        toast({ title: "Error", description: "Ocurrió un error al guardar los cambios.", variant: "destructive" });
    }
  };

  return (
    <>
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
              const needsRenewal = alert.msg === 'Requiere Autorización';

              return (
                <TableRow key={p.id}>
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
                  <TableCell className="space-x-2 text-right">
                    {needsRenewal ? (
                      <RenewalForm participant={p} onSuccess={handleRenewalSuccess} />
                    ) : (
                      <Button variant="outline" size="sm" onClick={(e) => handleEditClick(p, e)}>
                        Editar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editingParticipant && (
        <EditParticipantForm
            participant={editingParticipant}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
        />
      )}
    </>
  );
};
