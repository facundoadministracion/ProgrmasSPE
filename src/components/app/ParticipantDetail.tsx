'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Novedad, Participant, Payment } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { calculateAge, formatDateToDDMMYYYY } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  FileText,
  PlusCircle,
  Clock,
  Loader2,
  UserX,
  UserCheck,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import BajaForm from './BajaForm';
import EditParticipantForm from './EditParticipantForm';

const DetailItem = ({ label, value, className }: { label: string, value: React.ReactNode, className?: string }) => (
    <div className={cn("flex flex-col justify-center rounded-lg p-3", className)}>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-base font-bold">{value}</span>
    </div>
);

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ParticipantDetail = ({ participant: initialParticipant }: { participant: Participant }) => {
  const { firestore } = useFirebase();
  const [participant, setParticipant] = useState(initialParticipant);

  useEffect(() => {
    setParticipant(initialParticipant);
  }, [initialParticipant]);

  const currentYear = new Date().getFullYear().toString();
  const [isBajaDialogOpen, setIsBajaDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const novedadesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'novedades'), where('participantId', '==', participant.id)) : null, [firestore, participant.id]);
  const { data: novedadesData, isLoading: novedadesLoading } = useCollection<Novedad>(novedadesRef);
  const novedades = useMemo(() => (novedadesData || []).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), [novedadesData]);

  const paymentsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'payments'), where('dni', '==', participant.dni), where('anio', '==', currentYear)) : null, [firestore, participant.dni, currentYear]);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsRef);

  const [newNovedad, setNewNovedad] = useState({ descripcion: '', fecha: new Date().toISOString().split('T')[0] });

  const bajaNovedad = useMemo(() => {
    if (participant.activo || !novedades) return null;
    return novedades.find(nov => nov.motivo) || null;
  }, [novedades, participant.activo]);
  
  const handleAddNovedad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNovedad.descripcion || !firestore) return;
    await addDoc(collection(firestore, 'novedades'), {
      participantId: participant.id,
      participantName: participant.nombre,
      descripcion: newNovedad.descripcion,
      fecha: newNovedad.fecha,
      fechaRealCarga: serverTimestamp(),
      ownerId: participant.ownerId
    });
    setNewNovedad({ ...newNovedad, descripcion: '' });
  };
  
  const handleBajaConfirm = async (bajaData: any) => {
    if (!firestore) return;

    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, { activo: false });
    setParticipant(prev => ({...prev, activo: false}));

    let descripcion = `Baja registrada. Motivo: ${bajaData.motivo}.`;
    if (bajaData.motivo === 'Acto Administrativo' || bajaData.motivo === 'SINTyS') {
      descripcion += ` ${bajaData.tipoActo} N° ${bajaData.numeroActo}.`;
    }
    if (bajaData.detalle) {
      descripcion += ` Detalle: ${bajaData.detalle}.`;
    }
    const monthName = meses[parseInt(bajaData.mesBaja, 10) - 1];
    descripcion += ` Período de baja: ${monthName} - ${bajaData.anioBaja}.`;

    await addDoc(collection(firestore, 'novedades'), {
      ...bajaData,
      descripcion,
      fechaRealCarga: serverTimestamp(),
    });

    setIsBajaDialogOpen(false);
  };

  const toggleParticipantStatus = async () => {
    if (!firestore) return;
    const newStatus = !participant.activo;
    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, { activo: newStatus });
    setParticipant(prev => ({...prev, activo: newStatus}));

    await addDoc(collection(firestore, 'novedades'), {
      participantId: participant.id,
      participantName: participant.nombre,
      descripcion: `Cambio de estado manual a ${newStatus ? 'ACTIVO' : 'INACTIVO'}.`,
      fecha: new Date().toISOString().split('T')[0],
      fechaRealCarga: serverTimestamp(),
      ownerId: participant.ownerId,
    });
  }

  const handleDeleteParticipant = async () => {
    if (!firestore) return;

    await addDoc(collection(firestore, 'novedades'), {
      participantId: participant.id,
      participantName: participant.nombre,
      descripcion: `Participante ELIMINADO de la base de datos.`,
      fecha: new Date().toISOString().split('T')[0],
      fechaRealCarga: serverTimestamp(),
      ownerId: participant.ownerId,
    });

    const partRef = doc(firestore, 'participants', participant.id);
    await deleteDoc(partRef);
    setIsDeleteDialogOpen(false);
  };

  const handleSaveEdit = async (updatedData: Partial<Participant>) => {
    if (!firestore) return;

    const changesDescription = Object.keys(updatedData).map(key => {
        const oldValue = participant[key as keyof Participant] || 'N/A';
        const newValue = updatedData[key as keyof Partial<Participant>] || 'N/A';
        return `${key} (de '${oldValue}' a '${newValue}')`;
    }).join(', ');

    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, updatedData);
    setParticipant(prev => ({...prev, ...updatedData}));

    await addDoc(collection(firestore, 'novedades'), {
      participantId: participant.id,
      participantName: updatedData.nombre || participant.nombre,
      descripcion: `Se modificaron los siguientes campos: ${changesDescription}`,
      fecha: new Date().toISOString().split('T')[0],
      fechaRealCarga: serverTimestamp(),
      ownerId: participant.ownerId,
    });

    setIsEditing(false);
  };

  const alertStatus = getAlertStatus(participant);
  const age = calculateAge(participant.fechaNacimiento);
  
  if (isEditing) {
    return <EditParticipantForm participant={participant} onSave={handleSaveEdit} onCancel={() => setIsEditing(false)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start pb-4 border-b">
        <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
              {participant.nombre.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold">{participant.nombre}</h3>
              <p className="text-gray-500">DNI: {participant.dni}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="blue">{participant.programa}</Badge>
                {participant.esEquipoTecnico && <Badge variant="indigo">Equipo Técnico</Badge>}
                <Badge variant={!participant.activo ? 'destructive' : alertStatus.type as any}>
                  {!participant.activo ? 'Inactivo' : alertStatus.msg}
                </Badge>
              </div>
            </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil size={16} className="mr-1" />
            Editar
          </Button>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 size={16} className="mr-1" />
                Borrar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Está seguro que desea eliminar a {participant.nombre}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará al participante de forma permanente de la base de datos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteParticipant}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={isBajaDialogOpen} onOpenChange={setIsBajaDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant={participant.activo ? "destructive" : "outline"} size="sm">
                {participant.activo ? <UserX/> : <UserCheck/>}
                {participant.activo ? 'Dar de Baja' : 'Reactivar'}
              </Button>
            </AlertDialogTrigger>
            {participant.activo ? (
              <BajaForm 
                participantId={participant.id}
                participantName={participant.nombre}
                ownerId={participant.ownerId}
                onConfirm={handleBajaConfirm}
              />
            ) : (
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Confirmar cambio de estado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción marcará al participante como <strong>ACTIVO</strong>. 
                    Esto afectará su visibilidad en los reportes y liquidaciones. Se registrará una novedad con el cambio.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={toggleParticipantStatus}>Confirmar Reactivación</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            )}
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pagos">Historial Pagos ({currentYear})</TabsTrigger>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
        </TabsList>
        <div className="min-h-[300px] pt-4">
            <TabsContent value="general">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <DetailItem label="Edad" value={age > 0 ? `${age} años` : 'N/D'} className="bg-gray-50"/>
                <DetailItem label="Fecha Ingreso" value={formatDateToDDMMYYYY(participant.fechaIngreso as string)} className="bg-gray-50 text-indigo-700"/>
                <DetailItem label="Categoría" value={participant.categoria || 'N/A'} className="bg-gray-50" />
                <DetailItem label="Lugar de Trabajo" value={participant.lugarTrabajo || '-'} className="bg-gray-50" />
                <DetailItem label="Email" value={participant.email || '-'} className="bg-gray-50" />
                <DetailItem label="Teléfono" value={participant.telefono || '-'} className="bg-gray-50" />
                <DetailItem label="Último Pago Registrado" value={participant.ultimoPago || 'Sin registros'} className="bg-gray-50 col-span-2"/>

                {!participant.activo && bajaNovedad ? (
                  <div className="md:col-span-2 mt-2 p-3 rounded-lg border-l-4 flex items-start gap-3 text-sm bg-gray-100 border-gray-500 text-gray-800">
                      <UserX size={20} className="mt-0.5 text-gray-600"/>
                      <div>
                          <h4 className="font-bold">Información de la Baja</h4>
                          <p><strong>Motivo:</strong> {bajaNovedad.motivo}</p>
                          {(bajaNovedad.motivo === 'Acto Administrativo' || bajaNovedad.motivo === 'SINTyS') && bajaNovedad.tipoActo && (
                            <p><strong>Acto:</strong> {bajaNovedad.tipoActo} N° {bajaNovedad.numeroActo}</p>
                          )}
                          {bajaNovedad.detalle && <p><strong>Detalle:</strong> {bajaNovedad.detalle}</p>}
                          {bajaNovedad.mesBaja && bajaNovedad.anioBaja && <p><strong>Período:</strong> {meses[parseInt(bajaNovedad.mesBaja, 10) - 1]} - {bajaNovedad.anioBaja}</p>}
                      </div>
                  </div>
                ) : participant.activo && alertStatus && (alertStatus.type === 'yellow' || alertStatus.type === 'red') && (
                  <div className={`md:col-span-2 mt-2 p-3 rounded-lg border-l-4 flex items-start gap-3 text-sm ${
                    alertStatus.type === 'red' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-yellow-50 border-yellow-500 text-yellow-800'
                  }`}>
                    <AlertTriangle size={20} className="mt-0.5"/>
                    <div>
                      <h4 className="font-bold">Alerta Administrativa</h4>
                      <p>{alertStatus.msg}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="pagos">
              <div className="border rounded overflow-hidden max-h-80 overflow-y-auto">
                <Table>
                    <TableHeader className="bg-gray-50 sticky top-0">
                        <TableRow>
                            <TableHead>Periodo</TableHead>
                            <TableHead>Monto</TableHead>
                            <TableHead>Procesado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentsLoading && <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="animate-spin inline-block mr-2"/>Cargando pagos...</TableCell></TableRow>}
                        {!paymentsLoading && (payments || []).map(pay => (
                            <TableRow key={pay.id}>
                                <TableCell>{pay.mes}/{pay.anio}</TableCell>
                                <TableCell className="font-mono font-bold text-green-700">${pay.monto}</TableCell>
                                <TableCell className="text-gray-500">{pay.fechaCarga?.seconds ? new Date(pay.fechaCarga.seconds * 1000).toLocaleDateString('es-AR') : 'Reciente'}</TableCell>
                            </TableRow>
                        ))}
                        {!paymentsLoading && (!payments || payments.length === 0) && <TableRow><TableCell colSpan={3} className="h-24 text-center">No hay pagos registrados este año.</TableCell></TableRow>}
                    </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="novedades">
              <div className="space-y-4">
                <form onSubmit={handleAddNovedad} className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><PlusCircle size={16} /> Nueva Novedad</h4>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                       <div className="w-1/3"><label className="text-xs text-gray-500">Fecha</label><Input type="date" className="text-sm" value={newNovedad.fecha} onChange={(e) => setNewNovedad({...newNovedad, fecha: e.target.value})} /></div>
                       <div className="flex-1"><label className="text-xs text-gray-500">Descripción</label><Input type="text" placeholder="Ej: Baja, Licencia..." className="text-sm" value={newNovedad.descripcion} onChange={(e) => setNewNovedad({...newNovedad, descripcion: e.target.value})} /></div>
                    </div>
                    <Button type="submit" disabled={!newNovedad.descripcion} className="self-end" size="sm">Agregar</Button>
                  </div>
                </form>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                   {novedadesLoading && <div className="text-center text-gray-400 p-4"><Loader2 className="animate-spin inline-block mr-2"/>Cargando novedades...</div>}
                   {!novedadesLoading && (novedades || []).map(nov => (
                     <div key={nov.id} className="border-l-2 border-blue-400 pl-3 py-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-gray-800 font-medium">{nov.descripcion}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1"><Clock size={12} /> {formatDateToDDMMYYYY(nov.fecha)}</span>
                        </div>
                     </div>
                   ))}
                   {!novedadesLoading && (!novedades || novedades.length === 0) && <div className="text-center text-gray-400 p-4">No hay novedades registradas.</div>}
                </div>
              </div>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ParticipantDetail;
