'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, query } from 'firebase/firestore';
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

export default function SignUpPage() {
  const { auth, firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    if (isUserLoading) return;
    
    const checkAdminAndFirstUser = async () => {
      if (!firestore) return;
      
      // Check if there are any users in the users collection
      const usersQuery = query(collection(firestore, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const isDbEmpty = usersSnapshot.empty;
      setIsFirstUser(isDbEmpty);

      // Check if current user is admin
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
        } catch (err) {
          console.error("Error checking admin status:", err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setIsCheckingAdmin(false);
    };

    checkAdminAndFirstUser();
  }, [user, isUserLoading, firestore]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFirstUser && !isAdmin) {
      setError('Solo los administradores pueden crear nuevos usuarios.');
      return;
    }

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

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      const assignedRole = isFirstUser ? 'admin' : 'data_entry';
      
      await setDoc(doc(firestore, 'users', newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: newUser.email,
        role: assignedRole,
        createdAt: serverTimestamp(),
      });
      
      alert(`¡Usuario ${email} creado exitosamente con el rol de ${assignedRole}!`);
      router.push('/');

    } catch (err: any) {
       if (err.code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya está en uso.');
      } else {
        setError('Ocurrió un error durante el registro.');
      }
      console.error(err);
    }
  };

  if (isUserLoading || isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Verificando permisos...
      </div>
    );
  }
  
  if (user && !isAdmin && !isFirstUser) {
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

  const canCreateUser = isFirstUser || isAdmin;

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
            {isFirstUser 
              ? "Regístrate como el primer administrador." 
              : "Registrar un nuevo miembro del equipo (rol: Data Entry)"
            }
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
            <Button type="submit" className="w-full" disabled={!canCreateUser}>
              {isFirstUser ? "Crear Usuario Administrador" : "Crear Usuario"}
            </Button>
            {isFirstUser && <p className="text-xs text-center text-gray-500 mt-2">El primer usuario registrado será administrador.</p>}
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
