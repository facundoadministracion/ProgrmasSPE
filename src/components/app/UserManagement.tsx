'use client';

import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Edit, Wrench, Trash2, PlusCircle, Calendar } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface UserManagementProps {
  users: UserRole[];
  currentUser: User | null;
  isLoading: boolean;
  // Function to refresh user list after changes
  onUsersChange: () => void;
}

const UserManagement = ({ users, currentUser, isLoading, onUsersChange }: UserManagementProps) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRole | null>(null);
  
  const [newUserData, setNewUserData] = useState<{ name: string; email: string; password: string; role: 'admin' | 'data-entry' }>({ name: '', email: '', password: '', role: ROLES.DATA_ENTRY });
  const [updatedData, setUpdatedData] = useState<{ name: string; role: UserRole['role'] }>({ name: '', role: ROLES.DATA_ENTRY });

  const currentUserRole = users.find(u => u.uid === currentUser?.uid)?.role;

  useEffect(() => {
    if (editingUser) {
      setUpdatedData({ name: editingUser.name, role: editingUser.role });
    }
  }, [editingUser]);
  
  const handleCreateUser = async () => {
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      toast({ variant: "destructive", title: "Campos incompletos", description: "Por favor, complete todos los campos." });
      return;
    }
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error desconocido.');
      }

      toast({ title: "Usuario Creado", description: `El usuario ${newUserData.name} ha sido creado.` });
      onUsersChange(); // Refresh list
      setCreateDialogOpen(false);
      setNewUserData({ name: '', email: '', password: '', role: ROLES.DATA_ENTRY });
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({ variant: "destructive", title: "Error al Crear Usuario", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/update-user-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              uid: editingUser.uid, 
              role: updatedData.role,
              name: updatedData.name
            }),
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.error || 'Ocurrió un error desconocido.');
      }

      toast({ title: "Usuario Actualizado", description: `Se han guardado los cambios para ${updatedData.name}.` });
      onUsersChange(); // Refresh list
      setEditingUser(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo actualizar el usuario: ${error.message}` });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessing(true);
    try {
        const response = await fetch('/api/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userToDelete.uid }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Ocurrió un error desconocido.');
        }

      toast({ title: "Usuario Eliminado", description: `Se ha eliminado al usuario ${userToDelete.name}.` });
      onUsersChange(); // Refresh list
      setUserToDelete(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar el usuario: ${error.message}` });
    } finally {
        setIsProcessing(false);
    }
  };

  // ... (Las funciones de mantenimiento como handleCorrectDates y handleFixPagosPorPrograma permanecen igual)
  const handleCorrectDates = async () => {
    if (!firestore) return;
    toast({ title: 'Iniciando corrección de fechas...', description: 'Buscando participantes de Tecnoempleo.' });

    const convertDate = (dateStr: string) => {
        if (!dateStr || !dateStr.includes('/')) return null;
        const parts = dateStr.split('/');
        if (parts.length !== 3) return null;
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    try {
        const q = query(collection(firestore, "participants"), where("programa", "==", "Tecnoempleo"));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(firestore);
        let updatesNeeded = 0;

        querySnapshot.forEach(doc => {
            const participant = doc.data();
            const updates: { [key: string]: any } = {};

            const newFechaNacimiento = convertDate(participant.fechaNacimiento);
            if (newFechaNacimiento && newFechaNacimiento !== participant.fechaNacimiento) {
                updates.fechaNacimiento = newFechaNacimiento;
            }

            const newFechaIngreso = convertDate(participant.fechaIngreso);
            if (newFechaIngreso && newFechaIngreso !== participant.fechaIngreso) {
                updates.fechaIngreso = newFechaIngreso;
            }

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                updatesNeeded++;
            }
        });

        if (updatesNeeded > 0) {
            await batch.commit();
            toast({ title: '¡Fechas Corregidas!', description: `Se han actualizado las fechas de ${updatesNeeded} participante(s).` });
        } else {
            toast({ title: 'Diagnóstico Finalizado', description: 'No se encontraron fechas con formato incorrecto en Tecnoempleo.' });
        }

    } catch (error) {
        console.error('Error corrigiendo fechas:', error);
        toast({ variant: "destructive", title: 'Error en la Corrección', description: 'Ocurrió un error inesperado.' });
    }
  };

  const handleFixPagosPorPrograma = async () => {
    if (!firestore) return;
    toast({ title: 'Iniciando corrección de contadores por programa...', description: 'Este proceso puede tardar.' });

    try {
        // 1. Fetch all participants and map them by ID
        const participantsRef = collection(firestore, 'participants');
        const participantsSnapshot = await getDocs(participantsRef);
        const participantsMap = new Map();
        participantsSnapshot.forEach(doc => {
            participantsMap.set(doc.id, doc.data());
        });

        // 2. Fetch all payments
        const pagosRef = collection(firestore, 'pagosRegistrados');
        const pagosSnapshot = await getDocs(pagosRef);

        // 3. Calculate correct counts for each participant and program
        const correctCountsByParticipant = new Map<string, { [program: string]: number }>();
        pagosSnapshot.forEach(pagoDoc => {
            const pago = pagoDoc.data();
            if (pago.participantId && pago.programa) { // Check if participantId and program exist
                const program = pago.programa; // <-- BUG FIXED HERE
                const currentCounts = correctCountsByParticipant.get(pago.participantId) || {};
                currentCounts[program] = (currentCounts[program] || 0) + 1;
                correctCountsByParticipant.set(pago.participantId, currentCounts);
            }
        });

        // 4. Compare with stored data and batch update if necessary
        const batch = writeBatch(firestore);
        let updatesNeeded = 0;

        const areObjectsEqual = (obj1: any, obj2: any) => {
            const o1 = obj1 || {};
            const o2 = obj2 || {};
            const keys1 = Object.keys(o1);
            const keys2 = Object.keys(o2);

            if (keys1.length !== keys2.length) return false;

            for (const key of keys1) {
                if (!o2.hasOwnProperty(key) || o1[key] !== o2[key]) {
                    return false;
                }
            }
            return true;
        };

        participantsSnapshot.forEach(doc => {
            const participantId = doc.id;
            const participantData = doc.data();
            const storedCounts = participantData.pagosPorPrograma;
            const correctCounts = correctCountsByParticipant.get(participantId);

            if (!areObjectsEqual(storedCounts, correctCounts)) {
                batch.update(doc.ref, { pagosPorPrograma: correctCounts || {} });
                updatesNeeded++;
            }
        });

        // 5. Commit batch and provide feedback
        if (updatesNeeded > 0) {
            await batch.commit();
            toast({ title: '¡Corrección Completada!', description: `Se han actualizado los contadores por programa de ${updatesNeeded} participante(s).` });
        } else {
            toast({ title: 'Diagnóstico Finalizado', description: 'Todos los contadores por programa ya estaban sincronizados.' });
        }

    } catch (error) {
        console.error('Error al corregir los pagos por programa:', error);
        toast({ variant: "destructive", title: 'Error en la corrección', description: 'Ocurrió un error inesperado. Revisa la consola.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión y Mantenimiento</h2>
        {currentUserRole === ROLES.ADMIN && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCorrectDates}>
              <Calendar className="mr-2 h-4 w-4" /> Corregir Fechas (Tecnoempleo)
            </Button>
            <Button variant="outline" onClick={handleFixPagosPorPrograma}>
              <Wrench className="mr-2 h-4 w-4" /> Corregir Contadores
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4"/> Nuevo Usuario
            </Button>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader><CardTitle>Lista de Usuarios del Sistema</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin h-5 w-5"/>Cargando...</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingUser(user)} disabled={currentUser?.uid === user.uid || currentUserRole !== ROLES.ADMIN}><Edit className="mr-2 h-4 w-4" />Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => setUserToDelete(user)} disabled={currentUser?.uid === user.uid || currentUserRole !== ROLES.ADMIN}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
        <DialogContent> 
        <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifique los datos para: {editingUser?.email}</DialogDescription>
        </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label htmlFor="name">Nombre y Apellido</label><Input id="name" value={updatedData.name} onChange={(e) => setUpdatedData({ ...updatedData, name: e.target.value })}/></div>
            <div className="space-y-2"><label htmlFor="role">Rol del Sistema</label><Select value={updatedData.role} onValueChange={(newRole: UserRole['role']) => setUpdatedData({ ...updatedData, role: newRole })}><SelectTrigger id="role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ROLES.ADMIN}>Admin</SelectItem><SelectItem value={ROLES.DATA_ENTRY}>Data Entry</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleUpdateUser} disabled={isProcessing}>{isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>Complete el formulario para registrar un nuevo usuario.</DialogDescription>
            </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label>Nombre y Apellido</label><Input placeholder="Juan Pérez" value={newUserData.name} onChange={(e) => setNewUserData({...newUserData, name: e.target.value})} /></div>
            <div className="space-y-2"><label>Email</label><Input type="email" placeholder="juan.perez@example.com" value={newUserData.email} onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} /></div>
            <div className="space-y-2"><label>Contraseña</label><Input type="password" placeholder="Mínimo 6 caracteres" value={newUserData.password} onChange={(e) => setNewUserData({...newUserData, password: e.target.value})} /></div>
            <div className="space-y-2"><label>Rol</label><Select value={newUserData.role} onValueChange={(role: UserRole['role']) => setNewUserData({...newUserData, role})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ROLES.ADMIN}>Admin</SelectItem><SelectItem value={ROLES.DATA_ENTRY}>Data Entry</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer. El usuario <span className="font-bold">{userToDelete?.name}</span> será eliminado permanentemente del sistema.</AlertDialogDescription>
            </AlertDialogHeader>
          <AlertDialogFooter>
              <Button variant="ghost" onClick={() => setUserToDelete(null)} disabled={isProcessing}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteUser} disabled={isProcessing}>{isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar y Eliminar</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;