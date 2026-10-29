import type { Metadata } from "next";
import clsx from "clsx";
import { Badge, Empty, Meter, PageHeader, Panel, Stat, fmtDate } from "@/components/ui";
import { ACTION_STATUS_LABEL, PHASES, type ActionStatus } from "@/lib/domain";
import { getSession } from "@/lib/session";
import { cycleDay, isOverdue, phaseProgress } from "@/lib/plan";
import { deleteAction, seedMethodology } from "./actions";
import { ActionForm, ProgressForm, type ActionRow } from "./forms";

export const metadata: Metadata = { title: "Plan de 90 días" };

const statusTone = { pendiente: "neutral", en_curso: "saline", completada: "verde", bloqueada: "rojo", cancelada: "neutral" } as const;

export default async function PlanPage({ searchParams }: PageProps<"/plan-90-dias">) {
  const s = await getSession();
  const sp = await searchParams;
  const mine = sp.mias === "1";
  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Plan de 90 días" />
        <Empty title="No hay un ciclo de evaluación activo" />
      </>
    );
  }

  const [{ data: actions }, { data: people }, { data: prios }] = await Promise.all([
    s.supabase
      .from("action_items")
      .select("*, owner:profiles!action_items_owner_id_fkey(full_name), priority:strategic_priorities(objective)")
      .eq("cycle_id", s.cycle.id)
      .order("deadline", { nullsFirst: false }),
    s.supabase.from("profiles").select("id, full_name").eq("active", true).neq("role", "lector").order("full_name"),
    s.supabase.from("strategic_priorities").select("id, objective").eq("cycle_id", s.cycle.id).eq("status", "aprobada"),
  ]);

  const all = actions ?? [];
  const list = mine ? all.filter((a) => a.owner_id === s.user.id) : all;
  const day = cycleDay(s.cycle.starts_on);
  const overdue = all.filter((a) => isOverdue(a));
  const open = all.filter((a) => a.status !== "completada" && a.status !== "cancelada");
  const overall = phaseProgress(all);

  return (
    <>
      <PageHeader
        title="Plan de 90 días"
        intro={`Inicio ${fmtDate(s.cycle.starts_on)}. ${day < 1 ? "El plan aún no inicia." : day > 90 ? "El periodo de 90 días concluyó." : `Hoy es el día ${day} de 90.`}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={mine ? "/plan-90-dias" : "/plan-90-dias?mias=1"} className="btn btn-secondary">{mine ? "Ver todas" : "Mis acciones"}</a>
            {s.isMd && all.length === 0 && (
              <form action={seedMethodology}><button className="btn btn-secondary">Cargar actividades base</button></form>
            )}
          </div>
        }
      />

      <Panel className="mb-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Avance global" value={overall == null ? "—" : `${overall}%`} />
          <Stat label="Acciones abiertas" value={open.length} />
          <Stat label="Vencidas" value={overdue.length} tone={overdue.length ? "rojo" : undefined} />
          <Stat label="Quick wins completados" value={`${all.filter((a) => a.is_quick_win && a.status === "completada").length}/${all.filter((a) => a.is_quick_win).length}`} />
          <div>
            <div className="text-[0.8rem] text-muted">Tiempo transcurrido</div>
            <div className="mt-2"><Meter value={Math.max(0, Math.min(100, (day / 90) * 100))} label="Días transcurridos" /></div>
            <div className="mt-1 text-xs text-muted tabular-nums">{Math.max(0, Math.min(day, 90))} de 90 días</div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-3">
        {PHASES.map((p) => {
          const items = list.filter((a) => a.phase === p.n);
          const prog = phaseProgress(items);
          const current = day >= (p.n - 1) * 30 + 1 && day <= p.n * 30;
          return (
            <section key={p.n} className={clsx("panel flex flex-col", current && "border-navy")} aria-labelledby={`phase-${p.n}`}>
              <header className={clsx("border-b px-4 py-3", current ? "border-navy bg-navy text-white" : "border-rule")}>
                <div className={clsx("text-xs", current ? "text-white/70" : "text-muted")}>{p.days}{current ? " · fase actual" : ""}</div>
                <h2 id={`phase-${p.n}`} className={clsx("text-base font-semibold", current && "text-white")}>{p.name}</h2>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="flex-1"><Meter value={prog ?? 0} tone={current ? "verde" : "navy"} label={`Avance fase ${p.n}`} /></div>
                  <span className="tabular-nums">{prog == null ? "—" : `${prog}%`}</span>
                </div>
              </header>
              <ul className="flex-1 divide-y divide-mist">
                {items.length === 0 && <li className="px-4 py-4 text-sm text-muted">Sin acciones en esta fase.</li>}
                {items.map((a) => {
                  const late = isOverdue(a);
                  const canProgress = s.isMd || a.owner_id === s.user.id;
                  return (
                    <li key={a.id} className={clsx("px-4 py-3", late && "border-l-4 border-l-rojo")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium leading-snug">{a.title}</div>
                          <div className="mt-0.5 text-xs text-muted">
                            {(a.owner as { full_name: string } | null)?.full_name ?? "Sin responsable"} ·{" "}
                            <span className={late ? "font-semibold text-rojo" : undefined}>{fmtDate(a.deadline)}{late ? " · vencida" : ""}</span>
                          </div>
                        </div>
                        <Badge tone={statusTone[a.status as ActionStatus]}>{ACTION_STATUS_LABEL[a.status as ActionStatus]}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <div className="flex-1"><Meter value={a.progress} tone={a.status === "completada" ? "verde" : "navy"} label="Avance" /></div>
                        <span className="tabular-nums">{a.progress}%</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {a.is_quick_win && <Badge tone="saline">Quick win</Badge>}
                        {a.priority && <Badge>{(a.priority as { objective: string }).objective.slice(0, 48)}…</Badge>}
                      </div>
                      {(a.kpi_text || a.target || a.comments || a.completion_evidence || canProgress || s.isMd) && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm text-navy-3 hover:underline">Detalle{canProgress ? " y avance" : ""}</summary>
                          <div className="mt-2 space-y-3 text-sm">
                            {a.description && <p>{a.description}</p>}
                            {(a.kpi_text || a.target) && <p><span className="text-muted">KPI:</span> {a.kpi_text ?? "—"} · <span className="text-muted">Meta:</span> {a.target ?? "—"}</p>}
                            {a.comments && <p><span className="text-muted">Comentarios:</span> {a.comments}</p>}
                            {a.completion_evidence && <p><span className="text-muted">Evidencia:</span> {a.completion_evidence}</p>}
                            {canProgress && <div className="rounded-[4px] bg-mist-2 p-3"><ProgressForm action={a as ActionRow} /></div>}
                            {s.isMd && (
                              <details>
                                <summary className="cursor-pointer text-sm font-semibold text-navy">Redefinir acción</summary>
                                <div className="mt-3"><ActionForm action={a as ActionRow} people={people ?? []} priorities={prios ?? []} /></div>
                                <form action={deleteAction.bind(null, a.id)} className="mt-2"><button className="btn-quiet text-sm text-muted">Eliminar acción</button></form>
                              </details>
                            )}
                          </div>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
              {s.isMd && (
                <details className="border-t border-rule px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold text-navy">Agregar acción</summary>
                  <div className="mt-3"><ActionForm people={people ?? []} priorities={prios ?? []} defaultPhase={p.n} /></div>
                </details>
              )}
              <footer className="border-t border-rule px-4 py-2 text-xs text-muted">Enfoque: {p.focus.join(" · ")}</footer>
            </section>
          );
        })}
      </div>
    </>
  );
}
