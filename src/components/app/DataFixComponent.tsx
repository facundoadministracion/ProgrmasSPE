'use client';

import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DataFixComponent = ({ onFixComplete }: { onFixComplete: () => void }) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleFixData = async () => {
    if (!firestore) {
      toast({ title: 'Error', description: 'No se pudo conectar a la base de datos.', variant: 'destructive' });
      return;
    }
    if (!window.confirm('Esta acción analizará y corregirá todos los registros de pago. Es seguro y solo debe ejecutarse una vez. ¿Continuar?')) {
        return;
    }

    setIsLoading(true);
    try {
      const paymentsRef = collection(firestore, 'payments');
      const paymentsSnapshot = await getDocs(paymentsRef);
      const batch = writeBatch(firestore);
      let documentsToUpdate = 0;

      paymentsSnapshot.forEach(doc => {
        const data = doc.data();
        let needsUpdate = false;
        const updates: { [key: string]: any } = {};

        if (typeof data.mes === 'number') {
          updates.mes = String(data.mes);
          needsUpdate = true;
        }
        if (typeof data.anio === 'number') {
          updates.anio = String(data.anio);
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc.ref, updates);
          documentsToUpdate++;
        }
      });

      if (documentsToUpdate > 0) {
        await batch.commit();
        toast({
          title: '¡Datos Corregidos!',
          description: `Se actualizaron ${documentsToUpdate} registros de pago con éxito.`,
        });
      } else {
        toast({
          title: 'No se requirieron cambios',
          description: 'Todos los registros de pago ya tenían el formato correcto.',
        });
      }
      setIsDone(true);
      onFixComplete(); // Notify parent to hide this component
    } catch (error) {
      console.error("Error fixing payment data:", error);
      toast({ title: 'Error', description: 'Ocurrió un problema al corregir los datos.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isDone) {
      return (
           <Card className="bg-green-50 border-green-200">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                     <ShieldCheck className="h-6 w-6 text-green-600" />
                    <CardTitle className="text-green-800">Reparación Completada</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-green-700">La base de datos ha sido actualizada. Ya puede reintentar la carga de pagos.</p>
                </CardContent>
            </Card>
      )
  }

  return (
    <Card className="bg-yellow-50 border-yellow-200">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
        <AlertTriangle className="h-6 w-6 text-yellow-600" />
        <CardTitle className="text-yellow-800">Acción de Mantenimiento Requerida</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-yellow-700">
          Detectamos una inconsistencia en el formato de los datos de pagos antiguos. Presione el botón para corregirla. Esta acción es segura y solo necesita realizarse una vez.
        </CardDescription>
        <Button onClick={handleFixData} disabled={isLoading} className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isLoading ? 'Corrigiendo...' : 'Corregir Datos de Pago'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default DataFixComponent;