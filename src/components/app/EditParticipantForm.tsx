'use client';

import React, { useState } from 'react';
import {
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DEPARTAMENTOS, PROGRAMAS, CATEGORIAS_TUTORIAS } from '@/lib/constants';
import type { Participant } from '@/lib/types';

const formatDateForInput = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      const parts = (dateStr as string).split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return '';
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

interface EditParticipantFormProps {
  participant: Participant;
  onSave: (updatedData: Partial<Participant>) => void;
  onCancel: () => void;
}

const EditParticipantForm: React.FC<EditParticipantFormProps> = ({ participant, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    nombre: participant.nombre || '',
    dni: participant.dni || '',
    fechaNacimiento: formatDateForInput(participant.fechaNacimiento),
    actoAdministrativo: participant.actoAdministrativo || '',
    programa: participant.programa || '',
    fechaIngreso: formatDateForInput(participant.fechaIngreso),
    departamento: participant.departamento || '',
    categoria: participant.categoria || '',
    lugarTrabajo: participant.lugarTrabajo || '',
    email: participant.email || '',
    telefono: participant.telefono || '',
    esEquipoTecnico: participant.esEquipoTecnico || false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [id]: checked }));
  };

  const handleSave = () => {
    const changes: Partial<Participant> = {};

    // Create a baseline that is normalized the same way as the initial state
    const initialNormalizedData = {
      nombre: participant.nombre || '',
      dni: participant.dni || '',
      fechaNacimiento: formatDateForInput(participant.fechaNacimiento),
      actoAdministrativo: participant.actoAdministrativo || '',
      programa: participant.programa || '',
      fechaIngreso: formatDateForInput(participant.fechaIngreso),
      departamento: participant.departamento || '',
      categoria: participant.categoria || '',
      lugarTrabajo: participant.lugarTrabajo || '',
      email: participant.email || '',
      telefono: participant.telefono || '',
      esEquipoTecnico: participant.esEquipoTecnico || false,
    };

    // Compare the current form state against the normalized baseline
    for (const key in formData) {
      const typedKey = key as keyof typeof formData;
      if (formData[typedKey] !== initialNormalizedData[typedKey]) {
        changes[typedKey as keyof Participant] = formData[typedKey];
      }
    }

    if (Object.keys(changes).length > 0) {
        if (changes.programa && changes.programa !== PROGRAMAS.TUTORIAS) {
            changes.categoria = ''; // Clear categoria if program is not Tutorias
        }
      onSave(changes);
    } else {
      onCancel(); // No changes were made
    }
  };

  return (
    <AlertDialogContent className="max-w-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle>Editar Legajo de {participant.nombre}</AlertDialogTitle>
        <AlertDialogDescription>
          Modifique los campos necesarios y guarde los cambios.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 py-4 max-h-[70vh] overflow-y-auto pr-3">
        <div className="space-y-1"><Label htmlFor="nombre">Nombre y Apellido</Label><Input id="nombre" value={formData.nombre} onChange={handleChange} /></div>
        <div className="space-y-1"><Label htmlFor="dni">DNI</Label><Input id="dni" value={formData.dni} onChange={handleChange} /></div>
        <div className="space-y-1"><Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label><Input id="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleChange} /></div>
        <div className="space-y-1"><Label htmlFor="fechaIngreso">Fecha de Ingreso</Label><Input id="fechaIngreso" type="date" value={formData.fechaIngreso} onChange={handleChange} /></div>
        <div className="space-y-1">
          <Label htmlFor="programa">Programa</Label>
          <Select value={formData.programa} onValueChange={(v) => handleSelectChange('programa', v)}>
            <SelectTrigger id="programa"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.values(PROGRAMAS).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="departamento">Departamento</Label>
          <Select value={formData.departamento} onValueChange={(v) => handleSelectChange('departamento', v)}>
            <SelectTrigger id="departamento"><SelectValue /></SelectTrigger>
            <SelectContent>{DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {formData.programa === PROGRAMAS.TUTORIAS && (
          <div className="space-y-1">
            <Label htmlFor="categoria">Categoría Tutoría</Label>
            <Select value={formData.categoria} onValueChange={(v) => handleSelectChange('categoria', v)}>
              <SelectTrigger id="categoria"><SelectValue placeholder="Sin categoría" /></SelectTrigger>
              <SelectContent>{CATEGORIAS_TUTORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1"><Label htmlFor="actoAdministrativo">Acto Administrativo</Label><Input id="actoAdministrativo" value={formData.actoAdministrativo} onChange={handleChange} /></div>
        <div className="space-y-1"><Label htmlFor="lugarTrabajo">Lugar de Trabajo</Label><Input id="lugarTrabajo" value={formData.lugarTrabajo} onChange={handleChange} /></div>
        <div className="space-y-1"><Label htmlFor="telefono">Teléfono</Label><Input id="telefono" type="tel" value={formData.telefono} onChange={handleChange} /></div>
        <div className="md:col-span-2 space-y-1"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={formData.email} onChange={handleChange} /></div>
        <div className="md:col-span-2 flex items-center space-x-2 pt-2">
          <Checkbox id="esEquipoTecnico" checked={formData.esEquipoTecnico} onCheckedChange={(c) => handleCheckboxChange('esEquipoTecnico', c as boolean)} />
          <Label htmlFor="esEquipoTecnico" className="font-bold">Es parte del Equipo Técnico</Label>
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={handleSave}>Guardar Cambios</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
};

export default EditParticipantForm;