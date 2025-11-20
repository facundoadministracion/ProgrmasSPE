'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  useFirebase,
  useCollection,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, addDoc, updateDoc, serverTimestamp, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

import { DEPARTAMENTOS, PROGRAMAS, CATEGORIAS_TUTORIAS } from '@/lib/constants';
import type { Participant, Payment, Novedad, AppConfig } from '@/lib/types';
import { getAlertStatus } from '@/lib/logic';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import ParticipantDetail from '@/components/app/ParticipantDetail';
import ProgramAnalytics from '@/components/app/ProgramAnalytics';
import AttendanceSection from '@/components/app/AttendanceSection';
import PaymentUploadWizard from '@/components/app/PaymentUploadWizard';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';

const DashboardCard = ({ title, value, icon: Icon, subtitle, onClick, actionText, color = 'blue' }: { title: string, value: string | number, icon: React.ElementType, subtitle: string, onClick?: () => void, actionText?: string, color?: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-muted-foreground text-${color}-500`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
       {onClick && (
            <CardFooter>
                 <Button onClick={onClick} variant="outline" className="w-full">{actionText || "Ver Detalles"}</Button>
            </CardFooter>
       )}
    </Card>
);

export default function App() {
  const { auth, firestore, isUserLoading } = useFirebase();
  const { user } = useUser();
  const [role, setRole] = useState('admin');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [selectedProgramDetail, setSelectedProgramDetail] = useState<string | null>(null); 

  const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';

  const participantsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'artifacts', appId, 'public', 'data', 'participants')) : null, [firestore, appId]);
  const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsRef);
  
  const paymentsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'artifacts', appId, 'public', 'data', 'payments')) : null, [firestore, appId]);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsRef);
  
  const novedadesRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'artifacts', appId, 'public', 'data', 'novedades')) : null, [firestore, appId]);
  const { data: allNovedades, isLoading: novedadesLoading } = useCollection<Novedad>(novedadesRef);
  
  const configRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'artifacts', appId, 'public', 'data', 'config')) : null, [firestore, appId]);
  const { data: configData, isLoading: configLoading } = useCollection<AppConfig>(configRef);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | 'new' | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleAddParticipant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore || !user) return;
    const formData = new FormData(e.currentTarget);
    const esEquipoTecnico = formData.get('esEquipoTecnico') === 'on';
    const data = Object.fromEntries(formData.entries());
    
    await addDoc(collection(firestore, 'artifacts', appId, 'public', 'data', 'participants'), {
      ...data, 
      esEquipoTecnico,
      pagosAcumulados: 0, 
      fechaAlta: new Date().toISOString(), 
      activo: true,
      ownerId: user.uid
    });
    alert("Participante agregado");
    setSelectedParticipant(null);
  };

  const handleUpdateConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(!firestore || !configData?.[0]?.id) {
        // if no config, create one
        if(firestore) {
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
            await addDoc(collection(firestore, 'artifacts', appId, 'public', 'data', 'config'), { ...data, timestamp: serverTimestamp() });
            alert("Configuración creada");
        }
        return;
    }
    const formData = new FormData(e.currentTarget);
    const data = {
      tutorias: {
        senior: parseFloat(formData.get('senior') as string),
        estandar: parseFloat(formData.get('estandar') as string),
        junior: parseFloat(formData.get('junior') as string),
      },
      joven: { monto: parseFloat(formData.get('joven') as string) },
      tecno: { monto: parseFloat(formData.get('tecno') as string) }
    };
    const configDocRef = doc(firestore, 'artifacts', appId, 'public', 'data', 'config', configData[0].id);
    await updateDoc(configDocRef, { ...data, timestamp: serverTimestamp() });
    alert("Montos actualizados");
  };
  
  const loading = participantsLoading || paymentsLoading || configLoading || novedadesLoading || isUserLoading;

  const renderDashboard = () => {
    if (selectedProgramDetail) {
        return <ProgramAnalytics programName={selectedProgramDetail} participants={participants || []} allNovedades={allNovedades || []} onBack={() => setSelectedProgramDetail(null)} />;
    }
    const alerts = (participants || []).filter(p => { const s = getAlertStatus(p); return s && (s.type === 'red' || s.type === 'yellow'); }).length;
    return (
      <div className="space-y-8">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Resumen General</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard title="Total Activos" value={participants?.length ?? 0} icon={Users} color="blue" subtitle="Padrón total consolidado" />
                <DashboardCard title="Alertas Admin." value={alerts} icon={AlertTriangle} color="red" subtitle="Requieren atención urgente" />
                <DashboardCard title="Pagos Registrados" value={payments?.length ?? 0} icon={DollarSign} color="green" subtitle="Histórico total de transacciones" />
            </div>
        </div>
        <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-700 mb-6">Detalle por Programas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(PROGRAMAS).map(prog => {
                    const count = (participants || []).filter(p => p.programa === prog).length;
                    return <DashboardCard key={prog} title={prog} value={count} icon={Briefcase} subtitle="Participantes activos" onClick={() => setSelectedProgramDetail(prog)} actionText="Ver Análisis Mensual" color="indigo"/>;
                })}
            </div>
        </div>
      </div>
    );
  };

  const renderParticipants = () => {
    const filtered = (participants || []).filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.dni.includes(searchTerm));
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Padrón de Participantes</h2>
          <div className="flex gap-2">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><Input type="text" placeholder="Buscar DNI/Nombre..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            {role === 'admin' && <Button onClick={() => setSelectedParticipant('new')}><PlusCircle size={16}/> Nuevo</Button>}
          </div>
        </div>
        <Card>
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Programa</TableHead>
                    <TableHead>Depto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map(p => {
                        const alert = getAlertStatus(p);
                        return (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.nombre}</TableCell><TableCell>{p.dni}</TableCell>
                                <TableCell><span className="block text-sm">{p.programa}</span>{p.esEquipoTecnico && <Badge variant="indigo">Equipo Técnico</Badge>}{!p.esEquipoTecnico && <span className="text-xs text-gray-400">{p.categoria}</span>}</TableCell>
                                <TableCell>{p.departamento}</TableCell>
                                <TableCell>{alert ? <Badge variant={alert.type as any}>{alert.msg}</Badge> : <Badge variant="green">Activo</Badge>}</TableCell>
                                <TableCell><Button variant="link" onClick={() => setSelectedParticipant(p)}>Ver Legajo</Button></TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Card>
      </div>
    );
  };

  const renderConfig = () => {
    const config = configData?.[0] || { tutorias: {}, joven: {}, tecno: {} };
    return(
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Configuración de Montos</h2>
            <form onSubmit={handleUpdateConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader><CardTitle>Tutorías (Por Categoría)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div><label className="block text-sm mb-1">Senior</label><Input name="senior" type="number" defaultValue={config?.tutorias?.senior} /></div>
                        <div><label className="block text-sm mb-1">Estándar</label><Input name="estandar" type="number" defaultValue={config?.tutorias?.estandar} /></div>
                        <div><label className="block text-sm mb-1">Junior</label><Input name="junior" type="number" defaultValue={config?.tutorias?.junior} /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Otros Programas (Fijo)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div><label className="block text-sm mb-1">Empleo Joven</label><Input name="joven" type="number" defaultValue={config?.joven?.monto} /></div>
                        <div><label className="block text-sm mb-1">Tecnoempleo</label><Input name="tecno" type="number" defaultValue={config?.tecno?.monto} /></div>
                    </CardContent>
                </Card>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full">Guardar Todos los Cambios</Button>
                </div>
            </form>
        </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Cargando sistema...</div>;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <h1 className="text-xl font-bold flex items-center gap-2"><Briefcase className="text-blue-400" />Gestión LR</h1>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {role === 'admin' && (
              <>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => { setActiveTab('dashboard'); setSelectedProgramDetail(null); }} isActive={activeTab === 'dashboard'}><Users size={16} />Resumen Gral.</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveTab('participants')} isActive={activeTab === 'participants'}><UserCheck size={16} />Participantes</SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setActiveTab('attendance')} isActive={activeTab === 'attendance'}><Calendar size={16} />Asistencia</SidebarMenuButton>
            </SidebarMenuItem>
            {role === 'admin' && (
              <>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setIsUploadModalOpen(true)}><DollarSign size={16} />Carga Pagos</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => setActiveTab('config')} isActive={activeTab === 'config'}><Settings size={16} />Configuración</SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <div className="text-xs text-center text-muted-foreground">Simular Rol</div>
             <div className="flex gap-2">
                 <Button size="sm" onClick={() => { setRole('admin'); setActiveTab('dashboard'); setSelectedProgramDetail(null); }} variant={role === 'admin' ? 'default' : 'secondary'} className="flex-1">Admin</Button>
                 <Button size="sm" onClick={() => { setRole('data_entry'); setActiveTab('attendance'); }} variant={role === 'data_entry' ? 'default' : 'secondary'} className="flex-1">Data</Button>
             </div>
             {user && (
                 <Button variant="outline" size="sm" onClick={() => signOut(auth)}>Cerrar Sesión</Button>
             )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b md:hidden">
            <SidebarTrigger />
            <span className="font-bold">Gestión LR</span>
        </header>
        <main className="flex-1 p-4 md:p-8">
            {activeTab === 'dashboard' && role === 'admin' && renderDashboard()}
            {activeTab === 'participants' && role === 'admin' && renderParticipants()}
            {activeTab === 'attendance' && <AttendanceSection participants={participants || []} />}
            {activeTab === 'config' && role === 'admin' && renderConfig()}
        </main>
      </SidebarInset>

      <Dialog open={selectedParticipant === 'new'} onOpenChange={(isOpen) => !isOpen && setSelectedParticipant(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nuevo Participante</DialogTitle>
            <DialogDescription>
              Complete el formulario para agregar un nuevo participante al sistema.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddParticipant} className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-sm">Nombre</label><Input name="nombre" required /></div>
                  <div><label className="text-sm">DNI</label><Input name="dni" required /></div>
                  <div><label className="text-sm">Fecha Nacimiento</label><Input name="fechaNacimiento" type="date" required /></div>
                  <div><label className="text-sm">Acto Adm. Alta (Opcional)</label><Input name="actoAdministrativo" placeholder="Res. Nº..." /></div>
                  <div><label className="text-sm">Programa</label>
                    <Select name="programa" defaultValue={PROGRAMAS.TUTORIAS}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.values(PROGRAMAS).map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm">Fecha de Ingreso al Programa</label><Input name="fechaIngreso" type="date" required /></div>
                  <div><label className="text-sm">Depto</label>
                    <Select name="departamento" defaultValue={DEPARTAMENTOS[0]}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DEPARTAMENTOS.map(d=><SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm">Categoría (Solo Tutorías)</label>
                    <Select name="categoria">
                      <SelectTrigger><SelectValue placeholder="-"/></SelectTrigger>
                      <SelectContent><SelectItem value="">-</SelectItem>{CATEGORIAS_TUTORIAS.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm">Lugar de Trabajo / Área</label><Input name="lugarTrabajo" placeholder="Ej: Escuela N° 5" /></div>
                  <div><label className="text-sm">Email (Opcional)</label><Input name="email" type="email" placeholder="ejemplo@email.com" /></div>
                  <div><label className="text-sm">Teléfono (Opcional)</label><Input name="telefono" placeholder="3804..." /></div>
              </div>
              <div className="flex items-center gap-2 mt-2 bg-indigo-50 p-3 rounded border border-indigo-100">
                  <Checkbox id="esEquipoTecnico" name="esEquipoTecnico" />
                  <label htmlFor="esEquipoTecnico" className="text-sm font-bold text-indigo-800 select-none">Es Equipo Técnico (Staff)</label>
              </div>
              <Button type="submit" className="w-full mt-4">Guardar</Button>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!(selectedParticipant && selectedParticipant !== 'new')} onOpenChange={(isOpen) => !isOpen && setSelectedParticipant(null)}>
        <DialogContent className="max-w-4xl">
           <DialogHeader>
             <DialogTitle>Legajo Personal</DialogTitle>
             <DialogDescription>
              Visualice y gestione la información del participante, incluyendo datos generales, pagos y novedades.
            </DialogDescription>
           </DialogHeader>
          {selectedParticipant && selectedParticipant !== 'new' && <ParticipantDetail participant={selectedParticipant} payments={payments || []} />}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Carga Masiva de Pagos</DialogTitle>
             <DialogDescription>
              Siga los pasos para cargar y procesar un archivo CSV con los datos de pago.
            </DialogDescription>
          </DialogHeader>
          <PaymentUploadWizard participants={participants || []} onClose={() => setIsUploadModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
