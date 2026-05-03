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
    <div className="p-4 md:p-8 pb-20 print:p-0 print:pb-0 print:bg-white print:m-0 print:h-screen print:w-screen">
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
                  <p className="font-mono bg-white p-2 rounded-md border border-slate-200 select-all break-all text-sm">
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
        <div className="w-full max-w-[794px] aspect-[1/1.414] mx-auto bg-white shadow-2xl print:shadow-none border border-slate-200 print:border-none flex flex-col items-center justify-between overflow-hidden relative print:w-[210mm] print:h-[297mm] print:max-w-none mb-10">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; margin: 0; padding: 0; }
              header, nav, .print\\:hidden { display: none !important; }
              main { padding: 0 !important; margin: 0 !important; max-width: none !important; }

              /* Force poster content to always render at desktop size */
              .poster-top-bar { height: 3.5rem !important; padding-left: 2.5rem !important; padding-right: 2.5rem !important; }
              .poster-content { padding: 1.5rem 3rem !important; gap: 1.5rem !important; justify-content: space-between !important; }
              .poster-title-sm { font-size: 1.25rem !important; }
              .poster-title-name { font-size: 2.25rem !important; }
              .poster-h1 { font-size: 3.75rem !important; margin-top: 1.5rem !important; margin-bottom: 1.5rem !important; line-height: 1.1 !important; }
              .poster-h1-span { font-size: 4.5rem !important; }
              .poster-subtitle { font-size: 1.25rem !important; margin-bottom: 2rem !important; }
              .poster-circles { gap: 3rem !important; margin-bottom: 2rem !important; }
              .poster-circle { width: 8rem !important; height: 8rem !important; border-width: 4px !important; }
              .poster-circle-num { font-size: 1.875rem !important; }
              .poster-circle-label { font-size: 0.625rem !important; }
              .poster-bottom-box { padding: 1.5rem !important; border-radius: 1.5rem !important; flex-direction: row !important; gap: 0 !important; }
              .poster-steps-title { font-size: 0.75rem !important; margin-bottom: 1rem !important; padding-bottom: 0.5rem !important; }
              .poster-steps { gap: 1rem !important; }
              .poster-step-num { width: 2rem !important; height: 2rem !important; font-size: 1rem !important; }
              .poster-step-text { font-size: 1rem !important; }
              .poster-qr-img { width: 12rem !important; height: 12rem !important; }
              .poster-footer { padding: 2rem !important; padding-top: 0 !important; }
              .poster-footer-inner { border-radius: 1.5rem !important; padding: 1.5rem !important; }
              .poster-footer-label { font-size: 0.75rem !important; margin-bottom: 0.25rem !important; }
              .poster-footer-url { font-size: 2.25rem !important; }
            }
          `}} />
          
          {/* Top Bar - Minimalist White */}
          <div className="w-full shrink-0 border-b border-slate-100">
            <div className="poster-top-bar w-full h-8 md:h-14 bg-white flex items-center justify-between px-4 md:px-10 text-slate-900">
              <span className="font-black tracking-[0.2em] uppercase text-xs md:text-sm">BarberFlow</span>
              <span className="text-xs md:text-sm font-medium text-slate-400">barberflow.com</span>
            </div>
          </div>

          <div className="poster-content flex-1 flex flex-col items-center justify-start gap-1 md:justify-between w-full px-6 md:px-12 py-1 md:py-6 text-center overflow-hidden">
            <h2 className="poster-title-sm text-[9px] md:text-xl font-black text-slate-400 uppercase tracking-[0.2em]">
              BIENVENIDO A <br/>
              <span className="poster-title-name text-lg md:text-4xl text-slate-900 mt-0.5 block leading-tight">{shop.name}</span>
            </h2>

            <h1 className="poster-h1 text-xl md:text-6xl font-black text-slate-900 leading-tight tracking-tighter my-1 md:my-6">
              RESERVA TU <br/>
              <span className="poster-h1-span text-amber-500 text-2xl md:text-7xl">CITA ONLINE</span>
            </h1>
            
            <p className="poster-subtitle text-[10px] md:text-xl text-slate-600 font-medium mb-1 md:mb-8">
              Sin llamadas · Sin esperas · En menos de 1 minuto
            </p>

            {/* Middle Section - Circles */}
            <div className="poster-circles flex justify-center gap-3 md:gap-12 w-full mb-2 md:mb-8">
              <div className="poster-circle flex flex-col items-center justify-center w-16 h-16 md:w-32 md:h-32 rounded-full border md:border-4 border-slate-100 text-slate-800 bg-white shadow-sm shrink-0">
                <span className="poster-circle-num text-sm md:text-3xl font-black text-amber-500">24h</span>
                <span className="poster-circle-label text-[6px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Disponible</span>
              </div>
              <div className="poster-circle flex flex-col items-center justify-center w-16 h-16 md:w-32 md:h-32 rounded-full border md:border-4 border-slate-100 text-slate-800 bg-white shadow-sm shrink-0">
                <span className="poster-circle-num text-sm md:text-3xl font-black text-amber-500">{'<'}1 MIN</span>
                <span className="poster-circle-label text-[6px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Reservas</span>
              </div>
              <div className="poster-circle flex flex-col items-center justify-center w-16 h-16 md:w-32 md:h-32 rounded-full border md:border-4 border-slate-100 text-slate-800 bg-white shadow-sm shrink-0">
                <span className="poster-circle-num text-sm md:text-3xl font-black text-amber-500">0</span>
                <span className="poster-circle-label text-[6px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">Llamadas</span>
              </div>
            </div>

            {/* Bottom Content - QR and Steps */}
            <div className="poster-bottom-box w-full bg-slate-50 rounded-xl md:rounded-3xl p-2 md:p-6 flex items-center justify-between border border-slate-200">
              <div className="flex-1 text-left pr-4">
                <h3 className="poster-steps-title text-[7px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-1 md:mb-4 border-b border-slate-200 pb-1">
                  CÓMO RESERVAR:
                </h3>
                
                <div className="poster-steps space-y-1 md:space-y-4">
                  <div className="flex items-start gap-2 md:gap-4">
                    <div className="poster-step-num w-4 h-4 md:w-8 md:h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-slate-900 shrink-0 text-[8px] md:text-base">1</div>
                    <div className="min-w-0">
                      <p className="poster-step-text font-bold text-slate-900 text-[8px] md:text-base leading-none">Escanea el QR</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 md:gap-4">
                    <div className="poster-step-num w-4 h-4 md:w-8 md:h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-slate-900 shrink-0 text-[8px] md:text-base">2</div>
                    <div className="min-w-0">
                      <p className="poster-step-text font-bold text-slate-900 text-[8px] md:text-base leading-none">Elige horario</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 md:gap-4">
                    <div className="poster-step-num w-4 h-4 md:w-8 md:h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-slate-900 shrink-0 text-[8px] md:text-base">3</div>
                    <div className="min-w-0">
                      <p className="poster-step-text font-bold text-slate-900 text-[8px] md:text-base leading-none">Confirma</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center shrink-0">
                <div className="p-1 md:p-3 bg-white rounded-lg md:rounded-3xl shadow-sm border border-slate-100">
                  <img src={qrCodeUrl} alt="QR Code" className="poster-qr-img w-14 h-14 md:w-48 md:h-48" crossOrigin="anonymous" />
                </div>
              </div>
            </div>
          </div>

          {/* Very Bottom - URL */}
          <div className="poster-footer w-full p-2 md:p-8 pt-0 shrink-0">
            <div className="poster-footer-inner bg-slate-900 text-white rounded-xl md:rounded-3xl p-3 md:p-6 text-center shadow-xl">
              <p className="poster-footer-label text-[8px] md:text-xs font-bold text-amber-400 mb-0.5 md:mb-1 uppercase tracking-widest">ENLACE DIRECTO DE RESERVA</p>
              <p className="poster-footer-url text-sm md:text-4xl font-black font-mono tracking-tight break-all">{shopUrl}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
