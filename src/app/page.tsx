'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirebase, useUser, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp, query, onSnapshot, setDoc, where, getCountFromServer, orderBy, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, AlertTriangle, Search, Calendar, Briefcase, Settings, UserCheck, PlusCircle, Shield, LogOut, Loader2, Upload, History, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';

import type { Participant, UserRole } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { DEPARTAMENTOS, PROGRAMAS, CATEGORIAS_TUTORIAS, ROLES } from '@/lib/constants';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';

// Componentes de la App
import ParticipantDetail from '@/components/app/ParticipantDetail';
import ProgramAnalytics from '@/components/app/ProgramAnalytics';
import AttendanceSection from '@/components/app/AttendanceSection';
import PaymentUploadWizard from '@/components/app/PaymentUploadWizard';
import ParticipantUploadWizard from '@/components/app/ParticipantUploadWizard';
import PaymentHistory from '@/components/app/PaymentHistory';
import { DashboardCard } from '@/components/app/DashboardCard';
import UserManagement from '@/components/app/UserManagement';
import ConfiguracionForm from '@/components/app/ConfiguracionForm';
import ConfiguracionHistorial from '@/components/app/ConfiguracionHistorial';
import DataFixComponent from '@/components/app/DataFixComponent';

type ParticipantFilter = 'requiresAttention' | 'paymentAlert' | 'ageAlert' | null;

const NewParticipantForm = ({ onFormSubmit } : { onFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) => {
    const [selectedProgram, setSelectedProgram] = useState(PROGRAMAS.TUTORIAS);
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

// --- COMPONENTE AISLADO PARA LA PESTAÑA DE PARTICIPANTES ---
const ParticipantsTab = ({ participants, isLoading, onSelect, onOpenParticipantWizard, initialSearchTerm, onSearchHandled, activeFilter, onClearFilter } : {
    participants: Participant[],
    isLoading: boolean,
    onSelect: (p: Participant | 'new') => void,
    onOpenParticipantWizard: () => void,
    initialSearchTerm?: string,
    onSearchHandled?: () => void,
    activeFilter: ParticipantFilter,
    onClearFilter: () => void,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
      if (initialSearchTerm) {
        setInputValue(initialSearchTerm);
        if (onSearchHandled) onSearchHandled();
      }
    }, [initialSearchTerm, onSearchHandled]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchTerm(inputValue);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [inputValue]);

    const paginatedParticipants = useMemo(() => {
        if (!participants) return { paginated: [], totalPages: 0 };

        let filtered = participants.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || String(p.dni).includes(searchTerm));

        if (activeFilter === 'requiresAttention') {
            filtered = filtered.filter(p => p.estado === 'Requiere Atención');
        } else if (activeFilter === 'paymentAlert') {
            filtered = filtered.filter(p => {
                const status = getAlertStatus(p);
                return p.activo && (p.programa === PROGRAMAS.JOVEN || p.programa === PROGRAMAS.TECNO) && (p.pagosAcumulados === 5 || p.pagosAcumulados === 6 || p.pagosAcumulados === 11 || p.pagosAcumulados === 12) 
            });
        } else if (activeFilter === 'ageAlert') {
             filtered = filtered.filter(p => {
                const status = getAlertStatus(p);
                return p.activo && p.programa === PROGRAMAS.JOVEN && status.msg.includes('Límite de Edad');
            });
        }

        filtered.sort((a, b) => a.nombre.localeCompare(b.nombre));

        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        
        return { paginated, totalPages, filteredCount: filtered.length };
    }, [participants, searchTerm, currentPage, activeFilter]);

    const { paginated, totalPages, filteredCount } = paginatedParticipants;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Padrón de Participantes</h2>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            type="text" 
                            placeholder="Buscar DNI/Nombre..." 
                            className="pl-10" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                        />
                    </div>
                    <Button onClick={onOpenParticipantWizard} variant="outline"><Upload className="mr-2 h-4 w-4" /> Carga Masiva</Button>
                    <Button onClick={() => onSelect('new')}><PlusCircle className="mr-2 h-4 w-4" /> Nuevo</Button>
                </div>
            </div>

            {activeFilter && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md flex justify-between items-center">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-3" />
                        <div>
                            <p className="font-bold">Filtro Activo</p>
                            <p>Mostrando {filteredCount} participantes que requieren atención.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClearFilter} className="text-yellow-800 hover:bg-yellow-200"><XCircle className="mr-2 h-4 w-4"/> Limpiar</Button>
                </div>
            )}

            <Card>
                {isLoading ? <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin h-5 w-5"/> Cargando participantes...</div> : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead><TableHead>DNI</TableHead><TableHead>Programa</TableHead>
                                <TableHead>Estado</TableHead><TableHead>Mes Ausencia</TableHead><TableHead>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginated.map(p => {
                                const alert = getAlertStatus(p);
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-medium">{p.nombre}</TableCell><TableCell>{p.dni}</TableCell>
                                        <TableCell>
                                            <span className="block text-sm">{p.programa}</span>
                                            {p.esEquipoTecnico ? (
                                                <Badge variant="indigo">Equipo Técnico</Badge>
                                            ) : p.programa === PROGRAMAS.TUTORIAS ? (
                                                <span className="text-xs text-gray-400">{p.categoria}</span>
                                            ) : null}
                                        </TableCell>
                                        <TableCell><Badge variant={alert.type as any}>{alert.msg}</Badge></TableCell>
                                        <TableCell className="text-sm">{p.estado === 'Requiere Atención' ? p.mesAusencia || 'N/A' : '-'}</TableCell>
                                        <TableCell><Button variant="link" size="sm" onClick={() => onSelect(p)}>Ver Legajo</Button></TableCell>
                                    </TableRow>
                                )
                            })}
                            {paginated.length === 0 && <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron resultados.</TableCell></TableRow>}
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


