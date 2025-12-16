'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

// Interfaces
interface PaymentHistoryDoc {
  id: string;
  mesLiquidacion: string;
  anoLiquidacion: string;
  programa?: string;
  cantidadPagos?: number;
  [key: string]: any;
}

interface GroupedPayment {
  mes: string;
  anio: string;
  programa: string;
  count: number;
}

const ITEMS_PER_PAGE = 4;

const PaymentHistory = () => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [history, setHistory] = useState<GroupedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = async () => {
    if (!firestore) return;
    setLoading(true);
    const historySnapshot = await getDocs(collection(firestore, 'paymentHistory'));
    const historyDocs = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PaymentHistoryDoc[];

    // --- FIX: De-duplicate and aggregate records ---
    const uniqueHistoryMap = new Map<string, GroupedPayment>();
    historyDocs.forEach(doc => {
        const programa = doc.programa || 'General';
        const key = `${doc.mesLiquidacion}-${doc.anoLiquidacion}-${programa}`;
        
        if (uniqueHistoryMap.has(key)) {
            // If key exists, aggregate the count
            const existing = uniqueHistoryMap.get(key)!;
            existing.count += doc.cantidadPagos || 0;
            uniqueHistoryMap.set(key, existing);
        } else {
            // If key doesn't exist, create a new entry
            uniqueHistoryMap.set(key, {
                mes: doc.mesLiquidacion,
                anio: doc.anoLiquidacion,
                programa: programa,
                count: doc.cantidadPagos || 0
            });
        }
    });
    const aggregatedHistory = Array.from(uniqueHistoryMap.values());
    // --- End of FIX ---

    const sortedHistory = aggregatedHistory.sort((a, b) => {
        if (a.anio !== b.anio) return parseInt(b.anio) - parseInt(a.anio);
        return parseInt(a.mes) - parseInt(a.mes);
    });

    setHistory(sortedHistory);
    setLoading(false);
  };

  useEffect(() => {
    if(firestore) fetchHistory();
  }, [firestore]);

  const { paginatedHistory, totalPages } = useMemo(() => {
    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    const paginated = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return { paginatedHistory: paginated, totalPages };
  }, [history, currentPage]);
  
  const handleDeleteBatch = async (batchData: GroupedPayment) => {
    const mesNombre = MONTHS[parseInt(batchData.mes) - 1];
    if (!window.confirm(`¿Seguro que quieres revertir el lote de ${batchData.count} pagos de ${mesNombre} ${batchData.anio} para ${batchData.programa}? \n\nEsta acción es PERMANENTE y hará lo siguiente:\n- Revertirá el pago a cada participante.\n- Eliminará los registros de pago individuales.\n- Eliminará este resumen del historial.`)) {
        return;
    }

    const key = `${batchData.mes}-${batchData.anio}-${batchData.programa}`;
    setDeleting(key);

    try {
        const response = await fetch('/api/revert-payment-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                programa: batchData.programa,
                mes: mesNombre, 
                anio: batchData.anio,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.details || 'Error desconocido en el servidor');
        }

        toast({ 
            title: "Reversión Exitosa", 
            description: `Se revirtieron ${result.revertedPayments} pagos y ${result.revertedHistory} registros de historial.`
        });

        await fetchHistory(); // Recargar el historial

    } catch (error) {
        console.error("Error revirtiendo el lote de pagos: ", error);
        toast({ 
            title: "Error en la Reversión", 
            description: error instanceof Error ? error.message : 'Ocurrió un error. Revise la consola.', 
            variant: "destructive"
        });
    } finally {
        setDeleting(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center p-8"><Loader className="animate-spin" /> Cargando historial...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Cargas de Pago</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 && !loading ? (
          <p className="text-sm text-gray-500">No se encontraron cargas de pago masivas.</p>
        ) : (
          <div className="space-y-4">
            {paginatedHistory.map(batch => {
              const key = `${batch.mes}-${batch.anio}-${batch.programa}`;
              const isDeleting = deleting === key;
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-bold">{MONTHS[parseInt(batch.mes) - 1]} {batch.anio}</p>
                    <p className="text-sm text-gray-600"><span className="font-semibold">{batch.programa}</span> - {batch.count} pagos registrados</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteBatch(batch)} disabled={isDeleting}>
                    {isDeleting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}<span className="ml-2">Revertir Lote</span>
                  </Button>
                </div>
              );
            })}
            {totalPages > 1 && (
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                <div className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente <ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
