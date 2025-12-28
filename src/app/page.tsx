'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useCollection, useFirebase } from '@/firebase';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';

// --- Componentes ---
import SessionManager from '@/components/app/SessionManager';
import {
    Sidebar, 
    SidebarProvider, 
    SidebarHeader, 
    SidebarContent, 
    SidebarMenu, 
    SidebarMenuItem, 
    SidebarMenuButton, 
    SidebarFooter
} from '@/components/ui/sidebar';
import ParticipantsTab from '@/components/app/ParticipantsTab';
import ParticipantDetail from '@/components/app/ParticipantDetail';
import Dashboard from '@/components/app/Dashboard';
import ParticipantUploadWizard from '@/components/app/ParticipantUploadWizard';
import UserManagement from '@/components/app/UserManagement';
import Configuracion from '@/components/app/Configuracion';
import EditParticipantForm from '@/components/app/EditParticipantForm';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, LayoutDashboard, Users, Cog, LogOut, FileUp, FileClock, Clipboard } from 'lucide-react';
import type { Participant, ParticipantFilter, UserRole } from '@/lib/types';
import AttendanceSection from '@/components/app/AttendanceSection';
import PaymentUploadWizard from '@/components/app/PaymentUploadWizard';

export default function Home() {
    const { user, isUserLoading, signOut } = useUser();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const { data: participants, isLoading: participantsLoading } = useCollection<Participant>(user ? 'participants' : null);
    const { data: userRoles, isLoading: usersLoading } = useCollection<UserRole>(user ? 'users' : null);

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

    const handleBackToPadrón = () => setSelectedParticipant(null);
    const handleSelectParticipant = (participant: Participant | 'new' | null) => setSelectedParticipant(participant);
    const handleOpenParticipantWizard = () => setParticipantWizardOpen(true);
    const handleCloseParticipantWizard = () => setParticipantWizardOpen(false);
    const handleSetFilter = (filter: ParticipantFilter, searchTerm?: string) => {
        setActiveFilter(filter);
        setActiveTab('participants');
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

    if (isUserLoading || (user && usersLoading)) { // Added usersLoading check
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-100">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="ml-4 text-gray-700">Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-100">
                <div className="text-center">
                    <p className="text-lg text-gray-700 mb-4">Por favor, inicia sesión para continuar.</p>
                    <Link href="/login" passHref>
                        <Button>Iniciar Sesión</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const renderMainContent = () => {
        if (selectedParticipant === 'new') {
            const newParticipantTemplate: Participant = { id: '', nombre: '', dni: '', legajo: '', fechaNacimiento: '', fechaIngreso: new Date().toISOString().split('T')[0], actoAdministrativo: '', domicilio: '', departamento: '', programa: '', estado: 'Ingresado', categoria: '', lugarTrabajo: '', email: '', telefono: '', esEquipoTecnico: false, activo: true, ultimoPago: '', pagosAcumulados: 0, mesAusencia: '', renovaciones: [], pagosPorPrograma: {}, historialProgramas: {} };
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

        const handleUserChange = () => {};

        switch (activeTab) {
            case 'resumen': return <Dashboard participants={participants || []} participantsLoading={participantsLoading} onSetFilter={handleSetFilter} onSelectParticipant={handleSelectParticipant} />;
            case 'participantes': return <ParticipantsTab participants={participants || []} isLoading={participantsLoading} onSelect={handleSelectParticipant} onOpenParticipantWizard={handleOpenParticipantWizard} initialSearchTerm={initialSearchTerm} onSearchHandled={() => setInitialSearchTerm(undefined)} activeFilter={activeFilter} onClearFilter={() => setActiveFilter(null)} onBackToDashboard={() => setActiveTab('dashboard')} />;
            case 'usuarios': return <UserManagement users={userRoles || []} currentUser={user} isLoading={usersLoading} onUsersChange={handleUserChange} />; 
            case 'asistencia': return <AttendanceSection participants={participants || []} />;
            case 'carga-pagos': return <PaymentUploadWizard participants={participants || []} onClose={() => setActiveTab('resumen')} />;
            case 'importar-historial': return <ParticipantUploadWizard allParticipants={participants || []} onClose={() => setActiveTab('resumen')} />;
            case 'configuracion': return <Configuracion />;
            default: return <div>Pestaña no encontrada</div>;
        }
    };

    return (
        <SessionManager>
            <SidebarProvider>
                <div className="flex min-h-screen bg-gray-50">
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
                                    <SidebarMenuItem>
                                        <SidebarMenuButton onClick={() => setActiveTab('usuarios')} isActive={activeTab === 'usuarios'}>
                                            <Users className="mr-2 h-4 w-4" />
                                            Usuarios
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
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
                    <main className="flex-1 p-8">{renderMainContent()}</main>
                    <Toaster />
                    {isParticipantWizardOpen && <ParticipantUploadWizard allParticipants={participants || []} onClose={handleCloseParticipantWizard} />}
                </div>
            </SidebarProvider>
        </SessionManager>
    );
}
