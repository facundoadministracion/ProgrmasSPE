
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import ClientProviders from '@/components/app/ClientProviders';
import AppLoader from './AppLoader'; // Importa el nuevo AppLoader

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Gestion de Programa LR',
  description: 'Gestión de programas y participantes',
};

export default function RootLayout() {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ClientProviders>
            <AppLoader />
        </ClientProviders>
        <Toaster />
      </body>
    </html>
  );
}
