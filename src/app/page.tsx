'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirebase, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp, query, onSnapshot, setDoc, where, getCountFromServer, orderBy, increment, limit } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, AlertTriangle, Search, Calendar, Briefcase, Settings, UserCheck, PlusCircle, Shield, LogOut, Loader2, Upload, History, ChevronLeft, ChevronRight, XCircle, Pencil } from 'lucide-react';

import type { Participant, UserRole } from '@/lib/types';
import { DEPARTAMENTOS, PROGRAMAS, CATEGORIAS_TUTORIAS, ROLES } from '@/lib/constants';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';

// Componentes de la App
import ParticipantDetail from '@/components/app/ParticipantDetail';
import AttendanceSection from '@/components/app/AttendanceSection';
import PaymentUploadWizard from '@/components/app/PaymentUploadWizard';
import ParticipantUploadWizard from '@/components/app/ParticipantUploadWizard';
import PaymentHistory from '@/components/app/PaymentHistory';
import UserManagement from '@/components/app/UserManagement';
import ConfiguracionForm from '@/components/app/ConfiguracionForm';
import ConfiguracionHistorial, { type Configuracion } from '@/components/app/ConfiguracionHistorial';
import ParticipantsTab from '@/components/app/ParticipantsTab';
import Dashboard from '@/components/app/Dashboard'; // Importamos el nuevo componente

type ParticipantFilter = 'requiresAttention' | 'paymentAlert' | 'ageAlert' | null;

