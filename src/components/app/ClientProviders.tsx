'use client';

import { type ReactNode } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import SessionManager from '@/components/app/SessionManager';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      <SessionManager>{children}</SessionManager>
    </FirebaseClientProvider>
  );
}
