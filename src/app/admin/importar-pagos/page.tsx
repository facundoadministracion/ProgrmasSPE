'''
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertCircle, CheckCircle, FileCheck2, Send, Telescope, UserCheck, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

// --- Type Definitions ---
type ParticipantInfo = { dni: string; nombre: string; };

interface AnalysisResult {
    fileName: string;
    program: string;
    period: string;
    totalInCsv: number;
    unknownDnis: { count: number; dnis: string[]; };
    nuevasAltas: { count: number; data: ParticipantInfo[]; };
    reactivaciones: { count: number; data: ParticipantInfo[]; };
    regulares: { count: number; data: ParticipantInfo[]; };
    bajas: { count: number; data: ParticipantInfo[]; };
}

interface ApiResponse {
    success: boolean;
    message: string;
    analysis?: AnalysisResult;
    details?: any; 
}

// --- Helper Components ---
const AnalysisItem: React.FC<{ title: string; count: number; variant?: 'default' | 'warning' | 'info' }> = ({ title, count, variant = 'default' }) => {
    const colors = {
        default: 'text-slate-500',
        warning: 'text-yellow-600',
        info: 'text-blue-600',
    };
    return (
        <div className="flex justify-between items-center py-2">
            <p className={`font-medium ${colors[variant]}`}>{title}</p>
            <p className={`font-bold text-lg ${colors[variant]}`}>{count}</p>
        </div>
    );
};


export default function ImportarPagosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [finalResult, setFinalResult] = useState<ApiResponse | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const resetState = () => {
      setFile(null);
      setAnalysis(null);
      setFinalResult(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      resetState();
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true);
    // Keep previous analysis for comparison if needed, but for now, we reset
    setAnalysis(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze-csv', { method: 'POST', body: formData });
      const data: ApiResponse = await res.json();

      if (!res.ok) throw new Error(data.message);
      
      setAnalysis(data.analysis!); 
      toast({ title: "Análisis Completo", description: "Revisa los resultados." });

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error en el Análisis", description: error.message });
        resetState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
      if (!file || !analysis) return;
      setIsLoading(true);
      setFinalResult(null);

      const formData = new FormData();
      formData.append('file', file); // Send the file again for the backend to process

      try {
          const res = await fetch('/api/importar-pagos', { method: 'POST', body: formData });
          const data: ApiResponse = await res.json();

          if (!res.ok) throw new Error(data.message || 'Ocurrió un error en el servidor.');

          setFinalResult(data);
          toast({ variant: data.success ? "default" : "destructive", title: "Importación Finalizada", description: data.message });

      } catch (error: any) {
          setFinalResult({ success: false, message: error.message });
          toast({ variant: "destructive", title: "Error en la Importación", description: error.message });
      } finally {
          setIsLoading(false);
      }
  };

  const hasPendingReactivations = analysis && analysis.reactivaciones.count > 0;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Carga de Liquidaciones</CardTitle>
          <CardDescription>Proceso de 2 pasos: Analiza un CSV y luego confirma la importación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={`p-4 border rounded-lg ${analysis ? 'bg-slate-50' : ''}`}>
            <p className="font-semibold text-slate-800">Paso 1: Seleccionar y Analizar</p>
            <div className="flex items-center space-x-4 mt-4">
                <Input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={isLoading} className="flex-grow" />
                <Button onClick={handleAnalyze} disabled={!file || isLoading || !!analysis}>
                    {isLoading && !analysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Telescope className="mr-2 h-4 w-4" />}
                    Analizar
                </Button>
            </div>
          </div>

          {analysis && (
            <>
              <Card className="bg-white shadow-md">
                  <CardHeader>
                      <CardTitle className="flex items-center"><FileCheck2 className="mr-3 text-blue-600"/>Resumen del Análisis</CardTitle>
                      <CardDescription>{`Archivo: ${analysis.fileName} | Programa: ${analysis.program} | Período: ${analysis.period}`}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-2">
                    <AnalysisItem title="Total de registros en CSV" count={analysis.totalInCsv} />
                    <Separator />
                    <AnalysisItem title="Regulares (Continúan)" count={analysis.regulares.count} />
                    <AnalysisItem title="Nuevas Altas" count={analysis.nuevasAltas.count} variant="info" />
                    <AnalysisItem title="Reactivaciones (Regresan)" count={analysis.reactivaciones.count} variant="info" />
                    <Separator />
                    <AnalysisItem title="Bajas Potenciales (Ausentes)" count={analysis.bajas.count} variant="warning" />
                    <AnalysisItem title="DNI Desconocidos (Ignorados)" count={analysis.unknownDnis.count} variant="warning" />
                  </CardContent>
              </Card>

              {hasPendingReactivations && (
                  <Card className="border-orange-400 bg-orange-50">
                      <CardHeader>
                          <CardTitle className="flex items-center text-orange-800"><AlertCircle className="mr-3"/>Acción Requerida: Gestionar Reactivaciones</CardTitle>
                          <CardDescription className="text-orange-700">Debes gestionar el legajo de cada participante para registrar el acto administrativo antes de continuar.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ul className="space-y-3">
                              {analysis.reactivaciones.data.map(p => (
                                  <li key={p.dni} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm">
                                      <div>
                                          <p className="font-semibold">{p.nombre}</p>
                                          <p className="text-sm text-slate-500">DNI: {p.dni}</p>
                                      </div>
                                      <Button variant="outline" size="sm" onClick={() => router.push(`/admin/participantes/${p.dni}`)}>
                                          <UserCheck className="mr-2 h-4 w-4"/> Gestionar Legajo
                                      </Button>
                                  </li>
                              ))}
                          </ul>
                          <Button onClick={handleAnalyze} disabled={isLoading} className="w-full mt-6 bg-orange-500 hover:bg-orange-600">
                              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                              Re-analizar Archivo
                          </Button>
                      </CardContent>
                  </Card>
              )}

              <div className="pt-4">
                <Button onClick={handleConfirmImport} disabled={isLoading || !!finalResult || hasPendingReactivations} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Confirmar e Importar
                </Button>
                {hasPendingReactivations && <p className="text-center text-sm text-red-600 mt-2">La confirmación está desactivada hasta que se gestionen todas las reactivaciones.</p>}
              </div>
            </>
          )}

          {finalResult && (
            <div className="mt-6 p-4 rounded-lg border bg-slate-50">
                <div className="flex items-center">
                    {finalResult.success ? <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> : <AlertCircle className="h-5 w-5 text-red-500 mr-2" />}
                    <h3 className={`font-semibold ${finalResult.success ? 'text-green-800' : 'text-red-800'}`}>{finalResult.success ? 'Importación Completada' : 'La importación falló'}</h3>
                </div>
                <p className="text-sm text-slate-600 mt-2 ml-7">{finalResult.message}</p>
                <Button onClick={resetState} variant="outline" className="mt-4 ml-7">Cargar otro archivo</Button>
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
'''