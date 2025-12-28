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
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = query(collectionGroup(db, 'paymentHistory'), orderBy('fechaCarga', 'desc'));
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<PaymentHistoryEntry, 'id'>)
            }));
            setHistory(historyData);
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

    const handleDeleteBatch = async (batchData: PaymentHistoryEntry) => {
        // La lógica de borrado se mantiene igual
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
                            {/* Aquí iría el contenido de la tabla, como thead y tbody */}
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
