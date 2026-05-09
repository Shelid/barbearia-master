'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Bell,
  Camera,
  Lock,
  MapPin,
  Navigation,
  Palette,
  Save,
  Settings,
  Store,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import {
  buildGoogleMapsDirectionsUrl,
  type Coordinates,
  createShopGeoFields,
  formatCoordinates,
  hasValidCoordinates,
  toOptionalNumber,
} from '@/lib/geo';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  getSpainMunicipalitiesForRegion,
  getSpainRegionByName,
  isSpainMunicipalityInRegion,
  SPAIN_REGIONS,
} from '@/lib/spain-locations';

type ShopSettings = {
  id: string;
  name?: string;
  slug?: string;
  phone?: string;
  region?: string;
  city?: string;
  address?: string;
  description?: string;
  logo?: string;
  image?: string;
  coverImage?: string;
  primaryColor?: string;
  darkMode?: boolean;
  notifyEmail?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  geohash?: string;
  hasExactLocation?: boolean;
  googleMapsUrl?: string;
  locationReference?: string;
  [key: string]: unknown;
};

const COLOR_OPTIONS = [
  { hex: '', name: 'Predeterminado' },
  { hex: '#ffffff', name: 'Blanco' },
  { hex: '#2563eb', name: 'Azul' },
  { hex: '#16a34a', name: 'Verde' },
  { hex: '#dc2626', name: 'Rojo' },
  { hex: '#d97706', name: 'Dorado' },
  { hex: '#7c3aed', name: 'Morado' },
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#e11d48', name: 'Rosa' },
  { hex: '#ea580c', name: 'Naranja' },
];

const LocationPickerMap = dynamic(() => import('@/components/admin/LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-[28px] bg-slate-100 text-sm font-medium text-slate-500">
      Cargando mapa...
    </div>
  ),
});

