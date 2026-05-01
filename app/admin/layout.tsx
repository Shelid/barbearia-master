'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Scissors, 
  Calendar, 
  Users, 
  Settings, 
  BarChart3, 
  Clock, 
  LogOut, 
  Menu,
  Bell,
  Image as ImageIcon,
  User as UserIcon,
  Megaphone
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { name: 'Agenda', href: '/admin', icon: Calendar },
  { name: 'Servicios', href: '/admin/servicos', icon: Scissors },
  { name: 'Barberos', href: '/admin/barbeiros', icon: Users },
  { name: 'Horarios', href: '/admin/horarios', icon: Clock },
  { name: 'Galería', href: '/admin/galeria', icon: ImageIcon },
  { name: 'Lista de Espera', href: '/admin/lista-espera', icon: Bell },
  { name: 'Informes', href: '/admin/relatorios', icon: BarChart3 },
  { name: 'Marketing', href: '/admin/marketing', icon: Megaphone },
  { name: 'Ajustes', href: '/admin/definicoes', icon: Settings },
];

type PendingBooking = {
  id: string;
  clientName?: string;
  date: string;
  serviceName?: string;
  startTime: string;
};

function SidebarContent({ pathname, userEmail, onLogout }: { pathname: string; userEmail?: string; onLogout: () => void }) {
  return (
    <div className="flex flex-col h-full bg-slate-50/50 border-r border-slate-200">
      <div className="p-6 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
            <Scissors className="text-white w-5 h-5" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-slate-900">BarberFlow</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 px-4 mt-2">
        <div className="space-y-6">
          <div>
            <p className="px-4 text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">Administración</p>
            <nav className="space-y-0.5">
              {navItems.slice(0, 5).map((item) => {
                const isCurrentlyActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all group",
                      isCurrentlyActive 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" 
                        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 border border-transparent"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isCurrentlyActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-4 text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">Más Opciones</p>
            <nav className="space-y-0.5">
              {navItems.slice(5).map((item) => {
                const isCurrentlyActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all group",
                      isCurrentlyActive 
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/60" 
                        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900 border border-transparent"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isCurrentlyActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-200">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start gap-3 px-3 h-12 hover:bg-slate-200/50 rounded-xl")}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <UserIcon className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex flex-col items-start truncate h-auto py-1">
              <span className="text-sm font-bold text-slate-800 leading-none">Administrador</span>
              <span className="text-xs text-slate-500 font-medium truncate w-[130px] leading-tight pt-1">
                {userEmail || 'Cuenta'}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 shadow-sm">
            <DropdownMenuItem onClick={onLogout} className="text-red-600 focus:text-red-600 font-medium cursor-pointer py-2.5">
              <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [shopId, setShopId] = React.useState<string | null>(null);
  const [pendingBookings, setPendingBookings] = React.useState<PendingBooking[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!profile?.barbershopId) return;
    setShopId(profile.barbershopId);
  }, [profile]);

  const loadPendingBookings = React.useCallback(async (currentShopId: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const currentQuery = query(
      collection(db, 'barbershops', currentShopId, 'bookings'),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(currentQuery);
    const allPending: PendingBooking[] = snapshot.docs.map((currentDoc) => ({
      id: currentDoc.id,
      ...(currentDoc.data() as Omit<PendingBooking, 'id'>),
    }));
    const futureBookings = allPending.filter((booking) => booking.date > todayStr);
    futureBookings.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    setPendingBookings(futureBookings);
  }, []);

  useEffect(() => {
    if (!shopId) return;
    
    // Future bookings from tomorrow onwards (user request: "hoje é 21 só vai chegar os pedido apartir do dia 22 diante no sino")
    loadPendingBookings(shopId).catch((error) => {
      console.error('Error loading pending bookings:', error);
    });
  }, [loadPendingBookings, pathname, shopId]);

  const handleConfirmBooking = async (bookingId: string) => {
    if (!shopId) return;
    try {
      await updateDoc(doc(db, 'barbershops', shopId, 'bookings', bookingId), {
        status: 'confirmed'
      });
      await loadPendingBookings(shopId);
      toast.success('Cita confirmada!');
    } catch (error) {
      toast.error('Error al confirmar la cita');
    }
  };

  const handleLogout = async () => {
    try {
      // Need auth from firebase
      const { auth } = await import('@/lib/firebase');
      await signOut(auth);
      toast.success('Sesión cerrada');
      router.push('/');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-full shrink-0">
        <SidebarContent pathname={pathname} userEmail={user.email || undefined} onLogout={handleLogout} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-[#F8FAFC] flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")}>
                <Menu className="w-6 h-6 text-slate-700" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 border-none">
                <SidebarContent pathname={pathname} userEmail={user.email || undefined} onLogout={handleLogout} />
              </SheetContent>
            </Sheet>
            
            <h2 className="font-bold text-2xl tracking-tight hidden lg:block text-slate-800">
              {navItems.find(i => i.href === pathname)?.name || 'Panel de Control'}
            </h2>
          </div>

          <div className="flex flex-row items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-10 h-10 rounded-full relative bg-white border border-slate-200 text-slate-500 shadow-sm hover:text-slate-700 hover:bg-slate-50 outline-none")}>
                <Bell className="w-4 h-4" />
                {pendingBookings.length > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl border-slate-200 shadow-lg p-0 overflow-hidden mt-2">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
                  <h3 className="font-bold text-slate-800 text-sm">Notificaciones</h3>
                  <p className="text-xs text-slate-500">Citas pendientes (a partir de mañana)</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {pendingBookings.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No hay citas pendientes para fechas futuras.</div>
                  ) : (
                    pendingBookings.map(b => (
                      <div key={b.id} className="p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{b.clientName}</p>
                            <p className="text-xs text-slate-500">{format(new Date(b.date + 'T00:00:00'), 'd MMM yyyy', { locale: es })} a las {b.startTime}</p>
                          </div>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-none text-[10px] uppercase font-bold px-2">Pendiente</Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-3 line-clamp-1">{b.serviceName}</p>
                        <Button size="sm" onClick={() => handleConfirmBooking(b.id)} className="w-full h-8 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                          Confirmar Cita
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 lg:px-8 pb-12 pt-2 bg-[#F8FAFC]">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
