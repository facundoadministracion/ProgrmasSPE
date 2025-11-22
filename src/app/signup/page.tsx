'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';
import { ROLES } from '@/lib/constants';

export default function SignUpPage() {
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!name.trim()) {
      setError('Por favor, ingrese su nombre y apellido.');
      return;
    }

    if (!auth || !firestore) {
      setError('Los servicios de Firebase no están disponibles.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Create user in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Step 2: Update Firebase Auth profile with display name
      await updateProfile(newUser, { displayName: name });

      // Step 3: Create user profile data for Firestore
      const isAdmin = newUser.email === 'crnunezfacundo@gmail.com';
      const userProfileData: Omit<UserRole, 'createdAt'> & { createdAt: string } = {
        uid: newUser.uid,
        name: name,
        email: newUser.email || '',
        role: isAdmin ? ROLES.ADMIN : ROLES.DATA_ENTRY,
        createdAt: new Date().toISOString(),
      };

      // Step 4: Write user profile to Firestore
      const userDocRef = doc(firestore, 'users', newUser.uid);
      await setDoc(userDocRef, userProfileData);

      toast({
        title: "¡Registro Exitoso!",
        description: `La cuenta para ${email} ha sido creada. Será redirigido.`,
      });
      router.push('/');

    } catch (err: any) {
      console.error("SignUp Error:", err);
      let friendlyError = 'Ocurrió un error inesperado durante el registro.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'El correo electrónico ya está en uso por otra cuenta.';
      } else if (err.code === 'permission-denied') {
         friendlyError = 'Error de permisos al crear el perfil. Verifique las reglas de seguridad.';
         const permissionError = new FirestorePermissionError({
            path: `users/${(auth.currentUser?.uid || 'unknown')}`,
            operation: 'create',
            requestResourceData: { name, email, role: 'data_entry' },
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      setError(friendlyError);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Briefcase className="text-blue-600" size={32} />
            <h1 className="text-2xl font-bold">Gestión LR</h1>
          </div>
          <CardTitle>Crear Nuevo Usuario</CardTitle>
          <CardDescription>
            Complete el formulario para registrar un nuevo perfil de acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name">Nombre y Apellido</label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="email">Email del Nuevo Usuario</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@dominio.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="password">Contraseña</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Crear Usuario'}
            </Button>
            <div className="text-center text-sm text-gray-500 pt-2">
              <Link href="/" className="font-medium text-blue-600 hover:underline">
                Volver al Panel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