export default function SettingsPage() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const selectedRegion = shop?.region ? getSpainRegionByName(shop.region) : undefined;
  const availableMunicipalities = selectedRegion?.municipalities ?? [];
  const selectedCity =
    shop?.city && selectedRegion && isSpainMunicipalityInRegion(selectedRegion.name, shop.city)
      ? shop.city
      : '';

  useEffect(() => {
    if (!profile?.barbershopId) return;

    const fetchShop = async () => {
      const shopDoc = await getDoc(doc(db, 'barbershops', profile.barbershopId));
      if (shopDoc.exists()) {
        setShop({ id: shopDoc.id, ...shopDoc.data() });
      }
      setLoading(false);
    };

    fetchShop();
  }, [profile]);

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shop) return;

    setSaving(true);

    const validRegion = getSpainRegionByName(shop.region || '');
    if (!validRegion) {
      toast.error('Selecciona una comunidad/provincia valida.');
      setSaving(false);
      return;
    }

    if (!shop.city || !isSpainMunicipalityInRegion(validRegion.name, shop.city)) {
      toast.error('Selecciona una ciudad valida para la comunidad/provincia elegida.');
      setSaving(false);
      return;
    }

    const slugify = (text: string) =>
      text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');

    const latitude = toOptionalNumber(shop.latitude);
    const longitude = toOptionalNumber(shop.longitude);
    const hasPartialCoordinates =
      (latitude !== null || longitude !== null) && !hasValidCoordinates(latitude, longitude);

    if (hasPartialCoordinates) {
      toast.error('Completa latitud y longitud validas para guardar la ubicacion exacta.');
      setSaving(false);
      return;
    }

    if (shop.slug) {
      const slugQuery = query(collection(db, 'barbershops'), where('slug', '==', shop.slug));
      const slugSnapshot = await getDocs(slugQuery);
      const isTaken = slugSnapshot.docs.some(doc => doc.id !== shop.id);
      if (isTaken) {
        toast.error('Esta URL (Slug) ya esta siendo usada por otra barberia. Por favor, elige otra.');
        setSaving(false);
        return;
      }
    }

    const updatedShop = {
      ...shop,
      region: validRegion.name,
      address: shop.address?.trim() || '',
      locationReference: shop.locationReference?.trim() || '',
      regionSlug: validRegion.slug,
      citySlug: shop.city ? slugify(shop.city) : '',
      ...createShopGeoFields(latitude, longitude),
    };

    try {
      await updateDoc(doc(db, 'barbershops', shop.id), updatedShop);
      setShop(updatedShop);
      toast.success('Configuracion guardada correctamente.');
    } catch (error) {
      toast.error('Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'image' = 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 5 MB.');
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const maxDimension = field === 'logo' ? 600 : 1200;

      if (width > height) {
        if (width > maxDimension) {
          height *= maxDimension / width;
          width = maxDimension;
        }
      } else if (height > maxDimension) {
        width *= maxDimension / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const quality = field === 'logo' ? 0.8 : 0.6;
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        setShop((prev) => (prev ? { ...prev, [field]: dataUrl } : prev));
      }
    };

    img.src = URL.createObjectURL(file);
  };

  const handleColorClick = (color: string) => {
    setShop((prev) => (prev ? { ...prev, primaryColor: color } : prev));
  };

  const handleMapLocationChange = (coordinates: Coordinates) => {
    const nextGeo = createShopGeoFields(coordinates.latitude, coordinates.longitude);
    setShop((prev) => (prev ? { ...prev, ...nextGeo } : prev));
  };

  const handleManualCoordinateChange = (field: 'latitude' | 'longitude', value: string) => {
    const parsedValue = toOptionalNumber(value);

    setShop((prev) => {
      if (!prev) return prev;

      const draft = {
        ...prev,
        [field]: parsedValue,
      };

      const latitude = field === 'latitude' ? parsedValue : toOptionalNumber(draft.latitude);
      const longitude = field === 'longitude' ? parsedValue : toOptionalNumber(draft.longitude);

      if (hasValidCoordinates(latitude, longitude)) {
        return {
          ...draft,
          ...createShopGeoFields(latitude, longitude),
        };
      }

      return {
        ...draft,
        hasExactLocation: false,
        geohash: '',
        googleMapsUrl: '',
      };
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Este navegador no soporta geolocalizacion.');
      return;
    }

    setCapturingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleMapLocationChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        toast.success('Ubicacion exacta capturada correctamente.');
        setCapturingLocation(false);
      },
      () => {
        toast.error('No fue posible obtener tu ubicacion actual.');
        setCapturingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando ajustes...</div>;
  if (!shop) return <div className="p-8 text-center text-slate-500">No se encontro la barberia.</div>;

  const mapsPreviewUrl = buildGoogleMapsDirectionsUrl({
    latitude: shop.latitude,
    longitude: shop.longitude,
    address: shop.address,
    label: shop.name,
  });
  const formattedCoordinates = formatCoordinates(shop.latitude, shop.longitude);
  const selectedLocation = hasValidCoordinates(shop.latitude, shop.longitude)
    ? {
        latitude: Number(shop.latitude),
        longitude: Number(shop.longitude),
      }
    : null;

  return (
    <div className="space-y-8 pb-12">
      <div className="relative mt-2 overflow-hidden rounded-[32px] border border-slate-800 bg-slate-900 p-8 shadow-lg sm:p-10">
        <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-10">
          <Settings className="h-64 w-64 rotate-45 text-white" />
        </div>
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Ajustes del Negocio
            </h2>
            <p className="mt-2 text-lg text-slate-400">
              Gestiona la informacion de tu perfil, la apariencia de la web y la llegada del cliente.
            </p>
          </div>
          <Button
            onClick={() => handleUpdate()}
            disabled={saving}
            size="lg"
            className="gap-2 rounded-full bg-white px-6 font-semibold text-slate-900 shadow-md transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Guardando...' : 'Guardar todo'}
          </Button>
        </div>
      </div>

      <input
        type="file"
        ref={logoInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp"
        onChange={(e) => handleImageUpload(e, 'logo')}
      />
      <input
        type="file"
        ref={coverInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp"
        onChange={(e) => handleImageUpload(e, 'image')}
      />

      <Tabs defaultValue="general" className="mt-6 flex-col">
        <div className="mb-8 flex w-full justify-center">
          <TabsList className="relative flex h-auto w-full max-w-4xl flex-wrap justify-center gap-1 rounded-3xl border border-slate-100 bg-white p-1.5 shadow-sm lg:h-14 lg:flex-nowrap lg:rounded-full">
            <TabsTrigger
              value="general"
              className="h-11 min-w-[150px] flex-1 gap-2 rounded-full font-semibold whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white lg:h-full"
            >
              <Store className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="h-11 min-w-[150px] flex-1 gap-2 rounded-full font-semibold whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white lg:h-full"
            >
              <Palette className="h-4 w-4" />
              Apariencia
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="h-11 min-w-[150px] flex-1 gap-2 rounded-full font-semibold whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white lg:h-full"
            >
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="h-11 min-w-[150px] flex-1 gap-2 rounded-full font-semibold whitespace-nowrap data-[state=active]:bg-slate-900 data-[state=active]:text-white lg:h-full"
            >
              <Lock className="h-4 w-4" />
              Seguridad
            </TabsTrigger>
          </TabsList>
        </div>

        <form onSubmit={handleUpdate} className="block pb-12">
          <TabsContent value="general" className="m-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
            <Card className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-8 pb-6">
                <CardTitle className="text-2xl font-bold text-slate-800">Informacion de la barberia</CardTitle>
                <CardDescription className="mt-1 text-base text-slate-500">
                  Estos datos aparecen en tu pagina publica y ayudan al cliente a encontrarte.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="flex flex-col gap-10 xl:flex-row">
                  <div className="shrink-0 xl:w-[260px]">
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col items-center gap-4">
                        <div
                          className="group relative flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-[40px] border-2 border-dashed border-slate-200 bg-slate-50 shadow-sm transition-colors hover:border-slate-300"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {shop.logo ? (
                            <img src={shop.logo} alt="Logo" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-400">
                              <Upload className="mb-2 h-10 w-10 text-slate-300" />
                              <span className="text-xs font-bold uppercase tracking-wider">Subir logo</span>
                            </div>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Camera className="mb-1 h-6 w-6 text-white" />
                            <span className="text-xs font-bold tracking-wide text-white">CAMBIAR</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-800">Logo de la barberia</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">Max 5 MB (JPG, PNG)</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4">
                        <div
                          className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 shadow-sm transition-colors hover:border-slate-300"
                          onClick={() => coverInputRef.current?.click()}
                        >
                          {shop.image || shop.coverImage ? (
                            <img
                              src={(shop.image as string) || (shop.coverImage as string)}
                              alt="Portada"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center p-4 text-center text-slate-400">
                              <Upload className="mb-2 h-8 w-8 text-slate-300" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Subir foto portada</span>
                            </div>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <Camera className="mb-1 h-6 w-6 text-white" />
                            <span className="text-center text-[10px] font-bold tracking-wide text-white">
                              CAMBIAR PORTADA
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-800">Foto del local</p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Esta imagen aparece en la busqueda de tu ciudad.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="font-bold text-slate-700">Nombre de la barberia</Label>
                        <Input
                          id="name"
                          value={shop.name || ''}
                          className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
                          onChange={(e) => setShop({ ...shop, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="slug" className="font-bold text-slate-700">Slug (URL personalizada)</Label>
                          {shop?.slug && (
                            <div className="flex gap-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-xs font-bold text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                                onClick={() => {
                                  const url = `${window.location.origin}/${shop.slug}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success('Link copiado al portapapeles');
                                }}
                              >
                                Copiar Link
                              </Button>
                              <a 
                                href={`/${shop.slug}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                              >
                                Ver Página
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0">
                          <span className="flex h-11 shrink-0 items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-500">
                            barberflow.com/
                          </span>
                          <Input
                            id="slug"
                            value={shop.slug || ''}
                            className="h-11 rounded-l-none rounded-r-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
                            onChange={(e) => setShop({ ...shop, slug: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="font-bold text-slate-700">Telefono</Label>
                        <Input
                          id="phone"
                          value={shop.phone || ''}
                          className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
                          onChange={(e) => setShop({ ...shop, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region" className="font-bold text-slate-700">Comunidad / Provincia</Label>
                        <Select
                          value={selectedRegion?.name ?? ''}
                          onValueChange={(value) => {
                            const nextRegion = value ?? '';
                            const nextMunicipalities = getSpainMunicipalitiesForRegion(nextRegion);
                            setShop({
                              ...shop,
                              region: nextRegion,
                              city: shop.city && nextMunicipalities.includes(shop.city) ? shop.city : '',
                            });
                          }}
                        >
                          <SelectTrigger id="region" className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500">
                            <SelectValue placeholder="Selecciona una comunidad/provincia" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72 rounded-xl">
                            {SPAIN_REGIONS.map((region) => (
                              <SelectItem key={region.code} value={region.name}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="font-bold text-slate-700">Ciudad</Label>
                        <Select
                          value={selectedCity}
                          onValueChange={(value) => setShop({ ...shop, city: value ?? '' })}
                          disabled={!selectedRegion}
                        >
                          <SelectTrigger id="city" className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500">
                            <SelectValue placeholder={selectedRegion ? 'Selecciona una ciudad' : 'Selecciona primero la comunidad'} />
                          </SelectTrigger>
                          <SelectContent className="max-h-72 rounded-xl">
                            {availableMunicipalities.map((municipality) => (
                              <SelectItem key={municipality} value={municipality}>
                                {municipality}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address" className="font-bold text-slate-700">Direccion completa</Label>
                        <Input
                          id="address"
                          value={shop.address || ''}
                          className="h-11 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
                          onChange={(e) => setShop({ ...shop, address: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 md:p-7">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl space-y-2">
                          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            <MapPin className="h-3.5 w-3.5" />
                            Como llega el cliente
                          </div>
                          <h3 className="text-xl font-bold text-slate-900">Ubicacion exacta de la barberia</h3>
                          <p className="text-sm text-slate-500">
                            Haz clic en el mapa o arrastra el pino hasta la puerta de tu local. Nosotros guardamos la ubicacion exacta por ti.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 rounded-full bg-white"
                            onClick={handleUseCurrentLocation}
                            disabled={capturingLocation}
                          >
                            <MapPin className="h-4 w-4" />
                            {capturingLocation ? 'Capturando...' : 'Usar mi ubicacion actual'}
                          </Button>
                          {mapsPreviewUrl && (
                            <a
                              href={mapsPreviewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 rounded-full bg-white')}
                            >
                              <Navigation className="h-4 w-4" />
                              Previsualizar ruta
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-medium text-slate-500">
                            {selectedLocation
                              ? 'Pino colocado. Puedes moverlo o tocar otro punto del mapa.'
                              : 'Toca el mapa para colocar el pino exactamente donde esta la barberia.'}
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 border border-slate-200">
                            Consejo: acerca el zoom para dejar el punto exacto.
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                          <LocationPickerMap value={selectedLocation} onChange={handleMapLocationChange} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="locationReference" className="font-bold text-slate-700">
                            Referencia para llegar
                          </Label>
                          <Input
                            id="locationReference"
                            placeholder="Ej: frente al parking, junto a la farmacia..."
                            value={shop.locationReference || ''}
                            className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-emerald-500"
                            onChange={(e) => setShop({ ...shop, locationReference: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Badge
                          className={cn(
                            'rounded-full border px-3 py-1',
                            shop.hasExactLocation
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          )}
                        >
                          {shop.hasExactLocation ? 'Ubicacion lista' : 'Pendiente de punto exacto'}
                        </Badge>
                        {formattedCoordinates && (
                          <span className="font-medium text-slate-500">Coordenadas: {formattedCoordinates}</span>
                        )}
                        {shop.geohash && (
                          <span className="font-medium text-slate-400">Geohash preparado</span>
                        )}
                      </div>

                      <details className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                          Ajuste manual avanzado
                        </summary>
                        <p className="mt-2 text-sm text-slate-500">
                          Si lo prefieres, aqui tambien puedes corregir la latitud y la longitud manualmente.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="latitude" className="font-bold text-slate-700">Latitud</Label>
                            <Input
                              id="latitude"
                              inputMode="decimal"
                              placeholder="43.361395"
                              value={shop.latitude ?? ''}
                              className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-emerald-500"
                              onChange={(e) => handleManualCoordinateChange('latitude', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="longitude" className="font-bold text-slate-700">Longitud</Label>
                            <Input
                              id="longitude"
                              inputMode="decimal"
                              placeholder="-5.849389"
                              value={shop.longitude ?? ''}
                              className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-emerald-500"
                              onChange={(e) => handleManualCoordinateChange('longitude', e.target.value)}
                            />
                          </div>
                        </div>
                      </details>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-bold text-slate-700">Descripcion / Sobre nosotros</Label>
                      <textarea
                        id="description"
                        placeholder="Escribe algo sobre tu barberia para que los clientes lo vean..."
                        value={shop.description || ''}
                        className="flex min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        onChange={(e) => setShop({ ...shop, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="m-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
            <Card className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-8 pb-6">
                <CardTitle className="text-2xl font-bold text-slate-800">Personalizacion visual</CardTitle>
                <CardDescription className="mt-1 text-base text-slate-500">
                  Ajusta colores y el estilo general de la experiencia publica.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <div className="space-y-4">
                  <Label className="text-lg font-bold text-slate-800">Color principal</Label>
                  <p className="max-w-xl text-sm font-medium text-slate-500">
                    Elige el color que representa tu barberia. Se usa en botones, acentos e iconos.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.hex || 'default'}
                        type="button"
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border-4 shadow-sm transition-all ${
                          ((!shop.primaryColor && color.hex === '') || shop.primaryColor === color.hex)
                            ? 'scale-110 border-emerald-500'
                            : 'border-slate-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex || '#020617' }}
                        onClick={() => handleColorClick(color.hex)}
                        title={color.name}
                      >
                        {((!shop.primaryColor && color.hex === '') || shop.primaryColor === color.hex) && (
                          <div className="h-3 w-3 rounded-full bg-white shadow-sm" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100" />

                <div className="space-y-4">
                  <Label className="text-lg font-bold text-slate-800">Paleta de fondos</Label>
                  <div className="flex max-w-sm items-center gap-4 rounded-[24px] border border-slate-100 bg-slate-50/50 p-5 transition-shadow hover:shadow-sm">
                    <Switch
                      checked={shop.darkMode || false}
                      onCheckedChange={(value) => setShop({ ...shop, darkMode: value })}
                    />
                    <div>
                      <p className="font-bold text-slate-800">Modo oscuro permanente</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-500">
                        La pagina publica se mostrara en oscuro por defecto.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="m-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
            <Card className="overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-8 pb-6">
                <CardTitle className="text-2xl font-bold text-slate-800">Canales de notificacion</CardTitle>
                <CardDescription className="mt-1 text-base text-slate-500">
                  Configura como quieres recibir avisos de nuevas citas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-8">
                <div className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-slate-50/50 p-6 transition-shadow hover:shadow-sm">
                  <div className="space-y-1">
                    <Label className="text-lg font-bold text-slate-800">Notificaciones por email</Label>
                    <p className="text-sm font-medium text-slate-500">
                      Recibe un correo por cada nueva reserva registrada.
                    </p>
                  </div>
                  <Switch
                    checked={shop.notifyEmail || false}
                    onCheckedChange={(value) => setShop({ ...shop, notifyEmail: value })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="m-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
            <Card className="overflow-hidden rounded-[32px] border border-red-100 bg-white shadow-sm">
              <CardHeader className="border-b border-red-50 bg-red-50/50 p-8 pb-6">
                <CardTitle className="text-2xl font-bold text-red-900">Seguridad de la cuenta</CardTitle>
                <CardDescription className="mt-1 text-base text-red-800/70">
                  Opciones avanzadas y eliminacion de cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div>
                  <Button variant="outline" type="button" size="lg" className="rounded-full font-semibold shadow-sm">
                    Recuperar / cambiar contrasena
                  </Button>
                </div>

                <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800">Teléfono verificado</h4>
                      <p className="text-sm font-medium text-slate-500">Este es el número vinculado a tu cuenta para validaciones de seguridad.</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-100 w-full max-w-sm">
                    <span className="font-display text-lg font-bold text-slate-900 tracking-wider">
                      {profile?.phone || 'No disponible'}
                    </span>
                    {profile?.phoneVerified && (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-3 py-1 ml-auto">
                        Verificado
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-red-100 bg-red-50/30 p-8">
                  <p className="mb-1 text-lg font-bold text-red-700">Zona de peligro extremo</p>
                  <p className="mb-6 text-base font-medium text-red-600/80">
                    Una vez eliminada la barberia, se borraran servicios, barberos y agenda de forma permanente.
                  </p>

                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger
                      className={cn(buttonVariants({ variant: 'destructive' }), 'h-12 rounded-full px-6 font-semibold shadow-sm')}
                      disabled={saving}
                    >
                      Eliminar barberia permanentemente
                    </DialogTrigger>
                    <DialogContent className="rounded-[32px] border-red-100 p-8">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-red-600">
                          Estas absolutamente seguro?
                        </DialogTitle>
                        <DialogDescription className="mt-2 text-base font-medium text-slate-600">
                          Esta accion <strong className="font-bold text-slate-900">NO SE PUEDE DESHACER</strong> y
                          borrara agenda, barberos, servicios y la cuenta administrativa.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-8 gap-3 sm:gap-0">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => setDeleteDialogOpen(false)}
                          disabled={saving}
                          className="rounded-full bg-slate-100 px-6 font-semibold text-slate-800 hover:bg-slate-200"
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          className="rounded-full px-6 font-semibold shadow-md"
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            if (!profile?.uid) return;
                            try {
                              setSaving(true);
                              await updateDoc(doc(db, 'barbershops', shop.id), {
                                active: false,
                                deletedAt: new Date().toISOString(),
                              });
                              await updateDoc(doc(db, 'users', profile.uid), { barbershopId: null });
                              toast.success('Barberia eliminada correctamente.');
                              window.location.href = '/';
                            } catch (error) {
                              toast.error('Error al eliminar la barberia.');
                              setSaving(false);
                              setDeleteDialogOpen(false);
                            }
                          }}
                        >
                          {saving ? 'Eliminando...' : 'Si, borrar todo'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}
