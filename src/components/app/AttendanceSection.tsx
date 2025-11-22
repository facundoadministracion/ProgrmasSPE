'use client';
import React, { useMemo, useState } from 'react';
import { Participant } from '@/lib/types';
import { MONTHS, PROGRAMAS } from '@/lib/constants';
import { getPaymentStatus } from '@/lib/logic';
import { useFirebase, useUser } from '@/firebase';
import { writeBatch, collection, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Search, ArrowRight, Save, MapPin, DollarSign, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';

const AttendanceSection = ({ participants }: { participants: Participant[] }) => {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Participant | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
      mes: new Date().getMonth(),
      anio: new Date().getFullYear(),
      lugarTrabajo: '',
      responsable: '',
      metodo: 'Papel (Ministerio)',
      emailPresentacion: '',
      tardanza: false,
      certificado: false,
      observaciones: '',
      actualizarArea: false
  });

  const filteredPeople = useMemo(() => {
      if(searchTerm.length < 3) return [];
      const lower = searchTerm.toLowerCase();
      // Filtra solo por el programa de tutorías
      return participants.filter(p => 
          p.programa === PROGRAMAS.TUTORIAS && 
          (p.nombre.toLowerCase().includes(lower) || p.dni.includes(lower))
      );
  }, [searchTerm, participants]);

  const handleSelectPerson = async (p: Participant) => {
      if (!firestore) return;
      setSelectedPerson(p);
      setSearchTerm(''); 
      setDuplicateWarning(null);

      setFormData({
          mes: new Date().getMonth(),
          anio: new Date().getFullYear(),
          lugarTrabajo: p.lugarTrabajo || '', 
          responsable: '',
          metodo: 'Papel (Ministerio)',
          emailPresentacion: '',
          tardanza: false,
          certificado: false,
          observaciones: '',
          actualizarArea: false
      });

      const q = query(
          collection(firestore, 'asistencias'),
          where('participantId', '==', p.id),
          where('mes', '==', new Date().getMonth()),
          where('anio', '==', new Date().getFullYear())
      );
      const snapshot = await getDocs(q);
      if(!snapshot.empty) {
          const rec = snapshot.docs[0].data();
          setDuplicateWarning(`¡Atención! Ya existe una planilla cargada para este mes (${MONTHS[rec.mes]}) por método: ${rec.metodo}.`);
      }
  };

  const handleSave = async () => {
      if(!selectedPerson || !firestore) return;
      if(!formData.lugarTrabajo || !formData.responsable) {
          alert("Falta completar Lugar de Trabajo o Responsable.");
          return;
      }
      const batch = writeBatch(firestore);
      const asisRef = doc(collection(firestore, 'asistencias'));
      batch.set(asisRef, {
          participantId: selectedPerson.id,
          participantName: selectedPerson.nombre,
          dni: selectedPerson.dni,
          ...formData,
          fechaCarga: serverTimestamp(),
          ownerId: user?.uid,
      });

      if(formData.actualizarArea && formData.lugarTrabajo !== selectedPerson.lugarTrabajo) {
          const partRef = doc(firestore, 'participants', selectedPerson.id);
          batch.update(partRef, { lugarTrabajo: formData.lugarTrabajo });
          const novRef = doc(collection(firestore, 'novedades'));
          batch.set(novRef, {
              participantId: selectedPerson.id,
              participantName: selectedPerson.nombre,
              descripcion: `Cambio de Área por Planilla: ${selectedPerson.lugarTrabajo || 'S/D'} -> ${formData.lugarTrabajo}`,
              fecha: new Date().toISOString().split('T')[0],
              fechaRealCarga: serverTimestamp(),
              ownerId: user?.uid,
          });
      }

      await batch.commit();
      alert("Asistencia guardada correctamente.");
      setSelectedPerson(null); 
  };

  const isAreaChanged = selectedPerson && formData.lugarTrabajo.trim().toLowerCase() !== (selectedPerson.lugarTrabajo || '').trim().toLowerCase();
  const selectedPersonStatus = selectedPerson ? getPaymentStatus(selectedPerson.ultimoPago) : null;

  return (
    <div className="space-y-6">
      {!selectedPerson ? (
          <Card className="p-8 text-center max-w-2xl mx-auto">
            <CardContent>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Carga de Asistencia de Tutorías</h2>
              <p className="text-gray-500 mb-6">Busque al tutor para ingresar los datos de su planilla mensual.</p>
              
              <div className="relative max-w-md mx-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <Input 
                      type="text" 
                      className="pl-10 p-3"
                      placeholder="Ingrese DNI o Apellido del Tutor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                  />
              </div>

              {searchTerm.length > 2 && (
                  <div className="mt-4 text-left border rounded-lg overflow-hidden">
                      {filteredPeople.map(p => {
                          const status = getPaymentStatus(p.ultimoPago);
                          return (
                              <button 
                                  key={p.id} 
                                  onClick={() => handleSelectPerson(p)}
                                  className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-0 flex justify-between items-center group"
                              >
                                  <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-800">{p.nombre}</p>
                                        <Badge variant={status.type as any}>{status.text}</Badge>
                                      </div>
                                      <p className="text-sm text-gray-500">{p.dni} - {p.departamento}</p>
                                  </div>
                                  <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600"/>
                              </button>
                          );
                      })}
                      {filteredPeople.length === 0 && (
                          <div className="p-4 text-center text-gray-400">No se encontraron tutores con ese criterio.</div>
                      )}
                  </div>
              )}
            </CardContent>
          </Card>
      ) : (
          <Card className="overflow-hidden max-w-4xl mx-auto">
              <div className="bg-slate-800 text-white p-6 flex justify-between items-start">
                  <div className="flex gap-4">
                      <div className="h-16 w-16 bg-slate-600 rounded-full flex items-center justify-center text-2xl font-bold">
                          {selectedPerson.nombre.charAt(0)}
                      </div>
                      <div>
                          <h2 className="text-xl font-bold flex items-center gap-2">
                              {selectedPerson.nombre}
                              {selectedPersonStatus?.type === 'red' && <Badge variant="destructive">INACTIVO</Badge>}
                          </h2>
                          <p className="text-slate-300">{selectedPerson.dni} • {selectedPerson.programa}</p>
                          <div className="flex gap-2 mt-2 text-xs">
                              <Badge variant="secondary"><MapPin size={12} className="mr-1"/> {selectedPerson.departamento}</Badge>
                              <Badge variant="secondary"><DollarSign size={12} className="mr-1"/> Ult. Pago: {selectedPerson.ultimoPago || 'N/A'}</Badge>
                          </div>
                      </div>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedPerson(null)} className="text-slate-400 hover:text-white">Cancelar</Button>
              </div>

              {selectedPersonStatus?.type === 'red' && (
                   <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mb-0 flex items-start gap-3">
                      <Info className="text-red-600 mt-1" />
                      <div>
                          <h4 className="font-bold text-red-800">Participante Inactivo</h4>
                          <p className="text-sm text-red-700">Esta persona no registra pagos recientes (Último: {selectedPerson.ultimoPago}). Verifique si corresponde cargar asistencia.</p>
                      </div>
                   </div>
              )}

              {duplicateWarning && (
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-4 m-6 mb-0 flex items-start gap-3">
                      <AlertTriangle className="text-orange-600 mt-1" />
                      <div>
                          <h4 className="font-bold text-orange-800">Posible Duplicado</h4>
                          <p className="text-sm text-orange-700">{duplicateWarning}</p>
                      </div>
                  </div>
              )}
              
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-700 border-b pb-2">Datos de Presentación</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Mes</label>
                              <Select value={String(formData.mes)} onValueChange={v => setFormData({...formData, mes: parseInt(v)})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Año</label>
                              <Select value={String(formData.anio)} onValueChange={v => setFormData({...formData, anio: parseInt(v)})}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>{[2023, 2024, 2025].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                      </div>

                      <div>
                          <label className="text-sm font-medium text-gray-600 block mb-1">Método de Entrega</label>
                          <Select value={formData.metodo} onValueChange={v => setFormData({...formData, metodo: v})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Papel (Ministerio)">Papel (Ministerio)</SelectItem>
                                <SelectItem value="Email">Email</SelectItem>
                            </SelectContent>
                          </Select>
                      </div>

                      {formData.metodo === 'Email' && (
                          <div>
                              <label className="text-sm font-medium text-gray-600 block mb-1">Email de Origen (Remitente)</label>
                              <Input type="email" placeholder="quien_envio@email.com" value={formData.emailPresentacion} onChange={e => setFormData({...formData, emailPresentacion: e.target.value})} />
                          </div>
                      )}

                      <div>
                          <label className="text-sm font-medium text-gray-600 block mb-1">Firma / Responsable</label>
                          <Input placeholder="Quien firma la planilla..." value={formData.responsable} onChange={e => setFormData({...formData, responsable: e.target.value})} />
                      </div>
                  </div>

                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-700 border-b pb-2">Validación de Lugar</h3>
                      
                      <div className={`p-3 rounded border ${isAreaChanged ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Lugar de Trabajo (Según Planilla)</label>
                          <Input className="bg-white" value={formData.lugarTrabajo} onChange={e => setFormData({...formData, lugarTrabajo: e.target.value})} />
                          {isAreaChanged && (
                              <div className="mt-2 flex items-start gap-2">
                                  <Checkbox id="updateArea" checked={formData.actualizarArea} onCheckedChange={c => setFormData({...formData, actualizarArea: !!c})} />
                                  <label htmlFor="updateArea" className="text-xs text-orange-800 cursor-pointer">
                                      <strong>Difiere del sistema ({selectedPerson.lugarTrabajo}).</strong><br/>
                                      ¿Actualizar el legajo con este nuevo lugar?
                                  </label>
                              </div>
                          )}
                      </div>

                      <div className="flex gap-4 mt-4">
                          <div className="flex items-center gap-2 border p-3 rounded w-full cursor-pointer hover:bg-gray-50" onClick={() => setFormData(prev => ({...prev, tardanza: !prev.tardanza}))}>
                              <Checkbox checked={formData.tardanza} />
                              <span className="text-sm text-gray-700">Llegada Tarde</span>
                          </div>
                          <div className="flex items-center gap-2 border p-3 rounded w-full cursor-pointer hover:bg-gray-50" onClick={() => setFormData(prev => ({...prev, certificado: !prev.certificado}))}>
                              <Checkbox checked={formData.certificado} />
                              <span className="text-sm text-gray-700">Con Certificado</span>
                          </div>
                      </div>

                      <div>
                          <label className="text-sm font-medium text-gray-600 block mb-1">Observaciones</label>
                          <Textarea className="h-20 text-sm" placeholder="Notas adicionales..." value={formData.observaciones} onChange={e => setFormData({...formData, observaciones: e.target.value})} />
                      </div>
                  </div>
              </CardContent>

              <div className="bg-gray-50 p-6 border-t flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setSelectedPerson(null)}>Cancelar</Button>
                  <Button onClick={handleSave}><Save size={18} className="mr-2"/> Guardar Asistencia</Button>
              </div>
          </Card>
      )}
    </div>
  );
};

export default AttendanceSection;
