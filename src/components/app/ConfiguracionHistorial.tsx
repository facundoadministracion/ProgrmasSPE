'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

// Tipos
export interface Configuracion {
    id: string;
    montos: { [key: string]: number };
    mesVigencia: number;
    anoVigencia: number;
    actoAdministrativo: string;
    fechaCreacion: any; 
    esActiva: boolean;
}

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface Props {
    onEditConfig: (config: Configuracion) => void;
}

const ConfiguracionHistorial = ({ onEditConfig }: Props) => {
    const db = useFirestore();
    const { toast } = useToast();
    const [historial, setHistorial] = useState<Configuracion[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistorial = async () => {
            if (!db) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const q = query(collection(db, 'configuracionMontos'), orderBy('fechaCreacion', 'desc'));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Configuracion[];
                setHistorial(data);
            } catch (error) {
                console.error("Error fetching history: ", error);
                toast({ title: 'Error', description: 'No se pudo cargar el historial de configuraciones.', variant: 'destructive' });
            }
            finally {
                setIsLoading(false);
            }
        };

        fetchHistorial();
    }, [db, toast]);

    const formatMonto = (monto: number) => {
        return `$${monto.toLocaleString('es-AR')}`;
    }

    if (isLoading) {
        return <p className="text-center text-gray-500">Cargando historial...</p>;
    }

    if (historial.length === 0) {
        return <p className="text-center text-gray-500">No hay configuraciones guardadas.</p>;
    }

    return (
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
            <TableHeader className="sticky top-0 bg-gray-100/95">
                <TableRow>
                    <TableHead className="w-[150px]">Vigencia</TableHead>
                    <TableHead>Acto Administrativo</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Monto Tutorías</TableHead>
                    <TableHead className="text-right">Monto Empleo Joven</TableHead>
                    <TableHead className="text-right">Monto Tecnoempleo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {historial.map(config => {
                    const montoTutorias = config.montos.Senior || config.montos.Estandar || config.montos.Junior;
                    return (
                        <TableRow key={config.id}>
                            <TableCell className="font-medium">
                                {MESES[config.mesVigencia - 1]} {config.anoVigencia}
                            </TableCell>
                            <TableCell>{config.actoAdministrativo}</TableCell>
                            <TableCell className="text-center">
                                {config.esActiva && <Badge>Activa</Badge>}
                            </TableCell>
                            <TableCell className="text-right">{formatMonto(montoTutorias || 0)}</TableCell>
                            <TableCell className="text-right">{formatMonto(config.montos['Empleo Joven'] || 0)}</TableCell>
                            <TableCell className="text-right">{formatMonto(config.montos.Tecnoempleo || 0)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => onEditConfig(config)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
      </ScrollArea>
    );
};

export default ConfiguracionHistorial;
