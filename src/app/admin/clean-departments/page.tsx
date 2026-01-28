'use client';

import React, { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    CardFooter
} from '@/components/ui/card';

// Mapeos definidos por el usuario. La clave es el nombre incorrecto, el valor es el nombre correcto.
const DEPARTMENT_MAPPINGS: { [key: string]: string } = {
    'Capital': 'CAPITAL',
    'LA RIOJA': 'CAPITAL',
};

// Función para normalizar los nombres de los departamentos
const normalizeDepartment = (dept: string | undefined | null): string => {
    if (!dept || typeof dept !== 'string') {
        return 'NO ESPECIFICADO';
    }
    const trimmedDept = dept.trim();
    // Aplicar mapeos específicos primero
    if (DEPARTMENT_MAPPINGS[trimmedDept]) {
        return DEPARTMENT_MAPPINGS[trimmedDept];
    }
    // Convertir a mayúsculas como regla general
    return trimmedDept.toUpperCase();
};


function CleanDepartmentsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ checked: number, updated: number, errors: number } | null>(null);

    const handleCleanData = async () => {
        if (!firestore || !user) {
            alert("No estás autenticado. Por favor, recarga la página.");
            return;
        }

        const confirmation = window.confirm(
            "¿Estás seguro de que deseas iniciar la limpieza de datos? Esta acción modificará los legajos en la base de datos de forma permanente.\n\nReglas a aplicar:\n- 'Capital' y 'LA RIOJA' se convertirán en 'CAPITAL'.\n- Todos los demás nombres de departamento se convertirán a MAYÚSCULAS.\n\nEsta operación puede tardar unos minutos."
        );

        if (!confirmation) {
            return;
        }

        setIsLoading(true);
        setResult(null);

        let checkedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        try {
            const participantsCol = collection(firestore, 'participants');
            const snapshot = await getDocs(participantsCol);
            const batch = writeBatch(firestore);

            snapshot.forEach(document => {
                checkedCount++;
                const participant = document.data();
                const currentDept = participant.departamento;
                
                const normalizedDept = normalizeDepartment(currentDept);

                if (currentDept !== normalizedDept) {
                    const docRef = doc(firestore, 'participants', document.id);
                    batch.update(docRef, { departamento: normalizedDept });
                    updatedCount++;
                }
            });

            await batch.commit();

        } catch (error) {
            console.error("Error al limpiar los departamentos:", error);
            errorCount++;
        } finally {
            setIsLoading(false);
            setResult({ checked: checkedCount, updated: updatedCount, errors: errorCount });
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Herramienta de Limpieza de Departamentos</CardTitle>
                    <CardDescription>
                        Esta herramienta corregirá los nombres de los departamentos en todos los legajos de participantes.
                        Se aplicarán las siguientes reglas:
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc pl-6 space-y-2 mb-6">
                        <li>Los departamentos <span className="font-mono bg-gray-100 px-1 rounded-sm">Capital</span> y <span className="font-mono bg-gray-100 px-1 rounded-sm">LA RIOJA</span> se unificarán como <span className="font-mono bg-gray-100 px-1 rounded-sm">CAPITAL</span>.</li>
                        <li>Todos los demás nombres de departamento se convertirán a <span className="font-bold">MAYÚSCULAS</span>.</li>
                        <li>Los legajos sin departamento se asignarán a <span className="font-mono bg-gray-100 px-1 rounded-sm">NO ESPECIFICADO</span>.</li>
                    </ul>
                    <div className="p-4 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-800">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">¡Atención! Esta acción es irreversible y modificará los datos directamente en la base de datos.</p>
                            </div>
                        </div>
                    </div>

                    {result && (
                        <div className="mt-6 p-4 border rounded-md bg-gray-50">
                            <h3 className="font-bold mb-2 flex items-center">
                                {result.errors > 0 ? <AlertTriangle className="h-5 w-5 text-red-500 mr-2" /> : <CheckCircle className="h-5 w-5 text-green-500 mr-2" />}
                                Resultado de la Limpieza
                            </h3>
                            <p>Legajos revisados: <span className="font-bold">{result.checked}</span></p>
                            <p>Legajos actualizados: <span className="font-bold">{result.updated}</span></p>
                            {result.errors > 0 && <p className="text-red-600">Ocurrieron <span className="font-bold">{result.errors}</span> errores durante el proceso. Revisa la consola para más detalles.</p>}
                            {result.updated === 0 && result.errors === 0 && <p className="mt-2 text-green-700">¡Excelente! Los datos ya estaban limpios y no se requirieron cambios.</p>}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button onClick={handleCleanData} disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                        ) : (
                            'Iniciar Limpieza de Departamentos'
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default CleanDepartmentsPage;
