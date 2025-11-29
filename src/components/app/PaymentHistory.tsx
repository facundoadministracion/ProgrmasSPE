'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, query, where, doc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS, PROGRAMAS } from '@/lib/constants';

// (Interfaces no modificadas)
interface Payment {
  id: string;
  mes: string;
  anio: string;
  programa?: string;
  participantId: string;
  [key: string]: any;
}

interface GroupedPayment {
  mes: string;
  anio: string;
  programa: string;
  count: number;
  paymentIds: string[];
  participantsToUpdate: string[];
}

const ITEMS_PER_PAGE = 4;

const PaymentHistory = () => {
  const { firestore } = useFirebase();
  const [history, setHistory] = useState<GroupedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchHistory = async () => {
    if (!firestore) return;
    setLoading(true);
    const paymentsSnapshot = await getDocs(collection(firestore, 'pagosRegistrados'));
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Payment[];

    const grouped = payments.reduce((acc, payment) => {
      const key = `${payment.mes}-${payment.anio}-${payment.programa || 'General'}`;
      if (!acc[key]) {
        acc[key] = {
          mes: payment.mes,
          anio: payment.anio,
          programa: payment.programa || 'General',
          count: 0,
          paymentIds: [],
          participantsToUpdate: [],
        };
      }
      acc[key].count++;
      acc[key].paymentIds.push(payment.id);
      if (payment.participantId) {
          acc[key].participantsToUpdate.push(payment.participantId);
      }
      return acc;
    }, {} as { [key: string]: GroupedPayment });

    const sortedHistory = Object.values(grouped).sort((a, b) => {
        if (a.anio !== b.anio) return parseInt(b.anio) - parseInt(a.anio);
        return parseInt(b.mes) - parseInt(a.mes);
    });

    setHistory(sortedHistory);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [firestore]);

  const { paginatedHistory, totalPages } = useMemo(() => {
    const totalPages = Math.ceil(history.length / ITEMS_PER_PAGE);
    const paginated = history.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    return { paginatedHistory: paginated, totalPages };
  }, [history, currentPage]);


  const handleDeleteBatch = async (batchData: GroupedPayment) => {
    if (!firestore || !window.confirm(`¿Estás seguro de que quieres eliminar ${batchData.count} pagos de ${MONTHS[parseInt(batchData.mes) - 1]} ${batchData.anio} para el programa ${batchData.programa}? Esta acción no se puede deshacer.`)) {
      return;
    }

    const key = `${batchData.mes}-${batchData.anio}-${batchData.programa}`;
    setDeleting(key);

    try {
      const batch = writeBatch(firestore);

      const uniqueParticipantIds = [...new Set(batchData.participantsToUpdate)];
      uniqueParticipantIds.forEach(participantId => {
        if (participantId) {
            const participantRef = doc(firestore, 'participants', participantId);
            batch.update(participantRef, { pagosAcumulados: increment(-1) });
        }
      });

      batchData.paymentIds.forEach(paymentId => {
        const paymentRef = doc(firestore, 'pagosRegistrados', paymentId);
        batch.delete(paymentRef);
      });

      await batch.commit();
      
      alert('Lote de pagos eliminado exitosamente.');
      await fetchHistory(); 
      
      if ((currentPage - 1) * ITEMS_PER_PAGE >= history.length - batchData.paymentIds.length && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

    } catch (error) {
      console.error("Error eliminando el lote de pagos: ", error);
      alert('Ocurrió un error al eliminar el lote de pagos.');
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
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No se encontraron cargas de pago masivas.</p>
        ) : (
          <div className="space-y-4">
            {paginatedHistory.map(batch => {
              const key = `${batch.mes}-${batch.anio}-${batch.programa}`;
              const isDeleting = deleting === key;
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="font-bold">
                        {MONTHS[parseInt(batch.mes) - 1]} {batch.anio}
                    </p>
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold">{batch.programa}</span> - {batch.count} pagos registrados
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteBatch(batch)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}<span className="ml-2">Eliminar</span>
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
