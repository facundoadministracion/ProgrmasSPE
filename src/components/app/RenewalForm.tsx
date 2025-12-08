
"use client";

import React, { useState, useContext } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Participant, Renovacion } from '@/lib/types';
import { FirebaseContext } from '@/firebase/provider';
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';

interface RenewalFormProps {
  participant: Participant;
  onSuccess: () => void;
}

export const RenewalForm: React.FC<RenewalFormProps> = ({ participant, onSuccess }) => {
  const firebaseContext = useContext(FirebaseContext);
  const { toast } = useToast();
  const [actType, setActType] = useState<'decreto' | 'resolucion'>('decreto');
  const [actNumber, setActNumber] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Si el contexto o los servicios principales no están listos, renderizamos un botón deshabilitado.
  if (!firebaseContext || !firebaseContext.areServicesAvailable) {
    return <Button variant="outline" size="sm" disabled>Renovar</Button>;
  }

  const { firestore: db, user } = firebaseContext;

  const handleSubmit = async () => {
    // Aunque ya verificamos el contexto, es una buena práctica verificar db y user antes de la operación.
    if (!db || !user) {
      toast({ title: "Error", description: "No estás autenticado o la base de datos no está disponible.", variant: "destructive" });
      return;
    }
    if (!actNumber) {
        toast({ title: "Error", description: "El número de acto es obligatorio.", variant: "destructive" });
        return;
    }

    setIsSaving(true);

    const newRenovacion: Renovacion = {
      tipoActo: actType,
      numeroActo: actNumber,
      fechaCarga: serverTimestamp(),
      ownerId: user.uid,
    };

    try {
      const participantRef = doc(db, "participantes", participant.id);
      await updateDoc(participantRef, {
        renovaciones: arrayUnion(newRenovacion)
      });

      toast({ title: "Éxito", description: "La renovación se ha guardado correctamente." });
      setIsOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error al guardar la renovación:", error);
      toast({ title: "Error", description: "No se pudo guardar la renovación.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>Renovar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Renovar Participación</DialogTitle>
          <DialogDescription>
            Registrar el acto administrativo para {participant.nombre}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="act-type" className="text-right">
              Tipo de Acto
            </Label>
            <Select onValueChange={(value: 'decreto' | 'resolucion') => setActType(value)} defaultValue={actType}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decreto">Decreto</SelectItem>
                <SelectItem value="resolucion">Resolución</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="act-number" className="text-right">
              Número
            </Label>
            <Input
              id="act-number"
              value={actNumber}
              onChange={(e) => setActNumber(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Renovación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
