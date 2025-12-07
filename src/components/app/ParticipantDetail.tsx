'use client';
import React, { useState, useEffect } from 'react';
import type { Participant, Novedad } from '@/lib/types';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Edit, Ban, CheckCircle, XCircle, History, FileText, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import EditParticipantForm from './EditParticipantForm';
import BajaForm from './BajaForm';
import { getAlertStatus } from '@/lib/logic';
import { MONTHS as meses } from '@/lib/constants';
import { calculateSeniority } from '@/lib/utils';

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (error) {
    return '-';
  }
};

const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-AR');
}

const ParticipantDetail = ({ participant, onBack }: { participant: Participant; onBack: () => void; }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isBajaDialogOpen, setIsBajaDialogOpen] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [reactivationData, setReactivationData] = useState({ month: '', year: new Date().getFullYear().toString(), decree: '' });
  const [history, setHistory] = useState<Novedad[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const fetchHistory = async () => {
        if (!firestore || !participant.id) return;
        setIsLoadingHistory(true);
        try {
            const q = query(
                collection(firestore, 'novedades'), 
                where('participantId', '==', participant.id), 
                orderBy('fechaRealCarga', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const historyData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Novedad[];
            setHistory(historyData);
        } catch (error) {
            console.error("Error fetching history: ", error);
            toast({ variant: 'destructive', title: 'Error al cargar historial' });
        } finally {
            setIsLoadingHistory(false);
        }
    }
    fetchHistory();
  }, [firestore, participant.id, toast]);

  const handleSave = async (updatedData: Partial<Participant>) => {
    if (!firestore) return;
    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, updatedData);
    toast({ title: "Legajo Actualizado" });
    setIsEditing(false);
  };

  const handleBajaConfirm = async (bajaData: any) => {
    if (!firestore || !user) return;
    const actoAdmin = (bajaData.motivo === 'Acto Administrativo' || bajaData.motivo === 'Cruce SINTyS') ? `${bajaData.tipoActo} N° ${bajaData.numeroActo}` : '';
    
    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, { activo: false, estado: 'Baja', actoAdministrativo: actoAdmin || participant.actoAdministrativo });

    const monthName = meses[parseInt(bajaData.mesBaja, 10) - 1];
    let descripcion = `Baja por ${bajaData.motivo} (${monthName} ${bajaData.anioBaja}).`;
    if(actoAdmin) descripcion += ` Respaldo: ${actoAdmin}.`;

    await addDoc(collection(firestore, 'novedades'), {
      ...bajaData,
      participantId: participant.id,
      descripcion,
      type: 'BAJA_DEFINITIVA',
      mesEvento: bajaData.mesBaja,
      anoEvento: bajaData.anioBaja,
      fechaRealCarga: serverTimestamp(),
      ownerId: user.uid
    });
    toast({ title: "Participante Dado de Baja" });
    setIsBajaDialogOpen(false);
  };
  
  const handleReactivate = async () => {
    if (!firestore || !user || !reactivationData.month || !reactivationData.year) {
        toast({ variant: 'destructive', title: 'Datos incompletos' });
        return;
    }

    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, { activo: true, estado: 'Activo', actoAdministrativo: reactivationData.decree || participant.actoAdministrativo });
    
    const monthName = meses[parseInt(reactivationData.month, 10) - 1];
    let descripcion = `Reactivación para ${monthName} de ${reactivationData.year}.`;
    if(reactivationData.decree) descripcion += ` Respaldo: ${reactivationData.decree}.`;

    await addDoc(collection(firestore, 'novedades'), {
        participantId: participant.id, 
        descripcion, 
        type: 'REACTIVACION', 
        mesEvento: reactivationData.month, 
        anoEvento: reactivationData.year, 
        actoAdministrativo: reactivationData.decree, 
        fechaRealCarga: serverTimestamp(), 
        ownerId: user.uid
    });
    toast({ title: "Participante Reactivado" });
    setIsReactivateDialogOpen(false);
  }

  const alert = getAlertStatus(participant);

  const renderField = (label: string, value: any) => (
    <div className="py-2">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-md text-gray-800">{value || '-'}</p>
    </div>
  );

  const renderMetric = () => {
      const program = participant.programa?.toLowerCase();
      if(program?.includes('tecno') || program?.includes('joven')) {
          return renderField('Cantidad de Pagos', participant.pagosAcumulados);
      } else if (program?.includes('tutor')) {
          return renderField('Antigüedad', calculateSeniority(participant.fechaIngreso));
      }
      return null;
  }
  
  const historyIcons: { [key: string]: React.ReactElement } = {
    BAJA_DEFINITIVA: <Ban className="h-4 w-4 text-red-600" />,
    REACTIVACION: <Check className="h-4 w-4 text-green-600" />,
    ALTA: <FileText className="h-4 w-4 text-blue-600" />,
    DEFAULT: <History className="h-4 w-4 text-gray-500" />
  }

  if (isEditing) {
    return <EditParticipantForm participant={participant} onSave={handleSave} onCancel={() => setIsEditing(false)} />;
  }

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
        <div className="flex items-center gap-2">
          {participant.activo ? (
            <Button variant="destructive" onClick={() => setIsBajaDialogOpen(true)}><Ban className="mr-2 h-4 w-4"/>Dar de Baja</Button>
           ) : (
            <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => setIsReactivateDialogOpen(true)}><CheckCircle className="mr-2 h-4 w-4"/>Reactivar</Button>
           )}
          <Button onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/>Editar Legajo</Button>
        </div>
      </div>
      
      {alert && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${alert.type === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
              {alert.type === 'red' ? <XCircle/> : <AlertTriangle />}
              <div className='flex-1'>
                <h3 className="font-bold text-sm leading-tight">{alert.msg}</h3>
                {participant.estado === 'Requiere Atención' && participant.mesAusencia && <p className="text-xs mt-1">{`Ausente en la liquidación de ${participant.mesAusencia.replace('/', ' de ')}`}.</p>}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <User className="h-10 w-10 text-gray-500" />
              <div>
                <CardTitle className="text-2xl">{participant.nombre}</CardTitle>
                <CardDescription>DNI: {participant.dni} - Legajo: {participant.legajo || '-'}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-6">
              {renderField('Programa', participant.programa)}
              {renderField('Fecha de Nacimiento', formatDate(participant.fechaNacimiento))}
              {renderField('Fecha de Alta', formatDate(participant.fechaIngreso))}
              {renderField('Departamento', participant.departamento)}
            </CardContent>
          </Card>
        </div>
        <div>
            <Card>
                <CardHeader><CardTitle>Información Clave</CardTitle></CardHeader>
                <CardContent className="divide-y">
                    {renderMetric()}
                    {renderField('Último Pago', participant.ultimoPago ? formatDateToMonthYear(participant.ultimoPago) : '-')}
                    {renderField('Acto Administrativo', participant.actoAdministrativo)}
                    {renderField('Estado', participant.estado)}
                </CardContent>
            </Card>
        </div>
      </div>
      
      <div className="mt-6">
        <Card>
            <CardHeader><CardTitle className="flex items-center"><History className="mr-2 h-5 w-5"/>Historial del Participante</CardTitle></CardHeader>
            <CardContent>
                {isLoadingHistory ? <p>Cargando...</p> : (
                    <ul className="space-y-4">
                        {history.map(item => (
                            <li key={item.id} className="flex items-start gap-3">
                                <div className="mt-1">{historyIcons[item.type] || historyIcons.DEFAULT}</div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">{item.descripcion}</p>
                                    <p className="text-xs text-gray-500">{formatTimestamp(item.fechaRealCarga)}</p>
                                </div>
                            </li>
                        ))}
                        <li className="flex items-start gap-3">
                            <div className="mt-1">{historyIcons.ALTA}</div>
                            <div>
                                <p className="text-sm font-medium text-gray-800">Alta inicial en el programa.</p>
                                <p className="text-xs text-gray-500">{formatDate(participant.fechaIngreso)}</p>
                            </div>
                        </li>
                    </ul>
                )}
            </CardContent>
        </Card>
      </div>

      {isBajaDialogOpen && <BajaForm participantId={participant.id} participantName={participant.nombre} ownerId={user?.uid || ''} onConfirm={handleBajaConfirm} onCancel={() => setIsBajaDialogOpen(false)} mesAusencia={participant.mesAusencia}/>}

      <Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reactivar a {participant.nombre}</DialogTitle><DialogDescription>Complete los datos para registrar la reactivación.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className='grid grid-cols-2 gap-4'>
                <div className="space-y-2">
                    <label>Mes de Reactivación</label>
                    <Select value={reactivationData.month} onValueChange={(value) => setReactivationData(prev => ({...prev, month: value}))}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{meses.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                    <label>Año</label>
                    <Input type="number" value={reactivationData.year} onChange={(e) => setReactivationData(prev => ({...prev, year: e.target.value}))} />
                </div>
            </div>
            <div className="space-y-2">
                <label>N° Acto Administrativo (Opcional)</label>
                <Input value={reactivationData.decree} onChange={(e) => setReactivationData(prev => ({...prev, decree: e.target.value}))} placeholder="Ej: Decreto 1234/23" />
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setIsReactivateDialogOpen(false)}>Cancelar</Button><Button onClick={handleReactivate}>Confirmar Reactivación</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParticipantDetail;
