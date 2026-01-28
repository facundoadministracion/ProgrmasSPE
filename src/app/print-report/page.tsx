'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface ReportData {
  data: any[];
  selectedProgram: string;
  selectedDepartment: string;
}

const PROGRAM_COLUMNS = ['Tutorías', 'Empleo Joven', 'Tecnoempleo'];

// *** FUNCIÓN DE NORMALIZACIÓN DEFINITIVA ***
// Elimina tildes, espacios y convierte a minúsculas.
const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .normalize('NFD') // Descompone caracteres (ej: 'á' -> 'a' + '´')
    .replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
    .toLowerCase()
    .trim();
};

const PrintReportPage = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedData = sessionStorage.getItem('printableReportData');
    if (storedData) {
      try {
        setReportData(JSON.parse(storedData));
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

  const reportTitle = useMemo(() => {
    if (!reportData) return 'Cargando informe...';
    let title = 'Informe de Distribución Geográfica';
    if (reportData.selectedProgram !== 'todos') {
      title += ` del programa "${reportData.selectedProgram}"`;
    } else {
      title += ' de los Programas de Empleo';
    }
    if (reportData.selectedDepartment !== 'Todos') {
      title += ` en ${reportData.selectedDepartment}`;
    }
    return title;
  }, [reportData]);

  const processedData = useMemo(() => {
    if (!reportData) return [];
    const departments: { [key: string]: { [key: string]: number } } = {};
    
    reportData.data.forEach(p => {
      const department = p.departamento ? p.departamento.trim() : 'No especificado';
      if (!departments[department]) {
        departments[department] = { total: 0 };
        PROGRAM_COLUMNS.forEach(prog => departments[department][prog] = 0);
      }
      
      // *** LÓGICA DE CONTEO CORREGIDA ***
      // Se usa la función de normalización para encontrar la columna correcta.
      const normalizedProgramName = normalizeText(p.programa);
      const programKey = PROGRAM_COLUMNS.find(col => normalizeText(col) === normalizedProgramName);

      if (programKey) {
        departments[department][programKey] = (departments[department][programKey] || 0) + 1;
      }
      departments[department].total += 1;
    });

    const totalParticipants = Object.values(departments).reduce((sum, dept) => sum + dept.total, 0);

    return Object.entries(departments)
      .map(([department, values]) => ({
        department,
        ...values,
        percentage: totalParticipants > 0 ? ((values.total / totalParticipants) * 100).toFixed(2) + '%' : '0.00%',
      }))
      .sort((a, b) => b.total - a.total);
  }, [reportData]);

  const totals = useMemo(() => {
      if (!processedData) return { total: 0 };
      return processedData.reduce((acc, currentRow) => {
          acc.total += currentRow.total;
          PROGRAM_COLUMNS.forEach(prog => {
              acc[prog] = (acc[prog] || 0) + (currentRow[prog] || 0);
          });
          return acc;
      }, { total: 0, ...PROGRAM_COLUMNS.reduce((acc, p) => ({...acc, [p]: 0}), {}) });
  }, [processedData]);

  if (loading || !reportData) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /><p className="ml-2">Cargando vista de impresión...</p></div>;
  }

  return (
    <div className="p-8">
        <style>{`
            @page { size: A4; margin: 1.5cm; }
            @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; color-adjust: exact; } }
        `}</style>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{reportTitle}</h1>
          <p className="text-sm text-gray-500">Generado el: {new Date().toLocaleDateString('es-AR')}</p>
        </div>
        <div className="no-print">
            <Button onClick={() => window.print()}>Imprimir de nuevo</Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Departamento</TableHead>
            {reportData.selectedProgram === 'todos' && PROGRAM_COLUMNS.map(p => <TableHead key={p} className="text-right">{p}</TableHead>)}
            <TableHead className="text-right font-bold">TOTAL</TableHead>
            <TableHead className="text-right">% Part.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedData.map((row) => (
            <TableRow key={row.department}>
              <TableCell className="font-medium">{row.department}</TableCell>
              {reportData.selectedProgram === 'todos' && PROGRAM_COLUMNS.map(p => <TableCell key={p} className="text-right">{row[p] || 0}</TableCell>)}
              <TableCell className="text-right font-bold">{row.total}</TableCell>
              <TableCell className="text-right">{row.percentage}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
            <TableRow className="bg-gray-100 font-bold">
            <TableCell>TOTAL GENERAL</TableCell>
            {reportData.selectedProgram === 'todos' && PROGRAM_COLUMNS.map(p => <TableCell key={p} className="text-right">{totals[p] || 0}</TableCell>)}
            <TableCell className="text-right">{totals.total}</TableCell>
            <TableCell className="text-right">100.00%</TableCell>
            </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};

export default PrintReportPage;
