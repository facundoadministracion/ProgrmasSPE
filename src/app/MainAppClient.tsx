'use client';

import React, { useState, useMemo, useEffect } from 'react';
import dynamicImport from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUser, useCollection, useFirebase } from '@/firebase';
import { writeBatch, doc, collection, serverTimestamp, query } from 'firebase/firestore';
import { useForceRefreshStore } from '@/store/force-refresh-store';

// --- PROVEEDOR ESTÁTICO (CORRECCIÓN DEL ERROR DE CARGA INFINITA) ---
import { SidebarProvider } from '@/components/ui/sidebar';

// --- Componentes UI & Iconos (Estáticos) ---
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, LayoutDashboard, Users, Cog, LogOut, FileUp, FileClock, Clipboard, FileBarChart } from 'lucide-react';
import type { Participant, ParticipantFilter, UserRole } from '@/lib/types';

// --- Placeholders para Carga Dinámica ---
const LoadingComponent = () => <div className="flex h-full w-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /></div>;
const FullScreenLoader = () => <div className="flex h-screen w-full items-center justify-center bg-gray-100"><Loader2 className="h-8 w-8 animate-spin text-gray-500" /><p className="ml-4 text-gray-700">Cargando...</p></div>;

// --- Componentes Visuales Cargados Dinámicamente ---
const Sidebar = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.Sidebar), { ssr: false });
const SidebarHeader = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.SidebarHeader), { ssr: false });
const SidebarContent = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.SidebarContent), { ssr: false });
const SidebarMenu = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.SidebarMenu), { ssr: false });
const SidebarMenuItem = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.SidebarMenuItem), { ssr: false });
const SidebarMenuButton = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.SidebarMenuButton), { ssr: false });
const SidebarFooter = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.SidebarFooter), { ssr: false });
const SidebarTrigger = dynamicImport(() => import('@/components/ui/sidebar').then(mod => mod.SidebarTrigger), { ssr: false });

const Dashboard = dynamicImport(() => import('@/components/app/Dashboard'), { ssr: false, loading: () => <LoadingComponent /> });
const ParticipantsTab = dynamicImport(() => import('@/components/app/ParticipantsTab'), { ssr: false, loading: () => <LoadingComponent /> });
const ParticipantDetail = dynamicImport(() => import('@/components/app/ParticipantDetail'), { ssr: false, loading: () => <LoadingComponent /> });
const UserManagement = dynamicImport(() => import('@/components/app/UserManagement'), { ssr: false, loading: () => <LoadingComponent /> });
const Reports = dynamicImport(() => import('@/components/app/Reports'), { ssr: false, loading: () => <LoadingComponent /> });
const Configuracion = dynamicImport(() => import('@/components/app/Configuracion'), { ssr: false, loading: () => <LoadingComponent /> });
const AttendanceSection = dynamicImport(() => import('@/components/app/AttendanceSection'), { ssr: false, loading: () => <LoadingComponent /> });
const PaymentUploadWizard = dynamicImport(() => import('@/components/app/PaymentUploadWizard'), { ssr: false, loading: () => <LoadingComponent /> });
const ParticipantUploadWizard = dynamicImport(() => import('@/components/app/ParticipantUploadWizard'), { ssr: false, loading: () => <LoadingComponent /> });
const ImportHistorialWizard = dynamicImport(() => import('@/app/admin/importar-historial/page'), { ssr: false, loading: () => <LoadingComponent /> });
const EditParticipantForm = dynamicImport(() => import('@/components/app/EditParticipantForm'), { ssr: false, loading: () => <LoadingComponent /> });

