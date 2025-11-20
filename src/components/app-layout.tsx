'use client';

import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import type { Role } from '@/lib/types';
import { useSidebar } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';

function MobileHeader() {
    const { toggleSidebar } = useSidebar();
    return (
        <div className="md:hidden mb-4 flex justify-between items-center bg-card p-4 rounded-lg shadow-sm border">
            <span className="font-bold text-lg">Gestión LR</span>
            <button onClick={toggleSidebar}><Menu /></button>
        </div>
    )
}

export function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<Role>('admin');

  return (
    <SidebarProvider>
        <div className="flex min-h-screen bg-background font-sans">
            <AppSidebar role={role} setRole={setRole} />
            <SidebarInset>
                <div className="p-4 md:p-6">
                    <MobileHeader />
                    {children}
                </div>
            </SidebarInset>
        </div>
    </SidebarProvider>
  );
}
