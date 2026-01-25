'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function ImportarHistorialPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; } | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setResult(null); // Reset result when a new file is selected
        }
    };

    const handleImport = async () => {
        if (!file) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, seleccione un archivo CSV." });
            return;
        }
        setIsLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/importar-pagos', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Error al importar el historial.");
            }

            setResult({ success: true, message: data.message });
            toast({ title: "Éxito", description: "El historial ha sido importado correctamente." });

        } catch (error: any) {
            setResult({ success: false, message: error.message });
            toast({ variant: "destructive", title: "Error de importación", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Importar Historial de Pagos</CardTitle>
                    <CardDescription>
                        Suba un archivo CSV para cargar pagos de períodos anteriores. El archivo debe tener las columnas: <strong>dni, programa, mes, anio, monto</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg">
                        <p className="font-semibold text-slate-800">Paso único: Seleccionar CSV e Importar</p>
                        <div className="flex items-center space-x-4 mt-4">
                            <Input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={isLoading} className="flex-grow" />
                        </div>
                    </div>

                    <Button onClick={handleImport} disabled={!file || isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Importar Historial
                    </Button>

                    {result && (
                        <div className="mt-6 p-4 rounded-lg border bg-slate-50">
                            <div className="flex items-center">
                                {result.success ? <CheckCircle className="h-5 w-5 text-green-500 mr-2" /> : <AlertCircle className="h-5 w-5 text-red-500 mr-2" />}
                                <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {result.success ? 'Importación Completada' : 'La importación falló'}
                                </h3>
                            </div>
                            <p className="text-sm text-slate-600 mt-2 ml-7">{result.message}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}