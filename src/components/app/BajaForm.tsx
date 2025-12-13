'use client';
import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MONTHS, CAUSALES_GENERALES, CAUSALES_SINTYS } from '@/lib/constants';

const BajaForm = ({ 
  participantName,
  onConfirm, 
  onCancel, 
  mesAusencia,
  initialData = null,
  isEditing = false
}: 
{
  participantName: string; 
  onConfirm: (data: any) => void; 
  onCancel: () => void; 
  mesAusencia?: string | null; 
  initialData?: any | null;
  isEditing?: boolean;
}) => {
  
  const parseMesAusencia = (mesAusencia: string | null | undefined) => {
    if (!mesAusencia) return { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() };
    const [mesStr, anioStr] = mesAusencia.split('/');
    const mesIndex = MONTHS.findIndex(m => m.toLowerCase() === mesStr.toLowerCase());
    return {
      mes: mesIndex !== -1 ? mesIndex + 1 : new Date().getMonth() + 1,
      anio: anioStr ? parseInt(anioStr) : new Date().getFullYear(),
    };
  };

  const getInitialState = () => {
    if (initialData) {
        return {
            motivo: initialData.motivo || '',
            tipoActo: initialData.tipoActo || '',
            numeroActo: initialData.numeroActo || '',
            causalInforme: initialData.causalInforme || '',
            mesBaja: initialData.mesBaja || String(new Date().getMonth() + 1),
            anioBaja: initialData.anioBaja || String(new Date().getFullYear()),
            detalle: initialData.detalle || '',
        }
    } 
    const initialBajaState = parseMesAusencia(mesAusencia);
    return {
        motivo: '',
        tipoActo: '',
        numeroActo: '',
        causalInforme: '',
        mesBaja: String(initialBajaState.mes),
        anioBaja: String(initialBajaState.anio),
        detalle: '',
    }
  }

  const [formData, setFormData] = useState(getInitialState());

  useEffect(() => {
    setFormData(getInitialState());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    if (field === 'motivo') {
      setFormData(prev => ({...prev, causalInforme: ''}));
    }
  }

  const handleSubmit = () => {
    onConfirm(formData);
  };

  const { motivo, tipoActo, numeroActo, causalInforme, mesBaja, anioBaja, detalle } = formData;

  const isActoAdministrativo = motivo === 'Acto Administrativo' || motivo === 'Cruce SINTyS';
  const isCausalRequired = motivo === 'Acto Administrativo' || motivo === 'Cruce SINTyS' || motivo === 'Informe Vinculados';

  const getCausalOptions = () => {
    if (motivo === 'Cruce SINTyS') return CAUSALES_SINTYS;
    if (motivo === 'Acto Administrativo' || motivo === 'Informe Vinculados') return CAUSALES_GENERALES;
    return [];
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl relative max-h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{isEditing ? 'Editar Baja de Participante' : 'Registrar Baja de Participante'}</h2>
            <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5"/></Button>
          </div>
          <p className="text-sm text-gray-600 mb-6">Estás gestionando la baja de <strong>{participantName}</strong>.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Columna Izquierda */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold mb-1">1. Motivo de la Baja</label>
                    <Select value={motivo} onValueChange={(v) => handleInputChange('motivo', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccione un motivo..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Acto Administrativo">Acto Administrativo</SelectItem>
                            <SelectItem value="Cruce SINTyS">Cruce SINTyS</SelectItem>
                            <SelectItem value="Informe Vinculados">Informe Vinculados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isActoAdministrativo && (
                  <div className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-gray-50">
                    <div>
                      <label className="block text-sm font-bold mb-1">Tipo de Acto</label>
                      <Select value={tipoActo} onValueChange={(v) => handleInputChange('tipoActo', v)}>
                          <SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="Decreto">Decreto</SelectItem>
                              <SelectItem value="Resolución">Resolución</SelectItem>
                          </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Número</label>
                      <Input value={numeroActo} onChange={(e) => handleInputChange('numeroActo', e.target.value)} placeholder="Ej: 1234/24" />
                    </div>
                  </div>
                )}

                {isCausalRequired && (
                  <div>
                    <label className="block text-sm font-bold mb-1">2. Causal</label>
                    <Select value={causalInforme} onValueChange={(v) => handleInputChange('causalInforme', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleccione una causal..." /></SelectTrigger>
                        <SelectContent>
                            {getCausalOptions().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                )}
            </div>

            {/* Columna Derecha */}
            <div className="space-y-4">
                <div className="p-3 border rounded-md bg-blue-50 border-blue-200">
                    <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-blue-800"><Calendar /> 3. Período del Evento</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Mes</label>
                            <Select value={mesBaja} onValueChange={(v) => handleInputChange('mesBaja', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Año</label>
                            <Select value={anioBaja} onValueChange={(v) => handleInputChange('anioBaja', v)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{[2021, 2022, 2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold mb-1 flex items-center gap-2"><FileText size={16}/>4. Detalles Adicionales</label>
                    <Textarea value={detalle} onChange={(e) => handleInputChange('detalle', e.target.value)} placeholder="Añada cualquier información relevante..." rows={isActoAdministrativo || isCausalRequired ? 3 : 6}/>
                </div>
            </div>

          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!motivo || (isActoAdministrativo && (!tipoActo || !numeroActo)) || (isCausalRequired && !causalInforme)}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
};

export default BajaForm;
