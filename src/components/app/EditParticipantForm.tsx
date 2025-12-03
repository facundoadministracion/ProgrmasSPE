'use client';

import React, { useState, useId } from 'react';
import type { Participant } from '@/lib/types';
import { PROGRAMAS, CATEGORIAS_TUTORIAS, ESTADOS_PARTICIPANTE, DEPARTAMENTOS } from '@/lib/constants';
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
  const formId = useId();
  const [formData, setFormData] = useState(participant);

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
  
  const FieldWrapper = ({ children, label, id }: { children: React.ReactNode, label: string, id: string }) => (
      <div className="flex-grow basis-1/3 p-2">
          <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
          <div className="mt-1">{children}</div>
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onMouseDown={onCancel}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Editar Legajo</h3>
            <form id={formId} onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto -m-2 p-2">
                <div className="flex flex-wrap">
                    <FieldWrapper label="Nombre Completo" id="nombre">
                        <Input id="nombre" value={formData.nombre} onChange={handleChange} />
                    </FieldWrapper>
                    <FieldWrapper label="DNI" id="dni">
                        <Input id="dni" value={participant.dni} disabled />
                    </FieldWrapper>
                    <FieldWrapper label="Fecha de Nacimiento" id="fechaNacimiento">
                        <Input id="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleChange} />
                    </FieldWrapper>
                    <FieldWrapper label="Fecha de Ingreso" id="fechaIngreso">
                        <Input id="fechaIngreso" type="date" value={formData.fechaIngreso} onChange={handleChange} />
                    </FieldWrapper>
                    <FieldWrapper label="Domicilio" id="domicilio">
                        <Input id="domicilio" value={formData.domicilio} onChange={handleChange} />
                    </FieldWrapper>
                    <FieldWrapper label="Localidad" id="localidad">
                        <Select value={formData.localidad} onValueChange={(value) => handleSelectChange('localidad', value)}>
                            <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent>
                                {DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FieldWrapper>
                     <FieldWrapper label="Programa" id="programa">
                        <Select value={formData.programa} onValueChange={(value) => handleSelectChange('programa', value)}>
                            <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent>
                                {Object.values(PROGRAMAS).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FieldWrapper>
                    <FieldWrapper label="Estado" id="estado">
                        <Select value={formData.estado} onValueChange={(value) => handleSelectChange('estado', value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ESTADOS_PARTICIPANTE.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FieldWrapper>
                     {formData.programa === PROGRAMAS.TUTORIAS && (
                        <FieldWrapper label="Categoría (Tutorías)" id="categoria">
                            <Select value={formData.categoria} onValueChange={(value) => handleSelectChange('categoria', value)}>
                                <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                <SelectContent>
                                    {CATEGORIAS_TUTORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FieldWrapper>
                     )}
                     <FieldWrapper label="Lugar de Trabajo" id="lugarTrabajo">
                        <Input id="lugarTrabajo" value={formData.lugarTrabajo} onChange={handleChange} />
                    </FieldWrapper>
                    <FieldWrapper label="Email" id="email">
                        <Input id="email" type="email" value={formData.email} onChange={handleChange} />
                    </FieldWrapper>
                    <FieldWrapper label="Teléfono" id="telefono">
                        <Input id="telefono" value={formData.telefono} onChange={handleChange} />
                    </FieldWrapper>
                    <div className="w-full p-2 mt-2">
                       <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded border border-indigo-100">
                           <Switch id="esEquipoTecnico" checked={formData.esEquipoTecnico} onCheckedChange={(checked) => handleSwitchChange('esEquipoTecnico', checked)} />
                           <Label htmlFor="esEquipoTecnico" className="font-bold text-indigo-800 select-none">Es Equipo Técnico</Label>
                        </div>
                    </div>
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
