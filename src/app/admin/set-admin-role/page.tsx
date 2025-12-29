'use client';

import { useUser } from '@/firebase';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useState } from 'react';

export default function SetAdminRolePage() {
    const { user, isUserLoading: loading } = useUser();
    const firestore = useFirestore();
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleMakeAdmin = async () => {
        if (!user || !firestore) {
            setError('No estás autenticado o la base de datos no está disponible.');
            return;
        }

        setMessage('');
        setError('');

        try {
            const userRef = doc(firestore, 'users', user.uid);
            // Usamos setDoc con merge:true para actualizar o crear el campo 'role'
            // sin sobreescribir el documento entero.
            await setDoc(userRef, { role: 'admin', name: user.displayName || user.email || 'Admin' }, { merge: true });
            setMessage('¡Listo! Ahora tienes permisos de administrador. Por favor, refresca la página principal.');
        } catch (e: any) {
            console.error(e);
            setError(`Ocurrió un error: ${e.message}`);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Cargando...</div>;
    }

    if (!user) {
        return <div className="flex justify-center items-center h-screen">Por favor, inicia sesión para continuar.</div>;
    }

    return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle>Asignar Rol de Administrador</CardTitle>
                    <CardDescription>
                        Esta herramienta te asignará el rol de administrador para que puedas gestionar la aplicación.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <p>
                            Tu ID de usuario es: <code className="bg-gray-100 text-gray-800 p-1 rounded text-sm">{user.uid}</code>
                        </p>
                        <p>
                            Haz clic en el botón de abajo para asignarte el rol de administrador.
                            Esto te dará acceso a todas las funciones de la aplicación.
                        </p>
                        <Button onClick={handleMakeAdmin} className="w-full">
                            Convertirme en Administrador
                        </Button>
                        {message && <p className="mt-4 text-center text-green-600 font-medium">{message}</p>}
                        {error && <p className="mt-4 text-center text-red-600 font-medium">{error}</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
