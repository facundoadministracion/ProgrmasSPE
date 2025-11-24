'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BajaFormProps {
  participantId: string;
  participantName: string;
  ownerId: string;
  onConfirm: (bajaData: any) => void;
}

const BajaForm: React.FC<BajaFormProps> = ({
  participantId,
  participantName,
  ownerId,
  onConfirm,
}) => {
  const [anioBaja, setAnioBaja] = useState(new Date().getFullYear().toString());
  const [mesBaja, setMesBaja] = useState((new Date().getMonth() + 1).toString());
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [otras, setOtras] = useState('');

  const handleConfirm = () => {
    const bajaData = {
      participantId,
      participantName,
      ownerId,
      fecha: new Date().toISOString().split('T')[0],
      anioBaja,
      mesBaja,
      motivo,
      detalle: detalle === 'Otras' ? otras : detalle,
    };
    onConfirm(bajaData);
  };

  const meses = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Registrar Baja de Participante</AlertDialogTitle>
        <AlertDialogDescription>
          Complete los siguientes datos para registrar la baja de{' '}
          <strong>{participantName}</strong>.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
            <label htmlFor="anioBaja" className="w-1/4 text-sm font-medium">
                Año de Baja
            </label>
            <Input
                id="anioBaja"
                value={anioBaja}
                onChange={(e) => setAnioBaja(e.target.value)}
                className="w-3/4"
            />
        </div>
        <div className="flex items-center gap-4">
            <label htmlFor="mesBaja" className="w-1/4 text-sm font-medium">
                Mes de Baja
            </label>
            <Select value={mesBaja} onValueChange={setMesBaja}>
                <SelectTrigger className="w-3/4">
                    <SelectValue placeholder="Seleccione un mes" />
                </SelectTrigger>
                <SelectContent>
                    {meses.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="motivo" className="w-1/4 text-sm font-medium">
            Motivo
          </label>
          <Select value={motivo} onValueChange={setMotivo}>
            <SelectTrigger className="w-3/4">
              <SelectValue placeholder="Seleccione un motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RRHH VInculados">RRHH VInculados</SelectItem>
              <SelectItem value="SINTyS">SINTyS</SelectItem>

              <SelectItem value="Decreto">Decreto</SelectItem>
              <SelectItem value="Resolucion">Resolucion</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <label htmlFor="detalle" className="w-1/4 text-sm font-medium">
            Detalle
          </label>
          <Select value={detalle} onValueChange={setDetalle}>
            <SelectTrigger className="w-3/4">
              <SelectValue placeholder="Seleccione un detalle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Renuncia">Renuncia</SelectItem>
              <SelectItem value="Trabajo Registrado">
                Trabajo Registrado
              </SelectItem>
              <SelectItem value="Incompatibilidad">Incompatibilidad</SelectItem>
              <SelectItem value="Otras">Otras</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {detalle === 'Otras' && (
          <div className="flex items-center gap-4">
            <label htmlFor="otras" className="w-1/4 text-sm font-medium">
              Especifique
            </label>
            <Input
              id="otras"
              value={otras}
              onChange={(e) => setOtras(e.target.value)}
              className="w-3/4"
              placeholder="Ingrese el motivo"
            />
          </div>
        )}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={handleConfirm}>Confirmar</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
};

export default BajaForm;
