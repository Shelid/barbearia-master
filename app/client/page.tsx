'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { collectionGroup, getDocs, query, where, doc, updateDoc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Calendar, Clock, MapPin, Scissors, Star, CheckCircle2, ChevronRight, MessageCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

export default function ClientDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any | null>(null);
  const [reviewBooking, setReviewBooking] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileBirthdate, setProfileBirthdate] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [cancelBookingDialog, setCancelBookingDialog] = useState<any | null>(null);

  const canCancel = (booking: any) => {
    if (booking.status !== 'pending' && booking.status !== 'confirmed') return false;
    
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hours, minutes] = booking.startTime.split(':').map(Number);
    
    const bookingDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();
    
    const diffHours = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= 3;
  };

  const handleCancelConfirm = async () => {
    if (!cancelBookingDialog) return;
    try {
      const batch = writeBatch(db);
      
      const bookingRef = doc(db, cancelBookingDialog.refPath);
      const slotRef = doc(db, 'barbershops', cancelBookingDialog.barbershopId, 'booked_slots', cancelBookingDialog.id);
      
      batch.update(bookingRef, { status: 'cancelled' });
      batch.update(slotRef, { status: 'cancelled' });
      
      await batch.commit();
      
      toast.success('Reserva cancelada con éxito');
      setBookings(current => current.map(b => b.id === cancelBookingDialog.id ? { ...b, status: 'cancelled' } : b));
    } catch (error) {
      toast.error('Error al cancelar la reserva');
      console.error(error);
    } finally {
      setCancelBookingDialog(null);
    }
  };

  const handleClientLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          role: 'client',
          displayName: result.user.displayName,
          createdAt: new Date().toISOString(),
        });
      }
      toast.success('¡Bienvenido!');
    } catch (error) {
      toast.error('Error al iniciar sesión');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        if (!cancelled) {
          setUserData(null);
          setBookings([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      (async () => {
        try {
          const [userDoc, bookingsSnap] = await Promise.all([
            getDoc(doc(db, 'users', user.uid)),
            getDocs(
              query(
                collectionGroup(db, 'bookings'),
                where('clientUid', '==', user.uid)
              )
            ),
          ]);

          if (cancelled) return;

          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({ id: userDoc.id, ...data });
            if (!data.birthdate) {
              setProfileName(data.displayName || '');
              setProfilePhotoUrl(data.photoUrl || '');
            }
          } else {
            setUserData(null);
          }

          const bookingsData = bookingsSnap.docs.map((currentDoc) => ({
            id: currentDoc.id,
            refPath: currentDoc.ref.path,
            ...currentDoc.data()
          } as any));

          bookingsData.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.startTime.localeCompare(a.startTime);
          });

          setBookings(bookingsData);
        } catch (error) {
          if (!cancelled) {
            console.error('Error loading client dashboard:', error);
            toast.error('No fue posible cargar tus reservas');
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubAuth();
    };
  }, []);

  const handleCompleteProfile = async () => {
    if (!profileName || !profileBirthdate) {
      toast.error('Por favor, rellena tu nombre y fecha de nacimiento.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
        displayName: profileName,
        birthdate: profileBirthdate,
        photoUrl: profilePhotoUrl
      });
      setUserData((current: any) => current ? ({
        ...current,
        displayName: profileName,
        birthdate: profileBirthdate,
        photoUrl: profilePhotoUrl
      }) : current);
      toast.success('Perfil completado con éxito');
    } catch (error) {
      toast.error('Error al actualizar perfil');
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewBooking) return;
    
    try {
      const reviewData = {
        barbershopId: reviewBooking.barbershopId,
        bookingId: reviewBooking.id,
        clientUid: auth.currentUser?.uid,
        clientName: auth.currentUser?.displayName || 'Cliente',
        rating,
        comment,
        createdAt: new Date().toISOString()
      };

      const batch = writeBatch(db);
      const reviewRef = doc(db, 'barbershops', reviewBooking.barbershopId, 'reviews', reviewBooking.id);
      const bookingRef = doc(db, reviewBooking.refPath);

      batch.set(reviewRef, reviewData);
      batch.update(bookingRef, {
        reviewed: true
      });

      await batch.commit();

      toast.success('¡Gracias por tu valoración!');
      setBookings((current) =>
        current.map((booking) =>
          booking.id === reviewBooking.id ? { ...booking, reviewed: true } : booking
        )
      );
      setReviewBooking(null);
    } catch (e) {
      toast.error('Error al enviar la valoración');
      console.error(e);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-center animate-pulse">Cargando tu panel...</div>;
  }

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-muted/20">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Calendar className="text-primary w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Debes iniciar sesión</h2>
        <p className="text-muted-foreground mt-2 mb-8 max-w-md">Para ver tus reservas y el historial de tus cortes, necesitas acceder a tu cuenta.</p>
        <div className="flex gap-4">
          <Button size="lg" onClick={handleClientLogin}>Iniciar Sesión</Button>
          <Link href="/">
            <Button variant="outline" size="lg">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      {/* Header */}
      <header className="bg-background border-b border-border mb-8 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Scissors className="text-primary-foreground w-4 h-4" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight hidden sm:block">BarberFlow</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Explorar Barberías</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => auth.signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display tracking-tight">Mis Reservas</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus próximas citas y tu historial de estilo.</p>
        </div>

        <div className="space-y-6">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Date/Time Column */}
                  <div className="bg-primary/5 p-6 sm:w-48 flex flex-row sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-2 border-b sm:border-b-0 sm:border-r border-border">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{format(new Date(booking.date), 'EEEE', { locale: es })}</span>
                      <p className="text-3xl font-bold text-primary">{format(new Date(booking.date), 'dd')}</p>
                      <p className="text-sm text-muted-foreground font-medium">{format(new Date(booking.date), 'MMM, yyyy', { locale: es })}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0 sm:mt-4 bg-background/80 px-3 py-1.5 rounded-full shadow-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-bold">{booking.startTime}</span>
                    </div>
                  </div>

                  {/* Details Column */}
                  <div className="p-6 flex-1">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                      <div>
                        <Badge 
                          variant="secondary" 
                          className={`mb-3 border-none text-[10px] uppercase font-bold tracking-wide ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-500/10 text-green-600' 
                              : booking.status === 'completed'
                              ? 'bg-blue-500/10 text-blue-600'
                              : booking.status === 'cancelled'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-yellow-500/10 text-yellow-600'
                          }`}
                        >
                          {booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'completed' ? 'Realizado' : booking.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                        </Badge>
                        <h3 className="text-xl font-bold">{booking.serviceName || 'Servicio de Barbería'}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Scissors className="w-4 h-4" /> 
                            <span>Con {booking.barberId === 'any' ? 'Cualquier Barbero' : (booking.barberName || 'tu Barbero')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <span>€{booking.price || '--'}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                        {canCancel(booking) && (
                          <Button 
                            variant="outline" 
                            className="gap-2 shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setCancelBookingDialog(booking)}
                          >
                            <XCircle className="w-4 h-4" /> Cancelar (hasta 3h antes)
                          </Button>
                        )}
                        {booking.status === 'completed' && !booking.reviewed && (
                          <Button 
                            variant="outline" 
                            className="gap-2 shrink-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => setReviewBooking(booking)}
                          >
                            <Star className="w-4 h-4 fill-current" /> Avaliar (Evaluar)
                          </Button>
                        )}
                        {booking.status === 'completed' && booking.reviewed && (
                          <div className="flex items-center gap-1 text-sm font-bold text-yellow-500 bg-yellow-50 px-3 py-1.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-4 h-4" /> Evaluado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {bookings.length === 0 && (
            <div className="text-center py-20 bg-background rounded-3xl border border-dashed">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold">No tienes reservas aún</h3>
              <p className="text-muted-foreground mt-1 max-w-sm mx-auto mb-6">Encuentra una barbería cerca de ti y agenda tu primer corte de cabello.</p>
              <Link href="/">
                <Button>Explorar Barberías</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewBooking} onOpenChange={(open) => !open && setReviewBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Qué tal fue tu experiencia?</DialogTitle>
            <DialogDescription>
              Valora el servicio de {reviewBooking?.serviceName || 'barbería'} para ayudar a otros clientes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center justify-center space-y-3">
              <Label>Puntuación</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-10 h-10 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comment">Comentario (opcional)</Label>
              <Textarea 
                id="comment" 
                placeholder="El trato fue excelente y el corte justo como lo pedí..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReviewBooking(null)}>Cancelar</Button>
            <Button onClick={handleReviewSubmit}>Enviar valoración</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={!!cancelBookingDialog} onOpenChange={(open) => !open && setCancelBookingDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Cancelar reserva?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres cancelar tu cita para el <strong>{cancelBookingDialog ? format(new Date(cancelBookingDialog.date), 'dd/MM/yyyy') : ''}</strong> a las <strong>{cancelBookingDialog?.startTime}</strong>?
              <br/><br/>
              Esta acción no se puede deshacer y el horario quedará libre para otros clientes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCancelBookingDialog(null)}>No, mantener cita</Button>
            <Button variant="destructive" onClick={handleCancelConfirm}>Sí, cancelar cita</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Profile Completion Dialog */}
      <Dialog open={userData && !userData.birthdate} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Completa tu perfil</DialogTitle>
            <DialogDescription>
              Para continuar y gestionar tus reservas, necesitamos algunos datos básicos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Ej. Juan Pérez" />
            </div>
            <div className="space-y-2">
              <Label>Fecha de nacimiento *</Label>
              <Input type="date" value={profileBirthdate} onChange={(e) => setProfileBirthdate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Foto de perfil (URL) - Opcional</Label>
              <Input value={profilePhotoUrl} onChange={(e) => setProfilePhotoUrl(e.target.value)} placeholder="https://..." />
              {profilePhotoUrl && <img src={profilePhotoUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover mt-2 mx-auto" />}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCompleteProfile} className="w-full">Guardar y continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
