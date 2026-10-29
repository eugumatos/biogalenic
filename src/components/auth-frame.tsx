import type { ReactNode } from "react";
import { STARS, NOT_GMP_NOTICE } from "@/lib/domain";

export function AuthFrame({ title, intro, error, children }: { title: string; intro: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div>
          <div className="text-lg font-bold">Biogalenic</div>
          <div className="text-sm text-white/60">Soluciones parenterales estériles · El Salvador</div>
        </div>
        <div>
          <ol className="mb-10 grid grid-cols-5 border-t border-white/25" aria-label="Escenarios STARS">
            {STARS.map((s) => (
              <li key={s.key} className="border-r border-white/15 px-2 pt-4 pb-1 text-center last:border-r-0">
                <div className="text-5xl font-bold leading-none xl:text-6xl">{s.letter}</div>
                <div className="mt-2 text-xs text-white/70">{s.name}</div>
              </li>
            ))}
          </ol>
          <p className="max-w-md font-serif text-2xl leading-snug text-white/90">
            Diagnosticar antes de transformar. Alinear antes de acelerar. Ejecutar con disciplina. Medir lo que importa.
          </p>
        </div>
        <p className="text-xs text-white/50">{NOT_GMP_NOTICE}</p>
      </section>
      <section className="flex items-center justify-center bg-white px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="text-lg font-bold text-navy">Biogalenic STARS</div>
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 mb-6 text-sm text-muted">{intro}</p>
          {error && <p role="alert" className="mb-4 rounded-[4px] bg-rojo-soft px-3 py-2 text-sm text-rojo">{error}</p>}
          {children}
          <p className="mt-10 text-xs text-muted lg:hidden">{NOT_GMP_NOTICE}</p>
        </div>
      </section>
    </div>
  );
}
