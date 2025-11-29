
'use client';

import React, { useEffect } from 'react';
import { useConfiguracion, type Configuracion } from '@/hooks/useConfiguracion';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface Props {
    onEditConfig: (config: Configuracion) => void;
    forceUpdateKey: number;
}

const ConfiguracionHistorial = ({ onEditConfig, forceUpdateKey }: Props) => {
    const { toast } = useToast();
    const { configuraciones: historial, isLoading, error, refetch } = useConfiguracion();

    useEffect(() => {
        if (forceUpdateKey > 0) {
            refetch();
        }
    }, [forceUpdateKey, refetch]);

    useEffect(() => {
        if (error) {
            toast({ title: 'Error', description: 'No se pudo cargar el historial de configuraciones.', variant: 'destructive' });
        }
    }, [error, toast]);

    const formatMonto = (monto: number) => {
        return `$${monto ? monto.toLocaleString('es-AR') : '0'}`;
    }

    if (isLoading) {
        return <p className="text-center text-gray-500">Cargando historial...</p>;
    }

    if (!historial || historial.length === 0) {
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
                    <TableHead className="text-right">Tutorías (Max)</TableHead>
                    <TableHead className="text-right">Empleo Joven</TableHead>
                    <TableHead className="text-right">Tecnoempleo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {historial.map(config => {
                    const montoTutorias = Math.max(
                        config.montos.Senior || 0,
                        config.montos.Estandar || 0,
                        config.montos.Junior || 0
                    );
                    return (
                        <TableRow key={config.id}>
                            <TableCell className="font-medium">
                                {MESES[config.mesVigencia - 1]} {config.anoVigencia}
                            </TableCell>
                            <TableCell>{config.actoAdministrativo}</TableCell>
                            <TableCell className="text-center">
                                {config.esActiva && <Badge>Activa</Badge>}
                            </TableCell>
                            <TableCell className="text-right">{formatMonto(montoTutorias)}</TableCell>
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
