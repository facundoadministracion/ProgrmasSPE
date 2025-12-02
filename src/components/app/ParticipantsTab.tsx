'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Upload, PlusCircle, AlertTriangle, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

import type { Participant } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { PROGRAMAS } from '@/lib/constants';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ParticipantFilter = 'requiresAttention' | 'paymentAlert' | 'ageAlert' | null;

const ParticipantsTab = ({ participants, isLoading, onSelect, onOpenParticipantWizard, initialSearchTerm, onSearchHandled, activeFilter, onClearFilter } : {
    participants: Participant[],
    isLoading: boolean,
    onSelect: (p: Participant | 'new') => void,
    onOpenParticipantWizard: () => void,
    initialSearchTerm?: string,
    onSearchHandled?: () => void,
    activeFilter: ParticipantFilter,
    onClearFilter: () => void,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
      if (initialSearchTerm) {
        setInputValue(initialSearchTerm);
        if (onSearchHandled) onSearchHandled();
      }
    }, [initialSearchTerm, onSearchHandled]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchTerm(inputValue);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [inputValue]);

    const paginatedParticipants = useMemo(() => {
        if (!participants) return { paginated: [], totalPages: 0 };

        let filtered = participants.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || String(p.dni).includes(searchTerm));

        if (activeFilter === 'requiresAttention') {
            filtered = filtered.filter(p => p.estado === 'Requiere Atención');
        } else if (activeFilter === 'paymentAlert') {
            filtered = filtered.filter(p => {
                const status = getAlertStatus(p);
                return p.activo && (p.programa === PROGRAMAS.JOVEN || p.programa === PROGRAMAS.TECNO) && (p.pagosAcumulados === 5 || p.pagosAcumulados === 6 || p.pagosAcumulados === 11 || p.pagosAcumulados === 12) 
            });
        } else if (activeFilter === 'ageAlert') {
             filtered = filtered.filter(p => {
                const edad = getAlertStatus(p);
                return p.activo && p.programa === PROGRAMAS.JOVEN && edad.msg.includes('Límite de Edad');
            });
        }

        filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        
        return { paginated, totalPages, filteredCount: filtered.length };
    }, [participants, searchTerm, currentPage, activeFilter]);

    const { paginated, totalPages, filteredCount } = paginatedParticipants;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Padrón de Participantes</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            type="text" 
                            placeholder="Buscar DNI/Nombre..." 
                            className="pl-10" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                        />
                    </div>
                    <Button onClick={onOpenParticipantWizard} variant="outline"><Upload className="mr-2 h-4 w-4" /> Carga Masiva</Button>
                    <Button onClick={() => onSelect('new')}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo</Button>
                </div>
            </div>

            {activeFilter && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md flex justify-between items-center">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-3" />
                        <div>
                            <p className="font-bold">Filtro Activo</p>
                            <p>Mostrando {filteredCount} participantes que requieren atención.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClearFilter} className="text-yellow-800 hover:bg-yellow-200"><XCircle className="mr-2 h-4 w-4"/> Limpiar</Button>
                </div>
            )}

            <Card>
                {isLoading ? <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin h-5 w-5"/> Cargando participantes...</div> : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead><TableHead>DNI</TableHead><TableHead>Programa</TableHead>
                                <TableHead>Estado</TableHead><TableHead>Mes Ausencia</TableHead><TableHead>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.map(p => {
                                const alert = getAlertStatus(p);
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.nombre}</TableCell><TableCell>{p.dni}</TableCell>
                                        <TableCell>
                                            <span className="block text-sm">{p.programa}</span>
                                            {p.esEquipoTecnico ? (
                                                <Badge variant="indigo">Equipo Técnico</Badge>
                                            ) : p.programa === PROGRAMAS.TUTORIAS ? (
                                                <span className="text-xs text-gray-400">{p.categoria}</span>
                                            ) : null}
                                        </TableCell>
                                        <TableCell><Badge variant={alert.type as any}>{alert.msg}</Badge></TableCell>
                                        <TableCell className="text-sm">{p.estado === 'Requiere Atención' ? p.mesAusencia || 'N/A' : '-'}</TableCell>
                                        <TableCell><Button variant="link" size="sm" onClick={() => onSelect(p)}>Ver Legajo</Button></TableCell>
                                    </TableRow>
                                )
                            })}
                            {paginated.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron resultados.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 p-4 border-t">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                            <div className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</div>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente <ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    )}
                    </>
                )}
            </Card>
        </div>
    );
};
export default ParticipantsTab;
