'use client';
import React, { useState, useEffect, useMemo, useId } from 'react';
import type { Participant, Novedad, PagoRegistrado } from '@/lib/types';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp, query, where, getDocs, orderBy, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Edit, Ban, CheckCircle, XCircle, History, FileText, Check, AlertTriangle, Pencil, FilePlus, Wallet, ArrowRightLeft, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import EditParticipantForm from './EditParticipantForm';
import BajaForm from './BajaForm';
import { getAlertStatus } from '@/lib/logic';
import { MONTHS, PROGRAMAS, ALERT_MESSAGES } from '@/lib/constants';
import { calculateSeniority } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import HistoricalProgramDetails from './HistoricalProgramDetails';

// Helper Functions
const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  } catch (error) { return '-'; }
};

const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' });
}

const formatDateToMonthYear = (dateString: string | undefined | null) => {
  if (!dateString) return '-';
  try {
    const [year, month] = dateString.split('-');
    return `${MONTHS[parseInt(month, 10) - 1] || ''} ${year}`;
  } catch (e) { return '-'; }
}

// Main Component
const ParticipantDetail = ({ participant: initialParticipant, onBack }: { participant: Participant; onBack: () => void; }) => {
  // Component State
  const [participant, setParticipant] = useState(initialParticipant);
  const [isEditing, setIsEditing] = useState(false);
  const [isBajaDialogOpen, setIsBajaDialogOpen] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [isTraspasoDialogOpen, setIsTraspasoDialogOpen] = useState(false);
  const [traspasoData, setTraspasoData] = useState({ nuevoPrograma: '', actoAdministrativo: '', month: (new Date().getMonth() + 1).toString(), year: new Date().getFullYear().toString() });
  const [reactivationData, setReactivationData] = useState({ month: '', year: new Date().getFullYear().toString(), decree: '' });
  const [isHistoricalProgramModalOpen, setIsHistoricalProgramModalOpen] = useState(false);
  const [history, setHistory] = useState<Novedad[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [novedadToEditText, setNovedadToEditText] = useState<Novedad | null>(null);
  const [newDescription, setNewDescription] = useState('');

  const [reactivationToEdit, setReactivationToEdit] = useState<Novedad | null>(null);
  const [reactivationEditData, setReactivationEditData] = useState({ month: '', year: '', decree: '' });

  const [bajaToEdit, setBajaToEdit] = useState<Novedad | null>(null);

  const [novedadToDelete, setNovedadToDelete] = useState<Novedad | null>(null);
  
  const [paymentHistory, setPaymentHistory] = useState<PagoRegistrado[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const editFormId = useId();
  const alert = getAlertStatus(participant);

  const isAuditableProgram = useMemo(() => 
    participant.programa === PROGRAMAS.JOVEN || participant.programa === PROGRAMAS.TECNO, 
    [participant.programa]
  );

  const totalPaymentCountInLegajo = useMemo(() => {
    if (!participant.pagosPorPrograma) return 0;
    return Object.values(participant.pagosPorPrograma).reduce((sum, count) => sum + count, 0);
}, [participant.pagosPorPrograma]);
 
  // Effects
  useEffect(() => {
    const fetchHistory = async () => {
        if (!firestore || !participant.id) return;
        setIsLoadingHistory(true);
        try {
            const q = query(collection(firestore, 'novedades'), where('participantId', '==', participant.id), orderBy('fechaRealCarga', 'desc'));
            const querySnapshot = await getDocs(q);
            setHistory(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Novedad[]);
        } catch (error) {
            console.error("Error fetching history: ", error);
            toast({ variant: 'destructive', title: 'Error al cargar historial' });
        } finally { setIsLoadingHistory(false); }
    }
    fetchHistory();
  }, [firestore, participant.id, toast]);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!firestore || !participant.id || !isAuditableProgram) return;
      setIsLoadingPayments(true);
      try {
        const q = query(
          collection(firestore, 'pagosRegistrados'), 
          where('participantId', '==', participant.id)
        );
        const snapshot = await getDocs(q);
        const payments = snapshot.docs.map(doc => doc.data() as PagoRegistrado);
        setPaymentHistory(payments);
      } catch (error) {
        console.error("Error fetching payment history: ", error);
        toast({ variant: 'destructive', title: 'Error al cargar historial de pagos.' });
      } finally {
        setIsLoadingPayments(false);
      }
    };

    fetchPaymentHistory();
  }, [firestore, participant.id, toast, isAuditableProgram]);

  const groupedPayments = useMemo(() => {
    if (!paymentHistory) return {};
    return paymentHistory.reduce((acc, payment) => {
        const program = payment.programa || 'General';
        if (!acc[program]) {
            acc[program] = {};
        }
        const year = payment.anio;
        if (!acc[program][year]) {
            acc[program][year] = [];
        }
        acc[program][year].push(parseInt(payment.mes, 10));
        return acc;
    }, {} as { [program: string]: { [year: string]: number[] } });
}, [paymentHistory]);

  useEffect(() => {
    if (novedadToEditText) {
      setNewDescription(novedadToEditText.descripcion.replace('Respaldo:', 'Decreto N°:'));
    } else { setNewDescription(''); }
  }, [novedadToEditText]);

  useEffect(() => {
    if (reactivationToEdit) {
        setReactivationEditData({ month: reactivationToEdit.mesEvento || '', year: reactivationToEdit.anoEvento || '', decree: reactivationToEdit.actoAdministrativo || '' });
    } else { setReactivationEditData({ month: '', year: '', decree: '' }); }
  }, [reactivationToEdit]);

  // Data Handlers
  const handleSave = async (updatedData: any) => {
    if (!firestore || !user) return;
  
    const { newRenovationActo, ...participantChanges } = updatedData;
    let requiresUpdate = Object.keys(participantChanges).length > 0;
    const partRef = doc(firestore, 'participants', participant.id);
    let finalChanges = { ...participantChanges };

    if (newRenovationActo) {
        const novedadDescripcion = `Renovación registrada con Acto Administrativo: ${newRenovationActo}`;
        const newNovedad: Omit<Novedad, 'id'> = {
            participantId: participant.id,
            descripcion: novedadDescripcion,
            type: 'RENOVACION',
            fechaRealCarga: serverTimestamp(),
            ownerId: user.uid,
        };
        const docRef = await addDoc(collection(firestore, 'novedades'), newNovedad);
        setHistory(prev => [{ ...newNovedad, id: docRef.id, fechaRealCarga: { seconds: Date.now() / 1000 } } as Novedad, ...prev]);

        finalChanges.renovaciones = updatedData.renovaciones;
        requiresUpdate = true;
    }

    if (requiresUpdate) {
        await updateDoc(partRef, finalChanges);
        setParticipant(prev => ({ ...prev, ...finalChanges }));
        toast({ title: "Legajo Actualizado" });
    } else {
        toast({ title: "No se realizaron cambios." });
    }
    
    setIsEditing(false);
  };

  const handleBajaConfirm = async (bajaData: any) => {
    if (!firestore || !user) return;
    const isActoAdmin = bajaData.motivo === 'Acto Administrativo' || bajaData.motivo === 'Cruce SINTyS';
    const actoAdmin = isActoAdmin ? `${bajaData.tipoActo} N° ${bajaData.numeroActo}` : '';
    const updatedParticipant: Partial<Participant> = { activo: false, estado: 'Baja', actoAdministrativo: actoAdmin || participant.actoAdministrativo };

    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, updatedParticipant);

    const monthName = MONTHS[parseInt(bajaData.mesBaja, 10) - 1];
    let descripcion = `Baja registrada. Motivo: ${bajaData.motivo}. Período: ${monthName} ${bajaData.anioBaja}.`;
    if (actoAdmin) descripcion += ` Acto: ${actoAdmin}.`;
    if(isActoAdmin && bajaData.causalInforme) descripcion += ` Causal: ${bajaData.causalInforme}.`;
    if(bajaData.detalle) descripcion += ` Detalles: ${bajaData.detalle}.`;

    const newNovedad: Omit<Novedad, 'id'> = {
      ...bajaData,
      participantId: participant.id, descripcion, type: 'BAJA_DEFINITIVA', fechaRealCarga: serverTimestamp(), ownerId: user.uid
    };
    const docRef = await addDoc(collection(firestore, 'novedades'), newNovedad);
    setHistory(prev => [{...newNovedad, id: docRef.id, fechaRealCarga: {seconds: Date.now()/1000}} as Novedad, ...prev]);
    setParticipant(prev => ({...prev, ...updatedParticipant}));
    toast({ title: "Participante Dado de Baja" });
    setIsBajaDialogOpen(false);
  };
  
  const handleReactivate = async () => {
    if (!firestore || !user || !reactivationData.month || !reactivationData.year) return;
    const updatedParticipant: Partial<Participant> = { activo: true, estado: 'Activo', actoAdministrativo: reactivationData.decree || participant.actoAdministrativo };
    
    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, updatedParticipant);
    
    const monthName = MONTHS[parseInt(reactivationData.month, 10) - 1];
    let descripcion = `Reactivación registrada para ${monthName} de ${reactivationData.year}.`;
    if(reactivationData.decree) descripcion += ` Decreto N°: ${reactivationData.decree}.`;

    const newNovedad: Omit<Novedad, 'id'> = {
        participantId: participant.id, descripcion, type: 'REACTIVACION', mesEvento: reactivationData.month, anoEvento: reactivationData.year, 
        actoAdministrativo: reactivationData.decree, fechaRealCarga: serverTimestamp(), ownerId: user.uid
    };
    
    const docRef = await addDoc(collection(firestore, 'novedades'), newNovedad);
    setHistory(prev => [{...newNovedad, id: docRef.id, fechaRealCarga: {seconds: Date.now()/1000}} as Novedad, ...prev]);
    setParticipant(prev => ({...prev, ...updatedParticipant}));
    toast({ title: "Participante Reactivado" });
    setIsReactivateDialogOpen(false);
  }

  const handleTraspasoConfirm = async () => {
    if (!firestore || !user || !traspasoData.nuevoPrograma) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debe seleccionar un programa de destino.' });
        return;
    }

    const { nuevoPrograma, actoAdministrativo, month, year } = traspasoData;
    const previousPrograma = participant.programa;

    const monthName = MONTHS[parseInt(month, 10) - 1];
    const formattedDate = `${monthName} de ${year}`;

    const updatedParticipant: Partial<Participant> = {
        programa: nuevoPrograma,
        actoAdministrativo: actoAdministrativo || participant.actoAdministrativo,
    };

    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, updatedParticipant);

    let descripcion = `Traspaso del programa "${previousPrograma}" a "${nuevoPrograma}" con fecha de vigencia ${formattedDate}.`;
    if (actoAdministrativo) {
        descripcion += ` Respaldo por Acto Administrativo: ${actoAdministrativo}.`;
    }

    const newNovedad: Omit<Novedad, 'id'> = {
        participantId: participant.id,
        descripcion,
        type: 'TRASPASO',
        fechaEvento: `${year}-${month.padStart(2, '0')}`, // Guardamos como YYYY-MM
        fechaRealCarga: serverTimestamp(),
        ownerId: user.uid,
    };
    const docRef = await addDoc(collection(firestore, 'novedades'), newNovedad);
    
    setHistory(prev => [{ ...newNovedad, id: docRef.id, fechaRealCarga: { seconds: Date.now() / 1000 } } as Novedad, ...prev]);
    setParticipant(prev => ({ ...prev, ...updatedParticipant }));
    
    toast({ title: 'Traspaso Exitoso', description: `${participant.nombre} ahora pertenece a ${nuevoPrograma}.` });
    setIsTraspasoDialogOpen(false);
};

  const handleUpdateBaja = async (bajaData: any) => {
    if (!firestore || !bajaToEdit) return;

    const isActoAdmin = bajaData.motivo === 'Acto Administrativo' || bajaData.motivo === 'Cruce SINTyS';
    const actoAdmin = isActoAdmin ? `${bajaData.tipoActo} N° ${bajaData.numeroActo}` : '';
    const updatedParticipant: Partial<Participant> = { actoAdministrativo: actoAdmin || participant.actoAdministrativo };

    const monthName = MONTHS[parseInt(bajaData.mesBaja, 10) - 1];
    let newDescription = `Baja registrada. Motivo: ${bajaData.motivo}. Período: ${monthName} ${bajaData.anioBaja}.`;
    if (actoAdmin) newDescription += ` Acto: ${actoAdmin}.`;
    if(isActoAdmin && bajaData.causalInforme) newDescription += ` Causal: ${bajaData.causalInforme}.`;
    if(bajaData.detalle) newDescription += ` Detalles: ${bajaData.detalle}.`;
    
    const novedadRef = doc(firestore, 'novedades', bajaToEdit.id);
    await updateDoc(novedadRef, { ...bajaData, descripcion: newDescription });

    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, updatedParticipant);

    toast({ title: 'Baja Actualizada' });
    setHistory(prev => prev.map(h => h.id === bajaToEdit.id ? { ...h, ...bajaData, descripcion: newDescription } : h));
    setParticipant(prev => ({...prev, ...updatedParticipant}));
    setBajaToEdit(null);
  };

  const handleUpdateReactivation = async () => {
    if (!firestore || !reactivationToEdit) return;
    const { month, year, decree } = reactivationEditData;
    const monthName = MONTHS[parseInt(month, 10) - 1];
    let newDescription = `Reactivación para ${monthName} de ${year}.`;
    if (decree) newDescription += ` Decreto N°: ${decree}.`;

    const novedadRef = doc(firestore, 'novedades', reactivationToEdit.id);
    await updateDoc(novedadRef, { descripcion: newDescription, mesEvento: month, anoEvento: year, actoAdministrativo: decree });

    const updatedParticipant: Partial<Participant> = { actoAdministrativo: decree || participant.actoAdministrativo };
    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, updatedParticipant);

    toast({ title: 'Reactivación Actualizada'});
    setHistory(prev => prev.map(h => h.id === reactivationToEdit.id ? { ...h, descripcion: newDescription, mesEvento: month, anoEvento: year, actoAdministrativo: decree } : h));
    setParticipant(prev => ({...prev, ...updatedParticipant}));
    setReactivationToEdit(null);
  }

  const handleDeleteNovedad = async () => {
      if (!firestore || !novedadToDelete) return;
      try {
          await deleteDoc(doc(firestore, 'novedades', novedadToDelete.id));
          toast({ title: 'Novedad Eliminada' });
          setHistory(prev => prev.filter(h => h.id !== novedadToDelete.id));
          setNovedadToDelete(null);
      } catch (error) { toast({ variant: 'destructive', title: 'Error al eliminar' }); }
  };

  const handleUpdateNovedadText = async () => {
    if (!firestore || !novedadToEditText) return;
    try {
        await updateDoc(doc(firestore, 'novedades', novedadToEditText.id), { descripcion: newDescription });
        toast({ title: 'Novedad Actualizada' });
        setHistory(prev => prev.map(h => h.id === novedadToEditText.id ? { ...h, descripcion: newDescription } : h));
        setNovedadToEditText(null);
    } catch (error) { toast({ variant: 'destructive', title: 'Error al actualizar' }); }
  };

  const handleDeleteParticipant = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha podido conectar con el servicio.' });
      return;
    }
    
    try {
      const functions = getFunctions();
      const deleteParticipantFunction = httpsCallable(functions, 'deleteParticipant');
      
      toast({ title: 'Eliminando...', description: 'Este proceso puede tardar unos segundos.' });

      await deleteParticipantFunction({ participantId: participant.id });

      toast({ title: '¡Legajo Eliminado!', description: `El legajo de ${participant.nombre} ha sido borrado permanentemente.` });
      
      setIsDeleteDialogOpen(false);
      onBack(); // Vuelve a la pantalla anterior

    } catch (error) {
      console.error("Error deleting participant:", error);
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.' });
    }
  };

  const handleEditClick = (item: Novedad) => {
      if (item.type === 'REACTIVACION') setReactivationToEdit(item);
      else if (item.type === 'BAJA_DEFINITIVA') setBajaToEdit(item);
      else setNovedadToEditText(item);
  }

  // Render Helpers
  const renderField = (label: string, value: any) => (<div className="py-2"><p className="text-sm font-medium text-gray-500">{label}</p><p className="text-md text-gray-800">{value || '-'}</p></div>);
  const renderMetric = () => {
    const currentProgram = participant.programa?.toLowerCase() || '';
    if (currentProgram.includes('tutor')) {
        return renderField('Antigüedad', calculateSeniority(participant.fechaIngreso));
    }
    
    if (isAuditableProgram) {
        return renderField('Pagos Acumulados (Legajo)', totalPaymentCountInLegajo);
    }
    
    return null;
}
  const historyIcons: { [key: string]: React.ReactElement } = { BAJA_DEFINITIVA: <Ban/>, REACTIVACION: <Check/>, ALTA: <FileText/>, RENOVACION: <FilePlus/>, TRASPASO: <ArrowRightLeft />, DEFAULT: <History/> }

  const requiresRenovation = alert.msg === ALERT_MESSAGES.REQUIERE_AUTORIZACION;

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
        <div className="flex items-center gap-2 flex-wrap">
  {participant.activo ? (
    <Button variant="destructive" onClick={() => setIsBajaDialogOpen(true)}><Ban className="mr-2 h-4 w-4"/>Dar de Baja</Button>
   ) : (
    <Button variant="outline" className="border-green-500 text-green-600" onClick={() => setIsReactivateDialogOpen(true)}><CheckCircle className="mr-2 h-4 w-4"/>Reactivar</Button>
   )}
   <Button variant="secondary" onClick={() => setIsTraspasoDialogOpen(true)}><ArrowRightLeft className="mr-2 h-4 w-4" />Traspaso de Programa</Button>
   {history.some(n => n.type === 'TRASPASO') && (
    <Button variant="outline" onClick={() => setIsHistoricalProgramModalOpen(true)}>
        <History className="mr-2 h-4 w-4" />Ver Programas Anteriores
    </Button>
)}
  <Button onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/>Editar Legajo</Button>
  <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="mr-2 h-4 w-4"/>Eliminar Legajo</Button>
