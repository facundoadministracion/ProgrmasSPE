'use client';
import React, { useState } from 'react';
import { Participant } from '@/lib/types';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, FileText, Edit, Ban, Bell, CheckCircle, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ParticipantForm from './EditParticipantForm';
import BajaForm from './BajaForm';
import { getAlertStatus } from '@/lib/logic';
import { MONTHS as meses } from '@/lib/constants';

const ParticipantDetail = ({ participant: initialParticipant, onBack }: { participant: Participant; onBack: () => void; }) => {
  const [participant, setParticipant] = useState(initialParticipant);
  const [isEditing, setIsEditing] = useState(false);
  const [isBajaDialogOpen, setIsBajaDialogOpen] = useState(false);
  const { firestore } = useFirebase();
  const { user } = useUser();

  const handleUpdate = (updatedParticipant: Participant) => {
    setParticipant(updatedParticipant);
    setIsEditing(false);
  };

  const handleBajaConfirm = async (bajaData: any) => {
    if (!firestore || !user) return;

    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, { activo: false, estado: 'Baja' });
    setParticipant(prev => ({...prev, activo: false, estado: 'Baja'}));

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
      type: 'BAJA_DEFINITIVA',
      mesEvento: bajaData.mesBaja,
      anoEvento: bajaData.anioBaja,
      fechaRealCarga: serverTimestamp(),
      ownerId: user.uid
    });

    setIsBajaDialogOpen(false);
  };
  
  const handleReactivate = async () => {
    if (!firestore) return;
    const partRef = doc(firestore, 'participants', participant.id);
    await updateDoc(partRef, { activo: true, estado: 'Activo' });
    setParticipant(prev => ({...prev, activo: true, estado: 'Activo'}));
    // Maybe add a novelty?
  }

  const alert = getAlertStatus(participant);

  const alertClassNames: { [key: string]: string } = {
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  };

  const renderField = (label: string, value: any) => (
    <div className="py-2">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-md text-gray-800">{value || '-'}</p>
    </div>
  );

  if (isEditing) {
    return <ParticipantForm participant={participant} onUpdate={handleUpdate} onCancel={() => setIsEditing(false)} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/>Volver</Button>
        <div className="flex items-center gap-2">
          {participant.activo ? (
            <Button variant="destructive" onClick={() => setIsBajaDialogOpen(true)}><Ban className="mr-2 h-4 w-4"/>Dar de Baja</Button>
           ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"><CheckCircle className="mr-2 h-4 w-4"/>Reactivar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{`¿Reactivar a ${participant.nombre}?`}</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción marcará al participante como activo y revertirá el estado de baja. ¿Desea continuar?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReactivate}>Confirmar Reactivación</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
           )}
          <Button onClick={() => setIsEditing(true)}><Edit className="mr-2 h-4 w-4"/>Editar Legajo</Button>
        </div>
      </div>
      
      {alert && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${alertClassNames[alert.type]}`}>
              {alert.type === 'red' ? <XCircle/> : (alert.type === 'yellow' ? <Bell /> : <CheckCircle />)}
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
                <CardDescription>DNI: {participant.dni} - Legajo: {participant.legajo}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-6">
              {renderField('Programa', participant.programa)}
              {renderField('Fecha de Nacimiento', participant.fechaNacimiento)}
              {renderField('Teléfono', participant.telefono)}
              {renderField('Domicilio', participant.domicilio)}
              {renderField('Localidad', participant.localidad)}
              {renderField('Fecha de Alta', participant.fechaAlta ? new Date(participant.fechaAlta).toLocaleDateString() : '-')}
            </CardContent>
          </Card>
        </div>
        <div>
            <Card>
                <CardHeader><CardTitle>Información Adicional</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {renderField('Pagos Acumulados', participant.pagosAcumulados)}
                    {renderField('Último Pago', participant.ultimoPago)}
                    {renderField('Acto Administrativo', participant.actoAdministrativo)}
                    {renderField('Estado', participant.estado)}
                </CardContent>
            </Card>
        </div>
      </div>
      
      {isBajaDialogOpen && (
        <BajaForm 
          participantId={participant.id} 
          participantName={participant.nombre} 
          ownerId={user?.uid || ''} 
          onConfirm={handleBajaConfirm}
          onCancel={() => setIsBajaDialogOpen(false)}
          mesAusencia={participant.mesAusencia} // <-- Prop added here
        />
      )}
    </div>
  );
};

export default ParticipantDetail;
