"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BarChart3,
  ClipboardList,
  Compass,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Menu,
  Settings,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import { NOT_GMP_NOTICE, ROLE_LABEL, type AppRole } from "@/lib/domain";

const NAV = [
  { href: "/tablero", label: "Tablero ejecutivo", icon: LayoutDashboard },
  { href: "/stars", label: "Evaluación STARS", icon: Compass },
  { href: "/departamentos", label: "Evaluación departamental", icon: ClipboardList },
  { href: "/equipo-ejecutivo", label: "Equipo ejecutivo", icon: Users, mdOnly: true },
  { href: "/riesgos", label: "Gestión de riesgos", icon: ShieldAlert },
  { href: "/prioridades", label: "Prioridades estratégicas", icon: BarChart3 },
  { href: "/plan-90-dias", label: "Plan de 90 días", icon: ListChecks },
  { href: "/kpis", label: "Gestión de KPIs", icon: Gauge },
  { href: "/reportes", label: "Reportes y exportación", icon: FileText },
  { href: "/administracion", label: "Administración", icon: Settings, mdOnly: true },
];

export function AppShell({
  children,
  role,
  name,
  cycleName,
  completion,
  signOut,
}: {
  children: ReactNode;
  role: AppRole;
  name: string;
  cycleName: string | null;
  completion: { approved: number; total: number };
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  // El menú móvil se cierra solo al navegar: queda abierto únicamente en la ruta donde se abrió.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean) => setOpenAt(v ? pathname : null);

  const items = NAV.filter((i) => !i.mdOnly || role === "md");

  const nav = (
    <nav aria-label="Módulos" className="flex flex-col gap-0.5 px-3">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-3 rounded-[4px] px-3 py-2 text-[0.9rem] transition-colors",
              active ? "bg-white text-navy font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/tablero" className="block px-6 pt-6 pb-5 text-white">
      <span className="block text-[1.05rem] font-bold tracking-[0.01em]">Biogalenic</span>
      <span className="mt-0.5 flex gap-[0.32em] text-[0.8rem] font-semibold text-white/60" aria-label="STARS">
        {"STARS".split("").map((c, i) => (
          <span key={i} className={i === 0 ? "text-white" : undefined}>
            {c}
          </span>
        ))}
        <span className="ml-1 font-normal">Evaluación ejecutiva</span>
      </span>
    </Link>
  );

  const footer = (
    <div className="mt-auto border-t border-white/10 px-6 py-4 text-xs text-white/60">
      <div className="font-semibold text-white">{name || "Usuario"}</div>
      <div>{ROLE_LABEL[role]}</div>
      <div className="mt-2 flex gap-4">
        <Link href="/auth/clave" className="text-white/80 underline-offset-2 hover:text-white hover:underline">Cambiar contraseña</Link>
        <form action={signOut}>
          <button className="text-white/80 underline-offset-2 hover:text-white hover:underline">Cerrar sesión</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-[264px]">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-navy lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>

      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button className="absolute inset-0 bg-navy/40" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col overflow-y-auto bg-navy">
            <button className="absolute top-5 right-4 text-white/80" onClick={() => setOpen(false)} aria-label="Cerrar menú">
              <X size={20} />
            </button>
            {brand}
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <header className="no-print sticky top-0 z-20 border-b border-rule bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button className="text-navy lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú">
            <Menu size={22} />
          </button>
          <div className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted">Ciclo </span>
            <span className="font-semibold text-navy">{cycleName ?? "sin ciclo activo"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm" title="Dimensiones con evaluación aprobada por el MD">
            <span className="hidden text-muted sm:inline">Evaluaciones aprobadas</span>
            <span className="font-semibold tabular-nums text-navy">
              {completion.approved}/{completion.total}
            </span>
            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-mist sm:block">
              <div className="h-full bg-navy" style={{ width: `${completion.total ? (completion.approved / completion.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      <footer className="mx-auto max-w-[1320px] px-4 pb-8 text-xs text-muted sm:px-6 lg:px-8">{NOT_GMP_NOTICE}</footer>
    </div>
  );
}
