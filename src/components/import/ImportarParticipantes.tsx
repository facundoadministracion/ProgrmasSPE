
import { useState, useMemo } from 'react';
import type { Participant } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast'; // Importar el hook para notificaciones

// Tipos de datos
type CsvData = { dni: string; genero: string; departamento: string; };
type PreviewData = {
  dni: string;
  nombre?: string;
  generoActual?: string;
  generoNuevo: string;
  deptoActual?: string;
  deptoNuevo: string;
  encontrado: boolean;
  cambios: boolean;
};

interface ImportarParticipantesProps { participants: Participant[]; }

const ImportarParticipantes: React.FC<ImportarParticipantesProps> = ({ participants }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false); // Estado para el proceso de confirmación
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const { toast } = useToast(); // Hook para mostrar notificaciones

  const participantsByDni = useMemo(() => new Map(participants.map(p => [p.dni, p])), [participants]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    setFile(selectedFile);
    setError(null);
    setPreviewData([]);
  };

  const handleAnalyze = () => {
    if (!file) { setError('Por favor, selecciona un archivo CSV para continuar.'); return; }
    setIsParsing(true); setError(null); setPreviewData([]);

    Papa.parse<CsvData>(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        const requiredFields = ['dni', 'genero', 'departamento'];
        const fileFields = results.meta.fields || [];
        const missingFields = requiredFields.filter(field => !fileFields.includes(field));

        if (missingFields.length > 0) {
          setError(`El archivo CSV no es válido. Faltan las columnas: ${missingFields.join(', ')}.`);
          setIsParsing(false); return;
        }

        const dataFromCsv = results.data.filter(row => row.dni && row.dni.trim() !== '');
        const comparisonData = dataFromCsv.map(row => {
          const participant = participantsByDni.get(row.dni.trim());
          if (participant) {
            const generoCambiado = participant.genero !== row.genero.trim();
            const deptoCambiado = participant.departamento !== row.departamento.trim();
            return { 
              dni: row.dni.trim(), nombre: participant.nombre, 
              generoActual: participant.genero, generoNuevo: row.genero.trim(),
              deptoActual: participant.departamento, deptoNuevo: row.departamento.trim(),
              encontrado: true, cambios: generoCambiado || deptoCambiado
            };
          } else {
            return { 
              dni: row.dni.trim(), generoNuevo: row.genero.trim(), deptoNuevo: row.departamento.trim(),
              encontrado: false, cambios: false 
            };
          }
        });
        setPreviewData(comparisonData);
        setIsParsing(false);
      },
      error: (err: any) => { setError(`Error al procesar el archivo: ${err.message}`); setIsParsing(false); },
    });
  };

  const handleCancel = () => { setFile(null); setPreviewData([]); setError(null); };
  
  const handleConfirm = async () => {
    setIsConfirming(true);
    console.log("Confirmando cambios...");

    // 1. Filtrar solo los registros que tienen cambios y existen en la base de datos
    const dataToUpdate = previewData
      .filter(row => row.encontrado && row.cambios)
      .map(row => ({
        dni: row.dni,
        genero: row.generoNuevo,
        departamento: row.deptoNuevo,
      }));

    if (dataToUpdate.length === 0) {
      toast({ title: "No hay cambios para aplicar", description: "Ninguno de los registros encontrados requiere una actualización." });
      setIsConfirming(false);
      return;
    }

    try {
      // 2. Usar la API que ya creamos para la actualización masiva
      const response = await fetch('/api/participants/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: dataToUpdate }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.errors?.join(', ') || 'Ocurrió un error en el servidor.');
      }

      // 3. Mostrar notificación de éxito y limpiar
      toast({
        title: "¡Actualización Exitosa!",
        description: `${result.updatedCount} participante(s) han sido actualizados.`,
      });
      handleCancel(); // Limpiar la vista

    } catch (error: any) {
      // 4. Mostrar notificación de error
      toast({
        variant: 'destructive',
        title: "Error al aplicar los cambios",
        description: error.message,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar y Actualizar Datos Masivamente</CardTitle>
        <CardDescription>Esta herramienta analiza un CSV, lo compara con el padrón actual y te permite aplicar cambios de género y departamento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewData.length === 0 && (
          <>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
               <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"><span>Carga un archivo</span><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".csv" /></label>
                  <p className="pl-1">o arrástralo aquí</p>
                </div>
                <p className="text-xs text-gray-500">Solo CSV con columnas: dni, genero, departamento.</p>
              </div>
            </div>
            {file && <p className="mt-2 text-sm text-gray-500">Archivo: {file.name}</p>}
            <Button onClick={handleAnalyze} disabled={!file || isParsing}>{isParsing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analizando...</> : 'Analizar y Previsualizar'}</Button>
          </>
        )}

        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        {previewData.length > 0 && (
          <div>
            <h3 className="text-lg font-medium">Previsualización de Cambios</h3>
            <p className="text-sm text-gray-600 mb-4">Se analizaron {previewData.length} registros. Revisa los cambios antes de confirmar. Los registros no encontrados serán ignorados.</p>
            <ScrollArea className="h-[400px] w-full border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>DNI</TableHead><TableHead>Nombre</TableHead><TableHead>Género (Actual → Nuevo)</TableHead><TableHead>Departamento (Actual → Nuevo)</TableHead><TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {previewData.map((row, i) => (
                            <TableRow key={i} className={row.cambios ? 'bg-yellow-100' : ''}>
                                <TableCell>{row.dni}</TableCell>
                                <TableCell>{row.encontrado ? row.nombre : <span className="text-red-600">No encontrado</span>}</TableCell>
                                <TableCell>
                                  {row.encontrado && (
                                    <div className="flex items-center">{row.generoActual || "-"} <ArrowRight className='mx-2 h-4 w-4'/> <strong>{row.generoNuevo}</strong></div>
                                  )}
                                </TableCell>
                                <TableCell>
                                   {row.encontrado && (
                                    <div className="flex items-center">{row.deptoActual || "-"} <ArrowRight className='mx-2 h-4 w-4'/> <strong>{row.deptoNuevo}</strong></div>
                                  )}
                                </TableCell>
                                <TableCell>
                                    {row.encontrado ? (row.cambios ? <Badge variant="default" className='bg-orange-500'>Cambios Detectados</Badge> : <Badge variant="secondary">Sin Cambios</Badge>) : <Badge variant="destructive">DNI no existe</Badge>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={handleCancel} disabled={isConfirming}>Cancelar</Button>
              <Button onClick={handleConfirm} disabled={isConfirming || previewData.filter(r => r.cambios).length === 0}>
                {isConfirming ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Confirmando...</> : `Confirmar y Aplicar ${previewData.filter(r => r.cambios).length} Cambios`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportarParticipantes;
