'use client';
import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, query, where, doc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader } from 'lucide-react';
import { MONTHS, PROGRAMAS } from '@/lib/constants';

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

const PaymentHistory = () => {
  const { firestore } = useFirebase();
  const [history, setHistory] = useState<GroupedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!firestore) return;
    setLoading(true);
    const paymentsSnapshot = await getDocs(collection(firestore, 'payments'));
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
      acc[key].participantsToUpdate.push(payment.participantId);
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

  const handleDeleteBatch = async (batchData: GroupedPayment) => {
    if (!firestore || !window.confirm(`¿Estás seguro de que quieres eliminar ${batchData.count} pagos de ${MONTHS[parseInt(batchData.mes) - 1]} ${batchData.anio} para el programa ${batchData.programa}? Esta acción no se puede deshacer.`)) {
      return;
    }

    const key = `${batchData.mes}-${batchData.anio}-${batchData.programa}`;
    setDeleting(key);

    try {
      const batch = writeBatch(firestore);

      // Decrement the payment count for each participant
      const uniqueParticipantIds = [...new Set(batchData.participantsToUpdate)];
      uniqueParticipantIds.forEach(participantId => {
        const participantRef = doc(firestore, 'participants', participantId);
        batch.update(participantRef, { pagosAcumulados: increment(-1) });
      });

      // Delete each payment document
      batchData.paymentIds.forEach(paymentId => {
        const paymentRef = doc(firestore, 'payments', paymentId);
        batch.delete(paymentRef);
      });

      await batch.commit();
      
      alert('Lote de pagos eliminado exitosamente.');
      fetchHistory(); // Refresh the list
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
            {history.map(batch => {
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentHistory;
