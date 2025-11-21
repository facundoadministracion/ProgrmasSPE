'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setIsSubmitting(false);
      return;
    }
    if (!name.trim()) {
      setError('Por favor, ingrese su nombre y apellido.');
      setIsSubmitting(false);
      return;
    }

    if (!auth || !firestore) {
      setError('Los servicios de Firebase no están disponibles.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      // Step 2: ALWAYS create the user document in Firestore with 'data_entry' role.
      // The first user must be manually promoted to 'admin' in the Firebase Console.
      await setDoc(doc(firestore, 'users', newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: newUser.email,
        role: 'data_entry',
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "¡Registro Exitoso!",
        description: `La cuenta para ${email} ha sido creada. Ahora puede iniciar sesión.`,
      });
      
      // Redirect to login after successful signup
      router.push('/login');

    } catch (err: any) {
       if (err.code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya está en uso. Si es usted, por favor inicie sesión.');
      } else {
        console.error("Signup Error:", err.code, err.message);
        setError(`Ocurrió un error durante el registro: ${err.message}`);
      }
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
            Complete el formulario para registrarse.
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
              <Link href="/login" className="font-medium text-blue-600 hover:underline">
                ¿Ya tienes cuenta? Iniciar Sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
