'use client';

import React, { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Novedad, Participant, Payment } from '@/lib/types';
import { getAlertStatus, getPaymentStatus } from '@/lib/logic';
import { calculateAge } from '@/lib/utils';
import {
  AlertTriangle,
  FileText,
  Mail,
  Phone,
  PlusCircle,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PROGRAMAS } from '@/lib/constants';

const ParticipantDetail = ({ participant, payments }: { participant: Participant, payments: Payment[]}) => {
  const { firestore } = useFirebase();
  
  const novedadesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'novedades'), where('participantId', '==', participant.id)) : null, [firestore, participant.id]);
  const { data: novedadesData } = useCollection<Novedad>(novedadesRef);
  const novedades = useMemo(() => (novedadesData || []).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()), [novedadesData]);

  const [newNovedad, setNewNovedad] = useState({ descripcion: '', fecha: new Date().toISOString().split('T')[0] });

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

  const alertStatus = getAlertStatus(participant);
  const age = calculateAge(participant.fechaNacimiento);
  const paymentStatus = getPaymentStatus(participant.ultimoPago);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
          {participant.nombre.charAt(0)}
        </div>
        <div>
          <h3 className="text-xl font-bold">{participant.nombre}</h3>
          <p className="text-gray-500">DNI: {participant.dni}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant="blue">{participant.programa}</Badge>
            {participant.esEquipoTecnico && <Badge variant="indigo">Equipo Técnico</Badge>}
            <Badge variant={paymentStatus.type as any}>{paymentStatus.text}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pagos">Historial Pagos</TabsTrigger>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
        </TabsList>
        <div className="min-h-[300px] pt-4">
            <TabsContent value="general">
              <div className="space-y-4">
                {alertStatus && alertStatus.type !== 'blue' && (
                  <div className={`p-4 rounded border-l-4 ${alertStatus.type === 'red' ? 'bg-red-50 border-red-500 text-red-700' : 'bg-yellow-50 border-yellow-500 text-yellow-700'}`}>
                    <h4 className="font-bold flex items-center gap-2"><AlertTriangle size={18} /> Atención</h4>
                    <p>{alertStatus.msg}</p>
                    {participant.programa !== PROGRAMAS.TUTORIAS && <p className="text-sm mt-1">Pagos acumulados: <strong>{participant.pagosAcumulados || 0}</strong></p>}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="p-3 bg-gray-50 rounded"><p className="text-gray-500">Edad</p><p className="font-bold">{age > 0 ? `${age} años` : 'N/D'}</p></div>
                   <div className="p-3 bg-gray-50 rounded"><p className="text-gray-500">Fecha Ingreso</p><p className="font-bold text-indigo-700">{participant.fechaIngreso ? new Date(participant.fechaIngreso).toLocaleDateString() : '-'}</p></div>
                   <div className="p-3 bg-gray-50 rounded"><p className="text-gray-500">Categoría</p><p className="font-bold">{participant.categoria || 'N/A'}</p></div>
                   <div className="p-3 bg-gray-50 rounded"><p className="text-gray-500">Lugar Trabajo</p><p className="font-bold">{participant.lugarTrabajo || '-'}</p></div>
                   <div className="p-3 bg-gray-50 rounded col-span-2"><p className="text-gray-500">Último Pago Registrado</p><p className="font-bold text-lg">{participant.ultimoPago || 'Sin registros'}</p></div>
                </div>

                <div className="mt-4 border-t pt-4">
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><FileText size={16}/> Datos de Contacto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <Mail size={16} />
                            <span>{participant.email || "Sin email"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <Phone size={16} />
                            <span>{participant.telefono || "Sin teléfono"}</span>
                        </div>
                    </div>
                </div>
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
                        {payments.filter(p => p.dni === participant.dni).map(pay => (
                            <TableRow key={pay.id}>
                                <TableCell>{pay.mes}/{pay.anio}</TableCell>
                                <TableCell className="font-mono font-bold text-green-700">${pay.monto}</TableCell>
                                <TableCell className="text-gray-500">{pay.fechaCarga?.seconds ? new Date(pay.fechaCarga.seconds * 1000).toLocaleDateString() : 'Reciente'}</TableCell>
                            </TableRow>
                        ))}
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
                   {(novedades || []).map(nov => (
                     <div key={nov.id} className="border-l-2 border-blue-400 pl-3 py-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm text-gray-800 font-medium">{nov.descripcion}</p>
                          <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1"><Clock size={12} /> {new Date(nov.fecha).toLocaleDateString()}</span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ParticipantDetail;
