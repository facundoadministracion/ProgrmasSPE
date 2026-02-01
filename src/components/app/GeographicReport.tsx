'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { Participant, PagoRegistrado } from '@/lib/types';
import { useCollection, useFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Printer, FileDown, Info, BarChart2 } from 'lucide-react';
import Papa from 'papaparse';
import { DEPARTAMENTOS, PROGRAMAS as PROGRAM_NAMES, YEARS, MONTHS } from '@/lib/constants';

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
};

interface ProcessedRow { department: string; total: number; percentage: string; totalAmount: number; [key:string]: any; }
interface TotalsRow { total: number; totalAmount: number; [key: string]: number; }

const GeographicReport = ({ onBack }: { onBack: () => void }) => {
  const { firestore } = useFirebase();
  const { data: allParticipants, isLoading: participantsLoading } = useCollection<Participant>('participants');
  
  const [filters, setFilters] = useState({ mes: '', anio: '', programa: 'todos', departamento: 'Todos' });
  const [isLoading, setIsLoading] = useState(false);
  const [baseData, setBaseData] = useState<any[]>([]);

  const handleFilterChange = (filterName: keyof typeof filters) => (value: string) => {
    const safeValue = value || (filterName === 'programa' ? 'todos' : 'Todos');
    setFilters(prev => ({ ...prev, [filterName]: safeValue }));
  };

  const generateReport = useCallback(async () => {
    if (!firestore || !filters.mes || !filters.anio) {
      alert('Por favor, seleccione Mes y Año.');
      return;
    }
    setIsLoading(true);
    setBaseData([]);
    try {
      const pagosQuery = query(collection(firestore, 'pagosRegistrados'), where('mes', '==', Number(filters.mes)), where('anio', '==', Number(filters.anio)));
      const pagosSnapshot = await getDocs(pagosQuery);
      const pagos = pagosSnapshot.docs.map(doc => doc.data() as PagoRegistrado);
      if (pagos.length > 0 && allParticipants) {
        const participantMap = new Map(allParticipants.map(p => [p.dni, p]));
        const fetchedData = pagos
          .map(pago => {
              const participant = participantMap.get(pago.dni);
              if (!participant) return null;
              return { ...participant, montoPagado: pago.montoPagado, programa: pago.programa };
          })
          .filter(p => p !== null);
        setBaseData(fetchedData as any[]);
      }
    } catch (error) { console.error("Error:", error); } 
    finally { setIsLoading(false); }
  }, [firestore, filters.mes, filters.anio, allParticipants]);

  const refinedData = useMemo(() => {
    if (baseData.length === 0) return [];
    return baseData
      .filter(p => filters.programa === 'todos' || normalizeText(p.programa) === normalizeText(filters.programa))
      .filter(p => filters.departamento === 'Todos' || p.departamento === filters.departamento);
  }, [baseData, filters.programa, filters.departamento]);

  const processedData: ProcessedRow[] = useMemo(() => {
    if (refinedData.length === 0) return [];
    const departments: { [key: string]: { total: number, totalAmount: number } } = {};
    refinedData.forEach(p => {
      const department = p.departamento || 'No especificado';
      if (!departments[department]) {
        departments[department] = { total: 0, totalAmount: 0 };
      }
      departments[department].total += 1;
      departments[department].totalAmount += p.montoPagado || 0;
    });
    const totalParticipants = Object.values(departments).reduce((sum, dept) => sum + dept.total, 0);
    return Object.entries(departments).map(([department, values]) => ({
        department, ...values,
        percentage: totalParticipants > 0 ? ((values.total / totalParticipants) * 100).toFixed(2) + '%' : '0.00%',
      })).sort((a, b) => b.total - a.total);
  }, [refinedData]);

  const totals: TotalsRow = useMemo(() => {
      const initialTotals: TotalsRow = { total: 0, totalAmount: 0 };
      return processedData.reduce((acc, row) => {
          acc.total += row.total;
          acc.totalAmount += row.totalAmount;
          return acc;
      }, initialTotals);
  }, [processedData]);
  
  // Se elimina la generación de título aquí. Solo se pasan los datos crudos.
  const handlePrint = (currentData: any[], currentFilters: typeof filters) => {
    sessionStorage.setItem('printableReportData', JSON.stringify({
      data: currentData,
      filters: currentFilters, // Pasamos el objeto de filtros completo
    }));
    window.open('/print-report', '_blank');
  };

  const handleExportCSV = () => {
    const csvData = refinedData.map(p => ({ DNI: p.dni, Nombre: p.nombre, Departamento: p.departamento, Programa: p.programa, Monto: p.montoPagado }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `informe_geografico_${filters.anio}_${filters.mes}.csv`);
    link.click();
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
        <div className="bg-gray-50 p-4 rounded-lg border mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <FilterSelect label="Año" value={filters.anio} onValueChange={handleFilterChange('anio')} options={YEARS.map(y => ({label: String(y), value: String(y)}))} placeholder="Seleccione Año" />
                <FilterSelect label="Mes" value={filters.mes} onValueChange={handleFilterChange('mes')} options={MONTHS.map((m, i) => ({label: m, value: String(i+1)}))} placeholder="Seleccione Mes" />
                <Button onClick={generateReport} disabled={isLoading || !filters.mes || !filters.anio} className="md:col-span-1">{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Generar</Button>
                <FilterSelect label="Programa" value={filters.programa} onValueChange={handleFilterChange('programa')} options={[{value: 'todos', label: 'Todos'}, ...Object.values(PROGRAM_NAMES).map(p => ({value: p, label: p}))]} />
                <FilterSelect label="Departamento" value={filters.departamento} onValueChange={handleFilterChange('departamento')} options={[{value: 'Todos', label: 'Todos'}, ...DEPARTAMENTOS.map(d => ({value: d, label: d}))]} />
            </div>
        </div>
        
        {isLoading && <div className="text-center p-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>}
        {!isLoading && baseData.length === 0 && <Alert className="mt-6"><Info className="h-4 w-4" /><AlertTitle>Informe Vacío</AlertTitle><AlertDescription>Seleccione Mes y Año, y haga clic en "Generar".</AlertDescription></Alert>}
        {!isLoading && baseData.length > 0 && (
            <div>
                <div className="flex justify-end gap-2 mb-4"><Button variant="outline" onClick={() => handlePrint(refinedData, filters)}><Printer className="mr-2 h-4 w-4"/> Imprimir</Button><Button variant="outline" onClick={handleExportCSV}><FileDown className="mr-2 h-4 w-4"/> Exportar Detalle</Button></div>
                <Table>
                    <TableHeader><TableRow><TableHead>Departamento</TableHead><TableHead className="text-right">Nº Part.</TableHead><TableHead className="text-right">Monto Total</TableHead><TableHead className="text-right">% Part.</TableHead></TableRow></TableHeader>
                    <TableBody>{processedData.map((row) => (<TableRow key={row.department}><TableCell className="font-medium">{row.department}</TableCell><TableCell className="text-right font-bold">{row.total}</TableCell><TableCell className="text-right">${(row.totalAmount || 0).toLocaleString('es-AR')}</TableCell><TableCell className="text-right">{row.percentage}</TableCell></TableRow>))}</TableBody>
                    <TableFooter><TableRow className="bg-gray-100 font-bold"><TableCell>TOTAL GENERAL</TableCell><TableCell className="text-right">{totals.total}</TableCell><TableCell className="text-right">${(totals.totalAmount || 0).toLocaleString('es-AR')}</TableCell><TableCell className="text-right">100.00%</TableCell></TableRow></TableFooter>
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
        <Select onValueChange={onValueChange} value={value}><SelectTrigger><SelectValue placeholder={placeholder || options[0].label} /></SelectTrigger><SelectContent>{options.map((opt: any) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent></Select>
    </div>
);

export default GeographicReport;
