'use client';

import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { doc, addDoc, updateDoc, deleteDoc, collection, serverTimestamp } from 'firebase/firestore';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { DEPARTAMENTOS, ROLES } from '@/lib/constants';

interface UserManagementProps {
  users: UserRole[];
  currentUser: User | null;
  isLoading: boolean;
}

const UserManagement = ({ users, currentUser, isLoading }: UserManagementProps) => {
  const { firestore } = useFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRole | null>(null);

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firestore) return;

    const formData = new FormData(e.target);
    const userData: Partial<UserRole> = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        role: formData.get('role') as UserRole['role'],
        departamento: formData.get('departamento') as string,
    };
    
    try {
        if (editingUser) {
            await updateDoc(doc(firestore, 'users', editingUser.uid), userData);
        } else {
            // For new users, we would normally handle auth creation and then this.
            // This component assumes user auth object already exists.
            // This form is for editing existing or creating profiles for already-authed users.
            // We'll simulate adding, but this needs a proper flow with auth.
            console.error("Cannot create new user from this component. Please use Sign Up page.");
            alert("La creación de nuevos usuarios debe hacerse desde la página de registro.");
            // await addDoc(collection(firestore, 'users'), { ...userData, createdAt: serverTimestamp()});
        }
        setIsModalOpen(false);
        setEditingUser(null);
    } catch (err) {
        console.error(err);
        alert("Error al guardar usuario.");
    }
  };

  const handleUpdateRole = async (uid: string, role: UserRole['role']) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'users', uid), { role });
  };

  const handleDeleteUser = async (uid: string) => {
      if(!firestore) return;
      if(window.confirm("¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer.")) {
          await deleteDoc(doc(firestore, 'users', uid));
      }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios del Sistema</h2>
        {/* <Button onClick={() => { setEditingUser(null); setIsModalOpen(true); }}><PlusCircle /> Nuevo Usuario</Button> */}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <div className="p-8 text-center text-gray-400">Cargando usuarios...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                       <Select
                          defaultValue={user.role}
                          onValueChange={(newRole: UserRole['role']) => handleUpdateRole(user.uid, newRole) }
                          disabled={currentUser?.uid === user.uid}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                            <SelectItem value={ROLES.DATA_ENTRY}>Data Entry</SelectItem>
                            <SelectItem value={ROLES.TECNICO}>Técnico</SelectItem>
                          </SelectContent>
                        </Select>
                    </TableCell>
                    <TableCell>{user.departamento || '-'}</TableCell>
                    <TableCell className="text-right">
                      {currentUser?.uid !== user.uid && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.uid)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
