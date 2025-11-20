'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import Link from 'next/link';


export default function SignUpPage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

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

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Create a user document in Firestore with a default role
      await setDoc(doc(firestore, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        role: 'data_entry', // Default role for new users
        createdAt: new Date().toISOString(),
      });
      
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está en uso.');
      } else {
        setError('Ocurrió un error durante el registro.');
      }
      console.error(err);
    }
  };
  
  if (isUserLoading || user) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
                <Briefcase className="text-blue-600" size={32}/>
                <h1 className="text-2xl font-bold">Gestión LR</h1>
            </div>
          <CardTitle>Crear Cuenta</CardTitle>
          <CardDescription>Regístrese para acceder al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email">Email</label>
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
            <Button type="submit" className="w-full">
              Registrarse
            </Button>
             <div className="text-center text-sm text-gray-500 pt-2">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:underline">
                    Inicia Sesión
                </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
