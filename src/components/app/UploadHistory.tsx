'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Loader2, Inbox, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MONTHS } from '@/lib/constants';
import { useForceRefreshStore } from '@/store/force-refresh-store'; // Importar el store

interface UploadHistoryRecord {
  id: string;
  uploadedAt: { seconds: number; nanoseconds: number; };
  uploadedBy: string;
  mesLiquidacion: string;
  anoLiquidacion: string;
  programa: string;
  cantidadPagos: number;
}

const ITEMS_PER_PAGE = 5;

const SimplifiedUploadHistory = () => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { triggerRefresh } = useForceRefreshStore(); // Obtener la función para disparar la actualización
  const [history, setHistory] = useState<UploadHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UploadHistoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const historyQuery = query(collection(firestore, 'paymentHistory'), orderBy('uploadedAt', 'desc'));
        const historySnapshot = await getDocs(historyQuery);
        const historyData = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UploadHistoryRecord));
        setHistory(historyData);

      } catch (error) {
        console.error("Error fetching upload history:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el historial." });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firestore, toast]);

  const sortedHistory = useMemo(() => {
      return [...history].sort((a, b) => {
          const dateA = new Date(parseInt(a.anoLiquidacion, 10), parseInt(a.mesLiquidacion, 10) - 1);
          const dateB = new Date(parseInt(b.anoLiquidacion, 10), parseInt(b.mesLiquidacion, 10) - 1);
          if (dateB.getTime() !== dateA.getTime()) {
              return dateB.getTime() - dateA.getTime();
          }
          return a.programa.localeCompare(b.programa);
      });
  }, [history]);

  const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = sortedHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  
  const handleDeleteClick = (record: UploadHistoryRecord) => {
      setSelectedRecord(record);
      setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
      if (!selectedRecord) return;

      setIsDeleting(true);
      try {
          const res = await fetch('/api/revert-payment-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ historyId: selectedRecord.id }),
          });

          const data = await res.json();

          if (!res.ok) {
              throw new Error(data.message || 'Ocurrió un error en el servidor al intentar eliminar la carga.');
          }

          toast({ title: "Carga Eliminada", description: "La carga de pago y sus efectos han sido revertidos." });
          setHistory(prev => prev.filter(item => item.id !== selectedRecord!.id));
          if (paginatedHistory.length === 1 && currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }
          
          triggerRefresh(); // ¡NOTIFICACIÓN ENVIADA!

      } catch (error: any) {
          toast({ variant: "destructive", title: "Error de Eliminación", description: error.message });
      } finally {
          setIsDeleting(false);
          setShowConfirmDialog(false);
          setSelectedRecord(null);
      }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="animate-spin h-6 w-6 text-gray-400 mr-2" />
        <span className="text-gray-500">Cargando historial...</span>
      </div>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-xl font-bold">Historial de Cargas de Pago</CardTitle>
            <CardDescription>Registro de los lotes de pago procesados. Desde aquí puedes revertir una carga.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {sortedHistory.length > 0 ? (
                    paginatedHistory.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50/50">
                            <div>
                                <p className="font-bold text-md">{MONTHS[parseInt(record.mesLiquidacion, 10) - 1]} {record.anoLiquidacion}</p>
                                <p className="text-sm text-gray-600">{record.programa} - {record.cantidadPagos} pagos registrados</p>
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(record)} disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar Carga
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500 border rounded-lg bg-gray-50">
                        <Inbox className="mx-auto h-10 w-10" />
                        <h3 className="mt-2 text-sm font-medium">No hay liquidaciones</h3>
                        <p className="mt-1 text-sm">Aún no se han procesado lotes de pagos.</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center mt-6 space-x-4">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(p => p - 1)} 
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                    <span className="text-sm font-medium text-gray-600">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(p => p + 1)} 
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}
        </CardContent>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Estás realmente seguro?</DialogTitle>
                    <DialogDescription>
                        Esta acción es irreversible. Se revertirán todos los pagos y cambios asociados a la carga seleccionada.
                    </DialogDescription>
                </DialogHeader>
                
                {selectedRecord && (
                    <div className="mt-4 text-sm rounded-md bg-yellow-50 border border-yellow-200 p-3 text-yellow-900">
                        <p><strong>Período:</strong> {MONTHS[parseInt(selectedRecord.mesLiquidacion, 10) - 1]} {selectedRecord.anoLiquidacion}</p>
                        <p><strong>Programa:</strong> {selectedRecord.programa}</p>
                        <p><strong>Pagos a revertir:</strong> {selectedRecord.cantidadPagos}</p>
                    </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                    Los legajos de los participantes serán ajustados a su estado anterior.
                </p>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={isDeleting}>Cancelar</Button>
                    <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sí, eliminar y revertir carga
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Card>
  );
};

export default SimplifiedUploadHistory;
