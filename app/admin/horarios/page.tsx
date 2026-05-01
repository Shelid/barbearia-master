'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Coffee, 
  Plane, 
  Save, 
  Plus, 
  Trash2,
  AlertCircle,
  UserX
} from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { buildHoursSummary } from '@/lib/shop-summary';
import { 
  collection, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  doc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { toast } from 'sonner';

const DAYS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

interface DayHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
  closed: boolean;
}

interface Closure {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  notifyClients: boolean;
}

interface AvailabilityOverride {
  id: string;
  barberId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export default function HoursPage() {
  const { profile } = useAuth();
  const [hours, setHours] = useState<DayHours[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const loadPageData = React.useCallback(async (currentShopId: string) => {
    const [hoursSnap, closuresSnap, barbersSnap, overridesSnap] = await Promise.all([
      getDocs(collection(db, 'barbershops', currentShopId, 'hours')),
      getDocs(collection(db, 'barbershops', currentShopId, 'closures')),
      getDocs(collection(db, 'barbershops', currentShopId, 'barbers')),
      getDocs(collection(db, 'barbershops', currentShopId, 'overrides')),
    ]);

    const hoursData = hoursSnap.docs.map((currentDoc) => currentDoc.data() as DayHours);
    const completeHours = Array.from({ length: 7 }, (_, i) => {
      const existing = hoursData.find((hour) => hour.dayOfWeek === i);
      return existing || {
        dayOfWeek: i,
        openTime: '09:00',
        closeTime: '19:00',
        breakStart: '13:00',
        breakEnd: '14:00',
        closed: i === 0,
      };
    });

    setHours(completeHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    setClosures(
      closuresSnap.docs.map((currentDoc) => ({
        id: currentDoc.id,
        ...currentDoc.data()
      })) as Closure[]
    );
    setBarbers(barbersSnap.docs.map((currentDoc) => ({ id: currentDoc.id, ...currentDoc.data() })));
    setOverrides(
      overridesSnap.docs.map((currentDoc) => ({
        id: currentDoc.id,
        ...currentDoc.data()
      })) as AvailabilityOverride[]
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile?.barbershopId) return;

    setBarbershopId(profile.barbershopId);
    setLoading(true);
    loadPageData(profile.barbershopId).catch((error) => {
      console.error('Error loading hours page:', error);
      toast.error('No fue posible cargar la disponibilidad');
      setLoading(false);
    });
  }, [loadPageData, profile]);

  const handleHourChange = (dayIndex: number, field: keyof DayHours, value: any) => {
    const newHours = [...hours];
    newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
    setHours(newHours);
  };

  const saveHours = async () => {
    if (!barbershopId) return;
    try {
      const promises = hours.map(day => 
        setDoc(doc(db, 'barbershops', barbershopId, 'hours', day.dayOfWeek.toString()), day)
      );
      await Promise.all(promises);
      await updateDoc(doc(db, 'barbershops', barbershopId), {
        hoursSummary: buildHoursSummary(hours),
      });
      toast.success('Horarios actualizados correctamente');
    } catch (error) {
      toast.error('Error al guardar los horarios');
    }
  };

  const addClosure = async () => {
    if (!barbershopId) return;
    try {
      await addDoc(collection(db, 'barbershops', barbershopId, 'closures'), {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: 'Vacaciones',
        notifyClients: true
      });
      await loadPageData(barbershopId);
      toast.success('Periodo de cierre anadido');
    } catch (error) {
      toast.error('Error al anadir el cierre');
    }
  };

  const updateClosure = async (id: string, field: keyof Closure, value: any) => {
    if (!barbershopId) return;
    setClosures((current) =>
      current.map((closure) => (closure.id === id ? { ...closure, [field]: value } : closure))
    );
    try {
      await setDoc(doc(db, 'barbershops', barbershopId, 'closures', id), { [field]: value }, { merge: true });
    } catch (error) {
      toast.error('Error al actualizar el cierre');
    }
  };

  const deleteClosure = async (id: string) => {
    if (!barbershopId) return;
    try {
      await deleteDoc(doc(db, 'barbershops', barbershopId, 'closures', id));
      setClosures((current) => current.filter((closure) => closure.id !== id));
      toast.success('Periodo de cierre eliminado');
    } catch (error) {
      toast.error('Error al eliminar el cierre');
    }
  };

  const addOverride = async () => {
    if (!barbershopId || barbers.length === 0) return;
    try {
      await addDoc(collection(db, 'barbershops', barbershopId, 'overrides'), {
        barberId: barbers[0].id,
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        reason: 'Bloqueo puntual'
      });
      await loadPageData(barbershopId);
      toast.success('Bloqueo anadido');
    } catch (error) {
      toast.error('Error al anadir el bloqueo');
    }
  };

  const updateOverride = async (id: string, field: string, value: any) => {
    if (!barbershopId) return;
    setOverrides((current) =>
      current.map((override) => (override.id === id ? { ...override, [field]: value } : override))
    );
    try {
      await updateDoc(doc(db, 'barbershops', barbershopId, 'overrides', id), { [field]: value });
    } catch (error) {
      toast.error('Error al actualizar el bloqueo');
    }
  };

  const deleteOverride = async (id: string) => {
    if (!barbershopId) return;
    try {
      await deleteDoc(doc(db, 'barbershops', barbershopId, 'overrides', id));
      setOverrides((current) => current.filter((override) => override.id !== id));
      toast.success('Bloqueo eliminado');
    } catch (error) {
      toast.error('Error al eliminar el bloqueo');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-lg mt-2">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Clock className="w-64 h-64 text-white transform -rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Horarios y Disponibilidad
            </h2>
            <p className="text-slate-400 mt-2 text-lg">
              Configura cuándo está abierta tu barbería y gestiona periodos de vacaciones o bloqueos puntuales.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="weekly" className="w-full mt-6 flex-col">
        <div className="flex justify-center w-full mb-8">
          <TabsList className="flex flex-wrap lg:flex-nowrap h-auto lg:h-14 rounded-3xl lg:rounded-full bg-white p-1.5 shadow-sm border border-slate-100 w-full max-w-3xl gap-1 justify-center relative">
            <TabsTrigger value="weekly" className="flex-1 min-w-[180px] h-11 lg:h-full gap-2 rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold whitespace-nowrap">
              <Clock className="w-4 h-4" />
              Horario Semanal
            </TabsTrigger>
            <TabsTrigger value="vacation" className="flex-1 min-w-[180px] h-11 lg:h-full gap-2 rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold whitespace-nowrap">
              <Plane className="w-4 h-4" />
              Modo Vacaciones
            </TabsTrigger>
            <TabsTrigger value="overrides" className="flex-1 min-w-[180px] h-11 lg:h-full gap-2 rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white font-semibold whitespace-nowrap">
              <UserX className="w-4 h-4" />
              Bloqueos Puntuales
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="weekly" className="mt-0">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 p-8 pb-6 bg-slate-50/30">
              <CardTitle className="text-2xl font-bold text-slate-800">Horario de Apertura Regular</CardTitle>
              <CardDescription className="text-base mt-1">Define el horario comercial base y descansos para cada día de la semana.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-4">
                {hours.map((day, index) => (
                  <div key={day.dayOfWeek} className={cn("flex flex-col xl:flex-row xl:items-center gap-6 p-6 rounded-[24px] border transition-colors", day.closed ? "bg-slate-50/50 border-slate-100/50" : "bg-white border-slate-200/60 shadow-sm")}>
                    <div className="w-36 font-bold text-lg text-slate-800">{DAYS[day.dayOfWeek]}</div>
                    
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <Switch 
                        checked={!day.closed}
                        onCheckedChange={(checked) => handleHourChange(index, 'closed', !checked)}
                      />
                      <span className={cn("text-sm font-bold", day.closed ? 'text-slate-400' : 'text-emerald-600')}>
                        {day.closed ? 'Cerrado' : 'Abierto'}
                      </span>
                    </div>

                    {!day.closed && (
                      <div className="flex flex-wrap items-center gap-6 flex-1">
                        <div className="flex items-center gap-3">
                          <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider w-16">Abre</Label>
                          <Input 
                            type="time" 
                            className="w-32 h-11 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-emerald-500 font-medium" 
                            value={day.openTime || '09:00'}
                            onChange={(e) => handleHourChange(index, 'openTime', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider w-16">Cierra</Label>
                          <Input 
                            type="time" 
                            className="w-32 h-11 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-emerald-500 font-medium" 
                            value={day.closeTime || '19:00'}
                            onChange={(e) => handleHourChange(index, 'closeTime', e.target.value)}
                          />
                        </div>
                        <div className="h-8 w-[2px] bg-slate-100 hidden 2xl:block mx-2 rounded-full" />
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-2 sm:gap-3 bg-amber-50/50 p-3 sm:px-4 rounded-2xl border border-amber-100/50 w-full lg:w-auto mt-2 sm:mt-0">
                          <div className="flex items-center gap-2 mr-auto sm:mr-0">
                            <Coffee className="w-4 h-4 text-amber-600" />
                            <Label className="text-xs uppercase text-amber-700/80 font-bold tracking-wider">Pausa</Label>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Input 
                              type="time" 
                              className="flex-1 sm:w-28 h-10 bg-white border-amber-200 rounded-lg focus-visible:ring-amber-500 font-medium text-sm" 
                              value={day.breakStart || '13:00'}
                              onChange={(e) => handleHourChange(index, 'breakStart', e.target.value)}
                            />
                            <span className="text-amber-300 font-bold">-</span>
                            <Input 
                              type="time" 
                              className="flex-1 sm:w-28 h-10 bg-white border-amber-200 rounded-lg focus-visible:ring-amber-500 font-medium text-sm" 
                              value={day.breakEnd || '14:00'}
                              onChange={(e) => handleHourChange(index, 'breakEnd', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-6 border-t border-slate-50">
                <Button onClick={saveHours} size="lg" className="gap-2 px-10 rounded-full shadow-md bg-slate-900 text-white hover:bg-slate-800 font-semibold text-base py-6">
                  <Save className="w-5 h-5" />
                  Guardar Horarios
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vacation" className="mt-8">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 p-8 pb-6 bg-slate-50/30 gap-6">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800">Cierres y Vacaciones</CardTitle>
                <CardDescription className="text-base mt-1">Bloquea la agenda completa por periodos largos.</CardDescription>
              </div>
              <Button onClick={addClosure} size="lg" className="gap-2 rounded-full border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm font-semibold">
                <Plus className="w-5 h-5" />
                Añadir Periodo de Cierre
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              {closures.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-[24px] bg-slate-50/50 flex flex-col items-center justify-center">
                  <Plane className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium text-lg">No hay periodos de cierre configurados a futuro.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {closures.map((closure) => (
                    <div key={closure.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-[24px] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow items-end">
                      <div className="grid gap-2 md:col-span-3">
                        <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Fecha de Inicio</Label>
                        <Input 
                          type="date" 
                          className="bg-slate-50 border-slate-200 rounded-xl h-11"
                          value={closure.startDate || ''}
                          onChange={(e) => updateClosure(closure.id, 'startDate', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 md:col-span-3">
                        <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Fecha de Fin</Label>
                        <Input 
                          type="date" 
                          className="bg-slate-50 border-slate-200 rounded-xl h-11"
                          value={closure.endDate || ''}
                          onChange={(e) => updateClosure(closure.id, 'endDate', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 md:col-span-5">
                        <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Motivo (Interno)</Label>
                        <Input 
                          placeholder="Ej: Reforma del local" 
                          className="bg-slate-50 border-slate-200 rounded-xl h-11"
                          value={closure.reason || ''}
                          onChange={(e) => updateClosure(closure.id, 'reason', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={!!closure.notifyClients}
                            onCheckedChange={(checked) => updateClosure(closure.id, 'notifyClients', checked)}
                          />
                          <span className="text-xs font-medium text-slate-600">Notificar</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg"
                          onClick={() => deleteClosure(closure.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-8 p-5 bg-amber-50/50 border border-amber-200/50 rounded-[20px] flex gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                <div className="text-sm text-amber-900">
                  <p className="font-bold">Importante:</p>
                  <p className="mt-1 text-amber-800">Durante los periodos de cierre, tu barbería aparecerá como &quot;En vacaciones&quot; en el portal público y no se permitirán nuevos agendamientos.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="overrides" className="mt-8">
          <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 p-8 pb-6 bg-slate-50/30 gap-6">
              <div>
                <CardTitle className="text-2xl font-bold text-slate-800">Bloqueos de Barbero</CardTitle>
                <CardDescription className="text-base mt-1">Bloquea horarios específicos para barberos individuales.</CardDescription>
              </div>
              <Button onClick={addOverride} size="lg" className="gap-2 rounded-full border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-sm font-semibold">
                <Plus className="w-5 h-5" />
                Añadir Bloqueo Puntual
              </Button>
            </CardHeader>
            <CardContent className="p-8">
              {overrides.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-[24px] bg-slate-50/50 flex flex-col items-center justify-center">
                  <UserX className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium text-lg">No hay bloqueos configurados.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {overrides.map((override) => (
                    <div key={override.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-[24px] border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow items-end">
                      <div className="grid gap-2 md:col-span-3">
                        <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Barbero</Label>
                        <Select 
                          value={override.barberId || ""} 
                          onValueChange={(val) => updateOverride(override.id, 'barberId', val)}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl h-11">
                            <SelectValue placeholder="Seleccionar barbero" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200">
                            {barbers.map(b => (
                              <SelectItem key={b.id} value={b.id} className="cursor-pointer">{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 md:col-span-3">
                        <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Fecha</Label>
                        <Input 
                          type="date" 
                          className="bg-slate-50 border-slate-200 rounded-xl h-11 text-sm font-medium"
                          value={override.date || ""}
                          onChange={(e) => updateOverride(override.id, 'date', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Inicio</Label>
                        <Input 
                          type="time" 
                          className="bg-slate-50 border-slate-200 rounded-xl h-11 text-sm font-medium"
                          value={override.startTime || ""}
                          onChange={(e) => updateOverride(override.id, 'startTime', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Fin</Label>
                        <Input 
                          type="time" 
                          className="bg-slate-50 border-slate-200 rounded-xl h-11 text-sm font-medium"
                          value={override.endTime || ""}
                          onChange={(e) => updateOverride(override.id, 'endTime', e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col md:flex-row items-center md:col-span-2 gap-4">
                        <div className="grid gap-2 flex-1 w-full">
                          <Label className="text-slate-500 uppercase text-xs font-bold tracking-wider">Motivo</Label>
                          <Input 
                            placeholder="Ej: Médico" 
                            className="bg-slate-50 border-slate-200 rounded-xl h-11 text-sm"
                            value={override.reason || ""}
                            onChange={(e) => updateOverride(override.id, 'reason', e.target.value)}
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl w-11 h-11 md:mb-0 mb-4 self-end shrink-0"
                          onClick={() => deleteOverride(override.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
