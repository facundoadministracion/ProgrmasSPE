'use client';
import React, { useState } from 'react';
import type { Participant } from '@/lib/types';
import { MONTHS, PROGRAMAS } from '@/lib/constants';
import { useFirebase, useUser } from '@/firebase';
import { writeBatch, collection, doc, serverTimestamp, increment, getDocs, query, where, addDoc } from 'firebase/firestore';
import { ArrowRight, AlertTriangle, Upload, XCircle, FileSignature, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const PaymentUploadWizard = ({ participants, onClose, onFindDni }: { participants: Participant[]; onClose: () => void; onFindDni: (dni: string) => void; }) => {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState({
    programa: Object.values(PROGRAMAS)[0],
    mes: new Date().getMonth(),
    anio: new Date().getFullYear(),
  });
  const [analysis, setAnalysis] = useState<{
    regulars: any[];
    newlyPaid: any[];
    absent: Participant[];
    unknown: any[];
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [altaResolution, setAltaResolution] = useState('');
  
  const cleanDNI = (value: any): string => {
    return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/\D/g, '').trim();
  };

  const parseCSV = (text: string): { dni: string; monto: number }[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const separator = lines[0].includes(';') ? ';' : ',';
    const result = [];
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('dni') || firstLineLower.includes('monto')) {
      lines.shift();
    }
    for (const line of lines) {
      if (line.trim() === '') continue;
      const parts = line.split(separator);
      if (parts.length >= 2) {
        const dni = cleanDNI(parts[0]);
        const monto = parseFloat(String(parts[1] || '0').trim().replace(',', '.'));
        if (dni && dni.length > 6 && !isNaN(monto)) {
          result.push({ dni, monto });
        }
      }
    }
    return result;
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !firestore) return;
    setAnalyzing(true);

    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(selectedFile, 'UTF-8');
      });

      const records = parseCSV(text);
      const csvDnis = new Set(records.map(r => r.dni));
      
      const prevMonthDate = new Date(config.anio, config.mes - 1);
      const prevMes = String(prevMonthDate.getMonth() + 1);
      const prevAnio = String(prevMonthDate.getFullYear());
      
      const paymentsRef = collection(firestore, 'payments');
      const q = query(paymentsRef, 
        where('mes', '==', prevMes), 
        where('anio', '==', prevAnio),
        where('programa', '==', config.programa)
      );
      const prevPaymentsSnapshot = await getDocs(q);
      const paidLastMonthIds = new Set(prevPaymentsSnapshot.docs.map(doc => doc.data().participantId));

      const allProgramParticipants = participants.filter(p => p.programa === config.programa);
      const participantMap = new Map(allProgramParticipants.map(p => [p.dni, p]));

      const regulars: any[] = [];
      const newlyPaid: any[] = [];
      const unknown: any[] = [];

      for (const rec of records) {
        const participant = participantMap.get(rec.dni);
        if (participant) {
          if (paidLastMonthIds.has(participant.id)) {
            regulars.push({ ...rec, participant });
          } else {
            newlyPaid.push({ ...rec, participant });
          }
        } else {
          unknown.push(rec);
        }
      }
      
      const absent = allProgramParticipants.filter(p =>
        p.activo &&
        p.estado !== 'Ingresado' &&
        !p.esEquipoTecnico &&
        paidLastMonthIds.has(p.id) &&
        !csvDnis.has(p.dni)
      );

      setAnalysis({ regulars, newlyPaid, absent, unknown });
      setStep(3);
    } catch (e) {
      console.error("Error analyzing file:", e);
      toast({ title: 'Error de Análisis', description: 'Ocurrió un error al analizar el archivo.', variant: 'destructive' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecute = async () => {
    if (!analysis || !firestore || !user) return;
    setProcessing(true);
    
    const paymentId = `${config.programa}-${config.mes + 1}-${config.anio}`;
    const paymentMonthStr = `${config.mes + 1}/${config.anio}`;

    try {
      const batch = writeBatch(firestore);
      const allPayments = [...analysis.regulars, ...analysis.newlyPaid];

      allPayments.forEach((item) => {
        const partRef = doc(firestore, 'participants', item.participant.id);
        const updates: any = {
          pagosAcumulados: increment(1),
          ultimoPago: paymentMonthStr,
          activo: true,
          estado: 'Activo',
          mesAusencia: null // Limpiar el mes de ausencia si está cobrando
        };
        if (analysis.newlyPaid.some(np => np.participant.id === item.participant.id) && altaResolution) {
          updates.actoAdministrativo = altaResolution;
        }
        batch.update(partRef, updates);
      });

      analysis.absent.forEach(p => {
        const partRef = doc(firestore, 'participants', p.id);
        batch.update(partRef, { 
            estado: 'Requiere Atención', 
            mesAusencia: `${config.mes + 1}/${config.anio}` // Guardar el mes de ausencia
        });
      });

      await batch.commit();

      const historyBatch = writeBatch(firestore);
      const paymentRecordRef = doc(firestore, "paymentRecords", paymentId);
      historyBatch.set(paymentRecordRef, {
        id: paymentId,
        programa: config.programa,
        mes: String(config.mes + 1),
        anio: String(config.anio),
        participantes: allPayments.map(p => ({ id: p.participant.id, dni: p.dni, nombre: p.participant.nombre, pagosAcumuladosPrev: p.participant.pagosAcumulados, estadoPrev: p.participant.estado || 'Activo' })),
        ausentes: analysis.absent.map(p => ({ id: p.id, dni: p.dni, nombre: p.nombre, estadoPrev: p.estado || 'Activo' })),
        fechaCarga: serverTimestamp(),
        ownerId: user.uid,
        ownerName: user.displayName || user.email
      });

      allPayments.forEach(item => {
        const payRef = doc(collection(firestore, 'payments'));
        historyBatch.set(payRef, {
          participantId: item.participant.id,
          dni: item.dni, monto: item.monto, mes: String(config.mes + 1), anio: String(config.anio),
          programa: config.programa, fechaCarga: serverTimestamp(), ownerId: user.uid, paymentRecordId: paymentId
        });
      });

      analysis.absent.forEach(p => {
        const novRef = doc(collection(firestore, 'novedades'));
        historyBatch.set(novRef, {
          participantId: p.id, participantName: p.nombre, dni: p.dni,
          descripcion: `Ausente en liquidación ${MONTHS[config.mes]} ${config.anio}.`,
          type: 'POSIBLE_BAJA', fecha: new Date().toISOString().split('T')[0], 
          fechaRealCarga: serverTimestamp(), ownerId: user.uid, paymentRecordId: paymentId
        });
      });

      await historyBatch.commit();

      toast({ title: "¡Proceso de Pago Finalizado!", 
        description: `Regulares: ${analysis.regulars.length}, Altas: ${analysis.newlyPaid.length}, Ausentes: ${analysis.absent.length}`
      });

      onClose();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error en la Ejecución', description: 'Error procesando. Verifique la consola.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between text-sm font-medium text-gray-500 border-b pb-4">
        <span className={step >= 1 ? 'text-blue-600 font-semibold' : ''}>1. Configuración</span>
        <ArrowRight size={16} className="text-gray-300"/>
        <span className={step >= 2 ? 'text-blue-600 font-semibold' : ''}>2. Carga CSV</span>
        <ArrowRight size={16} className="text-gray-300"/>
        <span className={step >= 3 ? 'text-blue-600 font-semibold' : ''}>3. Confirmación</span>
      </div>

      {step === 1 && (
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-bold mb-1">Programa</label>
            <Select value={config.programa} onValueChange={(v) => setConfig({ ...config, programa: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.values(PROGRAMAS).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Mes de Pago</label>
              <Select value={String(config.mes)} onValueChange={(v) => setConfig({ ...config, mes: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Año</label>
              <Select value={String(config.anio)} onValueChange={(v) => setConfig({ ...config, anio: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(2)}>Siguiente</Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">Cargando pagos para <strong>{config.programa}</strong> - <strong>{MONTHS[config.mes]} {config.anio}</strong>.</div>
          <div className="flex items-center justify-center w-full">
            <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"><div className="flex flex-col items-center justify-center pt-5 pb-6"><Upload className="w-10 h-10 mb-4 text-gray-500" />{selectedFile ? <p className="font-semibold text-gray-800">{selectedFile.name}</p> : <><p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click para subir</span> o arrastre el archivo</p><p className="text-xs text-gray-500">Archivo .CSV (DNI; MONTO)</p></>}</div ><Input id="csv-upload" type="file" className="hidden" accept=".csv,text/csv" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} /></label>
          </div>
          <div className="flex justify-between pt-4"><Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button><Button onClick={handleAnalyze} disabled={!selectedFile || analyzing}>{analyzing ? 'Analizando...' : 'Analizar'}</Button></div>
        </div>
      )}

      {step === 3 && analysis && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <Card className="p-4 bg-green-50 border-green-200"><CardContent className="p-2"><h3 className="text-2xl font-bold text-green-700">{analysis.regulars.length}</h3><p className="text-xs text-green-600 uppercase font-bold">Regulares</p></CardContent></Card>
            <Card className="p-4 bg-blue-50 border-blue-200"><CardContent className="p-2"><h3 className="text-2xl font-bold text-blue-700">{analysis.newlyPaid.length}</h3><p className="text-xs text-blue-600 uppercase font-bold">Nuevas Altas</p></CardContent></Card>
            <Card className="p-4 bg-yellow-50 border-yellow-200"><CardContent className="p-2"><h3 className="text-2xl font-bold text-yellow-700">{analysis.absent.length}</h3><p className="text-xs text-yellow-600 uppercase font-bold">Ausentes</p></CardContent></Card>
            <Card className={`p-4 ${analysis.unknown.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-100'}`}><CardContent className="p-2"><h3 className={`text-2xl font-bold ${analysis.unknown.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>{analysis.unknown.length}</h3><p className={`text-xs uppercase font-bold ${analysis.unknown.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>Desconocidos</p></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              {analysis.unknown.length > 0 && (
                <Card className="border-red-500"><CardHeader className="bg-red-50"><CardTitle className="text-red-800 flex items-center gap-2 text-base"><XCircle/>DNIs Desconocidos (Bloqueo)</CardTitle></CardHeader><CardContent className="p-4 text-sm text-red-700"><p className='mb-4'>Hay {analysis.unknown.length} DNI que no se encontraron en el padrón. Debe cargarlos primero para continuar.</p><div className="max-h-40 overflow-y-auto border bg-white p-2 rounded"><Table><TableHeader><TableRow><TableHead>DNI</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>{analysis.unknown.map(u => <TableRow key={u.dni}><TableCell className="font-mono">{u.dni}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onFindDni(u.dni)}><Search className="h-4 w-4 mr-2"/>Buscar</Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
              )}
              {analysis.absent.length > 0 && (
                 <Card className="border-yellow-200"><CardHeader className="bg-yellow-50"><CardTitle className="text-yellow-800 flex items-center gap-2 text-base"><AlertTriangle />Ausentes (Posible Baja)</CardTitle></CardHeader><CardContent className="p-4 text-sm text-yellow-800"><p>Se registrará una novedad y se marcará como "Requiere Atención" a los <strong>{analysis.absent.length} participantes</strong> que cobraron el mes pasado pero no figuran en este archivo. <strong>No se darán de baja.</strong></p></CardContent></Card>
              )}
            </div>
            <div className="space-y-6">
              {analysis.newlyPaid.length > 0 && (
                <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-md"><h4 className="font-bold text-indigo-800 flex items-center gap-2"><FileSignature size={18} /> Gestión de Altas ({analysis.newlyPaid.length})</h4><p className="text-sm text-indigo-700 mt-1 mb-2">Participantes que no cobraron el mes anterior. Ingrese el Decreto/Resolución de alta.</p><Input type="text" placeholder="Ej: Dec. N° 123/24" value={altaResolution} onChange={(e) => setAltaResolution(e.target.value)} /></div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between pt-6 border-t">
            <Button variant="ghost" onClick={() => { setAnalysis(null); setStep(2); }}>Atrás</Button>
            <Button onClick={handleExecute} disabled={processing || analyzing || analysis.unknown.length > 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400">{processing ? 'Procesando...' : (analysis.unknown.length > 0 ? 'Corrija los Errores' : 'Confirmar y Ejecutar')}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentUploadWizard;        
