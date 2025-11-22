'use client';

import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { ROLES } from '@/lib/constants';
import Link from 'next/link';

interface UserManagementProps {
  users: UserRole[];
  currentUser: User | null;
  isLoading: boolean;
}

const UserManagement = ({ users, currentUser, isLoading }: UserManagementProps) => {
  const { firestore } = useFirebase();

  const handleUpdateRole = async (uid: string, role: UserRole['role']) => {
    if (!firestore) return;
    await updateDoc(doc(firestore, 'users', uid), { role });
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
                          </SelectContent>
                        </Select>
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