const NewParticipantForm = ({ onFormSubmit } : { onFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) => {
    const [selectedProgram, setSelectedProgram] = useState<string>(PROGRAMAS.TUTORIAS);
    return (
        <form onSubmit={onFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
             <div className="flex flex-wrap gap-4">
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Nombre</label><Input name="nombre" required /></div>
                <div className="flex-grow md:basis-1/3"><label className="text-sm">DNI</label><Input name="dni" required /></div>
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Fecha Nacimiento</label><Input name="fechaNacimiento" type="date" required /></div>
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Acto Adm. Alta</label><Input name="actoAdministrativo" placeholder="Res. Nº..." /></div>
                <div className="flex-grow md:basis-1/3">
                    <label className="text-sm">Programa</label>
                    <Select name="programa" value={selectedProgram} onValueChange={(value) => setSelectedProgram(value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.values(PROGRAMAS).map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Fecha Ingreso</label><Input name="fechaIngreso" type="date" required /></div>
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Depto</label><Select name="departamento" defaultValue={DEPARTAMENTOS[0]}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPARTAMENTOS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                
                {selectedProgram === PROGRAMAS.TUTORIAS && (
                    <div className="flex-grow md:basis-1/3">
                        <label className="text-sm">Categoría (Tutorías)</label>
                        <Select name="categoria">
                            <SelectTrigger><SelectValue placeholder="-"/></SelectTrigger>
                            <SelectContent>{CATEGORIAS_TUTORIAS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
                
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Lugar de Trabajo</label><Input name="lugarTrabajo" placeholder="Ej: Escuela N° 5" /></div>
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Email</label><Input name="email" type="email" /></div>
                <div className="flex-grow md:basis-1/3"><label className="text-sm">Teléfono</label><Input name="telefono" /></div>
            </div>
            <div className="flex items-center gap-2 mt-4 bg-indigo-50 p-3 rounded border border-indigo-100"><Checkbox id="esEquipoTecnico" name="esEquipoTecnico" /><label htmlFor="esEquipoTecnico" className="text-sm font-bold text-indigo-800 select-none">Es Equipo Técnico</label></div>
            <div className="flex justify-end mt-6">
                <Button type="submit">Guardar</Button>
            </div>
        </form>
    )
};

export default function App() {
  const { auth } = useFirebase();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [initialSearch, setInitialSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ParticipantFilter>(null);
  
  const [editingConfig, setEditingConfig] = useState<Configuracion | null>(null);

  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const handleConfigSave = useCallback(() => {
      setForceUpdateKey(prev => prev + 1); 
  }, []);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (!user || !firestore) {
      setUserProfile(null);
      return;
    }
    
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data() as UserRole;
            setUserProfile(userData);
        } else {
            console.warn(`Creando perfil para ${user.uid}...`);
            const isAdmin = user.email === 'crnunezfacundo@gmail.com';
            const name = user.displayName || user.email?.split('@')[0] || 'Usuario';
            const newUserProfile: UserRole = {
                uid: user.uid,
                name: name,
                email: user.email || 'anonimo',
                role: isAdmin ? ROLES.ADMIN : ROLES.DATA_ENTRY,
                createdAt: new Date().toISOString(),
            };
            setDoc(userDocRef, newUserProfile).catch(e => console.error("Error creando perfil:", e));
        }
    }, (error) => {
        console.error("Error en suscripción de perfil:", error);
    });
    return () => unsubscribe();
  }, [user, firestore]);

  const participantsRef = useMemoFirebase(() => (firestore) ? query(collection(firestore, 'participants')) : null, [firestore]);
  const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsRef);
  
  const usersRef = useMemoFirebase(() => (firestore && userProfile?.role === ROLES.ADMIN) ? query(collection(firestore, 'users')) : null, [firestore, userProfile]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<UserRole>(usersRef);

  const isAdmin = userProfile?.role === ROLES.ADMIN;
  const isDataEntry = userProfile?.role === ROLES.DATA_ENTRY;
  
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const selectedParticipant = useMemo(() => {
      if (!selectedParticipantId) return null;
      return participants?.find(p => p.id === selectedParticipantId) ?? null;
  }, [selectedParticipantId, participants]);

  const handleSelectParticipant = (participant: Participant | null) => {
    setSelectedParticipantId(participant ? participant.id : null);
    setIsCreatingNew(false);
  };

  const handleOpenNewForm = () => {
      setSelectedParticipantId(null);
      setIsCreatingNew(true);
  };

  const [isPaymentUploadOpen, setIsPaymentUploadOpen] = useState(false);
  const [isParticipantUploadOpen, setIsParticipantUploadOpen] = useState(false);

  useEffect(() => {
     if (userProfile?.role === ROLES.DATA_ENTRY) {
        setActiveTab('attendance');
    }
  }, [userProfile]);

  const handleAddParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) return;
    const formData = new FormData(e.currentTarget);
    const esEquipoTecnico = formData.get('esEquipoTecnico') === 'on';
    
    const data: { [key: string]: any } = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    if (data.dni) {
        data.dni = String(data.dni);
    }
    
    await addDoc(collection(firestore, 'participants'), {
      ...data, 
      esEquipoTecnico,
      pagosAcumulados: 0, 
      fechaAlta: new Date().toISOString(), 
      activo: true,
      estado: 'Ingresado',
      ownerId: user.uid
    });
    toast({ title: "Participante Agregado", description: "El nuevo participante ha sido registrado." });
    setIsCreatingNew(false);
  };

  const handleFindDni = (dni: string) => {
    setIsPaymentUploadOpen(false);
    setActiveTab('participants');
    setInitialSearch(dni);
  };

  const handleSetFilter = (filter: ParticipantFilter) => {
      setActiveFilter(filter);
      setActiveTab('participants');
  };

  const handleClearFilter = () => {
      setActiveFilter(null);
  };
  
  const handleEditConfig = (config: Configuracion) => {
    setEditingConfig(config);
  };

  const handleFinishEditing = () => {
    setEditingConfig(null);
  };

  if (isUserLoading || !user) {
    return <div className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /><p>Iniciando sesión...</p></div>;
  }
  
  if (!userProfile) {
    return <div className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /><p>Cargando perfil...</p></div>;
  }
  
  const renderConfig = () => {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {editingConfig ? <><Pencil size={22}/> Editando Configuración</> : 'Registrar Nueva Configuración de Montos'}
                    </CardTitle>
                    <CardDescription>
                        {editingConfig 
                          ? `Está modificando los valores para la vigencia de ${editingConfig.mesVigencia}/${editingConfig.anoVigencia}. Los cambios se guardarán sobre este mismo registro.`
                          : 'Guardar una nueva configuración creará un registro histórico y pasará a ser la configuración activa.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConfiguracionForm 
                      onConfigSave={handleConfigSave} 
                      configToEdit={editingConfig} 
                      onFinishEditing={handleFinishEditing} 
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History/> Historial de Configuraciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <ConfiguracionHistorial forceUpdateKey={forceUpdateKey} onEditConfig={handleEditConfig} />
                </CardContent>
            </Card>
            
            <PaymentHistory />
        </div>
    );
  }

  const ActiveTabContent = () => {
    switch (activeTab) {
        case 'dashboard': 
            return isAdmin 
                ? <Dashboard 
                    participants={participants || []} 
                    participantsLoading={participantsLoading} 
                    onSetFilter={handleSetFilter}
                    onSelectParticipant={handleSelectParticipant}
                  /> 
                : null;
        case 'participants': 
            return isAdmin 
                ? <ParticipantsTab 
                    participants={participants || []} 
                    isLoading={participantsLoading} 
                    onSelect={(p) => {
                        if (p === 'new') {
                            handleOpenNewForm();
                        } else {
                            handleSelectParticipant(p);
                        }
                    }} 
                    onOpenParticipantWizard={() => setIsParticipantUploadOpen(true)} 
                    initialSearchTerm={initialSearch} 
                    onSearchHandled={() => setInitialSearch('')} 
                    activeFilter={activeFilter} 
                    onClearFilter={handleClearFilter} 
                  /> 
                : null;
        case 'attendance': 
            return (isAdmin || isDataEntry) ? <AttendanceSection participants={participants || []} /> : null;
        case 'users': 
            return isAdmin ? <UserManagement users={allUsers || []} currentUser={user} isLoading={usersLoading} /> : null;
        case 'config': 
            return isAdmin ? renderConfig() : null;
        default: 
            return null;
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'participants') {
      setActiveFilter(null); 
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader><h1 className="text-xl font-bold flex items-center gap-2 p-4"><Briefcase className="text-blue-400" />Gestión LR</h1></SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {isAdmin && <>
              <SidebarMenuItem><SidebarMenuButton onClick={() => handleTabChange('dashboard')} isActive={activeTab === 'dashboard'}><Users size={16} />Resumen Gral.</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton onClick={() => handleTabChange('participants')} isActive={activeTab === 'participants'}><UserCheck size={16} />Participantes</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton onClick={() => handleTabChange('users')} isActive={activeTab === 'users'}><Shield size={16} />Usuarios</SidebarMenuButton></SidebarMenuItem>
            </>}
            {(isAdmin || isDataEntry) && <SidebarMenuItem><SidebarMenuButton onClick={() => handleTabChange('attendance')} isActive={activeTab === 'attendance'}><Calendar size={16} />Asistencia</SidebarMenuButton></SidebarMenuItem>}
            {isAdmin && <>
              <SidebarMenuItem><SidebarMenuButton onClick={() => setIsPaymentUploadOpen(true)}><DollarSign size={16} />Carga Pagos</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton onClick={() => handleTabChange('config')} isActive={activeTab === 'config'}><Settings size={16} />Configuración</SidebarMenuButton></SidebarMenuItem>
            </>}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
             <div className="text-center p-2 border-t border-sidebar-border">
                <p className="text-sm font-semibold text-sidebar-foreground">{userProfile.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{userProfile.email}</p>
                <Badge variant="outline" className="mt-2">{userProfile.role}</Badge>
                <Button variant="ghost" size="sm" onClick={() => auth && signOut(auth)} className="w-full mt-2 text-red-500 hover:bg-red-50 hover:text-red-600"><LogOut size={16} />Cerrar Sesión</Button>
             </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b md:hidden bg-white">
            <SidebarTrigger /><span className="font-bold">Gestión LR</span>
        </header>
        <main className="flex-1 p-4 md:p-8 bg-gray-50/50">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Hola, {userProfile.name}</h1>
                {activeTab === 'dashboard' && <p className="text-gray-500">Resumen de la actividad reciente del sistema.</p>}
                 {activeTab === 'config' && <p className="text-gray-500">Gestión de montos y valores de los programas.</p>}
            </div>
          <ActiveTabContent />
        </main>
      </SidebarInset>

      <Dialog open={isCreatingNew} onOpenChange={setIsCreatingNew}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Nuevo Participante</DialogTitle><DialogDescription>Complete el formulario para agregar un nuevo participante.</DialogDescription></DialogHeader>
          <NewParticipantForm onFormSubmit={handleAddParticipant} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!selectedParticipant} onOpenChange={(isOpen) => !isOpen && handleSelectParticipant(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Legajo Personal</DialogTitle>
            <DialogDescription>Información del participante, pagos y novedades.</DialogDescription>
          </DialogHeader>
          {selectedParticipant && (
            <ParticipantDetail participant={selectedParticipant} onBack={() => handleSelectParticipant(null)} />
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPaymentUploadOpen} onOpenChange={setIsPaymentUploadOpen}> 
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Carga Masiva de Pagos</DialogTitle><DialogDescription>Siga los pasos para cargar un archivo CSV de pagos.</DialogDescription></DialogHeader>
          <PaymentUploadWizard participants={participants || []} onClose={() => setIsPaymentUploadOpen(false)} onFindDni={handleFindDni} />
        </DialogContent>
      </Dialog>

      <Dialog open={isParticipantUploadOpen} onOpenChange={setIsParticipantUploadOpen}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Carga Masiva de Participantes</DialogTitle><DialogDescription>Siga los pasos para cargar un archivo CSV para registrar nuevos participantes.</DialogDescription></DialogHeader>
          <ParticipantUploadWizard allParticipants={participants || []} onClose={() => setIsParticipantUploadOpen(false)} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
