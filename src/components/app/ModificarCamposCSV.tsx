'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { Loader2, Upload, FileDown, AlertTriangle, BadgeCheck } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Tipos para la respuesta detallada del backend
interface UpdatedRecord {
    dni: string;
    nombre: string;
    apellido: string;
    field: 'departamento' | 'genero';
    oldValue: string;
    newValue: string;
}

interface BulkUpdateResponse {
  updatedRecords: UpdatedRecord[];
  notFoundDnis: string[];
  errors: string[];
}

const ModificarCamposCSV = () => {
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BulkUpdateResponse | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      toast({ variant: 'destructive', title: 'Archivo no válido', description: 'Por favor, selecciona un archivo con formato CSV.' });
      event.target.value = ''; 
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        setCsvContent(text);
        setFileName(file.name);
        setResults(null); // Limpiamos resultados anteriores al cargar un nuevo archivo
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Error de Lectura', description: 'No se pudo leer el contenido del archivo.' });
        setCsvContent(null); setFileName('');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleUpdate = () => {
    if (!csvContent) {
      toast({ variant: 'destructive', title: 'No se ha cargado ningún archivo.' });
      return;
    }
    setIsLoading(true);
    setResults(null);

    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: async (parseResult) => {
        if (!parseResult.meta.fields?.includes('dni')) {
            toast({ variant: 'destructive', title: 'Formato de CSV incorrecto', description: 'El archivo CSV debe contener la columna "dni".' });
            setIsLoading(false); return;
        }

        const data = parseResult.data.filter((row: any) => row.dni && String(row.dni).trim() !== '');
        if (data.length === 0) {
            toast({ variant: 'destructive', title: 'Archivo Vacío', description: 'El archivo no contiene filas con un DNI válido.' });
            setIsLoading(false); return;
        }

        try {
          const response = await fetch('/api/participants/bulk-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participants: data }),
          });

          const resultData: BulkUpdateResponse = await response.json();
          if (!response.ok) throw new Error(resultData.errors?.join(', ') || 'Ocurrió un error en el servidor.');

          setResults(resultData);
          toast({ title: 'Proceso completado', description: 'La actualización ha finalizado. Revisa los resultados a continuación.' });

        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error en la actualización', description: error.message || 'No se pudo completar la operación.' });
        } finally {
          setIsLoading(false);
        }
      },
      error: (err: any) => {
        toast({ variant: 'destructive', title: 'Error al procesar el CSV', description: err.message });
        setIsLoading(false);
      }
    });
  };
  
  // Función para exportar los DNIs no encontrados a un nuevo CSV
  const exportNotFoundToCSV = () => {
    if (!results || results.notFoundDnis.length === 0) return;
    const csv = Papa.unparse({ fields: ["dni", "departamento", "genero"], data: results.notFoundDnis.map(dni => ({ dni })) });
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'dnis_no_encontrados.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actualización Masiva por CSV</CardTitle>
        <CardDescription>
          Sube un archivo CSV para modificar el departamento y/o género de múltiples participantes a la vez.
          El archivo debe contener la columna `dni` y, opcionalmente, `departamento` y/o `genero`.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <label htmlFor="csv-upload" className="text-sm font-medium">Archivo CSV</label>
            <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} />
            {fileName && <p className="text-sm text-gray-500">Archivo cargado: {fileName}</p>}
        </div>
        <Button onClick={handleUpdate} disabled={!csvContent || isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {isLoading ? 'Procesando...' : 'Actualizar Participantes'}
        </Button>

        {results && (
          <div className="space-y-8 pt-4">
            {/* Tabla de Legajos Actualizados */}
            {results.updatedRecords.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg flex items-center text-green-700"><BadgeCheck className="mr-2"/>Legajos Actualizados ({results.updatedRecords.length})</h3>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>DNI</TableHead><TableHead>Nombre</TableHead><TableHead>Campo Modificado</TableHead><TableHead>Valor Anterior</TableHead><TableHead>Valor Nuevo</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{results.updatedRecords.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.dni}</TableCell><TableCell>{`${r.nombre} ${r.apellido}`}</TableCell>
                        <TableCell className="capitalize">{r.field}</TableCell>
                        <TableCell><span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">{r.oldValue || '-'}</span></TableCell>
                        <TableCell><span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">{r.newValue}</span></TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Tabla de Legajos No Encontrados */}
            {results.notFoundDnis.length > 0 && (
              <div>
                 <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg flex items-center text-amber-700"><AlertTriangle className="mr-2"/>Legajos No Encontrados ({results.notFoundDnis.length})</h3>
                    <Button variant="outline" size="sm" onClick={exportNotFoundToCSV}><FileDown className="mr-2 h-4 w-4"/>Exportar Lista</Button>
                </div>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader><TableRow><TableHead>DNI No Encontrado</TableHead></TableRow></TableHeader>
                    <TableBody>{results.notFoundDnis.map((dni, i) => (<TableRow key={i}><TableCell>{dni}</TableCell></TableRow>))}</TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Lista de Errores de Procesamiento */}
            {results.errors.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg text-red-700">Errores de Procesamiento ({results.errors.length})</h3>
                <ul className="mt-2 list-disc list-inside text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {results.updatedRecords.length === 0 && results.notFoundDnis.length === 0 && results.errors.length === 0 && (
                <p className="text-center text-gray-500 py-4">No se realizaron cambios. Es posible que los datos del archivo ya coincidieran con los de la base de datos.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModificarCamposCSV;
