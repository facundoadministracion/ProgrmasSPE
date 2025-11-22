'use client';
import React, { useState } from 'react';
import type { Participant } from '@/lib/types';
import { MONTHS, PROGRAMAS } from '@/lib/constants';
import { useFirebase, useUser } from '@/firebase';
import { writeBatch, collection, doc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { ArrowRight, FileSignature, AlertTriangle, Upload, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


const PaymentUploadWizard = ({
  participants,
  onClose,
}: {
  participants: Participant[];
  onClose: () => void;
}) => {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState({
    programa: Object.values(PROGRAMAS)[0],
    mes: new Date().getMonth(),
    anio: new Date().getFullYear(),
  });
  const [analysis, setAnalysis] = useState<{
    matched: any[];
    unknown: any[];
    toDeactivate: Participant[];
    totalCsv: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [altaResolution, setAltaResolution] = useState('');
  const [flagMissing, setFlagMissing] = useState(true);

  const parseCSV = (text: string): { dni: string; monto: number }[] => {
    let lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    
    const separator = lines[0].includes(';') ? ';' : ',';
    const result = [];
    
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('dni') || firstLineLower.includes('monto')) {
      lines.shift();
    }

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      const currentline = lines[i].split(separator);
      if (currentline.length >= 2) {
        const dni = currentline[0].trim().replace(/\./g, '');
        const monto = parseFloat(currentline[1].trim());
        if (!isNaN(parseInt(dni)) && dni.length > 6 && !isNaN(monto)) {
          result.push({ dni, monto });
        }
      }
    }
    return result;
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;

      // FIX: Remove potential UTF-8 BOM character from the beginning of the file
      if (text && text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      
      const records = parseCSV(text);
      const programParticipants = participants.filter(
        (p) => p.programa === config.programa
      );
      const csvDnis = new Set(records.map(r => r.dni));

      const matched: any[] = [];
      const unknown: any[] = [];
      
      records.forEach((rec) => {
        const found = programParticipants.find((p) => p.dni.replace(/\./g, '').trim() === rec.dni);
        if (found) {
          const isNew = (found.pagosAcumulados || 0) === 0;
          matched.push({ ...rec, participant: found, isNew });
        } else {
          unknown.push(rec);
        }
      });
      
      const toDeactivate = programParticipants.filter(p => p.activo && !csvDnis.has(p.dni.replace(/\./g, '').trim()));

      setAnalysis({ matched, unknown, toDeactivate, totalCsv: records.length });
      setStep(3);
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleExecute = async () => {
    if (!analysis || !firestore || !user) return;
    setProcessing(true);

    try {
      const batch = writeBatch(firestore);
      const ultimoPagoStr = `${config.mes + 1}/${config.anio}`;

      // 1. Update matched participants
      analysis.matched.forEach((item) => {
        const partRef = doc(firestore, 'participants', item.participant.id);
        const updates: any = {
          pagosAcumulados: (item.participant.pagosAcumulados || 0) + 1,
          ultimoPago: ultimoPagoStr,
          activo: true, // Mark as active
        };

        if (item.isNew && altaResolution) {
          updates.actoAdministrativo = altaResolution;
        }
        batch.update(partRef, updates);

        const payRef = doc(collection(firestore, 'payments'));
        batch.set(payRef, {
          participantId: item.participant.id,
          participantName: item.participant.nombre,
          dni: item.dni,
          monto: item.monto,
          mes: String(config.mes + 1),
          anio: String(config.anio),
          fechaCarga: serverTimestamp(),
          ownerId: user.uid,
        });
      });

      // 2. Deactivate participants not in the CSV
      if (flagMissing) {
        analysis.toDeactivate.forEach(p => {
          const partRef = doc(firestore, 'participants', p.id);
          batch.update(partRef, { activo: false });

          const novRef = doc(collection(firestore, 'novedades'));
            batch.set(novRef, {
              participantId: p.id,
              participantName: p.nombre,
              descripcion: `Ausente en liquidación ${MONTHS[config.mes]} ${config.anio}. Se pasa a INACTIVO.`,
              fecha: new Date().toISOString().split('T')[0],
              fechaRealCarga: serverTimestamp(),
              ownerId: user.uid,
            });
        });
      }


      await batch.commit();
      alert(
        `¡Proceso finalizado!\n- Pagos registrados: ${analysis.matched.length}\n- Participantes pasados a INACTIVO: ${flagMissing ? analysis.toDeactivate.length : 0}`
      );
      onClose();
    } catch (e) {
      console.error(e);
      alert('Error procesando. Verifique la consola.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm font-medium text-gray-500 border-b pb-4">
        <span className={step >= 1 ? 'text-blue-600' : ''}>1. Configuración</span>
        <ArrowRight size={16} />
        <span className={step >= 2 ? 'text-blue-600' : ''}>2. Carga CSV</span>
        <ArrowRight size={16} />
        <span className={step >= 3 ? 'text-blue-600' : ''}>3. Confirmación</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Programa</label>
            <Select
              value={config.programa}
              onValueChange={(v) => setConfig({ ...config, programa: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PROGRAMAS).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Mes</label>
              <Select
                value={String(config.mes)}
                onValueChange={(v) => setConfig({ ...config, mes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Año</label>
              <Select
                value={String(config.anio)}
                onValueChange={(v) => setConfig({ ...config, anio: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)}>Siguiente</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
            Cargando pagos para <strong>{config.programa}</strong> -{' '}
            <strong>
              {MONTHS[config.mes]} {config.anio}
            </strong>
            .
          </div>
          <div className="flex items-center justify-center w-full">
            <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-4 text-gray-500" />
                    {selectedFile ? (
                        <p className="font-semibold text-gray-800">{selectedFile.name}</p>
                    ) : (
                        <>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click para subir</span> o arrastre el archivo</p>
                        <p className="text-xs text-gray-500">Archivo .CSV (DNI; MONTO)</p>
                        </>
                    )}
                </div>
                <Input id="csv-upload" type="file" className="hidden" accept=".csv,text/csv" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
            </label>
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button onClick={handleAnalyze} disabled={!selectedFile}>
              Analizar
            </Button>
          </div>
        </div>
      )}

      {step === 3 && analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <Card className="p-4 bg-green-50 border-green-200">
              <CardContent className="p-2">
                <h3 className="text-2xl font-bold text-green-700">
                  {analysis.matched.length}
                </h3>
                <p className="text-xs text-green-600 uppercase font-bold">
                  A Pagar (Activos)
                </p>
              </CardContent>
            </Card>
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <CardContent className="p-2">
                <h3 className="text-2xl font-bold text-yellow-700">
                  {analysis.toDeactivate.length}
                </h3>
                <p className="text-xs text-yellow-600 uppercase font-bold">
                  A Desactivar
                </p>
              </CardContent>
            </Card>
            <Card
              className={`p-4 ${
                analysis.unknown.length > 0
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <CardContent className="p-2">
                <h3 className="text-2xl font-bold">{analysis.unknown.length}</h3>
                <p className="text-xs uppercase font-bold">Desconocidos</p>
              </CardContent>
            </Card>
          </div>

          {analysis.matched.some((m) => m.isNew) && (
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4">
              <h4 className="font-bold text-indigo-800 flex items-center gap-2">
                <FileSignature size={18} /> Nuevas Altas Detectadas (
                {analysis.matched.filter((m) => m.isNew).length})
              </h4>
              <p className="text-sm text-indigo-700 mt-1 mb-2">
                Se detectaron participantes que recibirán su primer pago. Ingrese
                el Acto Administrativo si corresponde para actualizarlos
                masivamente.
              </p>
              <Input
                type="text"
                placeholder="Ej: Resolución Min. N° 123/2024"
                value={altaResolution}
                onChange={(e) => setAltaResolution(e.target.value)}
              />
            </div>
          )}

          {analysis.toDeactivate.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
              <h4 className="font-bold text-yellow-800 flex items-center gap-2">
                <AlertTriangle size={16} /> Gestión de Ausentes
              </h4>
              <p className="text-sm text-yellow-700 mt-1 mb-2">
                Personas activas en el padrón del programa que no figuran en este
                archivo de pago. Puede marcar una novedad y pasarlos a INACTIVO.
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="flagMissing"
                  checked={flagMissing}
                  onCheckedChange={(c) => setFlagMissing(!!c)}
                />
                <label
                  htmlFor="flagMissing"
                  className="text-sm font-bold text-yellow-900 select-none"
                >
                  Pasar a INACTIVO y registrar una novedad por la ausencia
                </label>
              </div>
            </div>
          )}

          {analysis.unknown.length > 0 && (
            <Card>
                <CardHeader className="bg-red-50">
                    <CardTitle className="text-red-800 flex items-center gap-2 text-base"><XCircle/>DNIs Desconocidos (Bloqueo de Seguridad)</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm text-red-700">
                    <p>Hay {analysis.unknown.length} DNIs en el archivo CSV que no se encontraron en el Padrón General de Participantes. Debe cargarlos primero antes de poder liquidarles un pago.</p>
                    <div className="max-h-40 overflow-y-auto mt-4 border bg-white p-2 rounded">
                        <Table>
                            <TableHeader><TableRow><TableHead>DNI Desconocido</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {analysis.unknown.map(u => (
                                    <TableRow key={u.dni}><TableCell className="font-mono">{u.dni}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button
              onClick={handleExecute}
              disabled={processing || analysis.unknown.length > 0}
              variant="default"
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
            >
              {processing ? 'Procesando...' : (
                analysis.unknown.length > 0 ? 'Corrija los Errores para Continuar' : 'Confirmar Operación'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default PaymentUploadWizard;

    