</div>
      </div>
      
      {alert && (<div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${alert.type === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
        {alert.type === 'red' ? <XCircle/> : <AlertTriangle/>}
        <div><h3 className="font-bold text-sm">{alert.msg}</h3>
        {participant.estado === 'Requiere Atención' && participant.mesAusencia && <p className="text-xs mt-1">{`Ausente en ${participant.mesAusencia.replace('/', ' de ')}`}.</p>}</div>
      </div>)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0"><User/><CardTitle>{participant.nombre}</CardTitle><CardDescription>DNI: {participant.dni} - Legajo: {participant.legajo || '-'}</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-6">
              {renderField('Programa', participant.programa)}
              {renderField('Nacimiento', new Date(participant.fechaNacimiento + 'T00:00:00').toLocaleDateString('es-AR'))}
              {renderField('Alta', formatDate(participant.fechaIngreso))}
              {renderField('Departamento', participant.departamento)}
            </CardContent>
          </Card>
        </div>
        <Card><CardHeader><CardTitle>Información Clave</CardTitle></CardHeader><CardContent className="divide-y">{renderMetric()}{renderField('Último Pago', formatDateToMonthYear(participant.ultimoPago))}{renderField('Acto Administrativo', participant.actoAdministrativo)}{renderField('Estado', participant.estado)}</CardContent></Card>
      </div>

      {isAuditableProgram && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet/> Historial de Pagos Liquidados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPayments ? (
              <p>Cargando historial de pagos...</p>
            ) : (
              <div>
                <div className="mb-4 pb-4 border-b">
    <p className="text-sm font-medium text-gray-600">Conteo de Pagos</p>
    <p className={`text-lg font-bold ${paymentHistory.length !== totalPaymentCountInLegajo ? 'text-red-600' : 'text-green-600'}`}>
        {paymentHistory.length} encontrados vs. {totalPaymentCountInLegajo} en legajo
    </p>
    {paymentHistory.length !== totalPaymentCountInLegajo && 
        <p className="text-xs text-red-500">El conteo no coincide. Considere correr el script de corrección.</p>
    }
</div>
                
<div className="space-y-4">
  <p className="text-sm font-medium text-gray-600">Meses liquidados por programa y año</p>
  {Object.keys(groupedPayments).sort().map(program => (
    <div key={program} className="py-2">
      <h3 className="font-bold text-md text-gray-800">{program}</h3>
      {Object.keys(groupedPayments[program]).sort((a,b) => parseInt(b) - parseInt(a)).map(year => (
        <div key={year} className="mt-2 pl-4">
          <h4 className="font-semibold text-md mb-2">{year}</h4>
          <div className="flex flex-wrap gap-2">
            {groupedPayments[program][year].sort((a,b) => a - b).map(month => (
               <Badge key={`${program}-${year}-${month}`} variant="secondary" className="text-sm">{MONTHS[month - 1]}</Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  ))}
  {paymentHistory.length === 0 && <p className="text-sm text-gray-500 mt-2">No se encontraron pagos registrados para los programas de este participante.</p>}
</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card className="mt-6"><CardHeader><CardTitle className="flex items-center"><History/>Historial</CardTitle></CardHeader><CardContent>{isLoadingHistory ? <p>Cargando...</p> : (<ul className="space-y-4"> {history.map(item => (<li key={item.id} className="flex items-start justify-between gap-3 group py-2 rounded-md hover:bg-gray-50 px-2 -mx-2">
        <div className="flex items-start gap-3"><div className="mt-1 text-gray-500">{historyIcons[item.type] || historyIcons.DEFAULT}</div><div><p>{item.descripcion}</p><p className="text-xs text-gray-500">{formatTimestamp(item.fechaRealCarga)}</p></div></div>
        <div className="flex opacity-0 group-hover:opacity-100"><Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}><Pencil/></Button><Button variant="ghost" size="icon" onClick={() => setNovedadToDelete(item)}><XCircle/></Button></div></li>))} <li className="flex items-start gap-3 px-2"><div className="mt-1 text-gray-500">{historyIcons.ALTA}</div><div><p>Alta inicial.</p><p className="text-xs text-gray-500">{formatDate(participant.fechaIngreso)}</p></div></li></ul>)}</CardContent></Card>

      {isBajaDialogOpen && <BajaForm participantName={participant.nombre} onConfirm={handleBajaConfirm} onCancel={() => setIsBajaDialogOpen(false)} mesAusencia={participant.mesAusencia}/>}
      {bajaToEdit && <BajaForm participantName={participant.nombre} onConfirm={handleUpdateBaja} onCancel={() => setBajaToEdit(null)} initialData={bajaToEdit} isEditing={true} />}
      
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Editar Legajo</DialogTitle>
          </DialogHeader>
          <EditParticipantForm 
            participant={participant} 
            onSave={handleSave} 
            formId={editFormId} 
            requiresRenovation={requiresRenovation}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button type="submit" form={editFormId}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTraspasoDialogOpen} onOpenChange={setIsTraspasoDialogOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Traspaso de Programa</DialogTitle>
            <DialogDescription>
                Mover a {participant.nombre} a un nuevo programa. El programa actual es "{participant.programa}".
            </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
    <div className="space-y-2">
        <label htmlFor="nuevo-programa">Nuevo Programa</label>
        <Select
            value={traspasoData.nuevoPrograma}
            onValueChange={(value) => setTraspasoData(prev => ({ ...prev, nuevoPrograma: value }))}
        >
            <SelectTrigger id="nuevo-programa">
                <SelectValue placeholder="Seleccione el programa de destino" />
            </SelectTrigger>
            <SelectContent>
                {Object.values(PROGRAMAS)
                    .filter(p => p !== participant.programa)
                    .map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
        </Select>
    </div>

    <div className="space-y-2">
    <label>Fecha de Vigencia del Pase</label>
    <div className="flex gap-2">
        <div className="flex-1">
            <Select
                value={traspasoData.month}
                onValueChange={(value) => setTraspasoData(prev => ({ ...prev, month: value }))}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                    {MONTHS.map((name, index) => (
                        <SelectItem key={name} value={(index + 1).toString()}>{name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex-1">
            <Select
                value={traspasoData.year}
                onValueChange={(value) => setTraspasoData(prev => ({ ...prev, year: value }))}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                    {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 4 + i).map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    </div>
</div>
    <div className="space-y-2">
        <label htmlFor="acto-admin">Acto Administrativo (Opcional)</label>
        <Input
            id="acto-admin"
            value={traspasoData.actoAdministrativo}
            onChange={(e) => setTraspasoData(prev => ({ ...prev, actoAdministrativo: e.target.value }))}
            placeholder="Ej: RES-2023-123-GDEBA"
        />
    </div>
</div>

        <DialogFooter>
            <Button variant="ghost" onClick={() => setIsTraspasoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleTraspasoConfirm}>Confirmar Traspaso</Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

{isHistoricalProgramModalOpen && (
    <Dialog open={isHistoricalProgramModalOpen} onOpenChange={setIsHistoricalProgramModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Historial de Programas de {participant.nombre}</DialogTitle>
                <DialogDescription>Detalle de participación en programas anteriores.</DialogDescription>
            </DialogHeader>
            {/* Aquí irá el contenido del nuevo componente que crearemos */}
            <HistoricalProgramDetails participant={participant} history={history} />
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsHistoricalProgramModalOpen(false)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
)}

<Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}><DialogContent><DialogHeader><DialogTitle>Reactivar a {participant.nombre}</DialogTitle><DialogDescription>Reactivar a {participant.nombre} en el programa.</DialogDescription></DialogHeader><div className="py-4 grid grid-cols-2 gap-4"><div className="space-y-2"><label>Mes</label><Select value={reactivationData.month} onValueChange={(v) => setReactivationData(p => ({...p, month: v}))}><SelectTrigger/><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><label>Año</label><Input type="number" value={reactivationData.year} onChange={(e) => setReactivationData(p => ({...p, year: e.target.value}))}/></div><div className="space-y-2 col-span-2"><label>Acto Administrativo (Opcional)</label><Input value={reactivationData.decree} onChange={(e) => setReactivationData(p => ({...p, decree: e.target.value}))}/></div></div><DialogFooter><Button variant="ghost" onClick={() => setIsReactivateDialogOpen(false)}>Cancelar</Button><Button onClick={handleReactivate}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
{reactivationToEdit && <Dialog open={!!reactivationToEdit} onOpenChange={() => setReactivationToEdit(null)}><DialogContent><DialogHeader><DialogTitle>Editar Reactivación</DialogTitle><DialogDescription>Modifique los datos de la reactivación.</DialogDescription></DialogHeader><div className="py-4 grid grid-cols-2 gap-4"><div className="space-y-2"><label>Mes</label><Select value={reactivationEditData.month} onValueChange={(v) => setReactivationEditData(p => ({...p, month: v}))}><SelectTrigger/><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><label>Año</label><Input value={reactivationEditData.year} onChange={(e) => setReactivationEditData(p => ({...p, year: e.target.value}))}/></div><div className="space-y-2 col-span-2"><label>Acto Administrativo (Opcional)</label><Input value={reactivationEditData.decree} onChange={(e) => setReactivationEditData(p => ({...p, decree: e.target.value}))}/></div></div><DialogFooter><Button variant="ghost" onClick={() => setReactivationToEdit(null)}>Cancelar</Button><Button onClick={handleUpdateReactivation}>Guardar</Button></DialogFooter></DialogContent></Dialog>}
{novedadToDelete && <Dialog open={!!novedadToDelete} onOpenChange={() => setNovedadToDelete(null)}><DialogContent><DialogHeader><DialogTitle>Confirmar Eliminación</DialogTitle><DialogDescription>Esta acción no se puede deshacer. La novedad será eliminada permanentemente.</DialogDescription></DialogHeader><div className="py-4"><p>{novedadToDelete?.descripcion}</p></div><DialogFooter><Button variant="ghost" onClick={() => setNovedadToDelete(null)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteNovedad}>Eliminar</Button></DialogFooter></DialogContent></Dialog>}
{novedadToEditText && <Dialog open={!!novedadToEditText} onOpenChange={() => setNovedadToEditText(null)}><DialogContent><DialogHeader><DialogTitle>Editar Novedad</DialogTitle><DialogDescription>Modifique la descripción de la novedad.</DialogDescription></DialogHeader><div className="py-4"><Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={4}/></div><DialogFooter><Button variant="ghost" onClick={() => setNovedadToEditText(null)}>Cancelar</Button><Button onClick={handleUpdateNovedadText}>Guardar</Button></DialogFooter></DialogContent></Dialog>}
<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>¿Estás seguro que deseas eliminar este legajo?</DialogTitle>
      <DialogDescription>
        <div className="py-4 text-red-600 font-medium">
          <p>¡ATENCIÓN! ESTA ACCIÓN ES IRREVERSIBLE.</p>
          <p className="mt-2">Se eliminará permanentemente el legajo de <span className="font-bold">{participant.nombre}</span>, junto con todo su historial de pagos, novedades y cualquier otro dato asociado.</p>
          <p className="mt-2">Una vez borrado, no podrá ser recuperado.</p>
        </div>
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
      <Button variant="destructive" onClick={handleDeleteParticipant}>Sí, eliminar permanentemente</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
      </div>
  );
};

export default ParticipantDetail;