function AppContent() {
    const [isClient, setIsClient] = useState(false);
    const { user, isUserLoading, signOut } = useUser();
    const router = useRouter();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { refreshId } = useForceRefreshStore();
    
    const participantsQuery = useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'participants'));
    }, [user, firestore, refreshId]);

    const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(participantsQuery);
    const { data: userRoles, isLoading: usersLoading } = useCollection<UserRole>(user ? 'users' : null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const currentUserRole = useMemo(() => {
        if (!user || !userRoles) return null;
        return userRoles.find(role => role.uid === user.uid) || null;
    }, [user, userRoles]);

    const isAdmin = currentUserRole?.role === 'admin';

    const [activeTab, setActiveTab] = useState('resumen');
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | 'new' | null>(null);
    const [isParticipantWizardOpen, setParticipantWizardOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ParticipantFilter | null>(null);
    const [initialSearchTerm, setInitialSearchTerm] = useState<string | undefined>(undefined);
    const [formId] = useState('participant-form');

    useEffect(() => {
        if (isClient && !isUserLoading && !user) {
            router.push('/login');
        }
    }, [isClient, isUserLoading, user, router]);

    const handleBackToPadrón = () => setSelectedParticipant(null);
    const handleSelectParticipant = (participant: Participant | 'new' | null) => setSelectedParticipant(participant);
    const handleOpenParticipantWizard = () => setParticipantWizardOpen(true);
    const handleCloseParticipantWizard = () => setParticipantWizardOpen(false);
    const handleSetFilter = (filter: ParticipantFilter | null, searchTerm?: string) => {
        setActiveFilter(filter);
        setActiveTab('participantes');
        if (searchTerm) setInitialSearchTerm(searchTerm);
    };

    const handleCreateParticipant = async (formData: Partial<Participant>) => {
        if (!firestore || !user) return toast({ variant: "destructive", title: "Error de autenticación." });
        try {
            const batch = writeBatch(firestore);
            const newParticipantRef = doc(collection(firestore, "participants"));
            batch.set(newParticipantRef, { ...formData, fechaAlta: serverTimestamp(), ownerId: user.uid, activo: true, estado: formData.estado || 'Ingresado' });
            await batch.commit();
            toast({ title: "Participante Creado", description: `${formData.nombre} ha sido añadido.` });
            handleBackToPadrón();
        } catch (error) {
            console.error("Error creating participant:", error);
            toast({ variant: "destructive", title: "Error al crear", description: "No se pudo guardar el participante." });
        }
    };

    if (!isClient || isUserLoading || !user || (user && usersLoading)) {
        return <FullScreenLoader />;
    }

    const renderMainContent = () => {
        if (selectedParticipant === 'new') {
            const newParticipantTemplate: Participant = { id: '', nombre: '', dni: '', legajo: '', fechaNacimiento: '', fechaIngreso: new Date().toISOString().split('T')[0], actoAdministrativo: '', domicilio: '', departamento: '', programa: '', estado: 'Ingresado', categoria: '', lugarTrabajo: '', email: '', telefono: '', esEquipoTecnico: false, activo: true, ultimoPago: '', pagosAcumulados: 0, mesAusencia: '', renovaciones: [], pagosPorPrograma: {}, historialProgramas: {}, ownerId: '', fechaAlta: '' };
            return (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Nuevo Participante</CardTitle>
                            <Button variant="ghost" onClick={handleBackToPadrón}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
                        </div>
                        <CardDescription>Complete el formulario para dar de alta a un nuevo participante.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <EditParticipantForm participant={newParticipantTemplate} onSave={handleCreateParticipant} formId={formId} requiresRenovation={false} />
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleBackToPadrón}>Cancelar</Button>
                        <Button type="submit" form={formId}>Crear Participante</Button>
                    </CardFooter>
                </Card>
            );
        }

        if (selectedParticipant) {
            const participantData = participants?.find(p => p && p.id === selectedParticipant.id);
            if (!participantData) return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
            return <ParticipantDetail participant={participantData} onBack={handleBackToPadrón} />;
        }

        switch (activeTab) {
            case 'resumen': return <Dashboard participants={participants || []} participantsLoading={participantsLoading} onSetFilter={handleSetFilter} onSelectParticipant={handleSelectParticipant} />;
            case 'participantes': return <ParticipantsTab participants={participants || []} isLoading={participantsLoading} onSelect={handleSelectParticipant} onOpenParticipantWizard={handleOpenParticipantWizard} initialSearchTerm={initialSearchTerm} onSearchHandled={() => setInitialSearchTerm(undefined)} activeFilter={activeFilter} onClearFilter={() => setActiveFilter(null)} onBackToDashboard={() => setActiveTab('dashboard')} />;
            case 'usuarios': return <UserManagement users={userRoles || []} currentUser={user} isLoading={usersLoading} onUsersChange={() => {}} />; 
            case 'informes': return <Reports participants={participants || []} participantsLoading={participantsLoading} onSelectParticipant={handleSelectParticipant} />;
            case 'asistencia': return <AttendanceSection participants={participants || []} />;
            case 'carga-pagos': return <PaymentUploadWizard participants={participants || []} onClose={() => setActiveTab('resumen')} onFindDni={() => {}}/>;
            case 'importar-historial': return <ImportHistorialWizard />;
            case 'configuracion': return <Configuracion />;
            default: return <div>Pestaña no encontrada</div>;
        }
    };

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-gray-50">
                <Sidebar>
                    <SidebarHeader>
                       <div className="p-4 text-center">
                            <h2 className="text-xl font-bold">Hola, {currentUserRole?.name || 'Usuario'}</h2>
                       </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => setActiveTab('resumen')} isActive={activeTab === 'resumen'}>
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Resumen Gral.
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => setActiveTab('participantes')} isActive={activeTab === 'participantes'}>
                                    <Users className="mr-2 h-4 w-4" />
                                    Participantes
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {isAdmin && (
                                <>
                                <SidebarMenuItem>
                                    <SidebarMenuButton onClick={() => setActiveTab('usuarios')} isActive={activeTab === 'usuarios'}>
                                        <Users className="mr-2 h-4 w-4" />
                                        Usuarios
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                     <SidebarMenuButton onClick={() => setActiveTab('informes')} isActive={activeTab === 'informes'}>
                                        <FileBarChart className="mr-2 h-4 w-4" />
                                        Informes
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                </>      
                            )}
                            <SidebarMenuItem>
                                 <SidebarMenuButton onClick={() => setActiveTab('asistencia')} isActive={activeTab === 'asistencia'}>
                                    <Clipboard className="mr-2 h-4 w-4" />
                                    Asistencia
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                 <SidebarMenuButton onClick={() => setActiveTab('carga-pagos')} isActive={activeTab === 'carga-pagos'}>
                                    <FileUp className="mr-2 h-4 w-4" />
                                    Carga Pagos
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                 <SidebarMenuButton onClick={() => setActiveTab('importar-historial')} isActive={activeTab === 'importar-historial'}>
                                    <FileClock className="mr-2 h-4 w-4" />
                                    Importar Historial
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => setActiveTab('configuracion')} isActive={activeTab === 'configuracion'}>
                                    <Cog className="mr-2 h-4 w-4" />
                                    Configuración
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarContent>
                    <SidebarFooter>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <div className="p-4 text-sm text-gray-500">
                                    <p>{user.email}</p>
                                </div>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton onClick={() => signOut()}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Cerrar Sesión
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>
                </Sidebar>
                <main className="flex-1 p-8">
                    <div className="md:hidden mb-4">
                        <SidebarTrigger />
                    </div>
                    {renderMainContent()}
                </main>
                <Toaster />
                <Dialog open={isParticipantWizardOpen} onOpenChange={setParticipantWizardOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Asistente para Carga Masiva de Participantes</DialogTitle>
                            <DialogDescription>
                                Sigue los pasos para importar, analizar y confirmar la carga de nuevos participantes desde un archivo CSV.
                            </DialogDescription>
                        </DialogHeader>
                        <ParticipantUploadWizard allParticipants={participants || []} onClose={handleCloseParticipantWizard} />
                    </DialogContent>
                </Dialog>
            </div>
        </SidebarProvider>
    );
}

export default AppContent;