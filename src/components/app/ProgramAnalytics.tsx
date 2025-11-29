'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Novedad, Participant } from '@/lib/types';
import { MONTHS, PROGRAMAS, CATEGORIAS_TUTORIAS } from '@/lib/constants';
import { formatDateToDDMMYYYY } from '@/lib/utils';
import { ArrowLeft, BarChart3, FileText, UserMinus, UserPlus, Wrench, Loader2, Coins } from 'lucide-react';
import { Card as UICard, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Card = ({ title, value, icon: Icon, subtitle, isLoading }: { title: string, value: string | number, icon: React.ElementType, subtitle: string, isLoading?: boolean }) => (
    <UICard>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? <div className="h-7 w-1/2 bg-gray-200 animate-pulse rounded" /> : <div className="text-2xl font-bold">{value}</div>}
            <p className="text-xs text-muted-foreground">{subtitle}</p>
        </CardContent>
    </UICard>
);

interface ProcessedPaymentData {
  count: number;
  monthName: string;
  year: string;
  categorias: { [key: string]: { count: number; monto: number } };
  categorizedParticipants: { [key: string]: any[] };
}

const ProgramAnalytics = ({ programName, participants, onBack, onSelectParticipant }: { programName: string; participants: Participant[]; onBack: () => void; onSelectParticipant: (p: Participant) => void; }) => {
  const [month, setMonth] = useState(String(new Date().getMonth()));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { firestore } = useFirebase();
  const { findConfigForDate, isLoading: configLoading } = useConfiguracion();

  const [paymentData, setPaymentData] = useState<ProcessedPaymentData | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentData = async () => {
      if (!firestore) return;

      setPaymentLoading(true);
      
      const currentMonth = parseInt(month) + 1;
      const currentYear = parseInt(year);
      const config = findConfigForDate(currentMonth, currentYear);

      try {
        const paymentRecordsRef = collection(firestore, 'paymentRecords');
        const q = query(
          paymentRecordsRef,
          where('programa', '==', programName),
          where('mes', '==', String(currentMonth)),
          where('anio', '==', String(currentYear))
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const paymentDoc = snapshot.docs[0].data();
          const paidParticipants = paymentDoc.participantes || [];
          const count = paidParticipants.length;
          const monthName = MONTHS[parseInt(paymentDoc.mes) - 1] || 'N/A';
          const yearValue = paymentDoc.anio;

          const categorizedParticipants: { [key: string]: any[] } = {};
          paidParticipants.forEach((p: any) => {
            const cat = p.categoria || 'Sin Categoría';
            if (!categorizedParticipants[cat]) {
                categorizedParticipants[cat] = [];
            }
            categorizedParticipants[cat].push(p);
          });

          const categorias: ProcessedPaymentData['categorias'] = {};
          if (programName === PROGRAMAS.TUTORIAS) {
             CATEGORIAS_TUTORIAS.forEach(cat => {
                const monto = config?.montos[cat] || 0;
                const count = categorizedParticipants[cat]?.length || 0;
                if(count > 0) {
                  categorias[cat] = { count, monto };
                }
             });
             if (categorizedParticipants['Sin Categoría']) {
                 categorias['Sin Categoría'] = { count: categorizedParticipants['Sin Categoría'].length, monto: 0 };
             }
          } else if (config?.montos[programName]) {
              categorias[programName] = { count: count, monto: config.montos[programName] };
          }

          setPaymentData({ count, monthName, year: yearValue, categorias, categorizedParticipants });
        } else {
          setPaymentData(null);
        }
      } catch (error) {
        console.error("Error fetching payment data:", error);
        setPaymentData(null);
      } finally {
        setPaymentLoading(false);
      }
    };

    if (!configLoading) {
        fetchPaymentData();
    }
  }, [firestore, programName, month, year, findConfigForDate, configLoading]);

  const novedadesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    const startDate = new Date(parseInt(year), parseInt(month), 1).toISOString().split('T')[0];
    const endDate = new Date(parseInt(year), parseInt(month) + 1, 0).toISOString().split('T')[0];
    return query(collection(firestore, 'novedades'), where('fecha', '>=', startDate), where('fecha', '<=', endDate));
  }, [firestore, year, month]);

  const { data: allNovedades, isLoading: novedadesLoading } = useCollection<Novedad>(novedadesRef);

  const analytics = useMemo(() => {
    const programParticipants = participants.filter(p => p.programa === programName);
    const m = parseInt(month);
    const y = parseInt(year);
    
    const getRefDate = (p: Participant): Date | null => {
        if (p.fechaIngreso) return new Date(p.fechaIngreso + 'T00:00:00');
        if (typeof p.fechaAlta === 'string') return new Date(p.fechaAlta);
        if (p.fechaAlta && 'seconds' in p.fechaAlta) return new Date((p.fechaAlta as any).seconds * 1000);
        return null; 
    };

    const altas = programParticipants.filter(p => {
        const d = getRefDate(p);
        if(!d) return false;
        return d.getMonth() === m && d.getFullYear() === y;
    });

    const bajasNovedades = (allNovedades || []).filter(n => {
        if(!n.fecha) return false;
        const isThisProgram = programParticipants.some(p => p.id === n.participantId);
        const isBaja = n.descripcion.toLowerCase().includes('baja');
        return isThisProgram && isBaja;
    });
    
    const equipoTecnico = programParticipants.filter(p => p.esEquipoTecnico).length;

    return { altas, bajasNovedades, equipoTecnico };
  }, [programName, participants, allNovedades, month, year]);

  const handleParticipantSelect = (dni: string) => {
    const participant = participants.find(p => p.dni === dni);
    if (participant) {
      setSelectedCategory(null);
      onSelectParticipant(participant);
    }
  };

  const selectedMonthName = MONTHS[parseInt(month)];
  const totalLiquidado = useMemo(() => {
      if (!paymentData) return 0;
      return Object.values(paymentData.categorias).reduce((acc, { count, monto }) => acc + (count * monto), 0);
  }, [paymentData]);

  return (
    <>
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
              <Card 
                  title="Total Liquidado"
                  value={totalLiquidado.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
                  icon={Coins} 
                  subtitle={paymentData ? `${paymentData.count} participantes` : 'Sin pago en este mes'}
                  isLoading={paymentLoading || configLoading}
              />
              {programName !== PROGRAMAS.TUTORIAS &&
                  <Card title="Equipo Técnico" value={analytics.equipoTecnico} icon={Wrench} subtitle="Personal de Staff" />
              }
              <Card title="Altas del Mes" value={analytics.altas.length} icon={UserPlus} subtitle={`En ${selectedMonthName}`} />
              <Card title="Bajas del Mes" value={analytics.bajasNovedades.length} icon={UserMinus} subtitle="Registradas en novedades" isLoading={novedadesLoading}/>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {programName === PROGRAMAS.TUTORIAS && (
                  <UICard>
                      <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 size={20}/> Distribución por Categoría ({selectedMonthName})</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          {paymentLoading || configLoading ? (
                              <div className="h-24 flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2"/> Cargando...</div>
                          ) : paymentData && Object.keys(paymentData.categorias).length > 0 ? (
                              Object.entries(paymentData.categorias).map(([cat, { count, monto }]: [string, { count: number; monto: number }]) => (
                                  <div key={cat} onClick={() => setSelectedCategory(cat)} className="cursor-pointer hover:opacity-80 p-2 rounded-lg transition-colors duration-150 hover:bg-gray-50">
                                      <div className="flex justify-between items-center text-sm mb-1">
                                          <div>
                                              <span>{cat}</span>
                                              <span className="text-xs text-gray-500 ml-2">({monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })})</span>
                                          </div>
                                          <span className="font-bold">{count}</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(count / (paymentData?.count || 1)) * 100}%` }}></div></div>
                                  </div>
                              ))
                          ) : (
                              <p className="text-gray-400 text-sm text-center py-8">No hay datos de pago para mostrar la distribución de este mes.</p>
                          )}
                      </CardContent>
                  </UICard>
              )}
              <UICard className={`${programName !== PROGRAMAS.TUTORIAS ? 'lg:col-span-2' : ''}`}>
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText size={20}/> Detalle de Movimientos ({selectedMonthName})</CardTitle></CardHeader>
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
                                  {novedadesLoading && <TableRow><TableCell colSpan={4} className="p-4 text-center text-gray-400"><Loader2 className="animate-spin inline-block mr-2" />Cargando movimientos...</TableCell></TableRow>}
                                  {!novedadesLoading && analytics.altas.map(p => (<TableRow key={'alta-'+p.id}><TableCell><Badge variant="green">Alta</Badge></TableCell><TableCell className="font-medium">{p.nombre}</TableCell><TableCell className="text-muted-foreground">Ingreso al programa</TableCell><TableCell>{formatDateToDDMMYYYY(p.fechaIngreso as string)}</TableCell></TableRow>))}
                                  {!novedadesLoading && analytics.bajasNovedades.map(n => (<TableRow key={'baja-'+n.id}><TableCell><Badge variant="destructive">Baja</Badge></TableCell><TableCell className="font-medium">{n.participantName}</TableCell><TableCell className="text-muted-foreground">{n.descripcion}</TableCell><TableCell>{formatDateToDDMMYYYY(n.fecha)}</TableCell></TableRow>))}
                                  {!novedadesLoading && analytics.altas.length === 0 && analytics.bajasNovedades.length === 0 && <TableRow><TableCell colSpan={4} className="p-4 text-center text-gray-400">Sin movimientos este mes</TableCell></TableRow>}
                              </TableBody>
                          </Table>
                      </div>
                  </CardContent>
              </UICard>
          </div>
      </div>

      <Dialog open={!!selectedCategory} onOpenChange={(isOpen) => !isOpen && setSelectedCategory(null)}>
          <DialogContent className="max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Participantes en Categoría: {selectedCategory}</DialogTitle>
                  <DialogDescription>
                      Lista de participantes para la categoría seleccionada. Puede hacer clic en "Ver Legajo" para editar.
                  </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto mt-4">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>DNI</TableHead>
                              <TableHead className="text-right">Acción</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {selectedCategory && paymentData?.categorizedParticipants[selectedCategory]?.sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => (
                              <TableRow key={p.id}>
                                  <TableCell>{p.nombre}</TableCell>
                                  <TableCell>{p.dni}</TableCell>
                                  <TableCell className="text-right">
                                      <Button variant="link" onClick={() => handleParticipantSelect(p.dni)}>Ver Legajo</Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
          </DialogContent>
      </Dialog>
    </>
  );
};
export default ProgramAnalytics;
