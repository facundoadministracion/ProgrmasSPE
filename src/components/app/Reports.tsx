'use client';

import React, { useMemo, useState } from 'react';
import type { Participant } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { PROGRAMAS, MONTHS, YEARS, DEPARTAMENTOS } from '@/lib/constants';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, User, ChevronDown, AlertCircle, Printer, ArrowLeft } from 'lucide-react';
import DataQualityReportCard from './DataQualityReportCard';
// El antiguo componente de impresión ya no es necesario aquí
// import PrintableReport from './PrintableReport';

interface DetailedParticipant extends Participant {
    montoPagado: number;
}
const formatCurrency = (num: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);
const normalizeDepartmentName = (name: string | null | undefined): string => {
  const defaultName = 'No especificado';
  if (!name || !name.trim()) return defaultName;
  let normalized = name.trim().toLowerCase().replace(/pealoza/g, 'peñaloza').replace(/^gral\.? /g, 'general ');
  const match = DEPARTAMENTOS.find(d => d.toLowerCase() === normalized);
  if (match) return match;
  if (normalized.includes('angel vicente')) return 'Ángel Vicente Peñaloza';
  if (normalized.includes('felipe varela')) return 'Felipe Varela';
  if (normalized.includes('rosario vera')) return 'Rosario Vera Peñaloza';
  return defaultName;
};

const ReportNavigation = ({ onSelectReport }: { onSelectReport: (report: string) => void }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onSelectReport('geo')}>
            <CardHeader><CardTitle>Informe Geográfico por Liquidación</CardTitle><CardDescription>Analiza liquidaciones mensuales específicas.</CardDescription></CardHeader>
        </Card>
         <Card className="cursor-not-allowed bg-gray-50"><CardHeader><CardTitle>Informe por Programa (Próximamente)</CardTitle><CardDescription>Análisis detallado de cada programa.</CardDescription></CardHeader></Card>
        <Card className="cursor-not-allowed bg-gray-50"><CardHeader><CardTitle>Informe por Participante (Próximamente)</CardTitle><CardDescription>Historial y estado de un participante.</CardDescription></CardHeader></Card>
    </div>
);

