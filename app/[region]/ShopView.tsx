'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Clock,
  Facebook,
  Image as ImageIcon,
  Info,
  Instagram,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
  Star,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookingFlow } from '@/components/BookingFlow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { buildGoogleMapsDirectionsUrl, formatCoordinates } from '@/lib/geo';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

type GalleryPhoto = {
  id: string;
  url?: string;
  createdAt?: {
    seconds?: number;
  } | null;
};

export default function ShopView({ slug, preloadedShop }: { slug: string, preloadedShop?: any }) {
  const { user, profile } = useAuth();
  const [shop, setShop] = React.useState<any>(preloadedShop || null);
  const [services, setServices] = React.useState<any[]>([]);
  const [barbers, setBarbers] = React.useState<any[]>([]);
  const [hours, setHours] = React.useState<any[]>([]);
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [gallery, setGallery] = React.useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetchShopData = async () => {
      try {
        let shopData = shop;
        let shopId = shop?.id;

        if (!shopData) {
          const shopsQuery = query(collection(db, 'barbershops'), where('slug', '==', slug));
          const shopsSnapshot = await getDocs(shopsQuery);

          const shopDoc = shopsSnapshot.docs.find(
            (doc) => doc.data().active !== false && doc.data().setupComplete === true
          );

          if (!shopDoc) {
            if (!cancelled) setLoading(false);
            return;
          }

          if (cancelled) return;

          shopData = { id: shopDoc.id, ...shopDoc.data() };
          shopId = shopDoc.id;
        }

        const [servicesSnap, barbersSnap, hoursSnap, reviewsSnap, gallerySnap] = await Promise.all([
          getDocs(collection(db, 'barbershops', shopId, 'services')),
          getDocs(collection(db, 'barbershops', shopId, 'barbers')),
          getDocs(collection(db, 'barbershops', shopId, 'hours')),
          getDocs(collection(db, 'barbershops', shopId, 'reviews')),
          getDocs(collection(db, 'barbershops', shopId, 'gallery')),
        ]);

        if (cancelled) return;

        const hoursData = hoursSnap.docs.map((doc) => doc.data());
        const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const completeHours = days.map((day, index) => {
          const hourData = hoursData.find((hour: any) => hour.dayOfWeek === index);
          return {
            day,
            open: hourData ? (hourData.closed ? 'Cerrado' : `${hourData.openTime} - ${hourData.closeTime}`) : 'Cerrado',
          };
        });

        const galleryData: GalleryPhoto[] = gallerySnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<GalleryPhoto, 'id'>),
        }));

        setShop(shopData);
        setServices(servicesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setBarbers(barbersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setHours(completeHours);
        setReviews(reviewsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setGallery(galleryData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchShopData().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [slug, shop]); // 'shop' is added to dependencies in case preloadedShop is not immediately available

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="mb-4 text-2xl font-bold">Barberia no encontrada</h1>
        <Link href="/" className={buttonVariants({ variant: 'default' })}>
          Volver al inicio
        </Link>
      </div>
    );
  }

  const getLuminance = (hex: string) => {
    const red = parseInt(hex.slice(1, 3), 16) / 255;
    const green = parseInt(hex.slice(3, 5), 16) / 255;
    const blue = parseInt(hex.slice(5, 7), 16) / 255;

    const channels = [red, green, blue].map((value) =>
      value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
    );

    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };

  const isLightColor = shop.primaryColor ? getLuminance(shop.primaryColor) > 0.5 : false;
  const directionsUrl =
    shop.googleMapsUrl ||
    buildGoogleMapsDirectionsUrl({
      latitude: shop.latitude,
      longitude: shop.longitude,
      address: shop.address,
      label: shop.name,
    });
  const formattedCoordinates = formatCoordinates(shop.latitude, shop.longitude);
  const phoneHref = shop.phone ? `tel:${shop.phone}` : '';
  const whatsappDigits = (shop.whatsapp || '').replace(/\D/g, '');
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : '';
  const backHref = shop.regionSlug ? `/${shop.regionSlug}` : '/';
  const reviewsCount = reviews.length;
  const avgRating =
    reviewsCount > 0 ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) / reviewsCount : shop.rating || 0;
  const displayRating = avgRating.toFixed(1);

  return (
    <div
      className="custom-theme min-h-screen bg-background pb-20"
      style={
        shop.primaryColor
          ? ({
              '--color-primary': shop.primaryColor,
              ...(isLightColor ? { '--color-primary-foreground': '#020617' } : {}),
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background px-4">
        <Link href={backHref} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="max-w-[200px] truncate font-display text-lg font-bold md:max-w-md">{shop.name}</span>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      <div className="container relative z-20 mx-auto mt-8 px-4">
        <div className="flex flex-col gap-12 lg:flex-row">
          <div className="flex-1">
            <div className="mb-8 flex flex-col items-start gap-6 md:flex-row md:items-end">
              <div className="h-32 w-32 overflow-hidden rounded-3xl border-4 border-background bg-white shadow-xl">
                <img src={shop.logo} alt="Logo" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="border-none bg-green-500/10 text-green-600">Abierto ahora</Badge>
                  <div className="flex items-center gap-1 text-sm font-bold">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {displayRating}
                    <span className="font-normal text-muted-foreground">
                      ({reviewsCount} {reviewsCount === 1 ? 'resena' : 'resenas'})
                    </span>
                  </div>
                </div>
                <h1 className="mb-2 font-display text-4xl font-bold md:text-5xl">{shop.name}</h1>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {shop.address || 'Direccion pendiente'}
                </p>
                {shop.locationReference && (
                  <p className="mt-2 text-sm text-muted-foreground">Referencia: {shop.locationReference}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {shop.hasExactLocation && (
                    <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                      Ubicacion exacta verificada
                    </Badge>
                  )}

                  {directionsUrl && (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 rounded-full')}
                    >
                      <Navigation className="h-4 w-4" />
                      Como llegar
                    </a>
                  )}
                </div>
              </div>
            </div>

            <Tabs defaultValue="info" className="w-full">
              <TabsList className="h-12 w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0">
                <TabsTrigger
                  value="info"
                  className="h-12 rounded-none px-0 font-bold transition-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Informacion
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="h-12 rounded-none px-0 font-bold transition-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Resenas
                </TabsTrigger>
                <TabsTrigger
                  value="photos"
                  className="h-12 rounded-none px-0 font-bold transition-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  Fotos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-10 pt-8">
                <section>
                  <h3 className="mb-4 text-xl font-bold">Sobre nosotros</h3>
                  <p className="leading-relaxed text-muted-foreground">
                    {shop.description || 'Esta barberia aun no ha anadido una descripcion.'}
                  </p>
                  <div className="mt-6 flex gap-4">
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Instagram className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Facebook className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" className="rounded-full">
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="mb-6 flex items-center gap-2 text-xl font-bold">
                    <Clock className="h-5 w-5 text-primary" /> Horarios
                  </h3>
                  <div className="grid grid-cols-1 gap-x-12 gap-y-3 md:grid-cols-2">
                    {hours.map((hour) => (
                      <div key={hour.day} className="flex items-center justify-between py-1">
                        <span className="font-medium">{hour.day}</span>
                        <span className={hour.open === 'Cerrado' ? 'font-bold text-destructive' : 'text-muted-foreground'}>
                          {hour.open}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <h3 className="flex items-center gap-2 text-xl font-bold">
                    <Info className="h-5 w-5 text-primary" /> Contacto y llegada
                  </h3>
                  <div className="flex flex-col gap-4 md:flex-row">
                    {phoneHref ? (
                      <a
                        href={phoneHref}
                        className={cn(
                          buttonVariants({ variant: 'outline' }),
                          'h-auto flex-1 justify-start rounded-2xl px-6 py-4'
                        )}
                      >
                        <Phone className="mr-3 h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefono</p>
                          <p className="font-bold">{shop.phone}</p>
                        </div>
                      </a>
                    ) : (
                      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border px-6 py-4 text-muted-foreground">
                        <Phone className="h-5 w-5" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">Telefono</p>
                          <p>No disponible</p>
                        </div>
                      </div>
                    )}

                    {whatsappHref ? (
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({ variant: 'outline' }),
                          'h-auto flex-1 justify-start rounded-2xl px-6 py-4'
                        )}
                      >
                        <MessageCircle className="mr-3 h-5 w-5 text-green-500" />
                        <div className="text-left">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</p>
                          <p className="font-bold">{shop.whatsapp}</p>
                        </div>
                      </a>
                    ) : (
                      <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border px-6 py-4 text-muted-foreground">
                        <MessageCircle className="h-5 w-5" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">WhatsApp</p>
                          <p>No disponible</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {directionsUrl && (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 transition-colors hover:bg-emerald-50"
                    >
                      <Navigation className="mt-0.5 h-5 w-5 text-emerald-600" />
                      <div className="space-y-1">
                        <p className="font-bold text-emerald-900">Abrir ruta exacta en Google Maps</p>
                        <p className="text-sm text-emerald-800">
                          El cliente puede abrir la navegacion con la direccion precisa de la barberia.
                        </p>
                      </div>
                    </a>
                  )}
                </section>
              </TabsContent>

              <TabsContent value="reviews" className="pt-8">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">{displayRating}</h3>
                      <div className="mt-1 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              'h-4 w-4',
                              star <= Math.round(avgRating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground'
                            )}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {reviewsCount} {reviewsCount === 1 ? 'resena verificada' : 'resenas verificadas'}
                      </p>
                    </div>
                    {user && profile?.role === 'client' && <Button>Escribir resena</Button>}
                  </div>

                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="space-y-3 rounded-2xl bg-muted/30 p-6">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{review.clientName}</span>
                          <span className="text-xs text-muted-foreground">
                            {review.createdAt
                              ? review.createdAt?.seconds
                                ? new Date(review.createdAt.seconds * 1000).toLocaleDateString()
                                : new Date(review.createdAt).toLocaleDateString() !== 'Invalid Date'
                                  ? new Date(review.createdAt).toLocaleDateString()
                                  : ''
                              : ''}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-3 w-3',
                                star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                              )}
                            />
                          ))}
                        </div>
                        <p className="italic leading-relaxed text-muted-foreground">&quot;{review.comment}&quot;</p>
                      </div>
                    ))}
                    {reviews.length === 0 && (
                      <div className="py-12 text-center text-muted-foreground">
                        Aun no hay resenas para esta barberia.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="photos" className="pt-8">
                {gallery.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center text-muted-foreground">
                    <ImageIcon className="mx-auto mb-3 h-12 w-12 opacity-20" />
                    Esta barberia todavia no ha subido ninguna foto.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {gallery.map((photo) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="aspect-square overflow-hidden rounded-2xl bg-slate-100"
                      >
                        <img
                          src={photo.url}
                          alt="Gallery"
                          className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="w-full lg:w-[450px]">
            <div className="sticky top-24">
              <BookingFlow shopId={shop.id} services={services} barbers={barbers} shopHours={hours} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
