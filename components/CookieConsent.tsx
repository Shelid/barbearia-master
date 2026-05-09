'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'barberflow_cookie_consent';

type ConsentState = {
  accepted: boolean;
  analytics: boolean;
  preferences: boolean;
  timestamp: number;
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so page loads first
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const save = (consent: ConsentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleAcceptAll = () => {
    save({ accepted: true, analytics: true, preferences: true, timestamp: Date.now() });
  };

  const handleRejectAll = () => {
    save({ accepted: true, analytics: false, preferences: false, timestamp: Date.now() });
  };

  const handleSaveCustom = () => {
    save({ accepted: true, analytics, preferences, timestamp: Date.now() });
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[998] md:hidden"
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto md:max-w-md z-[999]"
          >
            <div className="bg-white border border-slate-200 shadow-2xl md:rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-900 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Cookie className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-white text-sm tracking-wide">Cookies y Privacidad</span>
                </div>
                <button
                  onClick={handleRejectAll}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  aria-label="Rechazar y cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Usamos cookies <strong className="text-slate-900">estrictamente necesarias</strong> para el
                  funcionamiento del sitio (autenticación, sesión y seguridad). Con tu permiso, también
                  podemos activar cookies opcionales para mejorar tu experiencia.
                </p>

                {/* Expand / Customize */}
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {expanded ? 'Ocultar opciones' : 'Personalizar preferencias'}
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-1 pb-2 border-t border-slate-100">
                        {/* Essential - always on */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                              Cookies esenciales
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Necesarias para el login, la sesión y la seguridad. Siempre activas.
                            </p>
                          </div>
                          <div className="shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Siempre
                            </span>
                          </div>
                        </div>

                        {/* Analytics */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">Analítica</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Estadísticas de visitas anónimas para mejorar el servicio.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={analytics}
                              onChange={(e) => setAnalytics(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-800" />
                          </label>
                        </div>

                        {/* Preferences */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800">Preferencias</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Recordar configuraciones de interfaz y región seleccionada.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={preferences}
                              onChange={(e) => setPreferences(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-800" />
                          </label>
                        </div>

                        <button
                          onClick={handleSaveCustom}
                          className="w-full text-center text-xs font-bold text-slate-700 border border-slate-300 rounded-xl py-2 hover:bg-slate-50 transition-colors"
                        >
                          Guardar mis preferencias
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[10px] text-slate-400">
                  Más información en nuestra{' '}
                  <Link href="/cookies" className="underline hover:text-slate-600 transition-colors">
                    Política de Cookies
                  </Link>{' '}
                  y{' '}
                  <Link href="/privacidad" className="underline hover:text-slate-600 transition-colors">
                    Privacidad
                  </Link>
                  .
                </p>
              </div>

              {/* Buttons */}
              <div className="px-5 pb-5 flex gap-2.5">
                <button
                  onClick={handleRejectAll}
                  className="flex-1 h-10 text-xs font-bold border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Solo esenciales
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 h-10 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Aceptar todo
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
