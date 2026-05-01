import React from 'react';
import Link from 'next/link';
import { Check, X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 flex items-center justify-center w-11 h-11 bg-slate-100 rounded-full text-slate-700 hover:bg-slate-200 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display text-xl font-bold text-slate-900 ml-2">Planes y Precios</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
            Crece sin <span className="text-primary">límites</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">
            Elige el plan que mejor se adapte al tamaño de tu barbería. Todas las herramientas que necesitas para digitalizar tu negocio y conseguir más clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="relative flex flex-col p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-shadow">
            <div className="mb-8">
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">Starter</h3>
              <p className="text-slate-500 text-sm mb-6 h-10">Para barberos independientes que están empezando.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">€0</span>
                <span className="text-slate-500 font-medium">/ 30 días gratis</span>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>1 barbeiro</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Até 30 agendamentos/mês</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Página pública básica</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Aparece na central</span>
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                <span>Lembretes WhatsApp</span>
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                <span>Relatórios</span>
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                <span>Múltiplos barbeiros</span>
              </li>
            </ul>

            <Link href="/register" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "w-full rounded-full h-14 font-bold text-slate-900 border-slate-300 hover:bg-slate-50")}>
              Empezar Gratis
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="relative flex flex-col p-8 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl transform md:-translate-y-4">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-t-[2rem]" />
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-4">
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 text-xs font-black uppercase tracking-wider py-1.5 px-4 rounded-full shadow-lg">
                Más Popular
              </span>
            </div>
            
            <div className="mb-8 mt-2">
              <h3 className="font-display text-2xl font-bold text-white mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-6 h-10">Para barberías establecidas que quieren automatizar su gestión.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white">€29</span>
                <span className="text-slate-400 font-medium">/mes</span>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-slate-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Até 5 barbeiros</span>
              </li>
              <li className="flex items-start gap-3 text-slate-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-bold text-white">Agendamentos ilimitados</span>
              </li>
              <li className="flex items-start gap-3 text-slate-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Lembretes WhatsApp auto</span>
              </li>
              <li className="flex items-start gap-3 text-slate-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Relatórios mensais</span>
              </li>
              <li className="flex items-start gap-3 text-slate-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Prioridade na central</span>
              </li>
              <li className="flex items-start gap-3 text-slate-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Galeria de fotos</span>
              </li>
              <li className="flex items-start gap-3 text-slate-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Modo férias</span>
              </li>
            </ul>

            <Link href="/register?plan=pro" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full h-14 font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.02] transition-transform")}>
              Elegir Pro
            </Link>
          </div>

          {/* Business Plan */}
          <div className="relative flex flex-col p-8 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-shadow">
            <div className="mb-8">
              <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">Business</h3>
              <p className="text-slate-500 text-sm mb-6 h-10">Para grandes barberías y franquicias con necesidades avanzadas.</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-slate-900">€59</span>
                <span className="text-slate-500 font-medium">/mes</span>
              </div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="font-bold text-slate-900">Barbeiros ilimitados</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Domínio personalizado</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Analytics avançado</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Pré-pagamento online</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Política cancelamento pago</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span>Multi-localidade</span>
              </li>
            </ul>

            <Link href="/register?plan=business" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full h-14 font-bold bg-slate-900 text-white hover:bg-slate-800")}>
              Elegir Business
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
