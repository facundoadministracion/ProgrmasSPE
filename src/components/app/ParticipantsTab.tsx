'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Upload, PlusCircle, AlertTriangle, XCircle, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

import type { Participant, ParticipantFilter } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { PROGRAMAS } from '@/lib/constants';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ParticipantsTab = ({ participants, isLoading, onSelect, onOpenParticipantWizard, initialSearchTerm, onSearchHandled, activeFilter, onClearFilter, onBackToDashboard } : {
    participants: Participant[],
    isLoading: boolean,
    onSelect: (p: Participant | 'new') => void,
    onOpenParticipantWizard: () => void,
    initialSearchTerm?: string,
    onSearchHandled?: () => void,
    activeFilter: ParticipantFilter | null,
    onClearFilter: () => void,
    onBackToDashboard: () => void,
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
        if (!participants) return { paginated: [], totalPages: 0, filteredCount: 0 };

        const getParticipantPayments = (p: Participant) => {
            if (!p.programa || !p.pagosPorPrograma) return 0;
            return p.pagosPorPrograma[p.programa] || 0;
        };
        
        const participantsWithDetails = participants.map(p => ({
            ...p,
            payments: getParticipantPayments(p),
            alert: getAlertStatus(p), // getAlertStatus likely adds the 'mesAusencia' field
        }));

        let filtered = participantsWithDetails.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || String(p.dni).includes(searchTerm));

        if (activeFilter) {
             const relevantPrograms: string[] = [PROGRAMAS.TECNO, PROGRAMAS.JOVEN];
             const baseProgramFilter = (p: any) => p.programa && relevantPrograms.includes(p.programa);

             switch (activeFilter) {
                case 'requiresAttention':
                    filtered = filtered.filter(p => p.estado === 'Requiere Atención');
                    break;
                case 'ageAlert':
                    filtered = filtered.filter(p => p.activo && p.alert.msg.includes('Límite de Edad'));
                    break;
                case 'paymentDue':
                    filtered = filtered.filter(p => p.activo && baseProgramFilter(p) && (p.payments === 5 || p.payments === 11));
                    break;
                case 'renewalRequired':
                    filtered = filtered.filter(p => baseProgramFilter(p) && (p.payments === 6 || p.payments === 12) && p.estado !== 'Baja');
                    break;
                case 'finalization':
                    filtered = filtered.filter(p => p.activo && baseProgramFilter(p) && p.payments > 12);
                    break;
            }
        }

        filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        
        return { paginated, totalPages, filteredCount: filtered.length };
    }, [participants, searchTerm, currentPage, activeFilter]);

    const { paginated, totalPages, filteredCount } = paginatedParticipants;

    const filterDescriptions: { [key: string]: string } = {
        requiresAttention: 'Requieren Atención',
        ageAlert: 'con Alerta de Edad',
        paymentDue: 'Próximos a Vencer (5 u 11 pagos)',
        renewalRequired: 'Requieren Continuidad (6 o 12 pagos)',
        finalization: 'A Finalizar (más de 12 pagos)',
    };

    const isAttentionFilter = activeFilter === 'requiresAttention';

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
                            <p className="font-bold">Filtro Activo: {filterDescriptions[activeFilter]}</p>
                            <p>Mostrando {filteredCount} participantes que coinciden con el filtro.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={onClearFilter} className="text-yellow-800 hover:bg-yellow-200"><ArrowLeft className="mr-2 h-4 w-4"/> Volver al Resumen</Button>
                        <Button variant="outline" size="sm" onClick={onClearFilter} className="bg-yellow-200 text-yellow-900 border-yellow-300 hover:bg-yellow-300"><XCircle className="mr-2 h-4 w-4"/> Quitar Filtro</Button>
                    </div>
                </div>
            )}

            <Card>
                {isLoading ? <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin h-5 w-5"/> Cargando participantes...</div> : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>DNI</TableHead>
                                <TableHead>Programa</TableHead>
                                <TableHead>Estado</TableHead>
                                {isAttentionFilter && <TableHead>Liquidación Ausente</TableHead>}
                                <TableHead className="text-center">Pagos</TableHead>
                                <TableHead>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.map(p => {
                                const alert = p.alert;
                                // Correct logic: Use 'mesAusencia' field, which is added by getAlertStatus
                                const absenceDate = p.mesAusencia ? p.mesAusencia.replace('/', ' de ') : '-';
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.nombre}</TableCell>
                                        <TableCell>{p.dni}</TableCell>
                                        <TableCell><Badge variant="outline">{p.programa}</Badge></TableCell>
                                        <TableCell><Badge variant={alert.type as any}>{alert.msg}</Badge></TableCell>
                                        {isAttentionFilter && <TableCell className="text-center"><Badge variant="destructive">{absenceDate}</Badge></TableCell>}
                                        <TableCell className="text-center"><Badge>{p.payments}</Badge></TableCell>
                                        <TableCell><Button variant="link" size="sm" onClick={() => onSelect(p)}>Ver Legajo</Button></TableCell>
                                    </TableRow>
                                )
                            })}
                            {paginated.length === 0 && <TableRow><TableCell colSpan={isAttentionFilter ? 7 : 6} className="h-24 text-center">No se encontraron resultados para el filtro actual.</TableCell></TableRow>}
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