'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
import { Briefcase, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Redirect non-admins trying to access the signup page
    if (!isUserLoading && !user) {
       router.push('/login');
    } else if (user && firestore) {
      const checkAdmin = async () => {
        const userDoc = await doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userDoc);
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          router.push('/'); // Not an admin, redirect
        }
      };
      // Temporary workaround for getDoc not being available in useEffect.
      // In a real app, you might fetch this role when the user logs in and store it in context.
      setTimeout(() => checkAdmin().catch(console.error), 100);
    }
  }, [user, isUserLoading, router, firestore]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('No tienes permisos para crear usuarios.');
      return;
    }
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      // We can't create a new user and keep the current admin signed in with the client SDK.
      // This part would typically be handled by a server-side function (like a Firebase Function)
      // that the admin would call. For this demo, we'll just log that it would happen.
      
      alert(`Simulación: Se crearía un nuevo usuario con el rol 'data_entry' para ${email}.
En una app real, esto se haría con una Cloud Function para no desloguear al admin.`);

      console.log('--- USER CREATION (SIMULATED) ---');
      console.log('Action: Admin creating a new user.');
      console.log('Email:', email);
      console.log('Assigned Role: data_entry');
      console.log('This would be a server-side operation in a production environment.');
      console.log('---------------------------------');
      
      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');

    } catch (err: any) {
      // This error handling is for a real implementation, but won't be hit in the simulation
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está en uso.');
      } else {
        setError('Ocurrió un error durante el registro.');
      }
      console.error(err);
    }
  };

  if (isUserLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Cargando y verificando permisos...
      </div>
    );
  }

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
            Registrar un nuevo miembro del equipo (rol por defecto: Data Entry)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
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
              <label htmlFor="password">Contraseña Temporal</label>
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
            <Button type="submit" className="w-full">
              Crear Usuario
            </Button>
            <div className="text-center text-sm text-gray-500 pt-2">
              <Link
                href="/"
                className="font-medium text-blue-600 hover:underline"
              >
                Volver al Panel Principal
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
