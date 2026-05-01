'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Megaphone, Printer, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function MarketingPage() {
  const { profile } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
      </div>
    );
  }

  const isConfigured = shop?.setupComplete && shop?.slug;
  const shopUrl = isConfigured ? `barberflow.com/${shop.slug}` : '';
  const qrCodeUrl = isConfigured
    ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`https://${shopUrl}`)}&margin=10`
    : '';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-8 pb-20 print:p-0 print:pb-0 print:bg-white print:m-0 print:h-screen print:w-screen">
      {/* Admin UI - Hidden during print */}
      <div className="mb-8 print:hidden">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Marketing</h1>
              <p className="text-slate-500 mt-1">Material promocional para tu barberia.</p>
            </div>
          </div>
        </div>

        {!isConfigured ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-5 w-5" />
                Configuración Pendiente
              </CardTitle>
              <CardDescription className="text-amber-700/80">
                Para generar tu cartel promocional necesitas configurar el enlace (Slug) de tu barberia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/definicoes">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  Ir a Ajustes para configurar URL
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <Card className="flex-1 w-full">
              <CardHeader>
                <CardTitle>Cartel Promocional (A4)</CardTitle>
                <CardDescription>
                  Imprime este cartel y ponlo en la vitrina de tu barbería o en el mostrador. 
                  Tus clientes podrán escanear el código QR y reservar directamente en tu perfil.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" /> Enlace de reserva:
                  </h4>
                  <p className="font-mono bg-white p-2 rounded-md border border-slate-200 select-all">
                    {shopUrl}
                  </p>
                </div>
                <Button onClick={handlePrint} size="lg" className="w-full sm:w-auto gap-2">
                  <Printer className="h-5 w-5" />
                  Imprimir Cartel
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Consejo: Asegúrate de que la configuración de impresión esté en tamaño A4 y activa los gráficos de fondo si no se ven los colores.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Poster Preview & Print Template */}
      {isConfigured && (
        <div className="w-full max-w-[794px] aspect-[1/1.414] mx-auto bg-white shadow-2xl print:shadow-none border border-slate-200 print:border-none flex flex-col items-center justify-between overflow-hidden relative print:w-[210mm] print:h-[297mm] print:max-w-none">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; margin: 0; padding: 0; }
              header, nav, .print\\:hidden { display: none !important; }
              main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
            }
          `}} />
          
          {/* Top Bar - Minimalist White */}
          <div className="w-full shrink-0 border-b border-slate-100">
            <div className="w-full h-14 bg-white flex items-center justify-between px-10 text-slate-900">
              <span className="font-black tracking-[0.2em] uppercase text-sm">BarberFlow</span>
              <span className="text-sm font-medium text-slate-400">barberflow.com</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center w-full px-12 py-4 text-center">
            {/* Shop Name */}
            <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-4">
              BIENVENIDO A <br/>
              <span className="text-4xl text-slate-900 mt-1 block line-clamp-1">{shop.name}</span>
            </h2>

            <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter my-6">
              RESERVA TU <br/>
              <span className="text-amber-500 text-7xl">CITA ONLINE</span>
            </h1>
            
            <p className="text-xl text-slate-600 font-medium mb-8">
              Sin llamadas · Sin esperas · En menos de 1 minuto
            </p>

            {/* Middle Section - Circles */}
            <div className="flex justify-center gap-8 md:gap-12 w-full mb-8">
              <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-slate-100 text-slate-800 bg-white shadow-sm">
                <span className="text-3xl font-black text-amber-500">24h</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Disponible</span>
              </div>
              <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-slate-100 text-slate-800 bg-white shadow-sm">
                <span className="text-3xl font-black text-amber-500">{'<'}1 MIN</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Reservas</span>
              </div>
              <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-slate-100 text-slate-800 bg-white shadow-sm">
                <span className="text-3xl font-black text-amber-500">0</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">Llamadas</span>
              </div>
            </div>

            {/* Bottom Content - QR and Steps */}
            <div className="w-full bg-slate-50 rounded-3xl p-6 flex items-center justify-between border border-slate-200">
              <div className="flex-1 text-left pr-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-200 pb-2">
                  CÓMO RESERVAR:
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-slate-900 shrink-0 text-base">1</div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">Escanea el código QR</p>
                      <p className="text-sm text-slate-500">Usa la cámara de tu móvil</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-slate-900 shrink-0 text-base">2</div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">Elige horario y barbero</p>
                      <p className="text-sm text-slate-500">Verás nuestra agenda 24h al día</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-slate-900 shrink-0 text-base">3</div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">Confirma tu reserva</p>
                      <p className="text-sm text-slate-500">Recibirás un recordatorio</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-200 pb-2 w-full text-center">
                  ESCANEA AQUÍ
                </h3>
                <div className="p-3 bg-white rounded-3xl shadow-sm border border-slate-100">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" crossOrigin="anonymous" />
                </div>
              </div>
            </div>
          </div>

          {/* Very Bottom - URL */}
          <div className="w-full p-8 pt-0 shrink-0">
            <div className="bg-slate-900 text-white rounded-3xl p-6 text-center shadow-xl">
              <p className="text-xs font-bold text-amber-400 mb-1 uppercase tracking-widest">ENLACE DIRECTO DE RESERVA</p>
              <p className="text-3xl sm:text-4xl font-black font-mono tracking-tight line-clamp-1">{shopUrl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
