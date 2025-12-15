'use client';

import React, { useState, useCallback } from 'react';
import type { Participant } from '@/lib/types';
import { PROGRAMAS, CATEGORIAS_TUTORIAS, ESTADOS_PARTICIPANTE, DEPARTAMENTOS } from '@/lib/constants';
import MemoizedTextField from './edit-participant-form-parts/MemoizedTextField';
import MemoizedSelectField from './edit-participant-form-parts/MemoizedSelectField';
import MemoizedSwitchField from './edit-participant-form-parts/MemoizedSwitchField';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FilePlus } from 'lucide-react';


interface EditParticipantFormProps {
  participant: Participant;
  onSave: (updatedData: any) => void; // Changed to any to accommodate newRenovationActo
  formId: string;
  requiresRenovation: boolean;
}

const EditParticipantForm: React.FC<EditParticipantFormProps> = ({ participant, onSave, formId, requiresRenovation }) => {
  const [formData, setFormData] = useState(participant);
  const [newRenovationActo, setNewRenovationActo] = useState('');

  const handleUpdate = useCallback((id: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const changes: Partial<Participant> = {};
    const currentData = { ...formData };

    if (currentData.programa !== PROGRAMAS.TUTORIAS) {
        currentData.categoria = '';
    }
    
    for (const key in currentData) {
      const pKey = key as keyof Participant;
      if (pKey === 'renovaciones') continue; // Handled separately
      const formValue = currentData[pKey as keyof typeof currentData] || '';
      const participantValue = participant[pKey] || '';

      if (formValue !== participantValue) {
        (changes as any)[pKey] = formValue;
      }
    }

    const finalChanges: any = { ...changes };

    if (newRenovationActo && newRenovationActo.trim() !== '') {
      const existingRenovaciones = participant.renovaciones || [];
      finalChanges.renovaciones = [...existingRenovaciones, newRenovationActo.trim()];
      finalChanges.newRenovationActo = newRenovationActo.trim();
    }
    
    onSave(finalChanges);
  };
  
  return (
    <form id={formId} onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {requiresRenovation && (
              <div className="md:col-span-3">
                <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                  <FilePlus className="h-4 w-4" />
                  <AlertTitle>Acción Requerida: Registrar Renovación</AlertTitle>
                  <AlertDescription className="mt-2">
                      <MemoizedTextField 
                        id="newRenovationActo"
                        label="Acto Administrativo de Renovación (Decreto/Resolución N°)"
                        value={newRenovationActo}
                        onUpdate={(id, value) => setNewRenovationActo(value as string)}
                      />
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <MemoizedTextField id="nombre" label="Nombre Completo" value={formData.nombre || ''} onUpdate={handleUpdate} />
            <MemoizedTextField id="dni" label="DNI" value={participant.dni || ''} onUpdate={() => {}} disabled />
            <MemoizedTextField id="fechaNacimiento" label="Fecha de Nacimiento" type="date" value={formData.fechaNacimiento || ''} onUpdate={handleUpdate} />
            <MemoizedTextField id="fechaIngreso" label="Fecha de Ingreso" type="date" value={formData.fechaIngreso || ''} onUpdate={handleUpdate} />
            <MemoizedTextField id="actoAdministrativo" label="Nº de Decreto de Alta" value={formData.actoAdministrativo || ''} onUpdate={handleUpdate} />
            <MemoizedTextField id="domicilio" label="Domicilio" value={formData.domicilio || ''} onUpdate={handleUpdate} />
            <MemoizedSelectField id="departamento" label="Departamento" value={formData.departamento || ''} onUpdate={handleUpdate} options={DEPARTAMENTOS} />
            <MemoizedSelectField id="programa" label="Programa" value={formData.programa || ''} onUpdate={handleUpdate} options={Object.values(PROGRAMAS)} />
            <MemoizedSelectField id="estado" label="Estado" value={formData.estado || ''} onUpdate={handleUpdate} options={ESTADOS_PARTICIPANTE} />
            {formData.programa === PROGRAMAS.TUTORIAS && (
                <MemoizedSelectField id="categoria" label="Categoría (Tutorías)" value={formData.categoria || ''} onUpdate={handleUpdate} options={CATEGORIAS_TUTORIAS} />
            )}
            <MemoizedTextField id="lugarTrabajo" label="Lugar de Trabajo" value={formData.lugarTrabajo || ''} onUpdate={handleUpdate} />
            <MemoizedTextField id="email" label="Email" type="email" value={formData.email || ''} onUpdate={handleUpdate} />
            <MemoizedTextField id="telefono" label="Teléfono" value={formData.telefono || ''} onUpdate={handleUpdate} />
            <MemoizedSwitchField id="esEquipoTecnico" label="Es Equipo Técnico" checked={formData.esEquipoTecnico} onUpdate={handleUpdate} />
        </div>
    </form>
  );
};

export default EditParticipantForm;