const Reports: React.FC<ReportsProps> = ({ participants, participantsLoading, onSelectParticipant }) => {
    const firestore = useFirestore();
    const [activeReport, setActiveReport] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // El estado isPrinting ya no es necesario
    // const [isPrinting, setIsPrinting] = useState(false);
    
    const [selectedProgram, setSelectedProgram] = useState('todos');
    const [selectedMonth, setSelectedMonth] = useState('todos');
    const [selectedYear, setSelectedYear] = useState('todos');
    const [selectedDepartment, setSelectedDepartment] = useState('Todos');
    const [detailedReportData, setDetailedReportData] = useState<DetailedParticipant[]>([]);
    const [showDetails, setShowDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async () => {
        if (selectedMonth === 'todos' || selectedYear === 'todos' || !firestore) return;

        setIsGeneratingReport(true);
        setHasSearched(true);
        setDetailedReportData([]);
        setShowDetails(false);
        setError(null);
        setSelectedProgram('todos');
        setSelectedDepartment('Todos');

        try {
            const paymentsQuery = query(
                collection(firestore, 'pagosRegistrados'),
                where('mes', '==', selectedMonth),
                where('anio', '==', selectedYear)
            );
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const payments = paymentsSnapshot.docs.map(doc => ({ 
                dni: doc.data().dni,
                monto: (doc.data().montoPagado || doc.data().monto) as number,
                programa: doc.data().programa,
            }));

            if (payments.length === 0) {
                setIsGeneratingReport(false);
                return;
            }

            const dnis = [...new Set(payments.map(p => p.dni).filter(dni => dni && String(dni).trim()))];

            if (dnis.length === 0) {
                setIsGeneratingReport(false);
                return;
            }

            const participantMap = new Map<string, Participant>();

            const participantChunks: string[][] = [];
            for (let i = 0; i < dnis.length; i += 30) {
                participantChunks.push(dnis.slice(i, i + 30));
            }

            await Promise.all(participantChunks.map(async (chunk) => {
                if (chunk.length === 0) return;
                const participantsQuery = query(collection(firestore, 'participants'), where('dni', 'in', chunk));
                const participantsSnapshot = await getDocs(participantsQuery);
                participantsSnapshot.docs.forEach(doc => {
                    const participantData = { id: doc.id, ...doc.data() } as Participant;
                    if (participantData.dni) {
                        participantMap.set(String(participantData.dni), participantData);
                    }
                });
            }));
            
            const fullDetailedData: DetailedParticipant[] = payments.map(payment => {
                const participant = participantMap.get(String(payment.dni));
                return {
                    ...(participant || {} as Participant),
                    id: participant?.id || String(payment.dni),
                    dni: String(payment.dni),
                    nombre: participant?.nombre || 'Participante no encontrado',
                    departamento: participant?.departamento,
                    programa: payment.programa || participant?.programa,
                    montoPagado: payment.monto || 0,
                } as DetailedParticipant;
            }).filter(p => p.dni);
            
            setDetailedReportData(fullDetailedData);

        } catch (err) {
            console.error("Error generating report:", err);
            setError('Ocurrió un error al generar el informe. Verifique la consola para más detalles.');
        } finally {
            setIsGeneratingReport(false);
        }
    };
    
    const filteredDetailedData = useMemo(() => {
        return detailedReportData.filter(p => {
            const normalizedDept = normalizeDepartmentName(p.departamento);
            if (selectedDepartment !== 'Todos' && normalizedDept !== selectedDepartment) return false;
            if (selectedProgram !== 'todos' && p.programa !== selectedProgram) return false;
            return true;
        });
    }, [detailedReportData, selectedDepartment, selectedProgram]);

    const aggregatedReportData = useMemo(() => {
        const data: { [department: string]: { count: number; totalAmount: number } } = {};
        filteredDetailedData.forEach(p => {
            const department = normalizeDepartmentName(p.departamento);
            if (!data[department]) data[department] = { count: 0, totalAmount: 0 };
            data[department].count += 1;
            data[department].totalAmount += p.montoPagado;
        });
        return Object.entries(data).map(([department, values]) => ({ department, ...values })).sort((a, b) => b.count - a.count);
    }, [filteredDetailedData]);

    const { grandTotalCount, grandTotalAmount } = useMemo(() => {
        return aggregatedReportData.reduce((totals, row) => {
            totals.grandTotalCount += row.count;
            totals.grandTotalAmount += row.totalAmount;
            return totals;
        }, { grandTotalCount: 0, grandTotalAmount: 0 });
    }, [aggregatedReportData]);

    const handleResetFilters = () => {
        setSelectedProgram('todos');
        setSelectedMonth('todos');
        setSelectedYear('todos');
        setSelectedDepartment('Todos');
        setShowDetails(false);
        setDetailedReportData([]);
        setError(null);
        setHasSearched(false);
    };

    // *** NUEVA FUNCIÓN PARA IMPRIMIR ***
    const handlePrint = () => {
        const dataToPrint = {
            data: filteredDetailedData,
            selectedProgram,
            selectedDepartment,
        };
        sessionStorage.setItem('printableReportData', JSON.stringify(dataToPrint));
        window.open('/print-report', '_blank');
    };

    const renderContent = () => {
        if (activeReport === 'geo') {
            return (
                <div className="space-y-6">
                    {/* El modal de impresión ya no se renderiza aquí */}
                    <Card>
                        <CardHeader>
                            <Button variant="ghost" size="sm" onClick={() => { setActiveReport(null); handleResetFilters(); }} className="mb-2">
                                <ArrowLeft className="h-4 w-4 mr-2" /> Volver a Informes
                            </Button>
                            <CardTitle>Informe de Distribución Geográfica</CardTitle>
                            <CardDescription>Análisis de liquidaciones por mes. Seleccione mes/año y genere el informe.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4 p-4 border-b mb-4 bg-gray-50 rounded-lg items-end">
                                <div className="flex-1 min-w-[150px]"><label className="text-sm font-medium">Mes</label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Seleccionar</SelectItem>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select></div>
                                <div className="flex-1 min-w-[150px]"><label className="text-sm font-medium">Año</label><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Seleccionar</SelectItem>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
                                
                                <Button onClick={handleGenerateReport} disabled={selectedMonth === 'todos' || selectedYear === 'todos' || isGeneratingReport}>
                                    {isGeneratingReport ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null} Generar Informe
                                </Button>
                                <Button variant="outline" onClick={handleResetFilters}>Limpiar</Button>
                                
                                {aggregatedReportData.length > 0 && (
                                    // El botón ahora llama a la nueva función handlePrint
                                    <Button variant="secondary" onClick={handlePrint}>
                                        <Printer className="h-4 w-4 mr-2" /> Imprimir
                                    </Button>
                                )}
                            </div>

                            {detailedReportData.length > 0 && (
                                <div className="flex flex-wrap gap-4 p-4 border-b mb-4">
                                    <div className="flex-1 min-w-[200px]"><label className="text-sm font-medium">Filtrar por Departamento</label><Select value={selectedDepartment} onValueChange={setSelectedDepartment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{[...new Set(detailedReportData.map(p => normalizeDepartmentName(p.departamento)))].sort().map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                                    <div className="flex-1 min-w-[200px]"><label className="text-sm font-medium">Filtrar por Programa</label><Select value={selectedProgram} onValueChange={setSelectedProgram}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{[...new Set(detailedReportData.map(p => p.programa).filter(Boolean))].sort().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                            )}
                            
                            {isGeneratingReport ? (
                                <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Generando informe...</span></div>
                            ) : error ? (
                               <div className="text-center py-8 text-red-600"><AlertCircle className="h-6 w-6 mx-auto mb-2"/>{error}</div>
                            ) : !hasSearched ? (
                                <div className="text-center py-8 text-gray-500">Seleccione mes/año y genere un informe para ver los resultados.</div>
                            ) : aggregatedReportData.length > 0 ? (
                                <Table>
                                    <TableHeader><TableRow><TableHead>Departamento</TableHead><TableHead className="text-right">N° Participantes</TableHead><TableHead className="text-right">Monto Liquidado</TableHead></TableRow></TableHeader>
                                    <TableBody>{aggregatedReportData.map(row => (<TableRow key={row.department}><TableCell className="font-medium">{row.department}</TableCell><TableCell className="text-right">{row.count}</TableCell><TableCell className="text-right">{formatCurrency(row.totalAmount)}</TableCell></TableRow>))}</TableBody>
                                    <TableFooter><TableRow className="bg-gray-100 hover:bg-gray-100/80"><TableCell className="font-bold">Total General</TableCell><TableCell className="font-bold text-right">{grandTotalCount}</TableCell><TableCell className="font-bold text-right">{formatCurrency(grandTotalAmount)}</TableCell></TableRow></TableFooter>
                                </Table>
                            ) : detailedReportData.length > 0 && aggregatedReportData.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No hay resultados para los filtros aplicados.</div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">No se encontraron pagos para el período seleccionado.</div>
                            )}
                        </CardContent>
                         {aggregatedReportData.length > 0 && (
                             <CardFooter className="flex justify-center pt-4 border-t">
                                <Button variant="secondary" onClick={() => setShowDetails(!showDetails)}>
                                    {showDetails ? 'Ocultar Detalle' : 'Ver Detalle de Participantes'} 
                                    <ChevronDown className={`h-5 w-5 ml-2 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                                </Button>
                            </CardFooter>
                        )}
                    </Card>

                    {showDetails && filteredDetailedData.length > 0 && (
                        <Card>{/* ... Contenido del detalle ... */}</Card>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <DataQualityReportCard participants={participants} onSelectParticipant={onSelectParticipant} />
                <ReportNavigation onSelectReport={setActiveReport} />
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Módulo de Informes</h1>
            {participantsLoading && !activeReport ? <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : renderContent()}
        </div>
    );
};

export default Reports;
