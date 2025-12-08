'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface ApiResponse {
  success: boolean;
  message: string;
  details?: {
    registrosProcesados?: number;
    registrosTotales?: number;
    errores?: string[];
  } | string;
}

export default function ImportarPagosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      alert('Por favor, selecciona un archivo CSV.');
      return;
    }

    setUploading(true);
    setResponse(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import-pagos', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setResponse(data);

    } catch (error: any) {
      setResponse({ success: false, message: `Error en la comunicación con el servidor: ${error.message}` });
    } finally {
      setUploading(false);
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

          {response && (
            <div className={`mt-6 p-4 rounded-lg ${response.success ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
              <div className="flex items-start">
                {response.success ? <CheckCircle className="h-5 w-5 mr-3 text-green-500" /> : <AlertCircle className="h-5 w-5 mr-3 text-red-500" />}
                <div>
                  <h3 className="font-bold">{response.success ? 'Proceso Finalizado' : 'Error en la Importación'}</h3>
                  <p className="text-sm">{response.message}</p>
                </div>
              </div>

              {response.details && typeof response.details === 'object' && response.details.errores && response.details.errores.length > 0 && (
                <div className='mt-4'>
                  <h4 className='font-semibold text-sm'>Los siguientes registros no se pudieron procesar:</h4>
                  <ul className='list-disc list-inside text-sm mt-2 bg-white/60 p-3 rounded'>
                    {response.details.errores.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {response.details && typeof response.details === 'string' && (
                 <div className='mt-4'>
                    <h4 className='font-semibold text-sm'>Detalle del error interno del servidor:</h4>
                    <pre className="mt-2 text-xs whitespace-pre-wrap bg-white/60 p-3 rounded font-mono">{response.details}</pre>
                 </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
