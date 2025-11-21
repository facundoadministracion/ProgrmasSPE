'use client';
import React, { useState } from 'react';
import type { Participant } from '@/lib/types';
import { MONTHS, PROGRAMAS } from '@/lib/constants';
import { useFirebase, useUser } from '@/firebase';
import { parseCSV } from '@/lib/utils';
import { writeBatch, collection, doc, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, FileSignature, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';

const PaymentUploadWizard = ({ participants, onClose }: { participants: Participant[], onClose: () => void }) => {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [step, setStep] = useState(1); 
  const [config, setConfig] = useState({
    programa: Object.values(PROGRAMAS)[0],
    mes: new Date().getMonth(),
    anio: new Date().getFullYear()
  });
  const [csvText, setCsvText] = useState('');
  const [analysis, setAnalysis] = useState<{ matched: any[], unknown: any[], missing: any[], totalCsv: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const [altaResolution, setAltaResolution] = useState('');
  const [flagMissing, setFlagMissing] = useState(true);

  const handleAnalyze = () => {
    if(!csvText) return;
    const records = parseCSV(csvText);
    const programParticipants = participants.filter(p => p.programa === config.programa);
    
    const matched: any[] = [];
    const unknown: any[] = [];
    const missing: Participant[] = [];
    
    records.forEach(rec => {
        const found = programParticipants.find(p => p.dni === rec.dni);
        if(found) {
            const isNew = (found.pagosAcumulados || 0) === 0;
            matched.push({ ...rec, participant: found, isNew });
        } else {
            unknown.push(rec);
        }
    });

    programParticipants.forEach(p => {
        if(!p.activo) return; 
        const inCsv = records.find(rec => rec.dni === p.dni);
        if(!inCsv) {
            missing.push(p);
        }
    });

    setAnalysis({ matched, unknown, missing, totalCsv: records.length });
    setStep(3);
  };

  const handleExecute = async () => {
    if(!analysis || !firestore) return;
    setProcessing(true);
    
    try {
        const batch = writeBatch(firestore);
        let count = 0;
        
        analysis.matched.forEach(item => {
            const payRef = doc(collection(firestore, 'payments'));
            batch.set(payRef, {
                participantId: item.participant.id,
                participantName: item.participant.nombre,
                dni: item.dni,
                monto: item.monto,
                mes: String(config.mes + 1),
                anio: String(config.anio),
                fechaCarga: serverTimestamp(),
                ownerId: user?.uid
            });

            const updates: Partial<Participant> = {
                pagosAcumulados: (item.participant.pagosAcumulados || 0) + 1,
                ultimoPago: `${config.mes + 1}/${config.anio}`
            };

            if(item.isNew && altaResolution) {
                updates.actoAdministrativo = altaResolution;
            }

            const partRef = doc(firestore, 'participants', item.participant.id);
            batch.update(partRef, updates as any);
            count++;
        });

        if(flagMissing && analysis.missing.length > 0) {
            analysis.missing.forEach(p => {
                const novRef = doc(collection(firestore, 'novedades'));
                batch.set(novRef, {
                    participantId: p.id,
                    participantName: p.nombre,
                    descripcion: `Ausente en liquidación ${MONTHS[config.mes]} - Pendiente revisión`,
                    fecha: new Date().toISOString().split('T')[0],
                    fechaRealCarga: serverTimestamp(),
                    ownerId: user?.uid
                });
            });
        }

        await batch.commit();
        alert(`¡Proceso finalizado!\n- Pagos imputados: ${count}\n- Altas actualizadas: ${analysis.matched.filter(m=>m.isNew).length}\n- Ausencias reportadas: ${flagMissing ? analysis.missing.length : 0}`);
        onClose();
    } catch (e) {
        console.error(e);
        alert("Error procesando. Verifique consola.");
    } finally {
        setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between text-sm font-medium text-gray-500 border-b pb-4">
            <span className={step >= 1 ? "text-blue-600" : ""}>1. Configuración</span>
            <ArrowRight size={16} />
            <span className={step >= 2 ? "text-blue-600" : ""}>2. Carga CSV</span>
            <ArrowRight size={16} />
            <span className={step >= 3 ? "text-blue-600" : ""}>3. Confirmación</span>
        </div>

        {step === 1 && (
            <div className="space-y-4">
                <div><label className="block text-sm font-bold mb-1">Programa</label>
                  <Select value={config.programa} onValueChange={(v) => setConfig({...config, programa: v as any})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{Object.values(PROGRAMAS).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">Mes</label>
                      <Select value={String(config.mes)} onValueChange={(v) => setConfig({...config, mes: parseInt(v)})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="block text-sm font-bold mb-1">Año</label>
                      <Select value={String(config.anio)} onValueChange={(v) => setConfig({...config, anio: parseInt(v)})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{[2023, 2024, 2025].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                </div>
                <div className="flex justify-end pt-4"><Button onClick={() => setStep(2)}>Siguiente</Button></div>
            </div>
        )}

        {step === 2 && (
            <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">Cargando pagos para <strong>{config.programa}</strong> - <strong>{MONTHS[config.mes]} {config.anio}</strong>.</div>
                <Textarea className="w-full h-48 font-mono text-sm" placeholder="DNI, MONTO..." value={csvText} onChange={e => setCsvText(e.target.value)}></Textarea>
                <div className="flex justify-between pt-4"><Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button><Button onClick={handleAnalyze} disabled={!csvText}>Analizar</Button></div>
            </div>
        )}

        {step === 3 && analysis && (
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <Card className="p-4 bg-green-50 border-green-200"><CardContent><h3 className="text-2xl font-bold text-green-700">{analysis.matched.length}</h3><p className="text-xs text-green-600 uppercase font-bold">A Pagar</p></CardContent></Card>
                    <Card className="p-4 bg-yellow-50 border-yellow-200"><CardContent><h3 className="text-2xl font-bold text-yellow-700">{analysis.missing.length}</h3><p className="text-xs text-yellow-600 uppercase font-bold">Ausentes</p></CardContent></Card>
                    <Card className={`p-4 ${analysis.unknown.length > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 text-gray-400'}`}><CardContent><h3 className="text-2xl font-bold">{analysis.unknown.length}</h3><p className="text-xs uppercase font-bold">Desconocidos</p></CardContent></Card>
                </div>

                {analysis.matched.some(m => m.isNew) && (
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4">
                         <h4 className="font-bold text-indigo-800 flex items-center gap-2"><FileSignature size={18}/> Nuevas Altas Detectadas ({analysis.matched.filter(m=>m.isNew).length})</h4>
                         <p className="text-sm text-indigo-700 mt-1 mb-2">Se detectaron participantes que recibirán su primer pago. Ingrese el Acto Administrativo si corresponde para actualizarlos masivamente.</p>
                         <Input type="text" placeholder="Ej: Resolución Min. N° 123/2024" value={altaResolution} onChange={(e) => setAltaResolution(e.target.value)} />
                    </div>
                )}

                {analysis.missing.length > 0 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                        <h4 className="font-bold text-yellow-800 flex items-center gap-2"><AlertTriangle size={16}/> Gestión de Ausentes</h4>
                        <p className="text-sm text-yellow-700 mt-1 mb-2">Personas activas que no figuran en este archivo de pago.</p>
                        <div className="flex items-center gap-2">
                            <Checkbox id="flagMissing" checked={flagMissing} onCheckedChange={(c) => setFlagMissing(!!c)} />
                            <label htmlFor="flagMissing" className="text-sm font-bold text-yellow-900 select-none">Registrar "Posible Baja / Revisión" en sus novedades</label>
                        </div>
                    </div>
                )}

                {analysis.unknown.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-800 text-sm">
                        <strong>Bloqueo de Seguridad:</strong> Hay {analysis.unknown.length} DNIs desconocidos. Debe cargarlos primero en Participantes para asignarles el Acto Administrativo correspondiente.
                    </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                    <Button variant="ghost" onClick={() => setStep(2)}>Atrás</Button>
                    {analysis.unknown.length === 0 ? (
                        <Button onClick={handleExecute} disabled={processing || analysis.matched.length === 0} variant="default" className="bg-green-600 hover:bg-green-700">
                            {processing ? 'Procesando...' : 'Confirmar Operación'}
                        </Button>
                    ) : (
                        <Button disabled>Corregir Errores</Button>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
export default PaymentUploadWizard;
