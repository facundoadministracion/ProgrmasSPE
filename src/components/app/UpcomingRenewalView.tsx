'use client';

import React, { useMemo } from 'react';
import ReactDOMServer from 'react-dom/server';
import { ArrowLeft, Download, Eye } from 'lucide-react';

import type { Participant } from '@/lib/types';
import { PROGRAMAS } from '@/lib/constants';
import { cn } from '@/lib/utils';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const getParticipantPayments = (p: Participant) => {
    if (!p.programa || !p.pagosPorPrograma) return 0;
    return p.pagosPorPrograma[p.programa] || 0;
};

const calculateAge = (birthDateString: string): string | number => {
    if (!birthDateString) return 'N/A';
    let birthDate;
    if (birthDateString.includes('/')) {
        const parts = birthDateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const year = parseInt(parts[2], 10);
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                birthDate = new Date(year, month, day);
            }
        }
    }
    if (!birthDate || isNaN(birthDate.getTime())) {
        birthDate = new Date(birthDateString);
    }
    if (!birthDate || isNaN(birthDate.getTime())) {
        return 'N/A';
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const exportToCSV = (data: Participant[], filename: string) => {
    const headers = ['Nombre', 'DNI', 'Programa', 'Pagos', 'Departamento', 'Edad'];
    const csvContent = [
        headers.join(','),
        ...data.map(p => [
            `"${p.nombre}"`,
            p.dni,
            p.programa,
            getParticipantPayments(p),
            p.departamento,
            calculateAge(p.fechaNacimiento)
        ].join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const globalStyles = `
@tailwind base;
@tailwind components;
@tailwind utilities;
body { font-family: Arial, Helvetica, sans-serif; }
@layer base {
  :root { --background: 220 16% 96%; --foreground: 222 47% 11%; --card: 0 0% 100%; --card-foreground: 222 47% 11%; --popover: 0 0% 100%; --popover-foreground: 222 47% 11%; --primary: 215 14% 34%; --primary-foreground: 210 40% 98%; --secondary: 210 40% 96.1%; --secondary-foreground: 222 47% 11%; --muted: 210 40% 96.1%; --muted-foreground: 215 18% 47%; --accent: 175 84% 31%; --accent-foreground: 210 40% 98%; --destructive: 0 84.2% 60.2%; --destructive-foreground: 210 40% 98%; --border: 210 40% 91.4%; --input: 210 40% 91.4%; --ring: 175 84% 31%; --chart-1: 12 76% 61%; --chart-2: 173 58% 39%; --chart-3: 197 37% 24%; --chart-4: 43 74% 66%; --chart-5: 27 87% 67%; --radius: 0.5rem; --sidebar-background: 222 47% 11%; --sidebar-foreground: 210 40% 98%; --sidebar-primary: 221 83% 53%; --sidebar-primary-foreground: 210 40% 98%; --sidebar-accent: 221 83% 53%; --sidebar-accent-foreground: 210 40% 98%; --sidebar-border: 220 29% 28%; --sidebar-ring: 221 83% 53%; }
  .dark { --background: 222 47% 11%; --foreground: 210 40% 98%; --card: 222 47% 11%; --card-foreground: 210 40% 98%; --popover: 222 47% 11%; --popover-foreground: 210 40% 98%; --primary: 210 40% 98%; --primary-foreground: 222 47% 11%; --secondary: 217 33% 17%; --secondary-foreground: 210 40% 98%; --muted: 217 33% 17%; --muted-foreground: 215 20% 65%; --accent: 175 84% 31%; --accent-foreground: 210 40% 98%; --destructive: 0 63% 31%; --destructive-foreground: 210 40% 98%; --border: 217 33% 17%; --input: 217 33% 17%; --ring: 175 84% 31%; --chart-1: 220 70% 50%; --chart-2: 160 60% 45%; --chart-3: 30 80% 55%; --chart-4: 280 65% 60%; --chart-5: 340 75% 55%; --sidebar-background: 222 47% 11%; --sidebar-foreground: 210 40% 98%; --sidebar-primary: 221 83% 53%; --sidebar-primary-foreground: 210 40% 98%; --sidebar-accent: 217 33% 17%; --sidebar-accent-foreground: 210 40% 98%; --sidebar-border: 217 33% 17%; --sidebar-ring: 221 83% 53%; }
}
@layer base { * { @apply border-border; } body { @apply bg-background text-foreground; } }
`;

const PreviewLayout = ({ title, participants, departmentSummary, themeClassName }: any) => (
    <html className={themeClassName}>
        <head>
            <title>{`Vista Previa - ${title}`}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
        </head>
        <body className="bg-background text-foreground p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">{title}</h1>
                <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
                    <h2 className="text-xl font-bold mb-4">Detalle de Participantes</h2>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>DNI</TableHead>
                                    <TableHead>Departamento</TableHead>
                                    <TableHead>Edad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participants.map((p: Participant) => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.nombre}</TableCell>
                                        <TableCell>{p.dni}</TableCell>
                                        <TableCell>{p.departamento}</TableCell>
                                        <TableCell>{calculateAge(p.fechaNacimiento)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-lg shadow-sm border border-border mt-8">
                    <h2 className="text-xl font-bold mb-4">Resumen por Departamento</h2>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Departamento</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departmentSummary.map(([dept, count]: [string, number]) => (
                                    <TableRow key={dept}>
                                        <TableCell>{dept}</TableCell>
                                        <TableCell className="text-right">{count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </body>
    </html>
);

const UpcomingRenewalView = ({ participants, onBack, onSelectParticipant }: { participants: Participant[], onBack: () => void, onSelectParticipant: (participantId: string) => void }) => {

    const upcomingRenewalParticipants = useMemo(() => {
        const relevantPrograms: string[] = [PROGRAMAS.TECNO, PROGRAMAS.JOVEN];
        return participants.filter(p => {
            const payments = getParticipantPayments(p);
            const isInRelevantProgram = p.programa && relevantPrograms.includes(p.programa);
            const isUpcomingRenewal = payments === 5 || payments === 11;
            return isInRelevantProgram && isUpcomingRenewal && p.estado !== 'Baja';
        }).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [participants]);

    const summary = useMemo(() => {
        const data = {
            joven5: { count: 0, participants: [] as Participant[] },
            joven11: { count: 0, participants: [] as Participant[] },
            tecno5: { count: 0, participants: [] as Participant[] },
            tecno11: { count: 0, participants: [] as Participant[] },
        };

        upcomingRenewalParticipants.forEach(p => {
            const payments = getParticipantPayments(p);
            if (p.programa === PROGRAMAS.JOVEN) {
                if (payments === 5) { data.joven5.participants.push(p); data.joven5.count++; }
                else if (payments === 11) { data.joven11.participants.push(p); data.joven11.count++; }
            } else if (p.programa === PROGRAMAS.TECNO) {
                if (payments === 5) { data.tecno5.participants.push(p); data.tecno5.count++; }
                else if (payments === 11) { data.tecno11.participants.push(p); data.tecno11.count++; }
            }
        });
        return data;
    }, [upcomingRenewalParticipants]);

    const triggerPreview = (title: string, participants: Participant[]) => {
        const departmentSummary = participants.reduce((acc, p) => {
            const dept = p.departamento || 'No especificado';
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });

        const sortedDepartmentSummary = Object.entries(departmentSummary).sort(([, countA], [, countB]) => countB - countA);

        const themeClassName = document.documentElement.className;

        const previewContent = <PreviewLayout title={title} participants={participants} departmentSummary={sortedDepartmentSummary} themeClassName={themeClassName} />;
        const previewHtml = ReactDOMServer.renderToStaticMarkup(previewContent);

        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
            previewWindow.document.write(`<!DOCTYPE html>${previewHtml}`);
            previewWindow.document.close();
        } else {
            console.error('No se pudo abrir la ventana de vista previa. Asegúrese de que los pop-ups estén permitidos.');
        }
    };

    const SummaryCard = ({ title, count, onExport, onPreview, disabled }: { title: string, count: number, onExport: () => void, onPreview: () => void, disabled: boolean }) => (
        <Card className="p-4 flex flex-col justify-between border-l-4 border-yellow-500">
            <div>
                <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
                <p className="text-3xl font-bold text-gray-800">{count}</p>
            </div>
            <div className="flex items-center gap-2 mt-4">
                 <Button variant="outline" size="sm" onClick={onExport} disabled={disabled} className="w-full text-gray-700 border-gray-300 hover:bg-yellow-500 hover:text-white">
                    <Download className="mr-2 h-4 w-4" />Exportar
                </Button>
                <Button variant="outline" size="sm" onClick={onPreview} disabled={disabled} className="w-full text-gray-700 border-gray-300 hover:bg-yellow-500 hover:text-white">
                    <Eye className="mr-2 h-4 w-4" />Vista Previa
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Análisis de Próximos a Vencer</h2>
                <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Resumen</Button>
            </div>
            
            <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6")}>
                <SummaryCard 
                    title={`${PROGRAMAS.JOVEN} - 5 Pagos`} 
                    count={summary.joven5.count} 
                    onExport={() => exportToCSV(summary.joven5.participants, 'empleo_joven_5_pagos.csv')} 
                    onPreview={() => triggerPreview(`${PROGRAMAS.JOVEN} - 5 Pagos`, summary.joven5.participants)}
                    disabled={summary.joven5.count === 0} 
                />
                <SummaryCard 
                    title={`${PROGRAMAS.JOVEN} - 11 Pagos`} 
                    count={summary.joven11.count} 
                    onExport={() => exportToCSV(summary.joven11.participants, 'empleo_joven_11_pagos.csv')} 
                    onPreview={() => triggerPreview(`${PROGRAMAS.JOVEN} - 11 Pagos`, summary.joven11.participants)}
                    disabled={summary.joven11.count === 0} 
                />
                <SummaryCard 
                    title={`${PROGRAMAS.TECNO} - 5 Pagos`} 
                    count={summary.tecno5.count} 
                    onExport={() => exportToCSV(summary.tecno5.participants, 'tecnoempleo_5_pagos.csv')} 
                    onPreview={() => triggerPreview(`${PROGRAMAS.TECNO} - 5 Pagos`, summary.tecno5.participants)}
                    disabled={summary.tecno5.count === 0} 
                />
                <SummaryCard 
                    title={`${PROGRAMAS.TECNO} - 11 Pagos`} 
                    count={summary.tecno11.count} 
                    onExport={() => exportToCSV(summary.tecno11.participants, 'tecnoempleo_11_pagos.csv')} 
                    onPreview={() => triggerPreview(`${PROGRAMAS.TECNO} - 11 Pagos`, summary.tecno11.participants)}
                    disabled={summary.tecno11.count === 0} 
                />
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>DNI</TableHead>
                            <TableHead>Programa</TableHead>
                            <TableHead className="text-center">Pagos</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {upcomingRenewalParticipants.map(p => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.nombre}</TableCell>
                                <TableCell>{p.dni}</TableCell>
                                <TableCell><Badge variant="outline">{p.programa}</Badge></TableCell>
                                <TableCell className="text-center"><Badge>{getParticipantPayments(p)}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => onSelectParticipant(p.id)}>
                                       Gestionar
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {upcomingRenewalParticipants.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No hay participantes próximos a vencer en este momento.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

        </div>
    );
};

export default UpcomingRenewalView;
