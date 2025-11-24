'use client';

import React, { useState, useEffect } from 'react';
import type { Participant } from '@/lib/types';
import { PROGRAMAS, CATEGORIAS_TUTORIAS } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditParticipantFormProps {
  participant: Participant;
  onSave: (updatedData: Partial<Participant>) => void;
  onCancel: () => void;
}

const EditParticipantForm: React.FC<EditParticipantFormProps> = ({ participant, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nombre: participant.nombre || '',
    fechaNacimiento: participant.fechaNacimiento || '',
    fechaIngreso: participant.fechaIngreso || '',
    programa: participant.programa || '',
    categoria: participant.categoria || '',
    lugarTrabajo: participant.lugarTrabajo || '',
    email: participant.email || '',
    telefono: participant.telefono || '',
    esEquipoTecnico: participant.esEquipoTecnico || false,
  });

  useEffect(() => {
    // Si el programa no es Tutorías, limpiar la categoría
    if (formData.programa !== PROGRAMAS.TUTORIAS) {
      setFormData(prev => ({ ...prev, categoria: '' }));
    }
  }, [formData.programa]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
     setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (id: string, checked: boolean) => {
     setFormData(prev => ({ ...prev, [id]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const changes: Partial<Participant> = {};
    // Create a copy of formData to potentially modify before submission
    let submissionData = { ...formData };

    // If program is not Tutorias, ensure categoria is not sent
    if (submissionData.programa !== PROGRAMAS.TUTORIAS) {
        submissionData.categoria = '';
    }

    for (const key in submissionData) {
        const participantKey = key as keyof Participant;
        if (submissionData[participantKey] !== participant[participantKey]) {
            (changes as any)[participantKey] = submissionData[participantKey];
        }
    }

    if (Object.keys(changes).length > 0) {
        onSave(changes);
    }
  };

  const programas = Object.values(PROGRAMAS);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-bold mb-4">Editar Participante</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input id="nombre" value={formData.nombre} onChange={handleChange} />
            </div>
             <div>
                <Label htmlFor="dni">DNI (no editable)</Label>
                <Input id="dni" value={participant.dni} disabled />
            </div>
            <div>
                <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                <Input id="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
                <Input id="fechaIngreso" type="date" value={formData.fechaIngreso} onChange={handleChange} />
            </div>
             <div>
                <Label htmlFor="programa">Programa</Label>
                <Select value={formData.programa} onValueChange={(value) => handleSelectChange('programa', value)}>
                    <SelectTrigger><SelectValue placeholder="Seleccione un programa" /></SelectTrigger>
                    <SelectContent>
                        {programas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {formData.programa === PROGRAMAS.TUTORIAS && (
                <div>
                    <Label htmlFor="categoria">Categoría</Label>
                    <Select value={formData.categoria} onValueChange={(value) => handleSelectChange('categoria', value)}>
                        <SelectTrigger><SelectValue placeholder="Seleccione una categoría" /></SelectTrigger>
                        <SelectContent>
                            {CATEGORIAS_TUTORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="md:col-span-2">
                <Label htmlFor="lugarTrabajo">Lugar de Trabajo</Label>
                <Input id="lugarTrabajo" value={formData.lugarTrabajo} onChange={handleChange} />
            </div>
             <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={formData.telefono} onChange={handleChange} />
            </div>
             <div className="flex items-center space-x-2 pt-4">
                <Switch id="esEquipoTecnico" checked={formData.esEquipoTecnico} onCheckedChange={(checked) => handleSwitchChange('esEquipoTecnico', checked)} />
                <Label htmlFor="esEquipoTecnico">Es Equipo Técnico</Label>
            </div>
        </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar Cambios</Button>
      </div>
    </form>
  );
};

export default EditParticipantForm;