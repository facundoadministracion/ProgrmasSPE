'use client';

import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';
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
import { Loader2, Edit, Wrench, Trash2, PlusCircle } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface UserManagementProps {
  users: UserRole[];
  currentUser: User | null;
  isLoading: boolean;
}

const UserManagement = ({ users, currentUser, isLoading }: UserManagementProps) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreatingUser, setCreatingUser] = useState(false);
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
    setCreatingUser(true);
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
      setCreateDialogOpen(false);
      setNewUserData({ name: '', email: '', password: '', role: ROLES.DATA_ENTRY });
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({ variant: "destructive", title: "Error al Crear Usuario", description: error.message });
    } finally {
      setCreatingUser(false);
    }
  }

  const handleUpdateUser = async () => {
    if (!firestore || !editingUser) return;
    try {
      const userDocRef = doc(firestore, 'users', editingUser.uid);
      await updateDoc(userDocRef, { name: updatedData.name, role: updatedData.role });
      toast({ title: "Usuario Actualizado", description: `Se han guardado los cambios para ${updatedData.name}.` });
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el usuario." });
    }
  };
  
  const handleDeleteUser = async () => {
    if (!firestore || !userToDelete) return;
    try {
      const userDocRef = doc(firestore, 'users', userToDelete.uid);
      await deleteDoc(userDocRef);
      toast({ title: "Usuario Eliminado", description: `Se ha eliminado al usuario ${userToDelete.name}.` });
      setUserToDelete(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar al usuario." });
    }
  };

  const handleFixPagosAcumulados = async () => {
    if (!firestore) return;
    toast({ title: 'Iniciando corrección...' });
    try {
      const participantsCollection = collection(firestore, 'participants');
      const paymentRecordsCollection = collection(firestore, 'paymentRecords');
      const participantsSnapshot = await getDocs(participantsCollection);
      const paymentRecordsSnapshot = await getDocs(paymentRecordsCollection);
      const paymentCounts: { [key: string]: number } = {};
      paymentRecordsSnapshot.docs.forEach(recordDoc => {
        const record = recordDoc.data();
        if (record.participantes && Array.isArray(record.participantes)) {
          record.participantes.forEach((p: { id: string; }) => {
            if (p.id) { paymentCounts[p.id] = (paymentCounts[p.id] || 0) + 1; }
          });
        }
      });
      const batch = writeBatch(firestore);
      let updatedCount = 0;
      participantsSnapshot.docs.forEach(participantDoc => {
        const participantId = participantDoc.id;
        const participantData = participantDoc.data();
        const correctPaymentCount = paymentCounts[participantId] || 0;
        if (participantData.pagosAcumulados !== correctPaymentCount) {
          const participantRef = participantDoc.ref;
          batch.update(participantRef, { pagosAcumulados: correctPaymentCount });
          updatedCount++;
        }
      });
      if (updatedCount > 0) {
          await batch.commit();
          toast({ title: '¡Corrección completada!', description: `Se actualizaron ${updatedCount} participante(s).` });
      } else {
          toast({ title: 'No se necesitaron cambios' });
      }
    } catch (error) {
      console.error('Error al corregir los pagos acumulados:', error);
      toast({ variant: "destructive", title: 'Error en la corrección' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios del Sistema</h2>
        {currentUserRole === ROLES.ADMIN && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleFixPagosAcumulados}>
              <Wrench className="mr-2 h-4 w-4" /> Corregir Pagos
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4"/> Nuevo Usuario
            </Button>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader><CardTitle>Lista de Usuarios</CardTitle></CardHeader>
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
          <DialogHeader><DialogTitle>Editar Usuario</DialogTitle><DialogDescription>Modifique los datos para: {editingUser?.email}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label htmlFor="name">Nombre y Apellido</label><Input id="name" value={updatedData.name} onChange={(e) => setUpdatedData({ ...updatedData, name: e.target.value })}/></div>
            <div className="space-y-2"><label htmlFor="role">Rol del Sistema</label><Select value={updatedData.role} onValueChange={(newRole: UserRole['role']) => setUpdatedData({ ...updatedData, role: newRole })}><SelectTrigger id="role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ROLES.ADMIN}>Admin</SelectItem><SelectItem value={ROLES.DATA_ENTRY}>Data Entry</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button><Button onClick={handleUpdateUser}>Guardar Cambios</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Crear Nuevo Usuario</DialogTitle><DialogDescription>Complete el formulario para registrar un nuevo usuario.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label>Nombre y Apellido</label><Input placeholder="Juan Pérez" value={newUserData.name} onChange={(e) => setNewUserData({...newUserData, name: e.target.value})} /></div>
            <div className="space-y-2"><label>Email</label><Input type="email" placeholder="juan.perez@example.com" value={newUserData.email} onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} /></div>
            <div className="space-y-2"><label>Contraseña</label><Input type="password" placeholder="Mínimo 6 caracteres" value={newUserData.password} onChange={(e) => setNewUserData({...newUserData, password: e.target.value})} /></div>
            <div className="space-y-2"><label>Rol</label><Select value={newUserData.role} onValueChange={(role: UserRole['role']) => setNewUserData({...newUserData, role})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ROLES.ADMIN}>Admin</SelectItem><SelectItem value={ROLES.DATA_ENTRY}>Data Entry</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el rol para <span className="font-bold">{userToDelete?.name}</span>, perdiendo sus permisos.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteUser}>Confirmar y Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;