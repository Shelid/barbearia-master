'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  User,
  Check,
  X,
  Camera
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
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  getDocs
} from 'firebase/firestore';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Barber {
  id: string;
  name: string;
  bio: string;
  photoUrl: string;
  active: boolean;
}

export default function BarbersPage() {
  const { profile } = useAuth();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    photoUrl: '',
      active: true
  });

  const loadBarbers = React.useCallback(async (currentShopId: string) => {
    const snapshot = await getDocs(collection(db, 'barbershops', currentShopId, 'barbers'));
    const barbersData = snapshot.docs.map((currentDoc) => ({
      id: currentDoc.id,
      ...currentDoc.data()
    })) as Barber[];

    setBarbers(barbersData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!profile?.barbershopId) return;

    setBarbershopId(profile.barbershopId);
    setLoading(true);
    loadBarbers(profile.barbershopId).catch((error) => {
      console.error('Error loading barbers:', error);
      toast.error('No fue posible cargar los barberos');
      setLoading(false);
    });
  }, [loadBarbers, profile]);

  const handleOpenDialog = (barber?: Barber) => {
    if (barber) {
      setEditingBarber(barber);
      setFormData({
        name: barber.name,
        bio: barber.bio || '',
        photoUrl: barber.photoUrl || '',
        active: barber.active
      });
    } else {
      setEditingBarber(null);
      setFormData({
        name: '',
        bio: '',
        photoUrl: '',
        active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershopId) return;

    const data = {
      name: formData.name,
      bio: formData.bio,
      photoUrl: formData.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`,
      active: formData.active,
      barbershopId
    };

    try {
      if (editingBarber) {
        await updateDoc(doc(db, 'barbershops', barbershopId, 'barbers', editingBarber.id), data);
        toast.success('Barbero actualizado');
      } else {
        await addDoc(collection(db, 'barbershops', barbershopId, 'barbers'), data);
        toast.success('Barbero creado');
      }
      await loadBarbers(barbershopId);
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Error al guardar el barbero');
    }
  };

  const handleDelete = async (id: string) => {
    if (!barbershopId) return;
    try {
      await deleteDoc(doc(db, 'barbershops', barbershopId, 'barbers', id));
      await loadBarbers(barbershopId);
      toast.success('Barbero eliminado');
    } catch (error) {
      toast.error('Error al eliminar el barbero');
    }
  };

  const filteredBarbers = barbers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[32px] bg-slate-900 border border-slate-800 p-8 sm:p-10 shadow-lg mt-2">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <User className="w-64 h-64 text-white transform rotate-6" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
              Tus Barberos
            </h2>
            <p className="text-slate-400 mt-2 text-lg">
              Gestiona el equipo de profesionales y su presencia en la barbería.
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-full px-6 shadow-md bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <Plus className="w-4 h-4" />
            Nuevo Barbero
          </Button>
        </div>
      </div>

      <Card className="border border-slate-100 shadow-sm rounded-[32px] bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-8 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-2xl font-bold text-slate-800">Directorio del Equipo</CardTitle>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar barberos..." 
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
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Profesional</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Biografía</TableHead>
                  <TableHead className="py-4 px-8 font-semibold text-slate-600">Estado</TableHead>
                  <TableHead className="py-4 px-8 text-right font-semibold text-slate-600">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-slate-500 font-medium">
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
                        Cargando barberos...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBarbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center">
                        <User className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium text-lg">No se encontró ningún barbero.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBarbers.map((barber) => (
                    <TableRow key={barber.id} className="border-slate-100 hover:bg-slate-50/80 transition-colors group">
                      <TableCell className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 rounded-[16px] border border-slate-200/60 shadow-sm">
                            <AvatarImage src={barber.photoUrl} alt={barber.name} className="object-cover" />
                            <AvatarFallback className="rounded-[16px] bg-slate-100 text-slate-600 font-bold">{barber.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="font-bold text-slate-800 text-base">{barber.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <div className="text-sm text-slate-500 truncate max-w-[300px] font-medium">
                          {barber.bio || 'Sin biografía añadida todavía.'}
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-5">
                        <Badge variant="secondary" className={cn("font-bold px-3 py-1 text-xs rounded-full shadow-sm border", barber.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-slate-100 text-slate-600 border-slate-200/60')}>
                          {barber.active ? 'Disponible' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm bg-white")}>
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-sm border-slate-200">
                            <DropdownMenuItem onClick={() => handleOpenDialog(barber)} className="py-2.5 font-medium cursor-pointer">
                              <Edit2 className="w-4 h-4 mr-2 text-slate-500" />
                              Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 font-medium py-2.5 cursor-pointer"
                              onClick={() => handleDelete(barber.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Barbero
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
                {editingBarber ? 'Editar Profesional' : 'Nuevo Profesional'}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-base">
                Añade a un nuevo miembro a tu equipo y define su perfil.
              </DialogDescription>
            </div>
            <div className="p-8 space-y-6 bg-white">
              <div className="flex justify-center mb-2">
                <div className="relative group">
                  <Avatar className="w-24 h-24 rounded-[24px] border-2 border-slate-100 shadow-sm">
                    <AvatarImage src={formData.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name || 'default'}`} className="object-cover" />
                    <AvatarFallback className="rounded-[24px] bg-slate-50 text-slate-400"><User className="w-10 h-10" /></AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-slate-900/60 rounded-[24px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                    <Camera className="text-white w-6 h-6" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-semibold">Nombre Completo</Label>
                <Input 
                  id="name" 
                  placeholder="Ej: Carlos Barber" 
                  className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photoUrl" className="text-slate-700 font-semibold">URL de la Foto (opcional)</Label>
                <Input 
                  id="photoUrl" 
                  placeholder="https://ejemplo.com/foto.jpg" 
                  className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-slate-700 font-semibold">Especialidad / Bio</Label>
                <Input 
                  id="bio" 
                  placeholder="Especialista en degradados y barba" 
                  className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              </div>
              <div className="flex items-center justify-between rounded-[20px] border border-slate-100 p-5 bg-slate-50/50 mt-4">
                <div className="space-y-1 my-auto">
                  <Label className="text-base font-bold text-slate-800">Profesional Activo</Label>
                  <p className="text-sm text-slate-500 font-medium">Visible para agendamientos</p>
                </div>
                <Switch 
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[32px]">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-full shadow-none hover:bg-slate-200/50 text-slate-700 px-6 font-semibold">
                Cancelar
              </Button>
              <Button type="submit" className="rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-md px-8 font-semibold">
                {editingBarber ? 'Guardar Cambios' : 'Añadir Barbero'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
