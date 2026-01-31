'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { Participant, PagoRegistrado } from '@/lib/types';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Componentes de UI
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Map as MapIcon, User, ArrowLeft, Printer, FileDown, Info, BarChart2, Briefcase, UserCheck } from 'lucide-react';
import Papa from 'papaparse';
import { DEPARTAMENTOS, PROGRAMAS as PROGRAM_NAMES, YEARS, MONTHS } from '@/lib/constants';
import { normalizeText } from '@/lib/utils';

const PROGRAM_COLUMNS = ['Tutorías', 'Empleo Joven', 'Tecnoempleo'];

interface ProcessedRow { department: string; total: number; percentage: string; totalAmount: number; [key: string]: any; }
interface TotalsRow { total: number; totalAmount: number; [key: string]: number; }

const ProgramReportView = ({ onBack }: { onBack: () => void }) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-start">
        <div><CardTitle className="flex items-center"><Briefcase className="mr-2" />Informe por Programa</CardTitle><CardDescription>Análisis detallado de un programa específico.</CardDescription></div>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
      </div>
    </CardHeader>
    <CardContent>
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>En Construcción</AlertTitle>
        <AlertDescription>Esta sección está actualmente en desarrollo. Pronto podrás generar informes detallados por programa.</AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

const GeographicReportView = ({ onBack }: { onBack: () => void }) => {
  const { firestore } = useFirebase();
  const { data: allParticipants, isLoading: participantsLoading } = useCollection<Participant>('participants');
  
  const [filters, setFilters] = useState({ mes: '', anio: '', programa: 'todos', departamento: 'Todos' });
  const [isLoading, setIsLoading] = useState(false);
  const [baseData, setBaseData] = useState<any[]>([]);

  const handleFilterChange = (filterName: keyof typeof filters) => (value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const generateReport = useCallback(async () => {
    if (!firestore || !filters.mes || !filters.anio) { alert('Por favor, seleccione Mes y Año.'); return; }
    setIsLoading(true);
    setBaseData([]);
    try {
      const pagosQuery = query(
        collection(firestore, 'pagosRegistrados'), 
        where('mes', '==', filters.mes),
        where('anio', '==', filters.anio)
      );
      const pagosSnapshot = await getDocs(pagosQuery);
      const pagos = pagosSnapshot.docs.map(doc => doc.data() as PagoRegistrado);

      if (pagos.length > 0 && allParticipants) {
        const participantMap = new Map(allParticipants.map(p => [p.dni, p]));
        const fetchedData = pagos.map(pago => {
            const participant = participantMap.get(pago.dni);
            return participant ? { ...participant, montoPagado: pago.montoPagado, programa: pago.programa } : null;
          }).filter(Boolean);
        setBaseData(fetchedData as any[]);
      }
    } catch (error) { console.error("Error crítico al generar el informe:", error); setBaseData([]); }
    finally { setIsLoading(false); }
  }, [firestore, filters.mes, filters.anio, allParticipants]);

  const refinedData = useMemo(() => {
    if (baseData.length === 0) return [];
    return baseData
      .filter(p => filters.programa === 'todos' || normalizeText(p.programa) === normalizeText(filters.programa))
      .filter(p => filters.departamento === 'Todos' || normalizeText(p.departamento) === normalizeText(filters.departamento));
  }, [baseData, filters.programa, filters.departamento]);

  const processedData: ProcessedRow[] = useMemo(() => {
    if (refinedData.length === 0) return [];
    const departments: { [key: string]: { [key: string]: number, total: number, totalAmount: number } } = {};
    DEPARTAMENTOS.forEach(dept => { departments[dept] = { total: 0, totalAmount: 0, ...PROGRAM_COLUMNS.reduce((acc, prog) => ({...acc, [prog]: 0}), {}) }; });
    departments['No especificado'] = { total: 0, totalAmount: 0, ...PROGRAM_COLUMNS.reduce((acc, prog) => ({...acc, [prog]: 0}), {}) };

    refinedData.forEach(p => {
      const participantDeptNormalized = normalizeText(p.departamento);
      const canonicalDept = DEPARTAMENTOS.find(d => normalizeText(d) === participantDeptNormalized);
      const key = canonicalDept || 'No especificado';
      const departmentStats = departments[key];
      const normalizedProgramName = normalizeText(p.programa);
      const programKey = PROGRAM_COLUMNS.find(col => normalizeText(col) === normalizedProgramName);
      if (programKey) { departmentStats[programKey]++; }
      departmentStats.total++;
      departmentStats.totalAmount += p.montoPagado || 0;
    });

    const totalParticipants = refinedData.length;
    return Object.entries(departments).filter(([_, values]) => values.total > 0).map(([department, values]) => ({ department, ...values, percentage: totalParticipants > 0 ? ((values.total / totalParticipants) * 100).toFixed(2) + '%' : '0.00%', })).sort((a, b) => b.total - a.total);
  }, [refinedData]);

  const totals: TotalsRow = useMemo(() => {
      return processedData.reduce((acc, row) => {
          acc.total += row.total;
          acc.totalAmount += row.totalAmount;
          PROGRAM_COLUMNS.forEach(p => { acc[p] = (acc[p] || 0) + (row[p] || 0); });
          return acc;
      }, { total: 0, totalAmount: 0, ...PROGRAM_COLUMNS.reduce((acc, p) => ({ ...acc, [p]: 0 }), {}) });
  }, [processedData]);
  
  const handlePrint = () => {
    sessionStorage.setItem('printableReportData', JSON.stringify({ data: refinedData, processedData, totals, filters }));
    window.open('/print-report', '_blank');
  };

  const handleExportCSV = () => {
    const csvData = refinedData.map(p => ({ DNI: p.dni, Nombre: p.nombre, Apellido: p.apellido, Departamento: p.departamento, Programa: p.programa, Monto: p.montoPagado }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `informe_geografico_${filters.anio}_${filters.mes}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (participantsLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div><CardTitle className="flex items-center"><BarChart2 className="mr-2" />Informe Geográfico</CardTitle><CardDescription>Análisis de liquidaciones por departamento y período.</CardDescription></div>
          <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-4 rounded-lg border mb-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <FilterSelect label="Año" value={filters.anio} onValueChange={handleFilterChange('anio')} options={YEARS.map(y => ({label: String(y), value: String(y)}))} placeholder="Seleccione Año" />
                <FilterSelect label="Mes" value={filters.mes} onValueChange={handleFilterChange('mes')} options={MONTHS.map((m, i) => ({label: m, value: String(i+1)}))} placeholder="Seleccione Mes" />
                <Button onClick={generateReport} disabled={isLoading || !filters.mes || !filters.anio} className="self-end">{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Generar</Button>
            </div>

            {refinedData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <FilterSelect label="Programa" value={filters.programa} onValueChange={handleFilterChange('programa')} options={[{value: 'todos', label: 'Todos'}, ...Object.values(PROGRAM_NAMES).map(p => ({value: p, label: p}))]} />
                <FilterSelect label="Departamento" value={filters.departamento} onValueChange={handleFilterChange('departamento')} options={[{value: 'Todos', label: 'Todos'}, ...DEPARTAMENTOS.map(d => ({value: d, label: d}))]} />
                <div className="flex justify-end gap-2 self-end md:col-span-2">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Imprimir</Button>
                    <Button variant="outline" onClick={handleExportCSV}><FileDown className="mr-2 h-4 w-4"/> Exportar</Button>
                </div>
              </div>
            )}
        </div>
        
        {isLoading && <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}
        {!isLoading && baseData.length === 0 && <Alert className="mt-6"><Info className="h-4 w-4" /><AlertTitle>Informe Vacío</AlertTitle><AlertDescription>Seleccione Mes y Año, y haga clic en "Generar" para ver los resultados.</AlertDescription></Alert>}
        {!isLoading && refinedData.length > 0 && (
            <div>
                <Table>
                    <TableHeader><TableRow>
                        <TableHead>Departamento</TableHead>
                        {PROGRAM_COLUMNS.map(p => <TableHead key={p} className="text-right">{p}</TableHead>)}
                        <TableHead className="text-right font-bold">Nº Part.</TableHead>
                        <TableHead className="text-right font-bold">Monto Total</TableHead>
                        <TableHead className="text-right">% Part.</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{processedData.map((row) => (<TableRow key={row.department}>
                        <TableCell className="font-medium">{row.department}</TableCell>
                        {PROGRAM_COLUMNS.map(p => <TableCell key={p} className="text-right">{row[p] || 0}</TableCell>)}
                        <TableCell className="text-right font-bold">{row.total}</TableCell>
                        <TableCell className="text-right font-bold">${(row.totalAmount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{row.percentage}</TableCell>
                    </TableRow>))}</TableBody>
                    <TableFooter><TableRow className="bg-gray-100 font-bold">
                        <TableCell>TOTAL GENERAL</TableCell>
                        {PROGRAM_COLUMNS.map(p => <TableCell key={p} className="text-right">{totals[p] || 0}</TableCell>)}
                        <TableCell className="text-right">{totals.total}</TableCell>
                        <TableCell className="text-right">${(totals.totalAmount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">100.00%</TableCell>
                    </TableRow></TableFooter>
                </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

const FilterSelect = ({ label, value, onValueChange, options, placeholder }: any) => (
    <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
        <Select onValueChange={onValueChange} value={value}><SelectTrigger><SelectValue placeholder={placeholder || "Seleccionar"} /></SelectTrigger><SelectContent>{options.map((opt: any) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
    </div>
);

type ReportView = 'overview' | 'geographic-report' | 'program-report';

const Reports: React.FC = () => {
  const [view, setView] = useState<ReportView>('overview');

  if (view === 'geographic-report') {
    return <GeographicReportView onBack={() => setView('overview')} />;
  }
  
  if (view === 'program-report') {
    return <ProgramReportView onBack={() => setView('overview')} />;
  }

  return (
    <div className="space-y-8">
        <h2 className="text-2xl font-bold tracking-tight">Módulo de Informes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card onClick={() => setView('geographic-report')} className="cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all">
            <CardHeader><CardTitle className="flex items-center"><MapIcon className="mr-3" />Informe Geográfico</CardTitle></CardHeader>
            <CardContent><CardDescription>Análisis de liquidaciones por departamento y período.</CardDescription></CardContent>
          </Card>
          <Card onClick={() => setView('program-report')} className="cursor-pointer hover:shadow-lg hover:border-teal-500 transition-all">
            <CardHeader><CardTitle className="flex items-center"><Briefcase className="mr-3" />Informe por Programa</CardTitle></CardHeader>
            <CardContent><CardDescription>Genera un informe detallado para un programa específico.</CardDescription></CardContent>
          </Card>
          <Card className="cursor-not-allowed bg-gray-50 opacity-60">
            <CardHeader><CardTitle className="flex items-center text-gray-400"><UserCheck className="mr-3" />Informe por Persona</CardTitle><span className="ml-2 inline-block px-2 py-1 text-xs font-semibold text-white bg-gray-400 rounded-full">Próximamente</span></CardHeader>
            <CardContent><CardDescription>Consulta el historial completo de un participante.</CardDescription></CardContent>
          </Card>
        </div>
    </div>
  );
};

export default Reports;
