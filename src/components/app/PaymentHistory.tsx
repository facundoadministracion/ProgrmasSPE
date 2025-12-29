'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { collectionGroup, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

interface PaymentHistoryEntry {
    id: string;
    programa: string;
    mesLiquidacion: string;
    anoLiquidacion: string;
    fechaCarga: any; // Can be Timestamp or string
    cantidadPagos: number;
}

const monthNames: { [key: string]: string } = {
    '1': 'Enero', '2': 'Febrero', '3': 'Marzo', '4': 'Abril', '5': 'Mayo', '6': 'Junio',
    '7': 'Julio', '8': 'Agosto', '9': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

export function PaymentHistory() {
    const [history, setHistory] = useState<PaymentHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(collectionGroup(db, 'paymentHistory'), orderBy('fechaCarga', 'desc'));
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    programa: data.programa,
                    mesLiquidacion: data.mesLiquidacion,
                    anoLiquidacion: data.anoLiquidacion,
                    fechaCarga: data.fechaCarga?.toDate ? data.fechaCarga.toDate() : new Date(data.fechaCarga),
                    cantidadPagos: data.cantidadPagos,
                };
            });
            setHistory(historyData as PaymentHistoryEntry[]);
        } catch (err: any) {
            const errorMessage = err.message || "Ocurrió un error desconocido.";
            console.error("Error fetching payment history:", err);
            setError(errorMessage);
            toast({ title: "Error", description: "No se pudo cargar el historial de pagos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDeleteBatch = async (batchId: string) => {
        // TODO: Implement the call to the backend function to revert the payment batch.
        // For now, we will just show a toast.
        console.log("Attempting to delete batch:", batchId)
        toast({ title: "Función no implementada", description: `El borrado del lote ${batchId} aún no está conectado al backend.` });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Liquidaciones</CardTitle>
            </CardHeader>
            <CardContent>
                {loading && <p>Cargando historial...</p>}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
                        <strong className="font-bold">Error de Carga: </strong>
                        <p className="block sm:inline whitespace-pre-wrap">{error}</p>
                    </div>
                )}

                {!loading && !error && history.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programa</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Carga</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {history.map((entry) => (
                                    <tr key={entry.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.programa}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${monthNames[entry.mesLiquidacion]} ${entry.anoLiquidacion}`}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(entry.fechaCarga, 'dd/MM/yyyy HH:mm', { locale: es })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.cantidadPagos}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción revertirá el lote de pago para {entry.programa} del período {monthNames[entry.mesLiquidacion]} {entry.anoLiquidacion}. No se puede deshacer.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteBatch(entry.id)} className="bg-red-600 hover:bg-red-700">
                                                            Sí, revertir lote
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && history.length === 0 && (
                    <p>No hay historial de liquidaciones para mostrar.</p>
                )}
            </CardContent>
        </Card>
    );
}
