'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Scissors,
  Clock,
  Euro,
  Check,
  X
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { buildServiceKeywords } from '@/lib/shop-summary';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDocs
} from 'firebase/firestore';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMin: number;
  active: boolean;
  featured: boolean;
}

export default function ServicesPage() {
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationMin: '30',
    active: true,
      featured: false
  });

  const syncServiceKeywords = React.useCallback(async (currentShopId: string, currentServices: Service[]) => {
    await updateDoc(doc(db, 'barbershops', currentShopId), {
      serviceKeywords: buildServiceKeywords(currentServices),
    });
  }, []);

  const loadServices = React.useCallback(async (currentShopId: string) => {
    const snapshot = await getDocs(collection(db, 'barbershops', currentShopId, 'services'));
    const servicesData = snapshot.docs.map((currentDoc) => ({
      id: currentDoc.id,
      ...currentDoc.data()
    })) as Service[];

    setServices(servicesData);
    setLoading(false);
    return servicesData;
  }, []);

  useEffect(() => {
    if (!profile?.barbershopId) return;

    let cancelled = false;
    setBarbershopId(profile.barbershopId);
    setLoading(true);

    const loadPage = async () => {
      const servicesData = await loadServices(profile.barbershopId);
      if (!cancelled) {
        await syncServiceKeywords(profile.barbershopId, servicesData);
      }
    };

    loadPage().catch((error) => {
      console.error('Error loading services:', error);
      toast.error('No fue posible cargar los servicios');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [loadServices, profile, syncServiceKeywords]);

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        durationMin: service.durationMin.toString(),
        active: service.active,
        featured: service.featured || false
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        durationMin: '30',
        active: true,
        featured: false
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershopId) return;

    const data = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      durationMin: parseInt(formData.durationMin),
      active: formData.active,
      featured: formData.featured,
      barbershopId
    };

    try {
      if (editingService) {
        await updateDoc(doc(db, 'barbershops', barbershopId, 'services', editingService.id), data);
        toast.success('Servicio actualizado');
      } else {
        await addDoc(collection(db, 'barbershops', barbershopId, 'services'), data);
        // Mark shop as set up after adding a service
        await updateDoc(doc(db, 'barbershops', barbershopId), { setupComplete: true });
        toast.success('Servicio creado');
      }
      const nextServices = await loadServices(barbershopId);
      await syncServiceKeywords(barbershopId, nextServices);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Error al guardar el servicio');
    }
  };

  const handleDelete = async (id: string) => {
    if (!barbershopId) return;
    try {
      await deleteDoc(doc(db, 'barbershops', barbershopId, 'services', id));
      const nextServices = await loadServices(barbershopId);
      await syncServiceKeywords(barbershopId, nextServices);
      toast.success('Servicio eliminado');
    } catch (error) {
      toast.error('Error al eliminar el servicio');
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-lg mt-2">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Scissors className="w-64 h-64 text-white transform rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Tus Servicios
            </h2>
            <p className="text-slate-400 mt-2 text-lg">
              Configura y gestiona el catálogo de servicios que ofreces a tus clientes.
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-full px-6 shadow-md bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-8 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-2xl font-bold text-slate-800">Catálogo Actual</CardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar servicios..." 
              className="pl-10 bg-slate-50/50 border-slate-200 h-11 rounded-full shadow-sm text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Nombre del Servicio</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Duración</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Precio</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Estado</TableHead>
                  <TableHead className="py-4 px-8 text-right font-semibold text-slate-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-slate-500 font-medium">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
                        Cargando catálogo...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <Scissors className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium text-lg">No se encontraron servicios.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => (
                    <TableRow key={service.id} className="border-slate-100 hover:bg-slate-50/80 transition-colors group">
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-100 rounded-[14px] flex items-center justify-center shrink-0 border border-slate-200/60 shadow-sm group-hover:bg-white transition-colors">
                            <Scissors className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-base">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-slate-500 truncate max-w-[250px] font-medium mt-0.5">
                                {service.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-2 font-medium text-slate-600">
                          <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                            <Clock className="w-4 h-4" />
                          </div>
                          {service.durationMin} min
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-2 font-bold text-slate-800 text-base">
                          <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600">
                            <Euro className="w-4 h-4" />
                          </div>
                          {service.price.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <Badge variant="secondary" className={cn("font-bold px-3 py-1 text-xs rounded-full shadow-sm border", service.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-100 text-slate-600 border-slate-200/60')}>
                          {service.active ? 'Visible' : 'Oculto'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm bg-white")}>
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-sm border-slate-200">
                            <DropdownMenuItem onClick={() => handleOpenDialog(service)} className="py-2.5 font-medium cursor-pointer">
                              <Edit2 className="w-4 h-4 mr-2 text-slate-500" />
                              Editar Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 font-medium py-2.5 cursor-pointer"
                              onClick={() => handleDelete(service.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Servicio
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <form onSubmit={handleSubmit}>
            <div className="bg-slate-900 p-8 pb-6">
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-base">
                Define los detalles del servicio que ofreces en tu barbería.
              </DialogDescription>
            </div>
            <div className="p-8 space-y-6 bg-white">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-semibold">Nombre del Servicio</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Corte Clásico" 
                  className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-700 font-semibold">Descripción (opcional)</Label>
                <Input 
                  id="description" 
                  placeholder="Breve descripción del servicio" 
                  className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-slate-700 font-semibold">Precio (€)</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    step="0.01"
                    placeholder="25.00" 
                    className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-slate-700 font-semibold">Duración (min)</Label>
                  <Input 
                    id="duration" 
                    type="number" 
                    placeholder="30" 
                    className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                    value={formData.durationMin}
                    onChange={(e) => setFormData({...formData, durationMin: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-[20px] border border-slate-100 p-5 bg-slate-50/50">
                  <div className="space-y-1 my-auto">
                    <Label className="text-base font-bold text-slate-800">Servicio Activo</Label>
                    <p className="text-sm text-slate-500 font-medium">Visible para los clientes</p>
                  </div>
                  <Switch 
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                  />
                </div>
                <div className="flex items-center justify-between rounded-[20px] border border-slate-100 p-5 bg-slate-50/50">
                  <div className="space-y-1 my-auto">
                    <Label className="text-base font-bold text-slate-800">Destacado</Label>
                    <p className="text-sm text-slate-500 font-medium">Aparecerá arriba en la lista</p>
                  </div>
                  <Switch 
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[32px]">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-full shadow-none hover:bg-slate-200/50 text-slate-700 px-6 font-semibold">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md px-8 font-semibold">
                {editingService ? 'Guardar Cambios' : 'Crear Servicio'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
