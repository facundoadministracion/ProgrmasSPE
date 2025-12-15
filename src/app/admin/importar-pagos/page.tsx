'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function ImportarPagosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo CSV." });
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import-pagos', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        toast({
          variant: "default",
          title: "Importación Exitosa",
          description: data.message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error en la Importación",
          description: data.message + (data.details ? ` Detalles: ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details)}` : ''),
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de Conexión",
        description: `No se pudo comunicar con el servidor: ${error.message}`,
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
        </CardContent>
      </Card>
    </div>
  );
}
