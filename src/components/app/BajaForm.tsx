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
  const [tipoActo, setTipoActo] = useState('');
  const [numeroActo, setNumeroActo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [otrasDetalle, setOtrasDetalle] = useState('');

  const handleConfirm = () => {
    const finalDetalle = detalle === 'Otras' ? otrasDetalle : detalle;
    const bajaData = {
      participantId,
      participantName,
      ownerId,
      fecha: new Date().toISOString().split('T')[0],
      anioBaja,
      mesBaja,
      motivo,
      detalle: finalDetalle,
      ...((motivo === 'Acto Administrativo' || motivo === 'SINTyS') && { tipoActo, numeroActo }),
    };
    onConfirm(bajaData);
  };

  const meses = [
    { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
  ];

  const motivosBaja = ['Acto Administrativo', 'RRHH Vinculados', 'SINTyS'].sort();
  const tiposActoAdmin = ['Decreto', 'Resolución'].sort();
  const detallesBaja = ['Horas Docentes', 'Otras', 'Renuncia', 'Trabajo Registrado'].sort();

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Registrar Baja de Participante</AlertDialogTitle>
        <AlertDialogDescription>
          Complete los siguientes datos para registrar la baja de{' '}
          <strong>{participantName}</strong>.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-4 py-4">
        <div className="flex items-center gap-4">
          <label className="w-1/4 text-sm font-medium">Año de Baja</label>
          <Input value={anioBaja} onChange={(e) => setAnioBaja(e.target.value)} className="w-3/4" />
        </div>
        <div className="flex items-center gap-4">
          <label className="w-1/4 text-sm font-medium">Mes de Baja</label>
          <Select value={mesBaja} onValueChange={setMesBaja}>
            <SelectTrigger className="w-3/4"><SelectValue placeholder="Seleccione un mes" /></SelectTrigger>
            <SelectContent>
              {meses.map((mes) => <SelectItem key={mes.value} value={mes.value}>{mes.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <label className="w-1/4 text-sm font-medium">Motivo</label>
          <Select value={motivo} onValueChange={setMotivo}>
            <SelectTrigger className="w-3/4"><SelectValue placeholder="Seleccione un motivo" /></SelectTrigger>
            <SelectContent>
              {motivosBaja.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {(motivo === 'Acto Administrativo' || motivo === 'SINTyS') && (
          <>
            <div className="flex items-center gap-4">
              <label className="w-1/4 text-sm font-medium">Tipo de Acto</label>
              <Select value={tipoActo} onValueChange={setTipoActo}>
                <SelectTrigger className="w-3/4"><SelectValue placeholder="Seleccione un tipo" /></SelectTrigger>
                <SelectContent>
                  {tiposActoAdmin.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <label className="w-1/4 text-sm font-medium">Número</label>
              <Input value={numeroActo} onChange={(e) => setNumeroActo(e.target.value)} className="w-3/4" placeholder="Ingrese el número" />
            </div>
          </>
        )}

        <div className="flex items-center gap-4">
          <label className="w-1/4 text-sm font-medium">Detalle</label>
          <Select value={detalle} onValueChange={setDetalle}>
            <SelectTrigger className="w-3/4"><SelectValue placeholder="Seleccione un detalle" /></SelectTrigger>
            <SelectContent>
              {detallesBaja.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {detalle === 'Otras' && (
          <div className="flex items-center gap-4">
            <label className="w-1/4 text-sm font-medium">Especifique</label>
            <Input value={otrasDetalle} onChange={(e) => setOtrasDetalle(e.target.value)} className="w-3/4" placeholder="Ingrese el detalle" />
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
