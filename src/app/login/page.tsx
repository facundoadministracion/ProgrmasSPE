'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { auth } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas. Por favor, verifique e intente de nuevo.');
      } else {
        setError('Ocurrió un error al iniciar sesión.');
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
          <CardTitle>Iniciar Sesión</CardTitle>
          <CardDescription>Ingrese a su cuenta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">
              Ingresar
            </Button>
            <div className="text-center text-sm text-gray-500 pt-2">
                ¿No tienes cuenta?{' '}
                <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                    Regístrate
                </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
