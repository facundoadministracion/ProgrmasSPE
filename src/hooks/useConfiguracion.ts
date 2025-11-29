import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export interface Configuracion {
    id: string;
    montos: { [key: string]: number };
    mesVigencia: number;
    anoVigencia: number;
    actoAdministrativo: string;
    fechaCreacion: any;
    esActiva: boolean;
}

export const useConfiguracion = () => {
    const db = useFirestore();
    const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchConfiguraciones = useCallback(async () => {
        if (!db) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
            const q = query(collection(db, 'configuracionMontos'), orderBy('anoVigencia', 'desc'), orderBy('mesVigencia', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Configuracion[];
            setConfiguraciones(data);
        } catch (e: any) {
            console.error("Error fetching configurations: ", e);
            setError(e);
        } finally {
            setIsLoading(false);
        }
    }, [db]);

    useEffect(() => {
        fetchConfiguraciones();
    }, [fetchConfiguraciones]);

    const findConfigForDate = useCallback((mes: number, ano: number): Configuracion | null => {
        if (configuraciones.length === 0) return null;

        const targetDateValue = ano * 100 + mes;

        const suitableConfig = configuraciones.find(c => (c.anoVigencia * 100 + c.mesVigencia) <= targetDateValue);

        return suitableConfig || null;

    }, [configuraciones]);

    return { configuraciones, isLoading, error, findConfigForDate, refetch: fetchConfiguraciones };
};