export default function App() {
  const { auth } = useFirebase();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProgramDetail, setSelectedProgramDetail] = useState<string | null>(null);
  const [initialSearch, setInitialSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ParticipantFilter>(null);
  const [showDataFix, setShowDataFix] = useState(true); // Controla la visibilidad del componente de reparación
  
  const currentYear = new Date().getFullYear().toString();

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

  const participantsRef = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'participants')) : null, [firestore, user]);
  const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsRef);
  
  const usersRef = useMemoFirebase(() => (firestore && user && userProfile?.role === ROLES.ADMIN) ? query(collection(firestore, 'users')) : null, [firestore, user, userProfile]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<UserRole>(usersRef);

  const [stats, setStats] = useState({ totalPayments: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!firestore || userProfile?.role !== ROLES.ADMIN) {
        setStatsLoading(false);
        return;
    };
    
    const statsDocRef = doc(firestore, 'stats', 'global');
    const unsubscribe = onSnapshot(statsDocRef, (doc) => {
        if (doc.exists()) {
            setStats(doc.data() as any);
        } else {
            setStats({ totalPayments: 0 });
        }
        setStatsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, userProfile]);


  const isAdmin = userProfile?.role === ROLES.ADMIN;
  const isDataEntry = userProfile?.role === ROLES.DATA_ENTRY;
  
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | 'new' | null>(null);
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
      estado: 'Ingresado', // Nuevo estado por defecto
      ownerId: user.uid
    });
    toast({ title: "Participante Agregado", description: "El nuevo participante ha sido registrado." });
    setSelectedParticipant(null);
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
    
    const attentionRequiredCount = (participants || []).filter(p => p.estado === 'Requiere Atención').length;

    const paymentAlertCount = (participants || []).filter(p => p.activo && (p.programa === PROGRAMAS.JOVEN || p.programa === PROGRAMAS.TECNO) && (p.pagosAcumulados === 5 || p.pagosAcumulados === 6 || p.pagosAcumulados === 11 || p.pagosAcumulados === 12)).length;
    
    const ageAlertCount = (participants || []).filter(p => p.activo && p.programa === PROGRAMAS.JOVEN && getAlertStatus(p).msg.includes('Límite de Edad')).length;

    const activeParticipants = (participants || []).filter(p => p.estado === 'Activo' || p.estado === 'Requiere Atención').length;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <DashboardCard title="Total Activos" value={activeParticipants} icon={Users} color="blue" subtitle="Padrón liquidado" isLoading={participantsLoading} />
            <DashboardCard title="Requiere Atención" value={attentionRequiredCount} icon={AlertTriangle} color="red" subtitle="Participantes con alertas" isLoading={participantsLoading} onClick={() => handleSetFilter('requiresAttention')} actionText="Ver Lista" />
            <DashboardCard title="Alerta de Pagos" value={paymentAlertCount} icon={DollarSign} color="yellow" subtitle="Próximos a vencer/vencidos" isLoading={participantsLoading} onClick={() => handleSetFilter('paymentAlert')} actionText="Ver Lista" />
            <DashboardCard title="Alerta de Edad" value={ageAlertCount} icon={UserCheck} color="orange" subtitle="Límite de edad alcanzado" isLoading={participantsLoading} onClick={() => handleSetFilter('ageAlert')} actionText="Ver Lista" />
        </div>
        <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-700 mb-6">Detalle por Programas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(PROGRAMAS).map(prog => {
                    const count = (participants || []).filter(p => p.programa === prog && (p.estado === 'Activo' || p.estado === 'Requiere Atención')).length;
                    return <DashboardCard key={prog} title={prog} value={count} icon={Briefcase} subtitle="Participantes activos" onClick={() => setSelectedProgramDetail(prog)} actionText="Ver Análisis Mensual" color="indigo" isLoading={participantsLoading}/>;
                })}
            </div>
        </div>
      </div>
    );
  };
  
  const renderConfig = () => {
    return (
        <div className="space-y-8">
            {showDataFix && <DataFixComponent onFixComplete={() => setShowDataFix(false)} />}

            <Card>
                <CardHeader>
                    <CardTitle>Registrar Nueva Configuración de Montos</CardTitle>
                    <CardDescription>
                        Guardar una nueva configuración creará un registro histórico y pasará a ser la configuración activa.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ConfiguracionForm onConfigSave={handleConfigSave} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History/> Historial de Configuraciones</CardTitle>
                </CardHeader>
                <CardContent>
                    <ConfiguracionHistorial key={forceUpdateKey} />
                </CardContent>
            </Card>
            
            <PaymentHistory />
        </div>
    );
  }

  const ActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return isAdmin ? renderDashboard() : null;
      case 'participants': return isAdmin ? <ParticipantsTab participants={participants || []} isLoading={participantsLoading} onSelect={setSelectedParticipant} onOpenParticipantWizard={() => setIsParticipantUploadOpen(true)} initialSearchTerm={initialSearch} onSearchHandled={() => setInitialSearch('')} activeFilter={activeFilter} onClearFilter={handleClearFilter} /> : null;
      case 'attendance': return (isAdmin || isDataEntry) ? <AttendanceSection participants={participants || []} /> : null;
      case 'users': return isAdmin ? <UserManagement users={allUsers || []} currentUser={user} isLoading={usersLoading} /> : null;
      case 'config': return isAdmin ? renderConfig() : null;
      default: return null;
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedProgramDetail(null);
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
