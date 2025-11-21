'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
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
      // Step 1: Create the user in Firebase Auth. This part can still throw its own errors.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Step 2: Define the user data to be saved in Firestore.
      const userProfileData = {
        uid: newUser.uid,
        name: name,
        email: newUser.email,
        role: 'data_entry',
        createdAt: serverTimestamp(),
      };
      
      // Step 3: Create the user document in Firestore using a non-blocking call with contextual error handling.
      const userDocRef = doc(firestore, 'users', newUser.uid);
      
      setDoc(userDocRef, userProfileData)
        .then(() => {
          // This runs on successful creation of the Firestore document.
          toast({
            title: "¡Registro Exitoso!",
            description: `La cuenta para ${email} ha sido creada. Ahora puede iniciar sesión.`,
          });
          // Redirect to login after successful signup and Firestore write.
          router.push('/login');
        })
        .catch((err) => {
           // This catches Firestore-specific errors, especially permission errors.
          console.error("Firestore setDoc Error:", err);
          
          // Create the detailed, contextual error.
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'create',
            requestResourceData: userProfileData,
          });

          // Emit the error for the global listener to catch and display.
          errorEmitter.emit('permission-error', permissionError);

          // We don't set local state error here, as the global listener will handle it.
          // This avoids showing duplicate error messages.
        });

    } catch (err: any) {
       // This block now primarily catches Authentication errors.
       if (err.code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya está en uso. Si es usted, por favor inicie sesión.');
      } else {
        console.error("Auth Signup Error:", err.code, err.message);
        setError(`Ocurrió un error de autenticación: ${err.message}`);
      }
    } finally {
      // Because the Firestore operation is now non-blocking, we need to carefully manage the submitting state.
      // For this flow, we'll let the success toast and redirect handle the "end" of submission.
      // If there's an auth error, we set it back to false.
      if (error) {
        setIsSubmitting(false);
      }
      // Note: In a more complex scenario, you might want to keep `isSubmitting` true until the `setDoc` promise resolves.
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
