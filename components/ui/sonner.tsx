"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] shrink-0">
            <CircleCheckIcon className="size-5 text-emerald-400" />
          </div>
        ),
        info: (
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0">
            <InfoIcon className="size-5 text-blue-400" />
          </div>
        ),
        warning: (
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0">
            <TriangleAlertIcon className="size-5 text-amber-400" />
          </div>
        ),
        error: (
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] shrink-0">
            <OctagonXIcon className="size-5 text-red-400" />
          </div>
        ),
        loading: (
          <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center border border-slate-500/30 shadow-[0_0_15px_rgba(100,116,139,0.3)] shrink-0">
            <Loader2Icon className="size-5 text-slate-300 animate-spin" />
          </div>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "group flex items-center gap-4 w-full sm:w-[380px] p-4 bg-[#0F172A]/95 backdrop-blur-2xl border border-slate-800 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] rounded-[24px] text-white font-sans transition-all hover:scale-[1.02]",
          title: "text-[15px] font-bold tracking-tight text-white/95 leading-none",
          description: "text-[13px] text-slate-400 font-medium mt-1 leading-snug",
          actionButton: "bg-white text-slate-900 rounded-xl px-4 py-2 font-bold text-sm hover:bg-slate-100 transition-colors",
          cancelButton: "bg-slate-800 text-slate-300 rounded-xl px-4 py-2 font-semibold text-sm hover:bg-slate-700 transition-colors",
          content: "flex flex-col flex-1",
          success: "border-emerald-500/20",
          error: "border-red-500/20",
          warning: "border-amber-500/20",
          info: "border-blue-500/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
