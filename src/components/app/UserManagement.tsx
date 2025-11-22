'use client';

import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
import { PlusCircle, Loader2, Edit } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface UserManagementProps {
  users: UserRole[];
  currentUser: User | null;
  isLoading: boolean;
}

const UserManagement = ({ users, currentUser, isLoading }: UserManagementProps) => {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);
  const [updatedData, setUpdatedData] = useState<{ name: string; role: UserRole['role'] }>({ name: '', role: ROLES.DATA_ENTRY });

  useEffect(() => {
    if (editingUser) {
      setUpdatedData({ name: editingUser.name, role: editingUser.role });
    }
  }, [editingUser]);

  const handleUpdateUser = async () => {
    if (!firestore || !editingUser) return;
    try {
      const userDocRef = doc(firestore, 'users', editingUser.uid);
      await updateDoc(userDocRef, {
        name: updatedData.name,
        role: updatedData.role,
      });
      toast({
        title: "Usuario Actualizado",
        description: `Se han guardado los cambios para ${updatedData.name}.`
      });
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el usuario."
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios del Sistema</h2>
        <Button asChild>
          <Link href="/signup"><PlusCircle className="mr-2 h-4 w-4"/> Nuevo Usuario</Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin h-5 w-5"/>Cargando usuarios...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        disabled={currentUser?.uid === user.uid}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
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
            <DialogDescription>
              Modifique el nombre y el rol para el usuario: {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Nombre y Apellido</label>
              <Input
                id="name"
                value={updatedData.name}
                onChange={(e) => setUpdatedData({ ...updatedData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">Rol del Sistema</label>
              <Select
                value={updatedData.role}
                onValueChange={(newRole: UserRole['role']) => setUpdatedData({ ...updatedData, role: newRole })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                  <SelectItem value={ROLES.DATA_ENTRY}>Data Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleUpdateUser}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
