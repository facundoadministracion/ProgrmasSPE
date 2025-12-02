'use client';
import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MONTHS, CAUSALES_GENERALES, CAUSALES_SINTYS } from '@/lib/constants';

const BajaForm = ({ participantId, participantName, ownerId, onConfirm, onCancel, mesAusencia }: 
  { participantId: string; participantName: string; ownerId: string; onConfirm: (data: any) => void; onCancel: () => void; mesAusencia?: string | null; }) => {
  
  const parseMesAusencia = (mesAusencia: string | null | undefined) => {
    if (!mesAusencia) return { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() };
    const [mesStr, anioStr] = mesAusencia.split('/');
    const mesIndex = MONTHS.findIndex(m => m.toLowerCase() === mesStr.toLowerCase());
    return {
      mes: mesIndex !== -1 ? mesIndex + 1 : new Date().getMonth() + 1,
      anio: anioStr ? parseInt(anioStr) : new Date().getFullYear(),
    };
  };

  const initialBajaState = parseMesAusencia(mesAusencia);

  const [motivo, setMotivo] = useState('');
  const [tipoActo, setTipoActo] = useState('');
  const [numeroActo, setNumeroActo] = useState('');
  const [causalInforme, setCausalInforme] = useState('');
  const [mesBaja, setMesBaja] = useState<string>(String(initialBajaState.mes));
  const [anioBaja, setAnioBaja] = useState<string>(String(initialBajaState.anio));
  const [detalle, setDetalle] = useState('');

  useEffect(() => {
    setCausalInforme(''); // Reset causal on motivo change
  }, [motivo]);

  const handleSubmit = () => {
    const bajaData = {
      participantId,
      participantName,
      ownerId,
      motivo,
      tipoActo: isActoAdministrativo ? tipoActo : null,
      numeroActo: isActoAdministrativo ? numeroActo : null,
      causalInforme: isCausalRequired ? causalInforme : null,
      mesBaja,
      anioBaja,
      detalle,
      fecha: new Date().toISOString().split('T')[0],
    };
    onConfirm(bajaData);
  };

  const isActoAdministrativo = motivo === 'Acto Administrativo' || motivo === 'Cruce SINTyS';
  const isCausalRequired = motivo === 'Acto Administrativo' || motivo === 'Cruce SINTyS' || motivo === 'Informe Vinculados';

  const getCausalOptions = () => {
    if (motivo === 'Cruce SINTyS') return CAUSALES_SINTYS;
    if (motivo === 'Acto Administrativo' || motivo === 'Informe Vinculados') return CAUSALES_GENERALES;
    return [];
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg relative max-h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Registrar Baja de Participante</h2>
            <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5"/></Button>
          </div>
          <p className="text-sm text-gray-600 mb-6">Estás por dar de baja a <strong>{participantName}</strong>.</p>

          <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold mb-1">Motivo de la Baja</label>
                <Select value={motivo} onValueChange={setMotivo}>
                    <SelectTrigger><SelectValue placeholder="Seleccione un motivo..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Acto Administrativo">Acto Administrativo</SelectItem>
                        <SelectItem value="Cruce SINTyS">Cruce SINTyS</SelectItem>
                        <SelectItem value="Informe Vinculados">Informe Vinculados</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isActoAdministrativo && (
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-gray-50">
                <div>
                  <label className="block text-sm font-bold mb-1">Tipo de Acto</label>
                  <Select value={tipoActo} onValueChange={setTipoActo}>
                      <SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Decreto">Decreto</SelectItem>
                          <SelectItem value="Resolución">Resolución</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Número</label>
                  <Input value={numeroActo} onChange={(e) => setNumeroActo(e.target.value)} placeholder="Ej: 1234/24" />
                </div>
              </div>
            )}

            {isCausalRequired && (
              <div className="p-4 border rounded-md bg-gray-50">
                <label className="block text-sm font-bold mb-1">Causal</label>
                <Select value={causalInforme} onValueChange={setCausalInforme}>
                    <SelectTrigger><SelectValue placeholder="Seleccione una causal..." /></SelectTrigger>
                    <SelectContent>
                        {getCausalOptions().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="p-4 border rounded-md bg-blue-50 border-blue-200">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-blue-800"><Calendar /> Período del Evento</h4>
                <p className="text-xs text-blue-700 mb-3">Indica el mes y año en que se hizo efectiva la baja.</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Mes de Baja</label>
                        <Select value={mesBaja} onValueChange={setMesBaja}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Año de Baja</label>
                        <Select value={anioBaja} onValueChange={setAnioBaja}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>{[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold mb-1 flex items-center gap-2"><FileText size={16}/>Detalles Adicionales</label>
                <Textarea value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Añada cualquier información relevante..." />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!motivo || (isActoAdministrativo && (!tipoActo || !numeroActo)) || (isCausalRequired && !causalInforme)}>Confirmar Baja</Button>
        </div>
      </div>
    </div>
  );
};

export default BajaForm;
