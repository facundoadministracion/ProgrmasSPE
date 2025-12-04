'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { auth } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!auth) return;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      console.error("Login Error:", err.code, err.message);
      let errorMessage = 'Ocurrió un error al iniciar sesión. Por favor, intente de nuevo.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciales inválidas. Verifique su email y contraseña.';
      }
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: errorMessage,
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Falta Email",
        description: "Por favor, ingrese su correo electrónico en el campo de email para restablecer la contraseña.",
      });
      return;
    }
    if (auth) {
      try {
        await sendPasswordResetEmail(auth, email);
        toast({
          title: "Correo enviado",
          description: "Si la cuenta existe, se ha enviado un enlace para restablecer la contraseña a su correo.",
        });
      } catch (err: any) {
        console.error("Password Reset Error:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo enviar el correo de restablecimiento. Intente de nuevo.",
        });
      }
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
              <div className="flex justify-between items-center">
                <label htmlFor="password">Contraseña</label>
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
