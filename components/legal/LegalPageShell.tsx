import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalPageShellProps = {
  badge: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
  notice?: ReactNode;
};

export function LegalPageShell({
  badge,
  title,
  description,
  lastUpdated,
  sections,
  notice,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
          <div className="hidden items-center gap-2 text-sm font-semibold text-slate-500 sm:flex">
            <ShieldCheck className="h-4 w-4" />
            Documentacion legal
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <Badge className="mb-4 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
                {badge}
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Actualizado: {lastUpdated}
              </p>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Indice</p>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            {notice && (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                {notice}
              </div>
            )}

            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
              >
                <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                <div className="legal-rich mt-4 space-y-4 text-sm leading-7 text-slate-600">{section.content}</div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
