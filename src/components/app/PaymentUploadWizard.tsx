'use client';
import React, { useState, useMemo } from 'react';
import type { Participant } from '@/lib/types';
import { MONTHS, PROGRAMAS, CATEGORIAS_TUTORIAS } from '@/lib/constants';
import { useFirebase, useUser } from '@/firebase';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { writeBatch, collection, doc, serverTimestamp, increment, getDocs, query, where, addDoc } from 'firebase/firestore';
import { ArrowRight, AlertTriangle, Upload, XCircle, FileSignature, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const PaymentUploadWizard = ({ participants, onClose, onFindDni }: { participants: Participant[]; onClose: () => void; onFindDni: (dni: string) => void; }) => {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const { findConfigForDate, isLoading: configLoading } = useConfiguracion();

  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState({
    programa: Object.values(PROGRAMAS)[0],
    mes: new Date().getMonth(),
    anio: new Date().getFullYear(),
  });
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [altaResolution, setAltaResolution] = useState('');

  const cleanDNI = (value: any): string => String(value || '').normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/\D/g, '').trim();

  const parseCSV = (text: string): { dni: string; monto: number }[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const separator = lines[0].includes(';') ? ';' : ',';
    const result = [];
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('dni') || firstLineLower.includes('monto')) lines.shift();
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      const parts = line.split(separator);
      if (parts.length >= 2) {
        const dni = cleanDNI(parts[0]);
        const montoStr = String(parts[1] || '0').trim().replace(/\./g, '').replace(',', '.');
        const monto = parseFloat(montoStr);
        if (dni && dni.length > 6 && !isNaN(monto)) result.push({ dni, monto });
      }
    }
    return result;
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !firestore) return;
    setAnalyzing(true);

    try {
      const text = await selectedFile.text();
      const records = parseCSV(text);
      const csvDnis = new Set(records.map(r => r.dni));
      
      const configForMonth = findConfigForDate(config.mes + 1, config.anio);
      let montoCategoriaMap: Map<number, string> | null = null;

      if (config.programa === PROGRAMAS.TUTORIAS && configForMonth) {
          montoCategoriaMap = new Map();
          for (const [categoria, monto] of Object.entries(configForMonth.montos)) {
              if (CATEGORIAS_TUTORIAS.includes(categoria)) {
                  montoCategoriaMap.set(monto, categoria);
              }
          }
      }

      const prevMonthDate = new Date(config.anio, config.mes - 1);
      const prevPaymentsSnapshot = await getDocs(query(
        collection(firestore, 'pagosRegistrados'), 
        where('mes', '==', String(prevMonthDate.getMonth() + 1)), 
        where('anio', '==', String(prevMonthDate.getFullYear())),
        where('programa', '==', config.programa)
      ));
      const paidLastMonthDnis = new Set(prevPaymentsSnapshot.docs.map(doc => cleanDNI(doc.data().dni)));

      const allProgramParticipants = participants.filter(p => p.programa === config.programa);
      const participantMap = new Map(allProgramParticipants.map(p => [cleanDNI(p.dni), p]));

      const regulars: any[] = [], newlyPaid: any[] = [], unknown: any[] = [];

      for (const rec of records) {
        const participant = participantMap.get(rec.dni);
        let categoriaCalculada = null;
        if (config.programa === PROGRAMAS.TUTORIAS) {
            categoriaCalculada = montoCategoriaMap ? (montoCategoriaMap.get(rec.monto) || 'MONTO NO COINCIDE') : 'CONFIGURACION NO ENCONTRADA';
        }

        const paymentRecord = { ...rec, participant, categoriaCalculada };

        if (participant) {
          if (paidLastMonthDnis.has(rec.dni)) {
            regulars.push(paymentRecord);
          } else {
            newlyPaid.push(paymentRecord);
          }
        } else {
          unknown.push(paymentRecord);
        }
      }
      
      const absent = allProgramParticipants.filter(p => {
        const cleanParticipantDni = cleanDNI(p.dni);
        return p.activo && p.estado !== 'Ingresado' && !p.esEquipoTecnico &&
               paidLastMonthDnis.has(cleanParticipantDni) && 
               !csvDnis.has(cleanParticipantDni);
      });

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
    
    const paymentMonthStr = `${MONTHS[config.mes]}/${config.anio}`;

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
          mesAusencia: null,
        };
        if (analysis.newlyPaid.some(np => np.participant.id === item.participant.id) && altaResolution) {
          updates.actoAdministrativo = altaResolution;
        }
        if (item.categoriaCalculada && item.categoriaCalculada !== 'MONTO NO COINCIDE') {
            updates.categoria = item.categoriaCalculada;
        }
        batch.update(partRef, updates);
        
        const payRef = doc(collection(firestore, 'pagosRegistrados'));
        batch.set(payRef, {
          participantId: item.participant.id,
          dni: item.dni,
          nombre: item.participant.nombre,
          montoPagado: item.monto, 
          mes: String(config.mes + 1), 
          anio: String(config.anio),
          programa: config.programa,
          categoria: item.categoriaCalculada || item.participant.categoria || null,
          fechaCarga: serverTimestamp(), 
          ownerId: user.uid, 
        });
      });

      analysis.absent.forEach(p => {
        const partRef = doc(firestore, 'participants', p.id);
        batch.update(partRef, { estado: 'Requiere Atención', mesAusencia: paymentMonthStr });

        const novRef = doc(collection(firestore, 'novedades'));
        batch.set(novRef, {
          participantId: p.id, 
          participantName: p.nombre, 
          dni: p.dni,
          descripcion: `Ausente en liquidación ${MONTHS[config.mes]} ${config.anio}. Posible baja.`,
          type: 'POSIBLE_BAJA', 
          fecha: new Date().toISOString().split('T')[0], 
          mesEvento: String(config.mes + 1),
          anoEvento: String(config.anio),
          programa: config.programa,
          fechaRealCarga: serverTimestamp(), 
          ownerId: user.uid
        });
      });

      // Registrar en el historial de carga
      const paymentHistoryRef = doc(collection(firestore, 'paymentHistory'));
      batch.set(paymentHistoryRef, {
        uploadedAt: serverTimestamp(),
        uploadedBy: user.uid,
        mesLiquidacion: String(config.mes + 1),
        anoLiquidacion: String(config.anio),
        programa: config.programa,
        dnisProcesados: allPayments.map(p => p.dni),
        cantidadPagos: allPayments.length,
        cantidadAusentes: analysis.absent.length,
        cantidadRegulares: analysis.regulars.length,
        cantidadAltas: analysis.newlyPaid.length,
        cantidadDesconocidos: analysis.unknown.length,
      });

      await batch.commit();

      toast({ title: "¡Proceso de Pago Finalizado!", description: `Pagos registrados: ${allPayments.length}. Ausentes: ${analysis.absent.length}` });
      onClose();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error en la Ejecución', description: 'Error procesando. Verifique la consola.', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };
  
  const configReady = useMemo(() => {
      if (config.programa !== PROGRAMAS.TUTORIAS) return true;
      return !!findConfigForDate(config.mes + 1, config.anio);
  }, [config.programa, config.mes, config.anio, findConfigForDate]);

  return (
    <div className="space-y-6 p-1">
       <div className="flex items-center justify-between text-sm font-medium text-gray-500 border-b pb-4">
        <span className={step >= 1 ? 'text-blue-600 font-semibold' : ''}>1. Configuración</span> <ArrowRight size={16} className="text-gray-300"/>
        <span className={step >= 2 ? 'text-blue-600 font-semibold' : ''}>2. Carga CSV</span> <ArrowRight size={16} className="text-gray-300"/>
        <span className={step >= 3 ? 'text-blue-600 font-semibold' : ''}>3. Confirmación</span>
      </div>

      {step === 1 && (
        <div className="space-y-4 pt-4">
          <p className="text-sm text-gray-600">Seleccione el programa y el período para el cual desea registrar los pagos.</p>
          <div>
            <label className="block text-sm font-bold mb-1">Programa</label>
            <Select value={config.programa} onValueChange={(v) => setConfig({ ...config, programa: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.values(PROGRAMAS).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div> <label className="block text-sm font-bold mb-1">Mes de Pago</label> <Select value={String(config.mes)} onValueChange={(v) => setConfig({ ...config, mes: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select> </div>
            <div> <label className="block text-sm font-bold mb-1">Año</label> <Select value={String(config.anio)} onValueChange={(v) => setConfig({ ...config, anio: parseInt(v) })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select> </div>
          </div>
          {config.programa === PROGRAMAS.TUTORIAS && (
              <div className={`p-3 rounded-md text-sm ${configLoading ? 'bg-gray-100 text-gray-500' : (configReady ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800')}`}>
                  {configLoading ? <span className='flex items-center'><Loader2 className="animate-spin mr-2"/>Buscando configuración...</span> : (configReady ? 'Configuración de montos encontrada.' : 'Configuración de montos NO encontrada.')}
              </div>
          )}
          <div className="flex justify-end pt-4"><Button onClick={() => setStep(2)}>Siguiente</Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">Cargando pagos para <strong>{config.programa}</strong> - <strong>{MONTHS[config.mes]} {config.anio}</strong>.</div>
          <div className="flex items-center justify-center w-full">
            <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"><div className="flex flex-col items-center justify-center pt-5 pb-6"><Upload className="w-10 h-10 mb-4 text-gray-500" />{selectedFile ? <p className="font-semibold text-gray-800">{selectedFile.name}</p> : <><p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click para subir</span> o arrastre</p><p className="text-xs text-gray-500">.CSV (DNI; MONTO)</p></>}</div ><Input id="csv-upload" type="file" className="hidden" accept=".csv,text/csv" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} /></label>
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

          <div className="grid grid-cols-1 gap-6 items-start">
            {analysis.unknown.length > 0 && <Card className="border-red-500"><CardHeader className="bg-red-50"><CardTitle className="text-red-800 flex items-center gap-2 text-base"><XCircle/>DNIs Desconocidos (Bloqueo)</CardTitle></CardHeader><CardContent className="p-4 text-sm text-red-700"><p className='mb-4'>Hay {analysis.unknown.length} DNI que no se encontraron. Debe cargarlos primero.</p><div className="max-h-40 overflow-y-auto border bg-white p-2 rounded"><Table><TableHeader><TableRow><TableHead>DNI</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>{analysis.unknown.map((u:any) => <TableRow key={u.dni}><TableCell className="font-mono">{u.dni}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => onFindDni(u.dni)}><Search className="h-4 w-4 mr-2"/>Buscar</Button></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>}
            {analysis.absent.length > 0 && <Card className="border-yellow-200"><CardHeader className="bg-yellow-50"><CardTitle className="text-yellow-800 flex items-center gap-2 text-base"><AlertTriangle />Ausentes (Posible Baja)</CardTitle></CardHeader><CardContent className="p-4 text-sm text-yellow-800"><p>Se registrará una novedad para los <strong>{analysis.absent.length} participantes</strong> que cobraron el mes pasado pero no figuran en este archivo.</p></CardContent></Card>}
            {analysis.newlyPaid.length > 0 && (
              <Card className="border-indigo-200"><CardHeader className="bg-indigo-50"><CardTitle className="text-indigo-800 flex items-center gap-2 text-base"><FileSignature />Altas para este Período ({analysis.newlyPaid.length})</CardTitle></CardHeader><CardContent className="p-4"><p className="text-sm text-indigo-700 mb-2">Para las nuevas altas, ingrese el Decreto/Resolución de respaldo.</p><Input type="text" placeholder="Ej: Dec. N° 123/24" value={altaResolution} onChange={(e) => setAltaResolution(e.target.value)} />
              {config.programa === PROGRAMAS.TUTORIAS && <div className='mt-4'><p className="text-sm font-bold mb-2">Categorías Calculadas para Altas:</p><div className="max-h-32 overflow-y-auto"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Categoría</TableHead></TableRow></TableHeader><TableBody>{analysis.newlyPaid.map((p:any)=><TableRow key={p.dni}><TableCell>{p.participant.nombre}</TableCell><TableCell className={p.categoriaCalculada.includes('NO') ? 'text-red-600 font-bold' : ''}>{p.categoriaCalculada}</TableCell></TableRow>)}</TableBody></Table></div></div>}
              </CardContent></Card>
            )}
          </div>
          
          <div className="flex justify-between pt-6 border-t">
            <Button variant="ghost" onClick={() => { setAnalysis(null); setStep(2); }}>Atrás</Button>
            <Button onClick={handleExecute} disabled={processing || analyzing || analysis.unknown.length > 0 || (config.programa === PROGRAMAS.TUTORIAS && !configReady)} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"> {processing ? 'Procesando...' : (analysis.unknown.length > 0 ? 'Corrija los Errores' : 'Confirmar y Ejecutar')} </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentUploadWizard;