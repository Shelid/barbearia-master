'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Scissors, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  Plus,
  ArrowRight,
  Star
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { db, auth } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Dashboard() {
  const [adminData, setAdminData] = React.useState<any>(null);
  const [shop, setShop] = React.useState<any>(null);
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [barbers, setBarbers] = React.useState<any[]>([]);
  const [services, setServices] = React.useState<any[]>([]);
  const [hours, setHours] = React.useState<any[]>([]);
  const [closures, setClosures] = React.useState<any[]>([]);
  const [overrides, setOverrides] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isManualBookingOpen, setIsManualBookingOpen] = React.useState(false);
  const [rateClientBooking, setRateClientBooking] = React.useState<any>(null);
  const [clientRating, setClientRating] = React.useState(5);
  const [clientRatingsMap, setClientRatingsMap] = React.useState<Record<string, number>>({});
  
  const [showAllBookings, setShowAllBookings] = React.useState(false);
  const [shopId, setShopId] = React.useState<string | null>(null);
  const [autoAcceptEnabled, setAutoAcceptEnabled] = React.useState(false);
  
  const [statsDate, setStatsDate] = React.useState(() => format(new Date(), 'yyyy-MM-dd'));

  const [manualClientName, setManualClientName] = React.useState('');
  const [manualService, setManualService] = React.useState('');
  const [manualBarber, setManualBarber] = React.useState('');
  const [manualDate, setManualDate] = React.useState('');
  const [manualTime, setManualTime] = React.useState('');

  const loadBookings = React.useCallback(async (currentShopId: string, currentAutoAcceptEnabled: boolean) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const minDate = statsDate < today ? statsDate : today;
    const bookingsQ = showAllBookings
      ? query(collection(db, 'barbershops', currentShopId, 'bookings'))
      : query(collection(db, 'barbershops', currentShopId, 'bookings'), where('date', '>=', minDate));

    const snapshot = await getDocs(bookingsQ);
    const bookingsData = snapshot.docs.map((currentDoc) => ({
      id: currentDoc.id,
      ...currentDoc.data()
    } as any));

    if (currentAutoAcceptEnabled) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
      const pendingToConfirm = bookingsData.filter((booking) =>
        booking.status === 'pending' && (booking.date === todayStr || booking.date === tomorrowStr)
      );

      if (pendingToConfirm.length > 0) {
        const batch = writeBatch(db);

        pendingToConfirm.forEach((booking) => {
          batch.update(doc(db, 'barbershops', currentShopId, 'bookings', booking.id), { status: 'confirmed' });
          batch.set(
            doc(db, 'barbershops', currentShopId, 'booked_slots', booking.id),
            { status: 'confirmed' },
            { merge: true }
          );
          booking.status = 'confirmed';
        });

        await batch.commit();
        toast.success(`Se confirmaron ${pendingToConfirm.length} cita(s) automaticamente`);
      }
    }

    bookingsData.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.localeCompare(b.startTime);
    });
    setBookings(bookingsData);

    const ratingsAccumulator = bookingsData.reduce((acc, booking) => {
      if (booking.clientUid && booking.clientUid !== 'manual' && typeof booking.clientRating === 'number') {
        const current = acc[booking.clientUid] || { sum: 0, count: 0 };
        current.sum += booking.clientRating;
        current.count += 1;
        acc[booking.clientUid] = current;
      }

      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    const nextRatingsMap: Record<string, number> = {};
    for (const [clientUid, value] of Object.entries(ratingsAccumulator) as [string, { sum: number; count: number }][]) {
      nextRatingsMap[clientUid] = value.sum / value.count;
    }

    setClientRatingsMap(nextRatingsMap);
  }, [showAllBookings, statsDate]);

  React.useEffect(() => {
    if (!shopId) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const minDate = statsDate < today ? statsDate : today;
    const bookingsQ = showAllBookings 
      ? query(collection(db, 'barbershops', shopId, 'bookings'))
      : query(collection(db, 'barbershops', shopId, 'bookings'), where('date', '>=', minDate));

    const unsubBookings = onSnapshot(bookingsQ, async (snapshot) => {
      // Auto-accept logic
      if (autoAcceptEnabled) {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

        for (const change of snapshot.docChanges()) {
          if (change.type === 'added') {
             const b = { id: change.doc.id, ...change.doc.data() } as any;
             if (b.status === 'pending' && (b.date === todayStr || b.date === tomorrowStr)) {
               try {
                 await updateDoc(doc(db, 'barbershops', shopId, 'bookings', b.id), { status: 'confirmed' });
                 await updateDoc(doc(db, 'barbershops', shopId, 'booked_slots', b.id), { status: 'confirmed' });
                 toast.success(`Cita aceptada automáticamente para ${b.clientName || 'Cliente'}`);
               } catch (e) {
                 console.error('Error auto-accepting booking', e);
               }
             }
          }
        }
      }

      const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      bookingsData.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
      setBookings(bookingsData);

      const ratingsAccumulator = bookingsData.reduce((acc, booking) => {
        if (booking.clientUid && booking.clientUid !== 'manual' && typeof booking.clientRating === 'number') {
          const current = acc[booking.clientUid] || { sum: 0, count: 0 };
          current.sum += booking.clientRating;
          current.count += 1;
          acc[booking.clientUid] = current;
        }

        return acc;
      }, {} as Record<string, { sum: number; count: number }>);

      const nextRatingsMap: Record<string, number> = {};
      for (const [clientUid, value] of Object.entries(ratingsAccumulator) as [string, { sum: number; count: number }][]) {
        nextRatingsMap[clientUid] = value.sum / value.count;
      }

      setClientRatingsMap(nextRatingsMap);
    });

    return () => unsubBookings();
  }, [shopId, showAllBookings, autoAcceptEnabled]);

  React.useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (userData.role === 'client') {
            window.location.href = '/client';
            return;
          }

          setAdminData(userData);

          if (userData.barbershopId) {
            const [loadedShopDoc, barbersSnap, servicesSnap, hoursSnap, closuresSnap, overridesSnap] = await Promise.all([
              getDoc(doc(db, 'barbershops', userData.barbershopId)),
              getDocs(collection(db, 'barbershops', userData.barbershopId, 'barbers')),
              getDocs(collection(db, 'barbershops', userData.barbershopId, 'services')),
              getDocs(collection(db, 'barbershops', userData.barbershopId, 'hours')),
              getDocs(collection(db, 'barbershops', userData.barbershopId, 'closures')),
              getDocs(collection(db, 'barbershops', userData.barbershopId, 'overrides')),
            ]);

            if (loadedShopDoc.exists()) {
              setShop({ id: loadedShopDoc.id, ...loadedShopDoc.data() });
              setAutoAcceptEnabled(!!loadedShopDoc.data().autoAcceptEnabled);
            }

            setShopId(userData.barbershopId);
            setBarbers(barbersSnap.docs.map((currentDoc) => ({ id: currentDoc.id, ...currentDoc.data() } as any)));
            setServices(servicesSnap.docs.map((currentDoc) => ({ id: currentDoc.id, ...currentDoc.data() } as any)));

            const loadedHoursData = hoursSnap.docs.map((currentDoc) => currentDoc.data());
            const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
            const loadedHours = dayLabels.map((day, i) => {
              const hourData = loadedHoursData.find((hour: any) => hour.dayOfWeek === i);
              return {
                day,
                open: hourData ? (hourData.closed ? 'Cerrado' : `${hourData.openTime} - ${hourData.closeTime}`) : 'Cerrado'
              };
            });

            setHours(loadedHours);
            setClosures(closuresSnap.docs.map((currentDoc) => currentDoc.data()));
            setOverrides(overridesSnap.docs.map((currentDoc) => currentDoc.data()));
            setLoading(false);
            return;

            // Fetch Shop
            const shopDoc = await getDoc(doc(db, 'barbershops', userData.barbershopId));
            if (shopDoc.exists()) {
              setShop({ id: shopDoc.id, ...shopDoc.data() });
              setAutoAcceptEnabled(!!shopDoc.data()?.autoAcceptEnabled);
            }

            setShopId(userData.barbershopId);

            const barbersUnsub = () => undefined;

            const servicesUnsub = () => undefined;

            // Fetch Hours
            const hoursUnsub = onSnapshot(collection(db, 'barbershops', userData.barbershopId, 'hours'), (snapshot) => {
              const hoursData = snapshot.docs.map(doc => doc.data());
              const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
              const completeHours = DAYS.map((day, i) => {
                const h = hoursData.find((hd: any) => hd.dayOfWeek === i);
                return {
                  day,
                  open: h ? (h.closed ? 'Cerrado' : `${h.openTime} - ${h.closeTime}`) : 'Cerrado'
                };
              });
              setHours(completeHours);
            });

            const closuresUnsub = () => undefined;

            const overridesUnsub = () => undefined;

            setLoading(false);
            return () => {
              barbersUnsub();
              servicesUnsub();
              hoursUnsub();
              closuresUnsub();
              overridesUnsub();
            };
          } else {
            setLoading(false);
          }
        } else {
          // If master admin or user doc missing, show setup screen
          setAdminData({ uid: user.uid, email: user.email, displayName: user.displayName });
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleUpdateStatus = async (booking: any, status: string) => {
    if (!shop) return;
    
    if (status === 'completed' && booking.clientUid !== 'manual') {
      setRateClientBooking(booking);
      setClientRating(5);
      return;
    }

    try {
      const batch = writeBatch(db);
      const bookingRef = doc(db, 'barbershops', shop.id, 'bookings', booking.id);
      const slotRef = doc(db, 'barbershops', shop.id, 'booked_slots', booking.id);

      batch.update(bookingRef, { status });
      batch.set(slotRef, {
        date: booking.date,
        startTime: booking.startTime,
        barberId: booking.barberId,
        status,
        bookingId: booking.id
      }, { merge: true });

      await batch.commit();

      toast.success(`Cita ${status === 'confirmed' ? 'confirmada' : status === 'completed' ? 'marcada como completada' : 'cancelada'}`);
    } catch (error) {
      toast.error('Error al actualizar el estado');
      console.error(error);
    }
  };

  const handleRateClientSubmit = async () => {
    if (!rateClientBooking) return;
    try {
      const batch = writeBatch(db);
      const bookingRef = doc(db, 'barbershops', shop.id, 'bookings', rateClientBooking.id);
      const slotRef = doc(db, 'barbershops', shop.id, 'booked_slots', rateClientBooking.id);

      batch.update(bookingRef, {
        status: 'completed',
        clientRated: true,
        clientRating
      });
      batch.set(slotRef, {
        date: rateClientBooking.date,
        startTime: rateClientBooking.startTime,
        barberId: rateClientBooking.barberId,
        status: 'completed',
        bookingId: rateClientBooking.id
      }, { merge: true });

      await batch.commit();

      toast.success('Cita completada y cliente evaluado');
      setRateClientBooking(null);
    } catch (error) {
      toast.error('Error al completar la cita');
      console.error(error);
    }
  };

  const availableSlots = React.useMemo(() => {
    if (!manualDate || !manualBarber || !hours.length) return [];
    
    const dateStr = manualDate;
    
    const isClosed = closures.some(c => dateStr >= c.startDate && dateStr <= c.endDate);
    if (isClosed) return [];

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = format(dateObj, 'EEEE', { locale: es });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayConfig = hours.find(h => h.day === capitalizedDay);

    if (!dayConfig || dayConfig.open === 'Cerrado') return [];

    const [start, end] = dayConfig.open.split(' - ');
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const slots = [];
    let currentH = startH;
    let currentM = startM;

    while (currentH < endH || (currentH === endH && currentM < endM)) {
      const time = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
      
      const isBlocked = overrides.some(o => 
        o.date === dateStr && 
        (o.barberId === manualBarber || manualBarber === 'any') &&
        time >= o.startTime && time < o.endTime
      );

      const isBooked = bookings.some(b => 
        b.date === dateStr &&
        b.startTime === time && 
        b.status !== 'cancelled' &&
        (b.barberId === manualBarber || manualBarber === 'any')
      );

      if (!isBlocked && !isBooked) {
        slots.push(time);
      }
      
      currentM += 30;
      if (currentM >= 60) {
        currentH += 1;
        currentM = 0;
      }
    }
    return slots;
  }, [manualDate, manualBarber, hours, closures, overrides, bookings]);

  React.useEffect(() => {
    if (manualTime && !availableSlots.includes(manualTime)) {
      setManualTime('');
    }
  }, [availableSlots, manualTime]);

  const handleManualBooking = async () => {
    if (!shop || !manualClientName || !manualDate || !manualTime || !manualService || !manualBarber) {
       toast.error('Por favor, rellena todos los campos obligatorios.');
       return;
    }

    try {
      const selectedBarberObj = barbers.find(b => b.id === manualBarber) || { id: 'any', name: 'Cualquier Barbero' };
      const selectedServiceObj = services.find(s => s.id === manualService) || { id: 'manual', name: 'Cita Manual', price: 0 };
      
      const bookingData = {
        barbershopId: shop.id,
        barberId: selectedBarberObj.id,
        barberName: selectedBarberObj.name,
        serviceId: selectedServiceObj.id,
        serviceName: selectedServiceObj.name,
        price: selectedServiceObj.price || 0,
        clientUid: 'manual', // Indica que se creó manualmente sin inicio de sesión de usuario real
        clientName: manualClientName,
        clientEmail: 'manual@admin.com', // fallback
        date: manualDate,
        startTime: manualTime,
        status: 'confirmed', // Citas manuales se asumen confirmadas
        createdAt: new Date().toISOString()
      };

      const batch = writeBatch(db);
      const bookingRef = doc(collection(db, 'barbershops', shop.id, 'bookings'));
      const slotRef = doc(collection(db, 'barbershops', shop.id, 'booked_slots'), bookingRef.id);

      batch.set(bookingRef, bookingData);
      batch.set(slotRef, {
        date: manualDate,
        startTime: manualTime,
        barberId: selectedBarberObj.id,
        status: 'confirmed',
        bookingId: bookingRef.id
      });

      await batch.commit();
      
      toast.success('Cita manual creada con éxito');
      setIsManualBookingOpen(false);
      setManualClientName('');
      setManualService('');
      setManualBarber('');
      setManualDate('');
      setManualTime('');
    } catch (error) {
       toast.error('Error al guardar la cita manual');
       console.error(error);
    }
  };

  const { filteredBookings, uniqueClients, occupancyRate } = React.useMemo(() => {
    const filtered = bookings.filter(b => b.date === statsDate);
    
    // Unique clients
    const clients = new Set(filtered.map(b => b.clientUid !== 'manual' ? b.clientUid : `${b.clientName}-${b.startTime}`));
    
    // Occupancy Rate
    let occupancy = 0;
    if (hours.length && barbers.length) {
      // Split statsDate (yyyy-MM-dd) to avoid timezone shift from new Date()
      const [y, m, d] = statsDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      
      const dayIndex = dateObj.getDay(); // 0 = Domingo, 1 = Lunes, etc.
      const dayConfig = hours[dayIndex];
      
      const isClosed = closures.some(c => c.startDate <= statsDate && c.endDate >= statsDate) || (dayConfig && dayConfig.open === 'Cerrado');
      
      if (!isClosed && dayConfig && dayConfig.open !== 'Cerrado') {
        let totalSlots = 0;
        const activeBarbers = barbers.filter(b => b.active);
        
        const [openTime, closeTime] = dayConfig.open.split(' - ');
        
        if (openTime && closeTime) {
          const [openH, openM] = openTime.split(':').map(Number);
          const [closeH, closeM] = closeTime.split(':').map(Number);
          
          let slotsPerBarber = 0;
          let currentH = openH;
          let currentM = openM || 0;
          while (currentH < closeH || (currentH === closeH && currentM < closeM)) {
            slotsPerBarber++;
            currentM += 30;
            if (currentM >= 60) {
              currentH++;
              currentM -= 60;
            }
          }
          
          totalSlots = slotsPerBarber * activeBarbers.length;
        }
        
        if (totalSlots > 0) {
          const bookedCount = filtered.filter(b => b.status !== 'cancelled').length;
          occupancy = Math.min(100, Math.round((bookedCount / totalSlots) * 100));
        }
      }
    }
    
    return { filteredBookings: filtered, uniqueClients: clients.size, occupancyRate: occupancy };
  }, [bookings, statsDate, hours, barbers, closures]);

  const stats = [
    { label: 'Citas', value: filteredBookings.length.toString(), trend: '', icon: CalendarIcon },
    { label: 'Ingresos', value: `€${filteredBookings.reduce((acc, b) => acc + (b.price || 0), 0)}`, trend: '', icon: Scissors },
    { label: 'Clientes', value: uniqueClients.toString(), trend: '', icon: User },
    { label: 'Tasa ocupación', value: `${occupancyRate}%`, trend: '', icon: Clock },
  ];

  const displayedBookings = showAllBookings ? bookings : filteredBookings;

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando dashboard...</div>;
  }

  // No Barbershop state
  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm mt-8">
        <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-md">
          <Scissors className="text-white w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Bienvenido a BarberFlow</h2>
        <p className="text-slate-500 mt-3 max-w-md text-lg">
          Aún no tienes una barbería vinculada a tu cuenta. Para comenzar a gestionar tu agenda, primero debes crear tu barbería.
        </p>
        <div className="flex gap-4 mt-8">
          <Button size="lg" onClick={() => (window.location.href = '/register')} className="gap-2 rounded-full shadow-md text-md px-8">
            Crear mi Barbería <ArrowRight className="w-5 h-5" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => auth.signOut()} className="rounded-full">
            Cerrar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-lg mt-2">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Scissors className="w-64 h-64 text-white transform rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white/90 text-xs font-semibold mb-6 backdrop-blur-md">
               <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Panel Activo
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Hola, {adminData?.displayName?.split(' ')[0] || 'Barbero'} 👋
            </h2>
            <p className="text-slate-400 mt-2 text-lg">
              Aquí tienes un resumen de lo que está pasando hoy en <span className="text-white font-medium">{shop?.name || 'tu Barbería'}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-800">Resumen de Actividad</h3>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Input 
            type="date" 
            value={statsDate}
            onChange={(e) => setStatsDate(e.target.value)}
            className="w-40 rounded-xl bg-white border-slate-200"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border border-slate-100 shadow-sm rounded-[24px] bg-white overflow-hidden transition-all hover:shadow-md hover:-translate-y-1 duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-[18px] flex items-center justify-center border border-slate-200/60 shadow-sm">
                  <stat.icon className="w-5 h-5 opacity-80" />
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold px-2.5 py-1 text-xs rounded-full shadow-sm">
                  {stat.trend}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 font-semibold mb-1">{stat.label}</p>
              <h3 className="text-4xl font-display font-bold text-slate-800 tracking-tight">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <Card className="lg:col-span-2 border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 p-8 pb-6">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">Próximas Citas</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Tu agenda para el {format(new Date(statsDate + 'T00:00:00'), 'd de MMMM', { locale: es })}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 rounded-full hidden sm:flex">
                <Label htmlFor="auto-accept" className="text-xs font-semibold cursor-pointer">Auto Aceptar Hoy/Mañana</Label>
                <Switch 
                  id="auto-accept" 
                  checked={autoAcceptEnabled} 
                  onCheckedChange={async (checked) => {
                    if (!shopId) return;
                    setAutoAcceptEnabled(checked);
                    await updateDoc(doc(db, 'barbershops', shopId), { autoAcceptEnabled: checked });
                    toast.success(checked ? 'Aceptación automática activada para hoy y mañana' : 'Aceptación automática desactivada');
                  }} 
                />
              </div>
              <Dialog open={isManualBookingOpen} onOpenChange={setIsManualBookingOpen}>
                <DialogTrigger render={<Button size="sm" className="gap-2 rounded-full px-5 h-10 shadow-sm bg-slate-900 hover:bg-slate-800 text-white transition-colors" />}>
                  <Plus className="w-4 h-4" /> Nueva Cita
                </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Nueva Cita Manual</DialogTitle>
                  <DialogDescription>
                    Registra una cita para un cliente de forma manual.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Nombre del cliente</Label>
                    <Input id="clientName" placeholder="Ej. Juan Pérez" value={manualClientName} onChange={(e) => setManualClientName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service">Servicio</Label>
                    <Select value={manualService} onValueChange={(value) => setManualService(value ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} (€{s.price})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barber">Barbero</Label>
                    <Select value={manualBarber} onValueChange={(value) => setManualBarber(value ?? '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un barbero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Cualquiera (Sin preferencia)</SelectItem>
                        {barbers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input id="date" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Select value={manualTime} onValueChange={(value) => setManualTime(value ?? '')} disabled={!manualDate || !manualBarber || availableSlots.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !manualDate || !manualBarber 
                            ? "Selecciona fecha y barbero primero" 
                            : availableSlots.length === 0 
                              ? "No hay horarios disponibles" 
                              : "Selecciona una hora"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map(time => (
                          <SelectItem key={time} value={time}>{time}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsManualBookingOpen(false)}>Cancelar</Button>
                  <Button onClick={handleManualBooking}>Guardar Cita</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Client Rating Dialog */}
              <Dialog open={!!rateClientBooking} onOpenChange={(open) => !open && setRateClientBooking(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Finalizar y evaluar cliente</DialogTitle>
                  <DialogDescription>
                    Evalúa a {rateClientBooking?.clientName} de 1 a 5 estrellas. Esta nota solo será visible para las barberías.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setClientRating(star)}
                        className="focus:outline-none transition-transform hover:scale-110"
                      >
                        <Star className={`w-12 h-12 ${clientRating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRateClientBooking(null)}>Cancelar</Button>
                  <Button onClick={handleRateClientSubmit}>Guardar y Finalizar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          </CardHeader>
          <CardContent className="p-8 pt-6">
            <div className="space-y-4">
              {displayedBookings.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-[24px] bg-slate-50/50">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium text-lg">No hay citas programadas para esta fecha.</p>
                </div>
              ) : (
                displayedBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-[24px] bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200 transition-all group gap-4 sm:gap-0"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-white rounded-[20px] flex flex-col items-center justify-center border border-slate-200 shadow-sm group-hover:border-slate-300 transition-colors shrink-0">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{format(new Date(booking.date), 'MMM d', { locale: es })}</span>
                        <span className="text-lg font-black text-slate-800 leading-tight tracking-tight mt-0.5">{booking.startTime}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg leading-tight flex items-center gap-2">
                          {booking.clientName}
                          {booking.clientUid !== 'manual' && clientRatingsMap[booking.clientUid] > 0 && (
                            <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold">
                              <Star className="w-3 h-3 fill-current" /> {clientRatingsMap[booking.clientUid].toFixed(1)}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1.5 font-medium">
                          <span className="flex items-center gap-1.5 text-slate-600"><Scissors className="w-3.5 h-3.5" /> {booking.serviceName || 'Servicio'}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {barbers.find(b => b.id === booking.barberId)?.name || 'Barbero'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-slate-800">€{booking.price || 0}</p>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "mt-1 border font-bold text-[10px] tracking-wide px-2 py-0.5 rounded-md",
                            booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            booking.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            booking.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          )}
                        >
                          {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'completed' ? 'Realizado' : booking.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors outline-none shrink-0")}>
                          <MoreVertical className="w-5 h-5 text-slate-600" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-[16px] shadow-lg border-slate-100 p-2">
                          <DropdownMenuItem className="gap-2 cursor-pointer font-medium p-3 rounded-xl focus:bg-emerald-50 focus:text-emerald-700" onClick={() => handleUpdateStatus(booking, 'confirmed')}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Confirmar
                          </DropdownMenuItem>
                          {booking.status !== 'completed' && (
                            <DropdownMenuItem className="gap-2 cursor-pointer py-2.5 rounded-lg my-1 focus:bg-slate-50" onClick={() => handleUpdateStatus(booking, 'completed')}>
                              <CheckCircle2 className="w-4 h-4 text-blue-500" /> <span className="font-medium text-slate-700">Finalizar y Evaluar</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="gap-2 cursor-pointer py-2.5 rounded-lg my-1 focus:bg-red-50 focus:text-red-600 group" onClick={() => handleUpdateStatus(booking, 'cancelled')}>
                            <XCircle className="w-4 h-4 text-red-400 group-focus:text-red-600" /> <span className="font-medium text-slate-700 group-focus:text-red-700">Cancelar cita</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                </div>
              )))}
            </div>
            <Button 
              variant="ghost" 
              className="w-full mt-6 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-xl font-medium"
              onClick={() => setShowAllBookings(!showAllBookings)}
            >
              {showAllBookings ? 'Ver citas recientes' : 'Ver toda la agenda'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions / Summary */}
        <div className="space-y-6">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-slate-900 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Scissors className="w-32 h-32 text-white transform -rotate-12" />
            </div>
            <CardHeader className="pb-4 relative z-10">
              <CardTitle className="text-xl font-bold">Estado de la Barbería</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Nombre</span>
                <span className="font-bold text-right truncate max-w-[150px]">{shop?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Estado</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold tracking-wide">
                  {shop?.active ? 'Abierto' : 'Cerrado'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Comunidad</span>
                <span className="font-medium truncate max-w-[150px]">{shop?.region || 'No definida'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Ciudad</span>
                <span className="font-medium truncate max-w-[150px]">{shop?.city}</span>
              </div>
              <Separator className="bg-slate-800 my-2" />
              <Button variant="secondary" className="w-full gap-2 rounded-full font-bold bg-white text-slate-900 hover:bg-slate-100">
                <Clock className="w-4 h-4" /> Pausa rápida
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-50">
              <CardTitle className="text-xl font-bold text-slate-800">Barberos Activos</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5">
                {barbers.map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                        {b.photoUrl ? <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-400" />}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full border border-white shadow-sm ${b.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-xs font-semibold text-slate-500">{b.active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </div>
                ))}
                {barbers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">No hay barberos registrados.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
