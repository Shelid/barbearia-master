'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Scissors, MapPin, Calendar, ShieldCheck, ChevronRight, Star, LayoutDashboard } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { toast } from 'sonner';

const DEFAULT_REGIONS = [
  { name: 'Asturias', slug: 'asturias', count: 12, image: 'https://images.pexels.com/photos/3722818/pexels-photo-3722818.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { name: 'Madrid', slug: 'madrid', count: 45, image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?q=80&w=800&auto=format&fit=crop' },
  { name: 'Cataluña', slug: 'cataluna', count: 38, image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=800&auto=format&fit=crop' },
  { name: 'Andalucía', slug: 'andalucia', count: 29, image: 'https://images.pexels.com/photos/230743/pexels-photo-230743.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

export default function LandingPage() {
  const [activeRegions, setActiveRegions] = React.useState<any[]>(DEFAULT_REGIONS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { user, profile } = useAuth();

  const router = useRouter();

  const handleClientLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, provider);
        return;
      }
      
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
      router.push('/client');
    } catch (error) {
      toast.error('Error al iniciar sesión');
    }
  };

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        const q = query(collection(db, 'barbershops'));
        const snapshot = await getDocs(q);
        const shops = snapshot.docs.map(doc => doc.data());
        
        const countsByRegion: Record<string, number> = {};
        const seenSlugs = new Set();
        shops.forEach(shop => {
          if (shop.active === false) return;
          if (!shop.setupComplete) return; // Hide orphan/incomplete shops from region counts
          if (!shop.name || shop.name.length < 3) return;
          if (!shop.city) return;
          if (!shop.slug || seenSlugs.has(shop.slug)) return;

          seenSlugs.add(shop.slug);
          
          let regionSlug = (shop.regionSlug || '').toLowerCase().trim();
          regionSlug = regionSlug.replace(/^-+|-+$/g, ''); // Fix trailing dashes from spaces
          
          const regionNameStr = (shop.region || '').toLowerCase().trim();
          
          // Use standard slugs for mapping to DEFAULT_REGIONS
          let key = regionSlug;
          if (!key) {
            key = regionNameStr.replace(/ /g, '-').replace(/[^\w-]+/g, '');
            if (regionNameStr === 'cataluña' || regionNameStr === 'catalunya') key = 'cataluna';
            if (regionNameStr === 'andalucía') key = 'andalucia';
          }

          if (key) {
            countsByRegion[key] = (countsByRegion[key] || 0) + 1;
          }
        });

        setActiveRegions(prev => prev.map(region => ({
          ...region,
          count: countsByRegion[region.slug] || 0
        })));
      } catch (error) {
        console.error('Error fetching region counts:', error);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-bottom border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Scissors className="text-primary-foreground w-6 h-6" />
            </div>
            <span className="font-display text-base sm:text-2xl font-bold tracking-tight">BarberFlow</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="#regions" className="text-sm font-medium hover:text-primary transition-colors">
              Encontrar Barbería
            </Link>
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              ¿Cómo funciona?
            </Link>
          </nav>
          
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex gap-1.5 sm:gap-2">
              {user ? (
                <Link href="/client" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white rounded-full uppercase tracking-wider font-bold text-[9px] sm:text-xs px-2 sm:px-6 transition-all flex items-center gap-1 sm:gap-1.5")}>
                  <Calendar className="w-3 h-3 sm:hidden" />
                  <span className="hidden sm:inline">Mis Reservas</span>
                  <span className="sm:hidden">Reservas</span>
                </Link>
              ) : (
                <Button onClick={handleClientLogin} variant="outline" size="sm" className="bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white rounded-full uppercase tracking-wider font-bold text-[9px] sm:text-xs px-2 sm:px-6 transition-all flex items-center gap-1 sm:gap-1.5">
                  <Calendar className="w-3 h-3 sm:hidden" />
                  <span className="hidden sm:inline">Mis Reservas</span>
                  <span className="sm:hidden">Reservas</span>
                </Button>
              )}
              {user && profile?.role !== 'client' && (
                <Link href="/admin" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white rounded-full uppercase tracking-wider font-bold text-[9px] sm:text-xs px-2 sm:px-6 transition-all flex items-center gap-1 sm:gap-1.5")}>
                  <LayoutDashboard className="w-3 h-3 sm:hidden" />
                  <span className="hidden sm:inline">Panel para Profesional</span>
                  <span className="sm:hidden">Panel</span>
                </Link>
              )}
            </div>
          </div>
            
            {/* Mobile/Tablet view */}
            {/* (Hidden on desktop as we have the link above) */}
          </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[100vh] md:min-h-[100vh] flex items-end overflow-hidden pb-32 md:pb-36">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
            <img 
              src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop" 
              alt="Barbershop Atmosphere" 
              className="w-full h-full object-cover scale-105"
              style={{ objectPosition: '60% 30%' }}
            />
          </div>
          
          <div className="container mx-auto px-4 relative z-20 flex flex-col justify-end pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-4xl pointer-events-auto"
            >
              <Badge className="mb-4 py-1 px-3 text-[10px] sm:text-sm font-medium bg-transparent text-white border border-white/40 shadow-sm backdrop-blur-none whitespace-nowrap">
                #1 Plataforma de Barberías en España
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-white font-bold leading-[1.1] md:leading-[1] mb-5 tracking-tighter">
                La Central Digital de <span className="hidden md:inline"><br/></span>
                <span className="text-white italic">Barberías</span> en España
              </h1>
              <p className="text-base md:text-lg text-white/80 mb-6 max-w-xl leading-relaxed">
                Gestionamos la conexión entre los mejores barberos y clientes de toda España. Encuentra tu estilo o haz crecer tu negocio hoy mismo.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-2">
                <div className="flex flex-col gap-2 w-full sm:w-auto relative z-30">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60 ml-1">Para el Cliente</span>
                  <a href="#regions" className="relative z-30 h-14 md:h-16 px-6 md:px-10 flex items-center justify-center text-base md:text-lg bg-transparent text-white border-2 border-white hover:bg-white hover:text-black rounded-full w-full sm:w-auto pointer-events-auto cursor-pointer transition-all uppercase tracking-wide font-bold">
                    Buscar Barbería <ChevronRight className="ml-2 w-5 h-5" />
                  </a>
                </div>
                
                <div className="hidden sm:block h-12 w-[1px] bg-white/20 mx-2 pointer-events-none" />
                
                <div className="flex flex-col gap-2 w-full sm:w-auto relative z-30">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/60 ml-1">Para el Barbero / Admin</span>
                  {user && profile?.role !== 'client' ? (
                    <Link href="/admin" className="relative z-30 h-16 px-10 flex items-center justify-center text-lg bg-transparent text-white border-2 border-white hover:bg-white hover:text-black rounded-full w-full sm:w-auto pointer-events-auto cursor-pointer transition-all uppercase tracking-wide font-bold">
                      Ir al Panel <ChevronRight className="ml-2 w-5 h-5" />
                    </Link>
                  ) : (
                    <Link href="/login" className="relative z-30 h-14 md:h-16 px-6 md:px-10 flex items-center justify-center text-base md:text-lg bg-transparent text-white border-2 border-white hover:bg-white hover:text-black rounded-full w-full sm:w-auto pointer-events-auto cursor-pointer transition-all uppercase tracking-wide font-bold">
                      Acceso Profesionales <ChevronRight className="ml-2 w-5 h-5" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-8 md:mt-12 flex items-center justify-between sm:justify-start gap-3 md:gap-8 text-white/40 w-full sm:w-auto">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-white tracking-tight">+500</span>
                  <span className="text-xs uppercase tracking-tighter">Barberías</span>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-white tracking-tight">+50k</span>
                  <span className="text-xs uppercase tracking-tighter">Reservas/mes</span>
                </div>
                <div className="w-[1px] h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-white tracking-tight">17</span>
                  <span className="text-xs uppercase tracking-tighter">Regiones</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Role Selection Section - Clear distinction requested by user */}
        <section className="py-20 bg-background relative z-30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Client Area Card */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative group rounded-3xl border border-border bg-gradient-to-br from-muted/50 to-background p-8 md:p-12 shadow-sm transition-all hover:shadow-xl hover:border-primary/20 overflow-hidden"
              >
                <div className="flex flex-col h-full">
                  <Badge variant="outline" className="w-fit mb-6 border-primary/20 text-primary">Para el público</Badge>
                  <h3 className="text-2xl md:text-4xl font-display font-bold mb-4">Área del Cliente</h3>
                  <p className="text-muted-foreground mb-10 text-base md:text-lg leading-relaxed max-w-md">
                    Descubre las mejores barberías de tu ciudad, consulta horarios en tiempo real y reserva tu cita en 3 clicks. Sin llamadas ni esperas.
                  </p>
                  <div className="mt-auto relative z-20 flex flex-col sm:flex-row flex-wrap gap-3">
                    <a href="#regions" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white rounded-full px-8 h-14 text-sm uppercase tracking-wide font-bold pointer-events-auto cursor-pointer relative z-20 transition-all")}>
                      Buscar Barberías Locales
                    </a>
                    {user ? (
                      <Link href="/client" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white rounded-full px-8 h-14 text-sm uppercase tracking-wide font-bold pointer-events-auto cursor-pointer relative z-20 transition-all")}>
                        Mis Reservas
                      </Link>
                    ) : (
                      <Button onClick={handleClientLogin} variant="outline" size="lg" className="bg-transparent text-slate-900 border-2 border-slate-900 hover:bg-slate-900 hover:text-white rounded-full px-8 h-14 text-sm uppercase tracking-wide font-bold pointer-events-auto cursor-pointer relative z-20 transition-all">
                        Soy Cliente (Acceder)
                      </Button>
                    )}
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none z-0" style={{ right: '-5rem', top: '-5rem' }} />
                </div>
              </motion.div>

              {/* Barber Area Card */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="relative group rounded-3xl border border-border bg-slate-950 p-8 md:p-12 shadow-sm transition-all hover:shadow-xl dark overflow-hidden"
              >
                <div className="flex flex-col h-full text-white relative z-10 pointer-events-none">
                  <Badge variant="outline" className="w-fit mb-6 border-white/20 text-white/60 pointer-events-auto">Para profesionales</Badge>
                  <h3 className="text-2xl md:text-4xl font-display font-bold mb-4 pointer-events-auto">Área del Barbero</h3>
                  <p className="text-white/60 mb-10 text-base md:text-lg leading-relaxed max-w-md pointer-events-auto">
                    Lleva tu barbería al siguiente nivel. Gestiona tu agenda, controla tus ingresos y fideliza a tus clientes con nuestra plataforma 360º.
                  </p>
                  <div className="mt-auto flex flex-col sm:flex-row flex-wrap gap-4 relative z-20 pointer-events-auto">
                    <Link href="/register" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "bg-transparent text-white border-2 border-white hover:bg-white hover:text-black rounded-full px-8 h-14 text-sm uppercase tracking-wide font-bold pointer-events-auto cursor-pointer relative z-20 transition-all")}>
                      Registrar mi Barbería
                    </Link>
                    <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "bg-transparent text-white border-2 border-white hover:bg-white hover:text-black rounded-full px-8 h-14 text-sm uppercase tracking-wide font-bold pointer-events-auto cursor-pointer relative z-20 transition-all")}>
                      Acceder al Panel
                    </Link>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none z-0" style={{ right: '-5rem', top: '-5rem' }} />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Regions Grid */}
        <section id="regions" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <h2 className="font-display text-2xl md:text-4xl font-bold mb-4">Explora por Comunidad</h2>
              </div>
              <Link href="/regiones" className={cn(buttonVariants({ variant: 'link' }), "group")}>
                Ver todas las regiones <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {activeRegions.slice(0, 4).map((region, index) => (
                <motion.div
                  key={region.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Link href={`/${region.slug}`} className="group block relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-[24px] bg-slate-100 cursor-pointer">
                    {/* Background Image */}
                    <img 
                      src={region.image} 
                      alt={region.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Top Right Badge */}
                    <div className="absolute top-4 right-4 z-20">
                      <div className="bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <Scissors className="w-3 h-3" />
                        {region.count} Locales
                      </div>
                    </div>

                    {/* Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black/80 z-10 transition-opacity duration-300 group-hover:to-black/90" />
                    
                    {/* Text Content */}
                    <div className="absolute inset-x-0 bottom-0 p-6 z-20 flex flex-col justify-end">
                      <h3 className="text-white font-display text-3xl font-bold leading-tight drop-shadow-md">
                        {region.name}
                      </h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-display text-4xl font-bold mb-4">Todo lo que necesitas en un solo lugar</h2>
              <p className="text-muted-foreground">
                BarberFlow conecta a los mejores profesionales con clientes que valoran su tiempo y estilo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-none shadow-none bg-muted/50">
                <CardContent className="pt-8">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                    <MapPin className="text-amber-600 w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Geolocalización Real</h3>
                  <p className="text-muted-foreground">
                    Encuentra la barbería más cercana a tu posición actual o filtra por tu barrio favorito.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-none bg-muted/50">
                <CardContent className="pt-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                    <Calendar className="text-blue-600 w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Reserva 24/7</h3>
                  <p className="text-muted-foreground">
                    Agenda tu cita en menos de un minuto, a cualquier hora del día, sin esperar a que abran.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-none bg-muted/50">
                <CardContent className="pt-8">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                    <ShieldCheck className="text-emerald-600 w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Garantía de Calidad</h3>
                  <p className="text-muted-foreground">
                    Solo barberías verificadas con valoraciones reales de clientes de la comunidad.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-24 px-4">
          <div className="container mx-auto">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white p-8 md:p-16 text-center shadow-2xl border border-slate-800">
              {/* Decorative gradients */}
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight">
                  ¿Eres dueño de una barbería?
                </h2>
                <p className="text-base md:text-xl text-slate-300 mb-8 md:mb-10 font-medium">
                  Únete a la red más grande de España. Digitaliza tu agenda, reduce cancelaciones y atrae nuevos clientes.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
                  <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "bg-white !text-slate-900 hover:!bg-slate-200 hover:!text-slate-900 rounded-full px-8 md:px-10 h-12 md:h-14 text-sm md:text-base font-bold transition-all shadow-xl hover:scale-105")}>
                    Empezar Gratis
                  </Link>
                  <Link href="/planes" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "bg-slate-800/50 text-white border-slate-700 hover:bg-slate-800 hover:text-white rounded-full px-8 md:px-10 h-12 md:h-14 text-sm md:text-base font-bold transition-all backdrop-blur-sm")}>
                    Ver Planes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 py-6 md:py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center shadow-md">
                <Scissors className="text-white w-4 h-4" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-slate-900">BarberFlow</span>
            </Link>
            
            <div className="flex flex-wrap gap-8 sm:gap-12">
              <div>
                <h4 className="font-bold mb-3 text-slate-900 uppercase text-xs tracking-widest">Plataforma</h4>
                <ul className="space-y-2 text-sm font-medium">
                  <li><Link href="/regiones" className="hover:text-slate-900 transition-colors">Regiones</Link></li>
                  <li><Link href="/admin" className="hover:text-slate-900 transition-colors">Para Barberos</Link></li>
                  <li><Link href="/planes" className="hover:text-slate-900 transition-colors">Precios</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-3 text-slate-900 uppercase text-xs tracking-widest">Legal</h4>
                <ul className="space-y-2 text-sm font-medium">
                  <li><Link href="/privacidad" className="hover:text-slate-900 transition-colors">Privacidad</Link></li>
                  <li><Link href="/terminos" className="hover:text-slate-900 transition-colors">Términos</Link></li>
                  <li><Link href="/cookies" className="hover:text-slate-900 transition-colors">Cookies</Link></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-medium">
            <p>© {new Date().getFullYear()} BarberFlow Spain.</p>
            <div className="flex items-center gap-5">
              <Link href="#" className="hover:text-slate-900 transition-colors">Instagram</Link>
              <Link href="#" className="hover:text-slate-900 transition-colors">Facebook</Link>
              <Link href="#" className="hover:text-slate-900 transition-colors">LinkedIn</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
