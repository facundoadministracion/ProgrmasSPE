'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';

// --- COMPONENTE PARA LA CORRECCIÓN DE DATOS ---

export const DataFixPanel = () => {
    const { functions } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const handleFixData = async () => {
        if (!functions) {
            toast({ variant: 'destructive', title: 'Error', description: 'El servicio de funciones no está disponible.' });
            return;
        }

        setIsLoading(true);

        try {
            const fixFunction = httpsCallable(functions, 'fixOctober2025Payments');
            const result = await fixFunction();
            
            const data = result.data as { status: string; message: string; processedCount?: number };

            if (data.status === 'success') {
                toast({
                    title: "¡Éxito!",
                    description: data.message,
                    duration: 5000,
                });
                setIsCompleted(true);
            } else if (data.status === 'already_applied') {
                 toast({
                    variant: "default",
                    title: "Información",
                    description: data.message,
                    duration: 5000,
                });
                setIsCompleted(true);
            } else {
                throw new Error(data.message || 'Ocurrió un error desconocido.');
            }

        } catch (error: any) {
            console.error("Error al ejecutar la función de corrección:", error);
            toast({
                variant: 'destructive', 
                title: 'Error en la Corrección', 
                description: error.message || 'No se pudo completar la operación. Revisa los logs de la función.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isCompleted) {
        return null; // Ocultar el panel una vez que la operación fue exitosa o ya se había aplicado
    }

    return (
        <Card className="mt-6 border-destructive bg-orange-50">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <div>
                        <CardTitle>Acción de Única Vez Requerida</CardTitle>
                        <CardDescription>
                            Corrección de pagos para el programa Tecnoempleo (Octubre 2025).
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-700 mb-4">
                    Detectamos que 152 legajos del programa Tecnoempleo tienen un conteo de pagos incorrecto debido a un error en la carga del lote de Septiembre. Presiona el botón para aplicar la corrección. Esta acción creará los registros de pago faltantes de Octubre 2025 y ajustará el contador a 5.
                </p>
                <Button onClick={handleFixData} disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                    ) : (
                        'Ejecutar Corrección'
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};
