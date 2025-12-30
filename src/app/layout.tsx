import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import SessionManager from '@/components/app/SessionManager';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Gestion de Programa LR',
  description: 'Gestión de programas y participantes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <FirebaseClientProvider>
          <SessionManager>
            {children}
          </SessionManager>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
