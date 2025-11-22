'use client';
import React, { useState } from 'react';
import type { Participant } from '@/lib/types';
import { useFirebase, useUser } from '@/firebase';
import { writeBatch, collection, doc, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, FileSignature, AlertTriangle, FileUp, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

const ParticipantUploadWizard = ({ allParticipants, onClose }: { allParticipants: Participant[], onClose: () => void }) => {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [csvText, setCsvText] = useState('');
  const [analysis, setAnalysis] = useState<{ newParticipants: any[], duplicates: any[], totalCsv: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const parseParticipantCSV = (text: string): Omit<Participant, 'id'>[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const result: Omit<Participant, 'id'>[] = [];
    const headers = lines.shift()?.toLowerCase().split(',') || [];
    
    lines.forEach(line => {
        try {
            const values = line.split(',');
            const participant = {
                nombre: values[0]?.trim() || '',
                dni: values[1]?.trim().replace(/\./g, '') || '',
                fechaNacimiento: values[2]?.trim() || '',
                programa: values[3]?.trim() || '',
                fechaIngreso: values[4]?.trim() || '',
                departamento: values[5]?.trim() || '',
                lugarTrabajo: values[6]?.trim() || '',
                categoria: values[7]?.trim() || 'N/A',
                // Default values for fields not in this simple CSV
                pagosAcumulados: 0,
                activo: true,
                esEquipoTecnico: false,
                fechaAlta: new Date().toISOString(),
                ownerId: user?.uid,
            };
            if(participant.dni && participant.nombre) {
                result.push(participant as any);
            }
        } catch(e) {
            console.error("Error parsing line:", line, e);
        }
    });
    return result;
  };


  const handleAnalyze = () => {
    if (!csvText) return;
    const records = parseParticipantCSV(csvText);
    const existingDnis = new Set(allParticipants.map(p => p.dni));

    const newParticipants: any[] = [];
    const duplicates: any[] = [];

    records.forEach(rec => {
      if (existingDnis.has(rec.dni)) {
        duplicates.push(rec);
      } else {
        newParticipants.push(rec);
        existingDnis.add(rec.dni); // Add to set to handle duplicates within the same CSV
      }
    });

    setAnalysis({ newParticipants, duplicates, totalCsv: records.length });
    setStep(2);
  };

  const handleExecute = async () => {
    if (!analysis || !firestore || !user) return;
    setProcessing(true);

    try {
      const batch = writeBatch(firestore);
      let count = 0;

      analysis.newParticipants.forEach(participantData => {
        const partRef = doc(collection(firestore, 'participants'));
        batch.set(partRef, {
            ...participantData,
            fechaAlta: serverTimestamp(),
            ownerId: user.uid,
        });
        count++;
      });

      await batch.commit();
      alert(`¡Proceso finalizado!\n- Participantes nuevos creados: ${count}`);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error procesando la carga. Verifique la consola.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm font-medium text-gray-500 border-b pb-4">
        <span className={step >= 1 ? "text-blue-600" : ""}>1. Pegar Contenido</span>
        <ArrowRight size={16} />
        <span className={step >= 2 ? "text-blue-600" : ""}>2. Análisis y Confirmación</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
            <p>Pegue aquí los datos desde su hoja de cálculo. Asegúrese que las columnas estén en el orden correcto:</p>
            <p className="font-mono text-xs mt-2 bg-blue-100 p-1 rounded">nombre, dni, fechaNacimiento, programa, fechaIngreso, departamento, lugarTrabajo, categoria</p>
          </div>
          <Textarea 
            className="w-full h-48 font-mono text-sm" 
            placeholder="Juan Perez,30111222,1990-05-15,Tutorías,2023-01-10,Capital,Escuela N° 5,Senior..." 
            value={csvText} 
            onChange={e => setCsvText(e.target.value)}
          />
          <div className="flex justify-end pt-4">
            <Button onClick={handleAnalyze} disabled={!csvText}>
                <FileUp className="mr-2 h-4 w-4" /> Analizar Datos
            </Button>
          </div>
        </div>
      )}

      {step === 2 && analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <Card className="p-4 bg-green-50 border-green-200">
              <CardContent>
                <h3 className="text-2xl font-bold text-green-700">{analysis.newParticipants.length}</h3>
                <p className="text-xs text-green-600 uppercase font-bold">Nuevos para Crear</p>
              </CardContent>
            </Card>
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <CardContent>
                <h3 className="text-2xl font-bold text-yellow-700">{analysis.duplicates.length}</h3>
                <p className="text-xs text-yellow-600 uppercase font-bold">Duplicados (Omitidos)</p>
              </CardContent>
            </Card>
          </div>

          {analysis.newParticipants.length > 0 &&
            <div className="border rounded-md p-4 bg-gray-50/50">
                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><CheckCircle size={16} className="text-green-600"/> Participantes a Crear</h4>
                <div className="max-h-40 overflow-y-auto text-sm space-y-1">
                    {analysis.newParticipants.map((p, i) => <p key={i} className="text-gray-600">{p.nombre} ({p.dni})</p>)}
                </div>
            </div>
          }
          
          {analysis.duplicates.length > 0 &&
            <div className="border rounded-md p-4 bg-gray-50/50">
                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><XCircle size={16} className="text-yellow-600"/> Participantes Duplicados (se ignorarán)</h4>
                <div className="max-h-40 overflow-y-auto text-sm space-y-1">
                    {analysis.duplicates.map((p, i) => <p key={i} className="text-gray-500">{p.nombre} ({p.dni})</p>)}
                </div>
            </div>
          }


          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button>
            <Button 
                onClick={handleExecute} 
                disabled={processing || analysis.newParticipants.length === 0} 
                variant="default" 
                className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Procesando...' : `Confirmar y Crear ${analysis.newParticipants.length} Participantes`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ParticipantUploadWizard;
