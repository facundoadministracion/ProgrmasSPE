
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { collectionGroup, getDocs, orderBy, query } from 'firebase/firestore'; // Cambiado de collection a collectionGroup
import { db } from '@/firebase/config';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

// Tipos de datos
interface PaymentHistoryEntry {
    id: string;
    programa: string;
    mesLiquidacion: string;
    anoLiquidacion: string;
    fechaCarga: string;
    cantidadPagos: number;
}

const monthNames: { [key: string]: string } = {
    '1': 'Enero', '2': 'Febrero', '3': 'Marzo', '4': 'Abril', '5': 'Mayo', '6': 'Junio',
    '7': 'Julio', '8': 'Agosto', '9': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

export function PaymentHistory() {
    const [history, setHistory] = useState<PaymentHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            // AQUÍ ESTÁ LA CORRECCIÓN: Usar collectionGroup para consultar todos los historiales de pago
            const q = query(collectionGroup(db, 'paymentHistory'), orderBy('fechaCarga', 'desc'));
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<PaymentHistoryEntry, 'id'>)
            }));
            setHistory(historyData);
        } catch (error) {
            console.error("Error fetching payment history:", error);
            toast({ title: "Error", description: "No se pudo cargar el historial de pagos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDeleteBatch = async (batchData: PaymentHistoryEntry) => {
        const mesNombre = monthNames[batchData.mesLiquidacion];
        if (!mesNombre) {
            toast({ title: "Error", description: "El mes del lote es inválido.", variant: "destructive" });
            return;
        }

        try {
            const response = await fetch('/api/revert-payment-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    programa: batchData.programa,
                    mes: mesNombre,
                    anio: parseInt(batchData.anoLiquidacion, 10),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.details || 'Ocurrió un error desconocido.');
            }
            
            toast({ 
                title: "Proceso Iniciado", 
                description: `La eliminación del lote de ${batchData.programa} para ${mesNombre} de ${batchData.anoLiquidacion} ha comenzado. Los datos desaparecerán en breve.`
            });

            setTimeout(() => fetchHistory(), 2000); 

        } catch (error) {
            console.error("Error al revertir el lote:", error);
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";
            toast({ 
                title: "Error al Eliminar", 
                description: errorMessage,
                variant: "destructive" 
            });
        } 
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Liquidaciones</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? <p>Cargando historial...</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programa</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mes Liquidación</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Carga</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Eliminar</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {history.map((batch) => {
                                    const formattedDate = batch.fechaCarga ? format(new Date(batch.fechaCarga), "dd/MM/yyyy HH:mm", { locale: es }) : 'Fecha no disponible';
                                    const mesNombre = monthNames[batch.mesLiquidacion] || 'Mes Desconocido';
                                    return (
                                        <tr key={batch.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{batch.programa}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{mesNombre} de {batch.anoLiquidacion}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{formattedDate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{batch.cantidadPagos}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción es irreversible. Se eliminarán todos los registros de pago y novedades asociados con la carga del programa <strong>{batch.programa}</strong> para el mes de <strong>{mesNombre} de {batch.anoLiquidacion}</strong>.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteBatch(batch)}>Confirmar Eliminación</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
