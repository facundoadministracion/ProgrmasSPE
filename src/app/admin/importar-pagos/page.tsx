'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    errores?: string[];
  };
}

export default function ImportarPagosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setImportResult(null); // Reset result when a new file is selected
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo CSV." });
      return;
    }

    setUploading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import-pagos', {
        method: 'POST',
        body: formData,
      });

      const data: ImportResult = await res.json();

      if (!res.ok) {
          throw new Error(data.message || 'Ocurrió un error en el servidor.');
      }

      setImportResult(data);

      toast({
        variant: data.success ? "default" : "destructive",
        title: data.success ? "Importación Finalizada" : "Error en la Importación",
        description: data.message,
      });

    } catch (error: any) {
      const errorMessage = error.message || 'No se pudo comunicar con el servidor.';
      setImportResult({ success: false, message: errorMessage });
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: errorMessage,
      });
    } finally {
      setUploading(false);
      // Reset file input to allow re-uploading the same file
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if(fileInput) fileInput.value = '';
      setFile(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Importar Pagos Históricos</CardTitle>
          <CardDescription>
            Sube un archivo CSV para registrar pagos de forma masiva. Asegúrate que el archivo tenga las columnas: 'dni', 'programa', 'mes', 'anio'.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona el archivo CSV
              </label>
              <Input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            
            <div>
              <Button
                type="submit"
                variant="outline"
                disabled={uploading || !file}
                className="w-full"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" />
                )}
                {uploading ? 'Importando...' : 'Iniciar Importación'}
              </Button>
            </div>
          </form>

          {importResult && (
            <div className="mt-6 p-4 rounded-lg border bg-slate-50">
                <div className="flex items-center">
                    {importResult.success ? <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> : <AlertCircle className="h-5 w-5 text-red-500 mr-2" />}
                    <h3 className={`font-semibold ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {importResult.success ? 'Importación Finalizada' : 'La importación tuvo problemas'}
                    </h3>
                </div>
                <p className="text-sm text-slate-600 mt-2 ml-7">{importResult.message}</p>
                {importResult.details?.errores && importResult.details.errores.length > 0 && (
                <div className="mt-3 ml-7">
                    <p className="text-sm font-semibold text-slate-700">Detalles de errores encontrados:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 mt-1 max-h-40 overflow-y-auto bg-red-50 p-2 rounded">
                    {importResult.details.errores.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
                )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
