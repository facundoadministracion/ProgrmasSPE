'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useFirebase,
  useUser,
  useMemoFirebase,
  useFirestore,
  useCollection,
} from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  onSnapshot,
  setDoc,
  deleteDoc,
  where,
  writeBatch,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Search,
  Menu,
  Calendar,
  Briefcase,
  Settings,
  UserCheck,
  PlusCircle,
  Shield,
  Trash2,
  Edit,
  LogOut,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
} from 'lucide-react';

import type { Participant, Payment, Novedad, AppConfig, UserRole } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { DEPARTAMENTOS, PROGRAMAS, CATEGORIAS_TUTORIAS, ROLES } from '@/lib/constants';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';

import ParticipantDetail from '@/components/app/ParticipantDetail';
import ProgramAnalytics from '@/components/app/ProgramAnalytics';
import AttendanceSection from '@/components/app/AttendanceSection';
import PaymentUploadWizard from '@/components/app/PaymentUploadWizard';
import ParticipantUploadWizard from '@/components/app/ParticipantUploadWizard';
import { DashboardCard } from '@/components/app/DashboardCard';
import UserManagement from '@/components/app/UserManagement';
import { useToast } from '@/hooks/use-toast';


const NewParticipantForm = ({ onFormSubmit } : { onFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) => {
    const [selectedProgram, setSelectedProgram] = useState(PROGRAMAS.TUTORIAS);
    return (
        <form onSubmit={onFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm">Nombre</label><Input name="nombre" required /></div>
                <div><label className="text-sm">DNI</label><Input name="dni" required /></div>
                <div><label className="text-sm">Fecha Nacimiento</label><Input name="fechaNacimiento" type="date" required /></div>
                <div><label className="text-sm">Acto Adm. Alta</label><Input name="actoAdministrativo" placeholder="Res. Nº..." /></div>
                <div>
                    <label className="text-sm">Programa</label>
                    <Select name="programa" value={selectedProgram} onValueChange={(value) => setSelectedProgram(value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.values(PROGRAMAS).map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div><label className="text-sm">Fecha Ingreso</label><Input name="fechaIngreso" type="date" required /></div>
                <div><label className="text-sm">Depto</label><Select name="departamento" defaultValue={DEPARTAMENTOS[0]}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPARTAMENTOS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                
                {selectedProgram === PROGRAMAS.TUTORIAS && (
                    <div>
                        <label className="text-sm">Categoría (Tutorías)</label>
                        <Select name="categoria">
                            <SelectTrigger><SelectValue placeholder="-"/></SelectTrigger>
                            <SelectContent>{CATEGORIAS_TUTORIAS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
                
                <div><label className="text-sm">Lugar de Trabajo</label><Input name="lugarTrabajo" placeholder="Ej: Escuela N° 5" /></div>
                <div><label className="text-sm">Email</label><Input name="email" type="email" /></div>
                <div><label className="text-sm">Teléfono</label><Input name="telefono" /></div>
            </div>
            <div className="flex items-center gap-2 mt-2 bg-indigo-50 p-3 rounded border border-indigo-100"><Checkbox id="esEquipoTecnico" name="esEquipoTecnico" /><label htmlFor="esEquipoTecnico" className="text-sm font-bold text-indigo-800 select-none">Es Equipo Técnico</label></div>
            <Button type="submit" className="w-full mt-4">Guardar</Button>
        </form>
    )
}

export default function App() {
  const { auth } = useFirebase();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProgramDetail, setSelectedProgramDetail] = useState<string | null>(null);
  
  const currentYear = new Date().getFullYear().toString();

  // --- AUTENTICACIÓN & PERFIL ---
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
            if (user.email === 'crnunezfacundo@gmail.com' && userData.name !== 'Facundo') {
              updateDoc(userDocRef, { name: 'Facundo' });
              setUserProfile({ ...userData, name: 'Facundo' });
            } else {
              setUserProfile(userData);
            }
        } else {
            console.warn(`Creando perfil para ${user.uid}...`);
            const isAdmin = user.email === 'crnunezfacundo@gmail.com';
            const name = user.email === 'crnunezfacundo@gmail.com' ? 'Facundo' : user.displayName || user.email?.split('@')[0] || 'Usuario';
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

  // --- CARGA DE DATOS OPTIMIZADA ---
  const participantsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'participants')) : null, [firestore]);
  const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsRef);
  
  const configRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'config')) : null, [firestore]);
  const { data: configData, isLoading: configLoading } = useCollection<AppConfig>(configRef);

  const usersRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<UserRole>(usersRef);

  const [paymentCount, setPaymentCount] = useState(0);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || userProfile?.role !== ROLES.ADMIN) {
        setPaymentsLoading(false);
        return;
    };
    
    setPaymentsLoading(true);
    const q = query(collection(firestore, 'payments'), where('anio', '==', currentYear));
    
    getCountFromServer(q).then(snapshot => {
      setPaymentCount(snapshot.data().count);
      setPaymentsLoading(false);
    }).catch(err => {
      console.error("Error counting payments:", err);
      setPaymentsLoading(false);
    });
  }, [firestore, currentYear, userProfile]);


  // --- UI STATE ---
  const isAdmin = userProfile?.role === ROLES.ADMIN;
  const isDataEntry = userProfile?.role === ROLES.DATA_ENTRY;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | 'new' | null>(null);
  const [isPaymentUploadOpen, setIsPaymentUploadOpen] = useState(false);
  const [isParticipantUploadOpen, setIsParticipantUploadOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
    const data = Object.fromEntries(formData.entries());
    
    await addDoc(collection(firestore, 'participants'), {
      ...data, 
      esEquipoTecnico,
      pagosAcumulados: 0, 
      fechaAlta: new Date().toISOString(), 
      activo: true,
      ownerId: user.uid
    });
    toast({ title: "Participante Agregado", description: "El nuevo participante ha sido registrado." });
    setSelectedParticipant(null);
  };

  const handleUpdateConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(!firestore) return;
  
    const formData = new FormData(e.currentTarget);
    const data = {
      tutorias: {
        senior: parseFloat(formData.get('senior') as string || '0'),
        estandar: parseFloat(formData.get('estandar') as string || '0'),
        junior: parseFloat(formData.get('junior') as string || '0'),
      },
      joven: { monto: parseFloat(formData.get('joven') as string || '0') },
      tecno: { monto: parseFloat(formData.get('tecno') as string || '0') }
    };
    const configCollectionRef = collection(firestore, 'config');

  
    if (!configData || configData.length === 0) {
      await addDoc(configCollectionRef, { ...data, timestamp: serverTimestamp() });
      toast({ title: "Configuración Creada" });
    } else {
      const configDocRef = doc(configCollectionRef, configData[0].id);
      await updateDoc(configDocRef, { ...data, timestamp: serverTimestamp() });
      toast({ title: "Montos Actualizados" });
    }
  };
  
  if (isUserLoading || !user) {
    return <div className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /><p>Iniciando sesión...</p></div>;
  }
  
  if (!userProfile) {
    return <div className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /><p>Cargando perfil...</p></div>;
  }
  
  const renderDashboard = () => {
    if (selectedProgramDetail) {
        return <ProgramAnalytics programName={selectedProgramDetail} participants={participants || []} onBack={() => setSelectedProgramDetail(null)} />;
    }
    const alerts = (participants || []).filter(p => !p.activo).length;
    const activeParticipants = (participants || []).filter(p => p.activo).length;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DashboardCard title="Total Activos" value={activeParticipants} icon={Users} color="blue" subtitle="Padrón total consolidado" isLoading={participantsLoading} />
            <DashboardCard title="Inactivos" value={alerts} icon={AlertTriangle} color="red" subtitle="Requieren atención o baja" isLoading={participantsLoading} />
            <DashboardCard title="Pagos (Este Año)" value={paymentCount} icon={DollarSign} color="green" subtitle={`Transacciones en ${currentYear}`} isLoading={paymentsLoading} />
        </div>
        <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-700 mb-6">Detalle por Programas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(PROGRAMAS).map(prog => {
                    const count = (participants || []).filter(p => p.programa === prog && p.activo).length;
                    return <DashboardCard key={prog} title={prog} value={count} icon={Briefcase} subtitle="Participantes activos" onClick={() => setSelectedProgramDetail(prog)} actionText="Ver Análisis Mensual" color="indigo" isLoading={participantsLoading}/>;
                })}
            </div>
        </div>
      </div>
    );
  };

  const renderParticipants = () => {
    const filtered = (participants || []).filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.dni.includes(searchTerm));
    
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Padrón de Participantes</h2>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><Input type="text" placeholder="Buscar DNI/Nombre..." className="pl-10" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} /></div>
            <Button onClick={() => setIsParticipantUploadOpen(true)} variant="outline"><Upload className="mr-2 h-4 w-4" /> Carga Masiva</Button>
            <Button onClick={() => setSelectedParticipant('new')}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo</Button>
          </div>
        </div>
        <Card>
          {participantsLoading ? <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin h-5 w-5"/> Cargando participantes...</div> : (
            <>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead><TableHead>DNI</TableHead><TableHead>Programa</TableHead>
                    <TableHead>Depto</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map(p => {
                        const alert = getAlertStatus(p);
                        return (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.nombre}</TableCell><TableCell>{p.dni}</TableCell>
                                <TableCell><span className="block text-sm">{p.programa}</span>{p.esEquipoTecnico && <Badge variant="indigo">Equipo Técnico</Badge>}{!p.esEquipoTecnico && p.programa === PROGRAMAS.TUTORIAS && <span className="text-xs text-gray-400">{p.categoria}</span>}</TableCell>
                                <TableCell>{p.departamento}</TableCell>
                                <TableCell><Badge variant={alert.type as any}>{alert.msg}</Badge></TableCell>
                                <TableCell><Button variant="link" size="sm" onClick={() => setSelectedParticipant(p)}>Ver Legajo</Button></TableCell>
                            </TableRow>
                        )
                    })}
                     {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron resultados.</TableCell></TableRow>}
                </TableBody>
            </Table>
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 p-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                    <div className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente <ChevronRight className="h-4 w-4" /></Button>
                </div>
            )}
            </>
           )}
        </Card>
      </div>
    );
  };

  const renderConfig = () => {
    const config = configData?.[0] || { tutorias: { senior: 0, estandar: 0, junior: 0 }, joven: { monto: 0 }, tecno: { monto: 0 } };
    
    if(configLoading) return <div className="p-8 text-center text-gray-400">Cargando...</div>;

    return(
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Configuración de Montos</h2>
            <form onSubmit={handleUpdateConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader><CardTitle>Tutorías (Por Categoría)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div><label className="block text-sm mb-1">Senior</label><Input name="senior" type="number" defaultValue={config.tutorias.senior} /></div>
                        <div><label className="block text-sm mb-1">Estándar</label><Input name="estandar" type="number" defaultValue={config.tutorias.estandar} /></div>
                        <div><label className="block text-sm mb-1">Junior</label><Input name="junior" type="number" defaultValue={config.tutorias.junior} /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Otros Programas (Fijo)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div><label className="block text-sm mb-1">Empleo Joven</label><Input name="joven" type="number" defaultValue={config.joven.monto} /></div>
                        <div><label className="block text-sm mb-1">Tecnoempleo</label><Input name="tecno" type="number" defaultValue={config.tecno.monto} /></div>
                    </CardContent>
                </Card>
                <div className="md:col-span-2"><Button type="submit" className="w-full" disabled={!isAdmin}>Guardar Todos los Cambios</Button></div>
            </form>
        </div>
    );
  }

  const ActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return isAdmin ? renderDashboard() : null;
      case 'participants': return isAdmin ? renderParticipants() : null;
      case 'attendance': return (isAdmin || isDataEntry) ? <AttendanceSection participants={participants || []} /> : null;
      case 'users': return isAdmin ? <UserManagement users={allUsers || []} currentUser={user} isLoading={usersLoading} /> : null;
      case 'config': return isAdmin ? renderConfig() : null;
      default: return null;
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader><h1 className="text-xl font-bold flex items-center gap-2 p-4"><Briefcase className="text-blue-400" />Gestión LR</h1></SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {isAdmin && <>
              <SidebarMenuItem><SidebarMenuButton onClick={() => { setActiveTab('dashboard'); setSelectedProgramDetail(null); }} isActive={activeTab === 'dashboard'}><Users size={16} />Resumen Gral.</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton onClick={() => setActiveTab('participants')} isActive={activeTab === 'participants'}><UserCheck size={16} />Participantes</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton onClick={() => setActiveTab('users')} isActive={activeTab === 'users'}><Shield size={16} />Usuarios</SidebarMenuButton></SidebarMenuItem>
            </>}
            {(isAdmin || isDataEntry) && <SidebarMenuItem><SidebarMenuButton onClick={() => setActiveTab('attendance')} isActive={activeTab === 'attendance'}><Calendar size={16} />Asistencia</SidebarMenuButton></SidebarMenuItem>}
            {isAdmin && <>
              <SidebarMenuItem><SidebarMenuButton onClick={() => setIsPaymentUploadOpen(true)}><DollarSign size={16} />Carga Pagos</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton onClick={() => setActiveTab('config')} isActive={activeTab === 'config'}><Settings size={16} />Configuración</SidebarMenuButton></SidebarMenuItem>
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
                <h1 className="text-3xl font-bold text-gray-800">Bienvenido, {userProfile.name}</h1>
                {activeTab === 'dashboard' && <p className="text-gray-500">Resumen de la actividad reciente del sistema.</p>}
            </div>
          <ActiveTabContent />
        </main>
      </SidebarInset>

      <Dialog open={selectedParticipant === 'new'} onOpenChange={(isOpen) => !isOpen && setSelectedParticipant(null)}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Nuevo Participante</DialogTitle><DialogDescription>Complete el formulario para agregar un nuevo participante.</DialogDescription></DialogHeader>
          <NewParticipantForm onFormSubmit={handleAddParticipant} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!(selectedParticipant && selectedParticipant !== 'new')} onOpenChange={(isOpen) => !isOpen && setSelectedParticipant(null)}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Legajo Personal</DialogTitle><DialogDescription>Información del participante, pagos y novedades.</DialogDescription></DialogHeader>
          {selectedParticipant && selectedParticipant !== 'new' && <ParticipantDetail participant={selectedParticipant} />}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPaymentUploadOpen} onOpenChange={setIsPaymentUploadOpen}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Carga Masiva de Pagos</DialogTitle><DialogDescription>Siga los pasos para cargar un archivo CSV de pagos.</DialogDescription></DialogHeader>
          <PaymentUploadWizard participants={participants || []} onClose={() => setIsPaymentUploadOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isParticipantUploadOpen} onOpenChange={setIsParticipantUploadOpen}>
        <DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Carga Masiva de Participantes</DialogTitle><DialogDescription>Pegue el contenido de su archivo CSV para registrar nuevos participantes.</DialogDescription></DialogHeader>
          <ParticipantUploadWizard allParticipants={participants || []} onClose={() => setIsParticipantUploadOpen(false)} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
