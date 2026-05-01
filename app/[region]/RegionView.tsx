import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, Navigation, ChevronLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { BarbershopCard } from '@/components/BarbershopCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { calculateDistanceKm, formatDistanceKm, hasValidCoordinates, type Coordinates } from '@/lib/geo';
import { getNextAvailableSlot, isShopOpenNow, type HoursSummaryItem } from '@/lib/shop-summary';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';

const SORT_BEST_RATED = 'Mejor valorada';
const SORT_NAME = 'Nombre (A-Z)';
const SORT_NEXT_SLOT = 'Proximo horario libre';
const SORT_DISTANCE = 'Mas cercanas';
const FILTER_EXACT_LOCATION = 'Ubicacion exacta';

type RegionShop = {
  id: string;
  name: string;
  city: string;
  slug: string;
  region: string;
  regionSlug: string;
  setupComplete: boolean;
  active: boolean;
  image: string;
  rating: number;
  reviewsCount: number;
  nextSlot: string;
  distance: string;
  distanceValue: number;
  nextSlotValue: number;
  priceRange: string;
  latitude: number | null;
  longitude: number | null;
  hasExactLocation: boolean;
  serviceKeywords: string[];
  hoursSummary: HoursSummaryItem[];
  [key: string]: any;
};

export default function RegionView({ region }: { region: string }) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<RegionShop[]>([]);
  const [sortBy, setSortBy] = useState(SORT_BEST_RATED);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Este navegador no soporta geolocalizacion.');
      return;
    }

    setLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setSortBy(SORT_DISTANCE);
        toast.success('Distancias activadas para esta comunidad.');
        setLocatingUser(false);
      },
      () => {
        toast.error('No fue posible obtener tu ubicacion.');
        setLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (!region) return;
    let cancelled = false;

    const loadShops = async () => {
      setLoading(true);

      try {
        const snapshot = await getDocs(collection(db, 'barbershops'));
        if (cancelled) {
          return;
        }

        const seenSlugs = new Set<string>();
        const targetRegion = region.toLowerCase().trim().replace(/^-+|-+$/g, '');

        const filteredByRegion = snapshot.docs
          .map((shopDoc) => {
            const data = shopDoc.data();
            let nextSlot = 'Consultar';
            let nextSlotValue = Infinity;

            if (Array.isArray(data.hoursSummary) && data.hoursSummary.length > 0) {
              const nextSlotData = getNextAvailableSlot(data.hoursSummary);
              if (nextSlotData.nextSlot !== 'Consultar') {
                nextSlot = nextSlotData.nextSlot;
                nextSlotValue = nextSlotData.nextSlotValue;
              }
            }

            if (typeof data.nextSlot === 'string' && data.nextSlot && data.nextSlot !== 'Consultar') {
              nextSlot = data.nextSlot;
              nextSlotValue = typeof data.nextSlotValue === 'number' ? data.nextSlotValue : 0;
            }

            if (nextSlot === 'Consultar' && (!data.hoursSummary || data.hoursSummary.length === 0)) {
              nextSlot = 'Abierto hoy';
              nextSlotValue = 0;
            }

            return {
              id: shopDoc.id,
              ...data,
              name: String(data.name || ''),
              city: String(data.city || ''),
              slug: String(data.slug || ''),
              region: String(data.region || ''),
              regionSlug: String(data.regionSlug || ''),
              setupComplete: Boolean(data.setupComplete),
              image: data.image || data.coverImage || data.logo || 'https://picsum.photos/seed/barber/800/600',
              rating: typeof data.rating === 'number' ? data.rating : Number(data.rating ?? 0),
              reviewsCount: Number(data.reviewsCount || 0),
              nextSlot,
              distance: '',
              distanceValue: Infinity,
              nextSlotValue,
              priceRange: String(data.priceRange || 'EUR'),
              latitude: data.latitude ?? null,
              longitude: data.longitude ?? null,
              hasExactLocation: hasValidCoordinates(data.latitude, data.longitude) && data.hasExactLocation !== false,
              serviceKeywords: Array.isArray(data.serviceKeywords) ? data.serviceKeywords : [],
              hoursSummary: Array.isArray(data.hoursSummary) ? (data.hoursSummary as HoursSummaryItem[]) : [],
              active: data.active !== false,
            } as RegionShop;
          })
          .filter((shop) => {
            if (!shop.active) return false;
            if (!shop.setupComplete) return false;
            if (!shop.name || shop.name.length < 3) return false;
            if (!shop.city) return false;
            if (!shop.slug) return false;
            if (seenSlugs.has(shop.slug)) return false;

            let shopRegionSlug = (shop.regionSlug || '').toLowerCase().trim().replace(/^-+|-+$/g, '');
            const shopRegion = (shop.region || '').toLowerCase().trim();

            let isValidMatch = shopRegionSlug === targetRegion || shopRegion === targetRegion;
            if (!isValidMatch) {
              const shopRegionFallback = shopRegion.replace(/ /g, '-').replace(/[^\w-]+/g, '');
              isValidMatch = shopRegionFallback === targetRegion;
            }

            if (!isValidMatch) return false;

            seenSlugs.add(shop.slug);
            return true;
          });

        setShops(filteredByRegion);
      } catch (error) {
        console.error('Error loading shops for region', region, error);
        toast.error('No fue posible cargar las barberias ahora mismo.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadShops();

    return () => {
      cancelled = true;
    };
  }, [region]);

  const regionDisplay = region.charAt(0).toUpperCase() + region.slice(1);

  const shopsWithDistance = shops.map((shop) => {
    if (!userLocation || !hasValidCoordinates(shop.latitude, shop.longitude)) {
      return {
        ...shop,
        distance: '',
        distanceValue: Infinity,
      };
    }

    const distanceValue = calculateDistanceKm(userLocation, {
      latitude: shop.latitude as number,
      longitude: shop.longitude as number,
    });

    return {
      ...shop,
      distance: formatDistanceKm(distanceValue),
      distanceValue,
    };
  });

  const filteredShops = [...shopsWithDistance]
    .filter((shop) => {
      const searchValue = search.toLowerCase();
      const matchesSearch =
        shop.name.toLowerCase().includes(searchValue) || shop.city.toLowerCase().includes(searchValue);
      if (!matchesSearch) return false;

      if (activeFilters.includes('Abierto ahora')) {
        if (!isShopOpenNow(shop.hoursSummary || [])) return false;
      }

      if (activeFilters.includes('Citas hoy') && !shop.nextSlot.startsWith('Hoy')) {
        return false;
      }

      if (activeFilters.includes('Barba') && !shop.serviceKeywords.some((service: string) => service.includes('barba'))) {
        return false;
      }

      if (
        activeFilters.includes('Corte & Lavado') &&
        !shop.serviceKeywords.some((service: string) => service.includes('corte') || service.includes('lavado'))
      ) {
        return false;
      }

      if (activeFilters.includes(FILTER_EXACT_LOCATION) && !shop.hasExactLocation) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === SORT_BEST_RATED) {
        return b.rating - a.rating;
      }
      if (sortBy === SORT_NAME) {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === SORT_NEXT_SLOT) {
        return a.nextSlotValue - b.nextSlotValue;
      }
      if (sortBy === SORT_DISTANCE) {
        return a.distanceValue - b.distanceValue;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 flex items-center justify-center w-11 h-11 bg-slate-100 rounded-full text-slate-700 hover:bg-slate-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar barbería..."
                className="h-11 w-full bg-slate-100 border-transparent rounded-full pl-10 pr-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:bg-white shadow-none transition-all placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className={cn("shrink-0 h-11 w-11 rounded-full border-slate-200 transition-colors shadow-sm", userLocation ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" : "bg-white text-slate-700 hover:bg-slate-50")}
              onClick={handleUseLocation}
              disabled={locatingUser}
              title={userLocation ? "Ubicación activa" : "Usar mi ubicación"}
            >
              <Navigation className={cn("h-4 w-4", locatingUser && "animate-pulse")} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'shrink-0 h-11 w-11 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm')}>
                <SlidersHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-slate-100 bg-white">
                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 cursor-pointer font-medium text-slate-700" onClick={() => setSortBy(SORT_NAME)}>{SORT_NAME}</DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 cursor-pointer font-medium text-slate-700" onClick={() => setSortBy(SORT_BEST_RATED)}>{SORT_BEST_RATED}</DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 cursor-pointer font-medium text-slate-700" onClick={() => setSortBy(SORT_NEXT_SLOT)}>{SORT_NEXT_SLOT}</DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 cursor-pointer font-medium text-slate-700" onClick={() => setSortBy(SORT_DISTANCE)} disabled={!userLocation}>
                  {SORT_DISTANCE}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
              <Link href="/" className="hover:text-slate-900 transition-colors">España</Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900">{regionDisplay}</span>
            </div>
            <span className="text-xs font-black text-slate-500 bg-slate-200/60 px-3 py-1.5 rounded-full">{filteredShops.length} LOCALES</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">
            Barberías en <span className="text-slate-400">{regionDisplay}</span>
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
              <div key={index} className="space-y-4">
                <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredShops.map((shop, index) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <BarbershopCard shop={shop} />
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredShops.length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-2xl font-bold">No encontramos barberias</h3>
            <p className="text-muted-foreground">Prueba ajustando los filtros o buscando en otra zona.</p>
            <Button variant="outline" className="mt-6" onClick={() => setSearch('')}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
