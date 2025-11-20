'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
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

// NOTE: This is a placeholder for a real server-side user creation function.
// In a production app, an admin should not create users from the client
// as it would require signing them out. This should be a Cloud Function.
async function createDataEntryUser(email: string, pass: string) {
    alert(`Simulación Exitosa: Se crearía un nuevo usuario para ${email}.
Rol asignado: data_entry.
En producción, esto se haría en el servidor para no desloguear al admin.`);

    console.log('--- USER CREATION (SIMULATED) ---');
    console.log('Action: Admin creating a new user.');
    console.log('Email:', email);
    console.log('Assigned Role: data_entry');
    console.log('This would be a server-side operation.');
    console.log('---------------------------------');
}


export default function SignUpPage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    // If there is a user, check if they are an admin.
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(userDoc => {
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
        setIsCheckingAdmin(false);
      }).catch(err => {
        console.error("Error checking admin status:", err);
        setIsAdmin(false);
        setIsCheckingAdmin(false);
      });
    } else if (!isUserLoading) {
      // If there's no user and loading is finished, they are not an admin.
      setIsAdmin(false);
      setIsCheckingAdmin(false);
    }
  }, [user, isUserLoading, firestore]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Solo los administradores pueden crear nuevos usuarios.');
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
      await createDataEntryUser(email, password);
      // Clear form on success
      setEmail('');
      setPassword('');
      setConfirmPassword('');

    } catch (err: any) {
      setError('Ocurrió un error durante la simulación de registro.');
      console.error(err);
    }
  };
  
  // This page is for admins to create new users. 
  // An unauthenticated user might be the first admin trying to register.
  // The login page handles redirection for already-logged-in users.
  // The actual user creation logic is guarded by the `isAdmin` check.

  if (isUserLoading || isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Cargando...
      </div>
    );
  }

  // Only show the restrictive message if the user is logged in and NOT an admin
  if (user && !isAdmin) {
      return (
         <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-sm text-center">
                 <CardHeader>
                    <CardTitle>Acceso Denegado</CardTitle>
                    <CardDescription>Solo los administradores pueden registrar nuevos usuarios.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Link href="/" className="font-medium text-blue-600 hover:underline">
                        Volver al Panel Principal
                    </Link>
                </CardContent>
            </Card>
        </div>
      )
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
            {isAdmin 
              ? "Registrar un nuevo miembro del equipo (rol: Data Entry)" 
              : "Regístrate como el primer administrador."
            }
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
            <Button type="submit" className="w-full" disabled={!isAdmin}>
              {isAdmin ? "Crear Usuario" : "Crear Usuario (Admin)"}
            </Button>
             {!isAdmin && <p className="text-xs text-center text-gray-500 mt-2">El primer usuario registrado será administrador. Contacte al soporte si ya existe uno.</p>}
            <div className="text-center text-sm text-gray-500 pt-2">
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:underline"
              >
                ¿Ya tienes cuenta? Iniciar Sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}