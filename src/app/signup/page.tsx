'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, query, onSnapshot } from 'firebase/firestore';
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
    if (isUserLoading || !firestore) return;
    
    // Check if there are any users to determine if this is the first signup
    const usersQuery = query(collection(firestore, 'users'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const isDbEmpty = snapshot.empty;
      setIsFirstUser(isDbEmpty);

      // Now check the current user's role
      if (user) {
        const userDocRef = doc(firestore, 'users', user.uid);
        getDoc(userDocRef).then(userDoc => {
          setIsAdmin(userDoc.exists() && userDoc.data().role === 'admin');
          setIsCheckingAdmin(false);
        }).catch(err => {
          console.error("Error checking admin status:", err);
          setIsAdmin(false);
          setIsCheckingAdmin(false);
        });
      } else {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
      }
    }, (err) => {
        console.error("Error checking for first user:", err);
        setIsCheckingAdmin(false);
    });

    return () => unsubscribe();
  }, [user, isUserLoading, firestore]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const canCreate = isFirstUser || isAdmin;
    if (!canCreate) {
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
      // Step 1: Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      // Step 2: Determine the role
      const assignedRole = isFirstUser ? 'admin' : 'data_entry';
      
      // Step 3: Create the user document in Firestore atomically
      await setDoc(doc(firestore, 'users', newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: newUser.email,
        role: assignedRole,
        createdAt: serverTimestamp(),
      });
      
      alert(`¡Usuario ${email} creado exitosamente con el rol de ${assignedRole}!`);
      
      // If an admin created a user, they stay on the main page.
      // If it's the first user signing up, send them to login.
      if (isFirstUser) {
        router.push('/login');
      } else {
        router.push('/');
      }

    } catch (err: any) {
       if (err.code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya está en uso. Si es usted, inicie sesión.');
      } else {
        console.error(err);
        setError(`Ocurrió un error durante el registro: ${err.message}`);
      }
    }
  };

  if (isUserLoading || isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Verificando permisos...
      </div>
    );
  }
  
  const canCreateUser = isFirstUser || isAdmin;

  if (user && !canCreateUser) {
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
              {user ? (
                <Link href="/" className="font-medium text-blue-600 hover:underline">
                  Volver al Panel
                </Link>
              ) : (
                <Link href="/login" className="font-medium text-blue-600 hover:underline">
                  ¿Ya tienes cuenta? Iniciar Sesión
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
