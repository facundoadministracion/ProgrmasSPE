'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { MONTHS } from '@/lib/constants';

interface ReportPayload {
  data: any[];
  filters: {
    mes: string;
    anio: string;
    programa: string;
    departamento: string;
  };
}

interface ProcessedRow {
    department: string;
    total: number;
    percentage: string;
    [key: string]: any; 
}

interface TotalsRow {
    total: number;
    [key: string]: number; 
}

const PROGRAM_COLUMNS = ['Tutorías', 'Empleo Joven', 'Tecnoempleo'];

const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const PrintReportPage = () => {
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedData = sessionStorage.getItem('printableReportData');
    if (storedData) {
      try {
        setPayload(JSON.parse(storedData));
        sessionStorage.removeItem('printableReportData');
      } catch (error) {
        console.error("Error parsing report data:", error);
        router.push('/');
      }
    } else {
      router.push('/');
    }
    setLoading(false);
    const timeoutId = setTimeout(() => window.print(), 1000);
    return () => clearTimeout(timeoutId);
  }, [router]);

  const processedData: ProcessedRow[] = useMemo(() => {
    if (!payload) return [];
    const departments: { [key: string]: { [key: string]: number } } = {};
    
    payload.data.forEach(p => {
      const department = p.departamento ? p.departamento.trim() : 'No especificado';
      if (!departments[department]) {
        departments[department] = { total: 0 };
        PROGRAM_COLUMNS.forEach(prog => departments[department][prog] = 0);
      }
      
      const normalizedProgramName = normalizeText(p.programa);
      const programKey = PROGRAM_COLUMNS.find(col => normalizeText(col) === normalizedProgramName);

      if (programKey) {
        departments[department][programKey] = (departments[department][programKey] || 0) + 1;
      }
      departments[department].total += 1;
    });

    const totalParticipants = Object.values(departments).reduce((sum, dept) => sum + dept.total, 0);

    return Object.entries(departments)
      .map(([department, values]): ProcessedRow => ({
        department,
        ...values,
        total: values.total,
        percentage: totalParticipants > 0 ? ((values.total / totalParticipants) * 100).toFixed(2) + '%' : '0.00%',
      }))
      .sort((a, b) => b.total - a.total);
  }, [payload]);

  const totals: TotalsRow = useMemo(() => {
      if (!processedData) return { total: 0 };
      const initialTotals: TotalsRow = {
          total: 0,
          ...PROGRAM_COLUMNS.reduce((acc, p) => ({ ...acc, [p]: 0 }), {})
      };

      return processedData.reduce((acc: TotalsRow, currentRow: ProcessedRow) => {
          acc.total += currentRow.total;
          PROGRAM_COLUMNS.forEach(prog => {
              acc[prog] = (acc[prog] || 0) + (currentRow[prog] || 0);
          });
          return acc;
      }, initialTotals);
  }, [processedData]);

  if (loading || !payload) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2">Cargando vista de impresión...</p></div>;
  }
  
  const { filters } = payload;
  const selectedProgram = filters.programa !== 'todos' ? filters.programa.charAt(0).toUpperCase() + filters.programa.slice(1) : 'Todos los programas';
  const selectedDepartment = filters.departamento !== 'Todos' ? filters.departamento : 'Toda la provincia';

  return (
    <div className="p-8">
        <style>{`
            @page { size: A4; margin: 1.5cm; }
            @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; color-adjust: exact; } }
        `}</style>
      <div className="mb-8">
          <h1 className="text-2xl font-bold">Informe de Distribución Geográfica</h1>
          <div className="text-sm text-gray-700 mt-2 border-b pb-2">
            <div className="grid grid-cols-2 gap-x-4">
              <p>Programa: <strong className="font-semibold">{selectedProgram}</strong></p>
              <p>Departamento: <strong className="font-semibold">{selectedDepartment}</strong></p>
              <p>Período: <strong className="font-semibold">{MONTHS[Number(filters.mes) - 1]} {filters.anio}</strong></p>
              <p>Fecha de Emisión: <strong className="font-semibold">{new Date().toLocaleDateString('es-AR')}</strong></p>
            </div>
          </div>
      </div>
      
      <Button onClick={() => window.print()} className="no-print mb-4">Imprimir de nuevo</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Departamento</TableHead>
            {filters.programa === 'todos' && PROGRAM_COLUMNS.map(p => <TableHead key={p} className="text-right">{p}</TableHead>)}
            <TableHead className="text-right font-bold">Nº Part.</TableHead>
            <TableHead className="text-right">% Part.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedData.map((row) => (
            <TableRow key={row.department}>
              <TableCell className="font-medium">{row.department}</TableCell>
              {filters.programa === 'todos' && PROGRAM_COLUMNS.map(p => <TableCell key={p} className="text-right">{row[p] || 0}</TableCell>)}
              <TableCell className="text-right font-bold">{row.total}</TableCell>
              <TableCell className="text-right">{row.percentage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
            <TableRow className="bg-gray-100 font-bold">
            <TableCell>TOTAL GENERAL</TableCell>
            {filters.programa === 'todos' && PROGRAM_COLUMNS.map(p => <TableCell key={p} className="text-right">{totals[p] || 0}</TableCell>)}
            <TableCell className="text-right">{totals.total}</TableCell>
            <TableCell className="text-right">100.00%</TableCell>
            </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default PrintReportPage;
