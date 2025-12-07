'use client';
import React, { useState } from 'react';
import type { Participant } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { writeBatch, collection, doc } from 'firebase/firestore';
import { FileUp, CheckCircle, XCircle, UploadCloud, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface PaymentHistoryUploadWizardProps {
  allParticipants: Participant[];
  onClose: () => void;
}

const PaymentHistoryUploadWizard = ({ allParticipants, onClose }: PaymentHistoryUploadWizardProps) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const [analysis, setAnalysis] = useState<{
    paymentsByDni: Map<string, string[]>;
    foundParticipants: Map<string, Participant>;
    unfoundDnis: string[];
  } | null>(null);

  const parsePaymentHistoryCSV = (text: string): Map<string, string[]> => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return new Map();
    
    const paymentsByDni = new Map<string, string[]>();
    const separator = lines[0].includes(';') ? ';' : ',';

    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes('dni') || firstLineLower.includes('mes_pago')) {
      lines.shift();
    }
    
    lines.forEach(line => {
      try {
        const [dni, mesPago] = line.split(separator).map(v => v.trim());
        const cleanDni = String(dni?.replace(/\./g, '') || '');
        if (cleanDni && mesPago) {
          const payments = paymentsByDni.get(cleanDni) || [];
          if (!payments.includes(mesPago)) {
            payments.push(mesPago);
          }
          paymentsByDni.set(cleanDni, payments);
        }
      } catch (e) {
        console.error("Error parsing line:", line, e);
      }
    });
    return paymentsByDni;
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const paymentsByDni = parsePaymentHistoryCSV(text);
      
      const existingParticipantsMap = new Map(allParticipants.map(p => [String(p.dni), p]));
      const foundParticipants = new Map<string, Participant>();
      const unfoundDnis: string[] = [];

      for (const dni of paymentsByDni.keys()) {
        if (existingParticipantsMap.has(dni)) {
          foundParticipants.set(dni, existingParticipantsMap.get(dni)!);
        } else {
          unfoundDnis.push(dni);
        }
      }
      
      setAnalysis({ paymentsByDni, foundParticipants, unfoundDnis });
      setStep(2);
    };
    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleExecute = async () => {
    if (!analysis || !firestore) return;
    setProcessing(true);

    try {
      const batch = writeBatch(firestore);
      let updatedCount = 0;

      for (const [dni, participant] of analysis.foundParticipants) {
        const newPaymentHistory = Array.from(new Set([...(participant.historialPagos || []), ...analysis.paymentsByDni.get(dni)!]));
        newPaymentHistory.sort();

        const participantRef = doc(firestore, 'participants', participant.id);
        batch.update(participantRef, {
          historialPagos: newPaymentHistory,
          pagosAcumulados: newPaymentHistory.length,
        });
        updatedCount++;
      }

      await batch.commit();
      toast({ title: "¡Éxito!", description: `Se actualizó el historial de pagos de ${updatedCount} participante(s).` });
      onClose();
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: "Ocurrió un error al procesar la carga. Revise la consola." });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between text-sm font-medium text-gray-500 border-b pb-4">
            <span className={step >= 1 ? "text-blue-600" : ""}>1. Subir CSV de Pagos</span>
            <ArrowRight size={16} />
            <span className={step >= 2 ? "text-blue-600" : ""}>2. Análisis y Confirmación</span>
        </div>

      {step === 1 && (
        <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
                <p>Seleccione el archivo CSV con el historial de pagos. Las columnas deben ser:</p>
                <p className="font-mono text-xs mt-2 bg-blue-100 p-1 rounded">dni,mes_pago (ej: 12/2023)</p>
            </div>
            <div className="flex items-center justify-center w-full">
                <label htmlFor="csv-payment-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-4 text-gray-500" />
                        {selectedFile ? <p className="font-semibold text-gray-800">{selectedFile.name}</p> : <p className="text-sm text-gray-500"><span className="font-semibold">Click para subir</span> o arrastre</p>}
                    </div>
                    <Input id="csv-payment-upload" type="file" className="hidden" accept=".csv,text/csv" onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
                </label>
            </div>
            <div className="flex justify-end pt-4"><Button onClick={handleAnalyze} disabled={!selectedFile}><FileUp className="mr-2 h-4 w-4" /> Analizar Archivo</Button></div>
        </div>
      )}

      {step === 2 && analysis && (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
                <Card className="p-4 bg-green-50 border-green-200"><CardContent><h3 className="text-2xl font-bold text-green-700">{analysis.foundParticipants.size}</h3><p className="text-xs text-green-600 uppercase font-bold">Participantes Encontrados</p></CardContent></Card>
                <Card className="p-4 bg-red-50 border-red-200"><CardContent><h3 className="text-2xl font-bold text-red-700">{analysis.unfoundDnis.length}</h3><p className="text-xs text-red-600 uppercase font-bold">DNI No Encontrados</p></CardContent></Card>
            </div>
            {analysis.unfoundDnis.length > 0 &&
                <div className="border rounded-md p-4 bg-gray-50/50">
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><XCircle size={16} className="text-red-600"/> DNI no encontrados en la base de datos (se ignorarán)</h4>
                    <div className="max-h-40 overflow-y-auto text-sm space-y-1">
                        {analysis.unfoundDnis.map((dni, i) => <p key={i} className="text-gray-500">{dni}</p>)}
                    </div>
                </div>
            }
            <div className="flex justify-between pt-4 border-t">
                <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
                <Button onClick={handleExecute} disabled={processing || analysis.foundParticipants.size === 0} className="bg-green-600 hover:bg-green-700">{processing ? 'Procesando...' : `Confirmar y Cargar Historial`}</Button>
            </div>
        </div>
      )}
    </div>
  );
};
export default PaymentHistoryUploadWizard;