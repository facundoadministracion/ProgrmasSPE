'use client';

import React, { useState, useId, useCallback } from 'react';
import type { Participant } from '@/lib/types';
import { PROGRAMAS, CATEGORIAS_TUTORIAS, ESTADOS_PARTICIPANTE, DEPARTAMENTOS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import MemoizedTextField from './edit-participant-form-parts/MemoizedTextField';
import MemoizedSelectField from './edit-participant-form-parts/MemoizedSelectField';
import MemoizedSwitchField from './edit-participant-form-parts/MemoizedSwitchField';

interface EditParticipantFormProps {
  participant: Participant;
  onSave: (updatedData: Partial<Participant>) => void;
  onCancel: () => void;
}

const EditParticipantForm: React.FC<EditParticipantFormProps> = ({ participant, onSave, onCancel }) => {
  const formId = useId();
  const [formData, setFormData] = useState(participant);

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
      const formValue = currentData[pKey as keyof typeof currentData] || '';
      const participantValue = participant[pKey] || '';

      if (formValue !== participantValue) {
        (changes as any)[pKey] = formValue;
      }
    }

    if (Object.keys(changes).length > 0) {
        onSave(changes);
    } else {
        onCancel();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onMouseDown={onCancel}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Editar Legajo</h3>
            <form id={formId} onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto -m-2 p-2">
                <div className="flex flex-wrap">
                    <MemoizedTextField id="nombre" label="Nombre Completo" value={formData.nombre} onUpdate={handleUpdate} />
                    <MemoizedTextField id="dni" label="DNI" value={participant.dni} onUpdate={() => {}} disabled />
                    <MemoizedTextField id="fechaNacimiento" label="Fecha de Nacimiento" type="date" value={formData.fechaNacimiento} onUpdate={handleUpdate} />
                    <MemoizedTextField id="fechaIngreso" label="Fecha de Ingreso" type="date" value={formData.fechaIngreso} onUpdate={handleUpdate} />
                    <MemoizedTextField id="domicilio" label="Domicilio" value={formData.domicilio} onUpdate={handleUpdate} />
                    <MemoizedSelectField id="localidad" label="Localidad" value={formData.localidad} onUpdate={handleUpdate} options={DEPARTAMENTOS} />
                    <MemoizedSelectField id="programa" label="Programa" value={formData.programa} onUpdate={handleUpdate} options={Object.values(PROGRAMAS)} />
                    <MemoizedSelectField id="estado" label="Estado" value={formData.estado} onUpdate={handleUpdate} options={ESTADOS_PARTICIPANTE} />
                    {formData.programa === PROGRAMAS.TUTORIAS && (
                        <MemoizedSelectField id="categoria" label="Categoría (Tutorías)" value={formData.categoria} onUpdate={handleUpdate} options={CATEGORIAS_TUTORIAS} />
                    )}
                    <MemoizedTextField id="lugarTrabajo" label="Lugar de Trabajo" value={formData.lugarTrabajo} onUpdate={handleUpdate} />
                    <MemoizedTextField id="email" label="Email" type="email" value={formData.email} onUpdate={handleUpdate} />
                    <MemoizedTextField id="telefono" label="Teléfono" value={formData.telefono} onUpdate={handleUpdate} />
                    <MemoizedSwitchField id="esEquipoTecnico" label="Es Equipo Técnico" checked={formData.esEquipoTecnico} onUpdate={handleUpdate} />
                </div>
            </form>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 bg-gray-50 border-t rounded-b-lg">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" form={formId}>Guardar Cambios</Button>
        </div>
      </div>
    </div>
  );
};

export default EditParticipantForm;
