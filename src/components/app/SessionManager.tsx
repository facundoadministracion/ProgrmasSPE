'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// --- Tiempos de espera (1 hora de inactividad, 1 minuto de advertencia) ---
const INACTIVITY_LOGOUT_TIME = 60 * 60 * 1000; 
const WARNING_TIME = 60 * 1000; 

const SessionManager = ({ children }: { children: React.ReactNode }) => {
  const { auth } = useFirebase();
  const [showWarning, setShowWarning] = useState(false);

  // Función para cerrar la sesión
  const handleSignOut = useCallback(() => {
    if (auth) {
      signOut(auth).catch((error) => {
        console.error('Error al cerrar sesión automáticamente:', error);
      });
    }
  }, [auth]);

  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;
    let warningTimeout: NodeJS.Timeout;

    // Función que se activa cuando se cumple el tiempo de inactividad
    const onIdle = () => {
      setShowWarning(true);
      // Si el usuario no hace nada en la advertencia, se cierra la sesión
      warningTimeout = setTimeout(handleSignOut, WARNING_TIME);
    };

    // Reinicia los contadores cada vez que hay actividad
    const resetTimers = () => {
      clearTimeout(activityTimeout);
      clearTimeout(warningTimeout);
      setShowWarning(false);
      activityTimeout = setTimeout(onIdle, INACTIVITY_LOGOUT_TIME - WARNING_TIME);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    
    // Añade los listeners para detectar actividad
    events.forEach(event => window.addEventListener(event, resetTimers));
    
    // Inicia el contador
    resetTimers();

    // Limpia los listeners y temporizadores cuando el componente se desmonta
    return () => {
      clearTimeout(activityTimeout);
      clearTimeout(warningTimeout);
      events.forEach(event => window.removeEventListener(event, resetTimers));
    };
  }, [handleSignOut]);

  // Función para el botón "Permanecer"
  const stayLoggedIn = () => {
      setShowWarning(false);
      // La actividad de hacer clic ya reinició el temporizador principal
  };

  return (
    <>
      {children}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Sigues ahí?</DialogTitle>
            <DialogDescription>
              Tu sesión está a punto de cerrarse por inactividad. Se cerrará en 1 minuto.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:justify-end'>
            <Button variant="outline" onClick={handleSignOut}>Cerrar Sesión Ahora</Button>
            <Button onClick={stayLoggedIn}>Permanecer Conectado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SessionManager;