import React from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin } from 'lucide-react';

const ALL_REGIONS = [
  { name: 'Andalucía', slug: 'andalucia' },
  { name: 'Aragón', slug: 'aragon' },
  { name: 'Asturias', slug: 'asturias' },
  { name: 'Islas Baleares', slug: 'islas-baleares' },
  { name: 'Canarias', slug: 'canarias' },
  { name: 'Cantabria', slug: 'cantabria' },
  { name: 'Castilla-La Mancha', slug: 'castilla-la-mancha' },
  { name: 'Castilla y León', slug: 'castilla-y-leon' },
  { name: 'Cataluña', slug: 'cataluna' },
  { name: 'Extremadura', slug: 'extremadura' },
  { name: 'Galicia', slug: 'galicia' },
  { name: 'Madrid', slug: 'madrid' },
  { name: 'Murcia', slug: 'murcia' },
  { name: 'Navarra', slug: 'navarra' },
  { name: 'La Rioja', slug: 'la-rioja' },
  { name: 'País Vasco', slug: 'pais-vasco' },
  { name: 'Comunidad Valenciana', slug: 'comunidad-valenciana' },
  { name: 'Ceuta', slug: 'ceuta' },
  { name: 'Melilla', slug: 'melilla' },
];

export default function RegionesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 flex items-center justify-center w-11 h-11 bg-slate-100 rounded-full text-slate-700 hover:bg-slate-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display text-xl font-bold text-slate-900 ml-2">Todas las Comunidades</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="font-display text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">
            Explora por <span className="text-slate-400">Región</span>
          </h2>
          <p className="text-slate-500 text-lg">Selecciona tu comunidad autónoma para ver las mejores barberías disponibles.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ALL_REGIONS.map((region) => (
            <Link
              key={region.slug}
              href={`/${region.slug}`}
              className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-700 group-hover:text-slate-900 text-lg">{region.name}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
