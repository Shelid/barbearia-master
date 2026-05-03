'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, User, Scissors, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { db, auth, getAppCheckTokenForBackend } from '@/lib/firebase';
import { collection, getDocs, query, where, writeBatch, doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { toast } from 'sonner';

interface BookingFlowProps {
  shopId: string;
  services: any[];
  barbers: any[];
  shopHours: any[];
}

export function BookingFlow({ shopId, services, barbers, shopHours }: BookingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [closures, setClosures] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistWebsite, setWaitlistWebsite] = useState('');

  useEffect(() => {
    if (!shopId) return;

    let cancelled = false;

    const loadScheduleBlocks = async () => {
      const [closuresSnap, overridesSnap] = await Promise.all([
        getDocs(collection(db, 'barbershops', shopId, 'closures')),
        getDocs(collection(db, 'barbershops', shopId, 'overrides')),
      ]);

      if (cancelled) {
        return;
      }

      setClosures(closuresSnap.docs.map((currentDoc) => currentDoc.data()));
      setOverrides(overridesSnap.docs.map((currentDoc) => currentDoc.data()));
    };

    loadScheduleBlocks().catch((error) => {
      console.error('Error loading schedule blocks:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [shopId]);

  useEffect(() => {
    if (!shopId || !selectedDate || !selectedBarber) {
      setExistingBookings([]);
      return;
    }

    let cancelled = false;

    const loadBookedSlots = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const bookedSlotsQuery = query(
        collection(db, 'barbershops', shopId, 'booked_slots'),
        where('date', '==', dateStr),
        where('status', 'in', ['pending', 'confirmed'])
      );

      const snapshot = await getDocs(bookedSlotsQuery);
      if (!cancelled) {
        setExistingBookings(snapshot.docs.map((currentDoc) => currentDoc.data()));
      }
    };

    loadBookedSlots().catch((error) => {
      console.error('Error loading booked slots:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [shopId, selectedDate, selectedBarber]);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  // Generate slots based on shop hours for selected date
  const getAvailableSlots = () => {
    if (!selectedDate || !selectedBarber) return { slots: [], isVacation: false };
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Check for closures
    const isClosed = closures.some(c => dateStr >= c.startDate && dateStr <= c.endDate);
    if (isClosed) return { slots: [], isVacation: true };

    const dayIndex = selectedDate.getDay();
    const dayConfig = shopHours[dayIndex];

    if (!dayConfig || dayConfig.open === 'Cerrado') return { slots: [], isVacation: false };

    const [start, end] = dayConfig.open.split(' - ');
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const slots = [];
    let currentH = startH;
    let currentM = startM;
    
    const now = new Date();
    const isToday = selectedDate.getDate() === now.getDate() && 
                    selectedDate.getMonth() === now.getMonth() && 
                    selectedDate.getFullYear() === now.getFullYear();
    const nowH = now.getHours();
    const nowM = now.getMinutes();

    while (currentH < endH || (currentH === endH && currentM < endM)) {
      const time = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;
      
      // Check if slot is blocked by override for this barber
      const isBlocked = overrides.some(o => 
        o.date === dateStr && 
        (o.barberId === selectedBarber.id || selectedBarber.id === 'any') &&
        time >= o.startTime && time < o.endTime
      );

      // Check if slot is already booked
      const isBooked = existingBookings.some(b => 
        b.startTime === time && 
        (b.barberId === selectedBarber.id || selectedBarber.id === 'any')
      );

      // Check if the time has already passed (only if today)
      const isPastTime = isToday && (currentH < nowH || (currentH === nowH && currentM <= nowM));

      if (!isBlocked && !isBooked && !isPastTime) {
        slots.push(time);
      }
      
      currentM += 30;
      if (currentM >= 60) {
        currentH += 1;
        currentM = 0;
      }
    }
    return { slots, isVacation: false };
  };

  const { slots: timeSlots, isVacation } = getAvailableSlots();

  const handleConfirm = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedSlot) return;
    
    setLoading(true);
    let currentUser = auth.currentUser;

    if (!currentUser) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          await signInWithRedirect(auth, provider);
          return;
        }
        
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        
        // Ensure user doc exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            role: 'client',
            displayName: currentUser.displayName,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        toast.error('Debes iniciar sesión para poder reservar');
        setLoading(false);
        return;
      }
    }

    try {
      let clientPhone = '';
      let clientPhotoUrl = '';
      if (currentUser?.uid) {
        const uDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (uDoc.exists()) {
          clientPhone = uDoc.data().phone || '';
          clientPhotoUrl = uDoc.data().photoUrl || '';
        }
      }

      const bookingData = {
        barbershopId: shopId,
        barberId: selectedBarber.id,
        barberName: selectedBarber.name || 'Barbero',
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        price: selectedService.price || 0,
        clientUid: currentUser.uid,
        clientName: currentUser.displayName || 'Cliente',
        clientEmail: currentUser.email || '',
        clientPhone: clientPhone,
        clientPhotoUrl: clientPhotoUrl,
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const batch = writeBatch(db);
      
      // Private booking with PII
      const bookingsRef = collection(db, 'barbershops', shopId, 'bookings');
      const newBookingRef = doc(bookingsRef);
      batch.set(newBookingRef, bookingData);

      // Public slot info (no personal info, so regular users can see times block)
      const slotRef = doc(collection(db, 'barbershops', shopId, 'booked_slots'), newBookingRef.id);
      batch.set(slotRef, {
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot,
        barberId: selectedBarber.id,
        status: 'pending',
        bookingId: newBookingRef.id
      });

      await batch.commit();

      toast.success('¡Reserva realizada con éxito!');
      setStep(5); // Success step
    } catch (error) {
      toast.error('Error al realizar la reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!selectedDate) {
      toast.error('Selecciona una fecha antes de unirte a la lista');
      return;
    }

    const clientName = waitlistName.trim();
    const clientPhone = waitlistPhone.trim();

    if (!clientName || !clientPhone) {
      toast.error('Por favor, rellena todos los campos');
      return;
    }

    setLoading(true);

    try {
      const appCheckToken = await getAppCheckTokenForBackend();
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(appCheckToken ? { 'x-firebase-appcheck': appCheckToken } : {}),
        },
        body: JSON.stringify({
          shopId,
          clientName,
          clientPhone,
          preferredDate: format(selectedDate, 'yyyy-MM-dd'),
          barberId: selectedBarber?.id || 'any',
          website: waitlistWebsite,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(result?.error || 'Error al unirse a la lista');
        return;
      }

      setWaitlistName('');
      setWaitlistPhone('');
      setWaitlistWebsite('');
      toast.success('Te hemos agregado a la lista!');
      setStep(1);
    } catch (error) {
      toast.error('Error al unirse a la lista');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-xl overflow-hidden bg-background">
      <div className="bg-primary p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl font-bold">Reserva tu cita</h3>
          <Badge variant="secondary" className="bg-white/20 text-white border-none">
            {step <= 4 ? `Paso ${step} de 4` : '¡Éxito!'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-white' : 'bg-white/20'}`} 
            />
          ))}
        </div>
      </div>

      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Scissors className="w-4 h-4" /> Selecciona un servicio
              </h4>
              <div className="space-y-3">
                {services.filter(s => s.active).map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      nextStep();
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedService?.id === service.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-bold">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.durationMin} min</p>
                    </div>
                    <p className="font-display text-lg font-bold">€{service.price}</p>
                  </button>
                ))}
                {services.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No hay servicios disponibles.</p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={prevStep} className="rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h4 className="font-bold flex items-center gap-2">
                  <User className="w-4 h-4" /> ¿Con quién?
                </h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {barbers.filter(b => b.active).map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => {
                      setSelectedBarber(barber);
                      nextStep();
                    }}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedBarber?.id === barber.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <img src={barber.photoUrl} alt={barber.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="text-left">
                      <p className="font-bold">{barber.name}</p>
                      <p className="text-sm text-muted-foreground">{barber.bio || 'Barbero'}</p>
                    </div>
                    {selectedBarber?.id === barber.id && <Check className="ml-auto text-primary w-5 h-5" />}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSelectedBarber({ id: 'any', name: 'Cualquier barbero' });
                    nextStep();
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-muted hover:border-primary/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-bold">Cualquier barbero</p>
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={prevStep} className="rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h4 className="font-bold flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" /> Fecha y hora
                </h4>
              </div>
              
              <div className="flex flex-col gap-6">
                <div className="flex-1">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border-none"
                    locale={es}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date < today;
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold mb-3 uppercase tracking-wider text-muted-foreground">Horarios disponibles</p>
                  <ScrollArea className="h-[200px] pr-4">
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedSlot === slot ? 'default' : 'outline'}
                          className="h-10 text-sm"
                          onClick={() => {
                            setSelectedSlot(slot);
                            nextStep();
                          }}
                        >
                          {slot}
                        </Button>
                      ))}
                      {timeSlots.length === 0 && (
                        <div className="col-span-3 text-center py-8 space-y-4">
                          <p className="text-sm text-muted-foreground">
                            {isVacation 
                              ? "Esta barbería se encuentra cerrada por vacaciones en la fecha seleccionada."
                              : "No hay horarios disponibles para este día."}
                          </p>
                          {!isVacation && (
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              onClick={() => setStep(6)} // Waitlist step
                            >
                              Unirse a la lista de espera
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setStep(3)} className="rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h4 className="font-bold">Lista de espera</h4>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Te avisaremos si queda algun hueco libre para el dia {selectedDate ? format(selectedDate, 'PPP', { locale: es }) : ''}.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-name">Nombre</Label>
                  <Input
                    id="waitlist-name"
                    placeholder="Tu nombre"
                    value={waitlistName}
                    onChange={(event) => setWaitlistName(event.target.value)}
                    autoComplete="name"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waitlist-phone">Telefono</Label>
                  <Input
                    id="waitlist-phone"
                    placeholder="Tu telefono"
                    value={waitlistPhone}
                    onChange={(event) => setWaitlistPhone(event.target.value)}
                    autoComplete="tel"
                    maxLength={30}
                  />
                </div>
                <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                  <Label htmlFor="waitlist-website">Website</Label>
                  <Input
                    id="waitlist-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={waitlistWebsite}
                    onChange={(event) => setWaitlistWebsite(event.target.value)}
                  />
                </div>
                <Button 
                  className="w-full h-12" 
                  onClick={handleJoinWaitlist}
                  disabled={loading}
                >
                  {loading ? 'Procesando...' : 'Unirme a la lista'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={prevStep} className="rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h4 className="font-bold">Confirmar reserva</h4>
              </div>

              <div className="space-y-6">
                <div className="bg-muted/50 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Servicio</span>
                    <span className="font-bold">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Barbero</span>
                    <span className="font-bold">{selectedBarber?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fecha</span>
                    <span className="font-bold">{selectedDate ? format(selectedDate, 'PPP', { locale: es }) : ''}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Hora</span>
                    <span className="font-bold">{selectedSlot}</span>
                  </div>
                  <div className="pt-4 border-t border-border flex justify-between items-center">
                    <span className="font-bold">Total</span>
                    <span className="text-2xl font-display font-bold text-primary">€{selectedService?.price}</span>
                  </div>
                </div>

                <Button 
                  className="w-full h-14 text-lg font-bold" 
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? 'Procesando...' : 'Confirmar y Reservar'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Al confirmar, aceptas nuestra política de cancelación (2h antes).
                </p>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">¡Reserva confirmada!</h3>
              <p className="text-muted-foreground mb-8">
                Hemos enviado los detalles a tu email. ¡Te esperamos!
              </p>
              <Button className="w-full" onClick={() => setStep(1)}>
                Hacer otra reserva
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
