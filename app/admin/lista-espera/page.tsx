'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Phone, 
  Trash2, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  deleteDoc, 
  doc, 
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function WaitlistPage() {
  const { profile } = useAuth();
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const loadPageData = React.useCallback(async (currentShopId: string) => {
    const [waitlistSnap, barbersSnap] = await Promise.all([
      getDocs(collection(db, 'barbershops', currentShopId, 'waitlist')),
      getDocs(collection(db, 'barbershops', currentShopId, 'barbers')),
    ]);

    const waitlistData = waitlistSnap.docs.map((currentDoc) => ({
      id: currentDoc.id,
      ...currentDoc.data()
    })) as any[];

    waitlistData.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setWaitlist(waitlistData);
    setBarbers(barbersSnap.docs.map((currentDoc) => ({ id: currentDoc.id, ...currentDoc.data() } as any)));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile?.barbershopId) return;

    setBarbershopId(profile.barbershopId);
    setLoading(true);
    loadPageData(profile.barbershopId).catch((error) => {
      console.error('Error loading waitlist:', error);
      toast.error('No fue posible cargar la lista de espera');
      setLoading(false);
    });
  }, [loadPageData, profile]);

  const handleDelete = async (id: string) => {
    if (!barbershopId) return;
    try {
      await deleteDoc(doc(db, 'barbershops', barbershopId, 'waitlist', id));
      setWaitlist((current) => current.filter((item) => item.id !== id));
      toast.success('Entrada eliminada');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleNotify = async (id: string) => {
    if (!barbershopId) return;
    try {
      const notifiedAt = new Date().toISOString();
      await updateDoc(doc(db, 'barbershops', barbershopId, 'waitlist', id), {
        notifiedAt
      });
      setWaitlist((current) =>
        current.map((item) => (item.id === id ? { ...item, notifiedAt } : item))
      );
      toast.success('Cliente marcado como notificado');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando lista de espera...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-lg mt-2">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Users className="w-64 h-64 text-white transform -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Lista de Espera
            </h2>
            <p className="text-slate-400 mt-2 text-lg">
              Gestiona a los clientes que están a la espera de un hueco libre en la agenda.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-3 border border-white/10 shadow-sm mt-4 md:mt-0">
            <span className="text-white font-semibold text-lg">{waitlist.length}</span>
            <span className="text-slate-300">Clientes en espera</span>
          </div>
        </div>
      </div>

      <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-8 pb-6 bg-slate-50/30">
          <CardTitle className="text-2xl font-bold text-slate-800">Solicitudes Activas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Cliente</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Fecha Preferida</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Barbero</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Estado</TableHead>
                  <TableHead className="py-4 px-8 text-right font-semibold text-slate-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium text-lg">No hay clientes en la lista de espera.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  waitlist.map((item) => (
                    <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <TableCell className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-base">{item.clientName}</span>
                          <span className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                            <Phone className="w-3.5 h-3.5" /> {item.clientPhone}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-slate-50 px-3 py-1.5 rounded-lg w-fit border border-slate-100">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          {item.preferredDate}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="font-medium text-slate-700 font-display">
                          {barbers.find(b => b.id === item.barberId)?.name || 'Cualquier barbero'}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        {item.notifiedAt ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-none gap-1.5 px-3 py-1 text-xs font-bold rounded-full shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Notificado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs font-bold rounded-full shadow-sm bg-amber-50 text-amber-700 border border-amber-200/60">
                            <Clock className="w-3.5 h-3.5" /> Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          {!item.notifiedAt && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-full gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-semibold"
                              onClick={() => handleNotify(item.id)}
                            >
                              <CheckCircle2 className="w-4 h-4" /> Marcar Notificado
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-9 h-9 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
