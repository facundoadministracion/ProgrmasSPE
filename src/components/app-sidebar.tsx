'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Users,
  UserCheck,
  Calendar,
  DollarSign,
  Settings,
  Menu,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetContent } from './ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Role } from '@/lib/types';

interface AppSidebarProps {
  role: Role;
  setRole: (role: Role) => void;
}

const adminNavItems = [
  { href: '/', icon: Users, label: 'Resumen Gral.' },
  { href: '/participants', icon: UserCheck, label: 'Participantes' },
  { href: '/attendance', icon: Calendar, label: 'Asistencia' },
  { isButton: true, id: 'payments', icon: DollarSign, label: 'Carga Pagos' },
  { href: '/config', icon: Settings, label: 'Configuración' },
];

const dataEntryNavItems = [
    { href: '/attendance', icon: Calendar, label: 'Asistencia' },
];

export function AppSidebar({ role, setRole }: AppSidebarProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { openMobile, setOpenMobile, toggleSidebar } = useSidebar();

  const navItems = role === 'admin' ? adminNavItems : dataEntryNavItems;

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    // In a real app, you might want to navigate to a default page for that role
  };

  const sidebarContent = (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Briefcase className="text-blue-400" />
            <span className="font-bold text-lg group-data-[collapsible=icon]:hidden">
              Gestión LR
            </span>
          </Link>
          {!isMobile && (
            <div className="group-data-[collapsible=icon]:hidden">
              <SidebarTrigger />
            </div>
          )}
        </div>
        <div className="text-xs bg-slate-700 p-2 rounded group-data-[collapsible=icon]:hidden">
          Rol: <span className="font-bold uppercase text-blue-300">{role}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href || item.id}>
              {item.href ? (
                 <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={{ children: item.label }}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
              ) : (
                <SidebarMenuButton tooltip={{ children: item.label }}>
                    <item.icon />
                    <span>{item.label}</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <p className="text-xs text-slate-400 text-center">Simular Rol</p>
        <div className="flex gap-2">
          <Button
            onClick={() => handleRoleChange('admin')}
            size="sm"
            className={`flex-1 text-xs h-auto py-1 ${
              role === 'admin' ? 'bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            Admin
          </Button>
          <Button
            onClick={() => handleRoleChange('data_entry')}
            size="sm"
            className={`flex-1 text-xs h-auto py-1 ${
              role === 'data_entry'
                ? 'bg-green-500'
                : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            Data
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
  
  if (isMobile) {
    return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
            <SheetContent side="left" className="w-[18rem] bg-slate-800 text-white p-0 border-r-0">
                <div className="flex flex-col h-full">
                {sidebarContent}
                </div>
            </SheetContent>
        </Sheet>
    )
  }

  return <Sidebar variant="sidebar">{sidebarContent}</Sidebar>;
}
