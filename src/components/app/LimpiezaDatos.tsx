'use client';

import React, { useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle } from 'lucide-react';
import { normalizeText } from '@/lib/utils';
import { DEPARTAMENTOS } from '@/lib/constants';

const LimpiezaDatos: React.FC = () => {
  const { firestore } = useFirebase();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ processed: number; updated: number; errors: number } | null>(null);

  const handleCleanData = useCallback(async () => {
    if (!firestore) return;

    setIsLoading(true);
    setResult(null);
    let processed = 0;
    let updated = 0;
    let errors = 0;

    try {
      const participantsRef = collection(firestore, 'participants');
      const snapshot = await getDocs(participantsRef);
      const batch = writeBatch(firestore);
      const canonicalDepartments = new Map(DEPARTAMENTOS.map(d => [normalizeText(d), d]));

      snapshot.forEach(document => {
        processed++;
        const participant = document.data();
        const currentDept = participant.departamento;
        
        if (typeof currentDept !== 'string' || !currentDept) {
          return; // O manejar como un caso de error si se prefiere
        }

        const normalizedCurrentDept = normalizeText(currentDept);
        const canonicalDept = canonicalDepartments.get(normalizedCurrentDept);

        // Si el departamento normalizado existe en nuestra lista canónica
        // y es diferente al que está guardado, lo actualizamos.
        if (canonicalDept && canonicalDept !== currentDept) {
          const docRef = doc(firestore, 'participants', document.id);
          batch.update(docRef, { departamento: canonicalDept });
          updated++;
        }
      });

      if (updated > 0) {
        await batch.commit();
      }

    } catch (error) {
      console.error("Error al limpiar los datos:", error);
      errors = processed; // Asumimos que si hay un error, todo falló
    } finally {
      setResult({ processed, updated, errors });
      setIsLoading(false);
    }
  }, [firestore]);

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Limpieza y Estandarización de Departamentos</CardTitle>
        <CardDescription>
          Esta herramienta revisa todos los legajos de participantes y corrige los nombres de los departamentos para que coincidan con la lista oficial (ej: quita acentos).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className='text-sm text-slate-600'>
          Haga clic en el botón para iniciar el proceso. La herramienta comparará el departamento de cada participante con la lista canónica y lo actualizará si es necesario. Esto soluciona problemas de filtrado y agrupación en los informes.
        </p>
        
        <Button onClick={handleCleanData} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Iniciar Limpieza de Datos
        </Button>

        {result && (
          <Alert variant={result.errors > 0 ? "destructive" : (result.updated > 0 ? "default" : "default")} className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>
              {result.errors > 0 ? "Proceso Fallido" : "Proceso Completado"}
            </AlertTitle>
            <AlertDescription>
              Se procesaron {result.processed} legajos. Se actualizaron {result.updated} registros. {result.errors > 0 ? `Ocurrieron ${result.errors} errores.` : ''}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default LimpiezaDatos;
