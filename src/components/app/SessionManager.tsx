'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const SESSION_DURATION = 15 * 60 * 1000; // 15 minutos
const WARNING_TIME = 2 * 60 * 1000; // 2 minutos

const SessionManager = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useUser();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_TIME / 1000);

  const handleLogout = useCallback(() => {
    signOut();
    setDialogOpen(false);
  }, [signOut]);

  useEffect(() => {
    // PREVENT this from running on the server
    if (typeof window === 'undefined') {
      return;
    }

    if (!user) return;

    let sessionTimeout: NodeJS.Timeout;
    let warningTimeout: NodeJS.Timeout;
    let countdownInterval: NodeJS.Timeout;

    const startTimers = () => {
      sessionTimeout = setTimeout(handleLogout, SESSION_DURATION);
      warningTimeout = setTimeout(() => {
        setDialogOpen(true);
        setCountdown(WARNING_TIME / 1000);
        countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, SESSION_DURATION - WARNING_TIME);
    };

    const resetTimers = () => {
      clearTimeout(sessionTimeout);
      clearTimeout(warningTimeout);
      clearInterval(countdownInterval);
      startTimers();
    };

    const handleStayLoggedIn = () => {
        resetTimers();
        setDialogOpen(false);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimers));
    startTimers();

    // Expose the function for that it can be called from the dialog
    (window as any).handleStayLoggedIn = handleStayLoggedIn;

    return () => {
      clearTimeout(sessionTimeout);
      clearTimeout(warningTimeout);
      clearInterval(countdownInterval);
      events.forEach(event => window.removeEventListener(event, resetTimers));
      delete (window as any).handleStayLoggedIn;
    };
  }, [user, handleLogout]);

  const handleStayLoggedInGlobal = () => {
      if((window as any).handleStayLoggedIn) {
          (window as any).handleStayLoggedIn();
      }
  }

  return (
    <>
      {children}
      <Dialog open={isDialogOpen}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
                <DialogTitle>Tu sesión está a punto de expirar</DialogTitle>
                <DialogDescription>
                    Por inactividad, tu sesión se cerrará automáticamente en {countdown} segundos.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between">
                <Button variant="outline" onClick={handleLogout}>Cerrar Sesión</Button>
                <Button onClick={handleStayLoggedInGlobal}>Permanecer Conectado</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
};

export default SessionManager;
