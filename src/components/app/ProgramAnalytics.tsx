'use client';
import React, { useMemo, useState } from 'react';
import { Novedad, Participant } from '@/lib/types';
import { MONTHS, PROGRAMAS } from '@/lib/constants';
import { ArrowLeft, BarChart3, FileText, UserMinus, UserPlus, Users, Wrench } from 'lucide-react';
import { Card as UICard, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Card = ({ title, value, icon: Icon, subtitle }: { title: string, value: string | number, icon: React.ElementType, subtitle: string }) => (
    <UICard>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
        </CardContent>
    </UICard>
);

const ProgramAnalytics = ({ programName, participants, allNovedades, onBack }: { programName: string; participants: Participant[]; allNovedades: Novedad[]; onBack: () => void; }) => {
  const [month, setMonth] = useState(String(new Date().getMonth()));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const analytics = useMemo(() => {
    const programParticipants = participants.filter(p => p.programa === programName);
    const m = parseInt(month);
    const y = parseInt(year);
    
    const getRefDate = (p: Participant): Date | null => {
        if (p.fechaIngreso) {
            // Handle Firebase Timestamp or string date
            if (typeof p.fechaIngreso === 'string') return new Date(p.fechaIngreso);
            if ('seconds' in p.fechaIngreso) return new Date((p.fechaIngreso as any).seconds * 1000);
        }
        if (p.fechaAlta) {
            if (typeof p.fechaAlta === 'string') return new Date(p.fechaAlta);
            if ('seconds' in p.fechaAlta) return new Date((p.fechaAlta as any).seconds * 1000);
        }
        return null; 
    };

    const altas = programParticipants.filter(p => {
        const d = getRefDate(p);
        if(!d) return false;
        return d.getMonth() === m && d.getFullYear() === y;
    });

    const bajasNovedades = allNovedades.filter(n => {
        if(!n.fecha) return false;
        const d = new Date(n.fecha);
        const isThisProgram = programParticipants.some(p => p.id === n.participantId);
        const isBaja = n.descripcion.toLowerCase().includes('baja');
        return isThisProgram && isBaja && d.getMonth() === m && d.getFullYear() === y;
    });

    const endOfMonth = new Date(y, m + 1, 0);
    const activos = programParticipants.filter(p => {
        const d = getRefDate(p);
        return !d || d <= endOfMonth;
    });

    const equipoTecnico = programParticipants.filter(p => p.esEquipoTecnico).length;
    
    const categorias: { [key: string]: number } = {};
    if(programName === PROGRAMAS.TUTORIAS) {
        activos.forEach(p => {
            const cat = p.categoria || 'Sin Categoría';
            categorias[cat] = (categorias[cat] || 0) + 1;
        });
    }
    return { altas, bajasNovedades, activos, categorias, equipoTecnico };
  }, [programName, participants, allNovedades, month, year]);

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack}><ArrowLeft size={20} className="mr-2" /> Volver al Resumen</Button>
            <div className="flex gap-4">
                <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{[2023, 2024, 2025].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Análisis: {programName}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card title="Total Activos" value={analytics.activos.length} icon={Users} subtitle={`Acumulado a ${MONTHS[parseInt(month)]}`} />
            <Card title="Equipo Técnico" value={analytics.equipoTecnico} icon={Wrench} subtitle="Personal de Staff" />
            <Card title="Altas del Mes" value={analytics.altas.length} icon={UserPlus} subtitle="Nuevos ingresos" />
            <Card title="Bajas del Mes" value={analytics.bajasNovedades.length} icon={UserMinus} subtitle="Registradas en novedades" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {programName === PROGRAMAS.TUTORIAS && (
                <UICard>
                    <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 size={20}/> Distribución por Categoría</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {Object.entries(analytics.categorias).map(([cat, count]: [string, number]) => (
                            <div key={cat}>
                                <div className="flex justify-between text-sm mb-1"><span>{cat}</span><span className="font-bold">{count}</span></div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(count / analytics.activos.length) * 100}%` }}></div></div>
                            </div>
                        ))}
                        {Object.keys(analytics.categorias).length === 0 && <p className="text-gray-400 text-sm">Sin datos para mostrar.</p>}
                    </CardContent>
                </UICard>
            )}
            <UICard className={`${programName !== PROGRAMAS.TUTORIAS ? 'lg:col-span-2' : ''}`}>
                 <CardHeader><CardTitle className="flex items-center gap-2"><FileText size={20}/> Detalle de Movimientos ({MONTHS[parseInt(month)]})</CardTitle></CardHeader>
                 <CardContent>
                    <div className="overflow-y-auto max-h-60 border rounded-lg">
                        <Table>
                            <TableHeader className="bg-gray-50 sticky top-0">
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Detalle</TableHead>
                                    <TableHead>Fecha</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analytics.altas.map(p => (<TableRow key={'alta-'+p.id}><TableCell><Badge variant="green">Alta</Badge></TableCell><TableCell className="font-medium">{p.nombre}</TableCell><TableCell className="text-muted-foreground">Ingreso al programa</TableCell><TableCell>{p.fechaIngreso ? new Date(p.fechaIngreso).toLocaleDateString() : (p.fechaAlta && new Date(typeof p.fechaAlta === 'string' ? p.fechaAlta : (p.fechaAlta as any).seconds * 1000).toLocaleDateString()) || '-'}</TableCell></TableRow>))}
                                {analytics.bajasNovedades.map(n => (<TableRow key={'baja-'+n.id}><TableCell><Badge variant="destructive">Baja</Badge></TableCell><TableCell className="font-medium">{n.participantName}</TableCell><TableCell className="text-muted-foreground">{n.descripcion}</TableCell><TableCell>{new Date(n.fecha).toLocaleDateString()}</TableCell></TableRow>))}
                                {analytics.altas.length === 0 && analytics.bajasNovedades.length === 0 && <TableRow><TableCell colSpan={4} className="p-4 text-center text-gray-400">Sin movimientos este mes</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                 </CardContent>
            </UICard>
        </div>
    </div>
  );
};
export default ProgramAnalytics;
