'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
        description: "Por favor, ingrese su correo electrónico para restablecer la contraseña.",
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
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div 
        className="hidden lg:flex flex-col items-center justify-center text-white relative bg-cover bg-center"
        style={{ backgroundImage: "url('/logos/Gemini_Generated_Image_771cpi771cpi771c.png')" }}
      >
        <div className="absolute inset-0 bg-blue-950/70 z-0" />
        <div className="relative z-10 flex flex-col items-center text-center p-12">
          <h1 className="text-5xl font-bold tracking-tight text-white">Gestión de Programas LR</h1>
        </div>
        <p className="absolute bottom-10 text-sm text-gray-300 z-10">Secretaría de Políticas de Empleo</p>
      </div>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Iniciar Sesión</CardTitle>
              <CardDescription>Ingrese a su cuenta para continuar</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@dominio.com"
                    required
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password">Contraseña</label>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-xs text-blue-600 hover:underline focus:outline-none"
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
                    className="text-base"
                  />
                </div>
                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                <Button type="submit" className="w-full text-lg py-3">
                  Ingresar
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
