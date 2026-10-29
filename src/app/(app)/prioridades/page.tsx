import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, Meter, PageHeader, Panel, fmtDate } from "@/components/ui";
import { DECISION_LABEL, type DecisionStatus } from "@/lib/domain";
import { getSession } from "@/lib/session";
import { setPriorityStatus } from "./actions";
import { PriorityForm, type PriorityRow } from "./forms";

export const metadata: Metadata = { title: "Prioridades estratégicas" };

const tone = { propuesta: "saline", aprobada: "verde", rechazada: "neutral" } as const;

export default async function PrioridadesPage() {
  const s = await getSession();
  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Prioridades estratégicas" />
        <Empty title="No hay un ciclo de evaluación activo" />
      </>
    );
  }

  const [{ data: prios }, { data: people }, { data: kpis }, { data: actions }] = await Promise.all([
    s.supabase
      .from("strategic_priorities")
      .select("*, responsible:profiles!strategic_priorities_responsible_id_fkey(full_name), kpi:kpis(name)")
      .eq("cycle_id", s.cycle.id)
      .order("status")
      .order("sort_order"),
    s.supabase.from("profiles").select("id, full_name").eq("active", true).neq("role", "lector").order("full_name"),
    s.supabase.from("kpis").select("id, name").eq("active", true).order("name"),
    s.supabase.from("action_items").select("priority_id, progress, status").eq("cycle_id", s.cycle.id),
  ]);

  const list = prios ?? [];
  const approved = list.filter((p) => p.status === "aprobada");
  const proposed = list.filter((p) => p.status === "propuesta");
  const rejected = list.filter((p) => p.status === "rechazada");
  const dimName = (c: string) => s.dimensions.find((d) => d.code === c)?.department_name ?? c;
  const progress = (id: string) => {
    const a = (actions ?? []).filter((x) => x.priority_id === id && x.status !== "cancelada");
    return a.length ? Math.round(a.reduce((t, x) => t + x.progress, 0) / a.length) : null;
  };

  const card = (p: (typeof list)[number]) => {
    const pr = progress(p.id);
    return (
      <article key={p.id} className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
          <div className="min-w-0 max-w-3xl">
            <h3 className="text-[1.02rem] font-semibold">{p.objective}</h3>
            <p className="mt-0.5 text-xs text-muted">
              {p.source === "ia" ? "Propuesta por la IA" : "Definida por el MD"} · {(p.responsible as { full_name: string } | null)?.full_name ?? "sin responsable"} · límite {fmtDate(p.deadline)}
            </p>
          </div>
          <Badge tone={tone[p.status as DecisionStatus]}>{DECISION_LABEL[p.status as DecisionStatus]}</Badge>
        </div>
        <div className="grid gap-x-6 gap-y-3 p-4 text-sm sm:p-5 md:grid-cols-3">
          <Item label="Justificación de negocio">{p.rationale}</Item>
          <Item label="Impacto esperado">{p.expected_impact}</Item>
          <Item label="KPI">{(p.kpi as { name: string } | null)?.name ?? p.kpi_text}</Item>
          <Item label="Línea base → meta">{p.baseline || p.target ? `${p.baseline ?? "—"} → ${p.target ?? "—"}` : null}</Item>
          <Item label="Departamentos de apoyo">{p.supporting_dimensions?.map(dimName).join(", ")}</Item>
          <Item label="Recursos requeridos">{p.resources}</Item>
          <Item label="Riesgos y dependencias">{p.risks_dependencies}</Item>
          {p.decision_note && <Item label="Nota del MD">{p.decision_note}</Item>}
          {p.status === "aprobada" && (
            <div>
              <div className="text-xs text-muted">Avance de acciones vinculadas</div>
              {pr == null ? (
                <Link href="/plan-90-dias" className="text-navy-3 hover:underline">Sin acciones vinculadas</Link>
              ) : (
                <div className="mt-1 flex items-center gap-2"><Meter value={pr} /><span className="tabular-nums">{pr}%</span></div>
              )}
            </div>
          )}
        </div>
        {s.isMd && (
          <details className="border-t border-rule px-4 py-3 sm:px-5">
            <summary className="cursor-pointer text-sm font-semibold text-navy">
              {p.status === "propuesta" ? "Revisar, modificar y decidir" : "Modificar"}
            </summary>
            <div className="mt-4">
              <PriorityForm priority={p as PriorityRow} dimensions={s.dimensions} people={people ?? []} kpis={kpis ?? []} approvedCount={approved.length} />
            </div>
            {p.status === "rechazada" && (
              <form action={setPriorityStatus.bind(null, p.id, "propuesta")} className="mt-3">
                <button className="btn-quiet text-sm">Volver a propuesta</button>
              </form>
            )}
          </details>
        )}
      </article>
    );
  };

  return (
    <>
      <PageHeader
        title="Prioridades estratégicas"
        intro={`Hasta cinco prioridades aprobadas por ciclo. La IA propone; el Director General aprueba, modifica o rechaza. Aprobadas: ${approved.length} de 5.`}
      />

      <h2 className="mb-3 text-lg font-semibold">Aprobadas</h2>
      <div className="mb-8 space-y-4">
        {approved.length ? approved.map(card) : <Empty title="Aún no hay prioridades aprobadas">{s.isMd ? "Revise las propuestas o defina una nueva." : undefined}</Empty>}
      </div>

      {s.isMd && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Propuestas por decidir</h2>
          <div className="mb-8 space-y-4">
            {proposed.length ? proposed.map(card) : <p className="text-sm text-muted">No hay propuestas pendientes. Ejecute el análisis en Evaluación STARS para obtener propuestas de la IA.</p>}
          </div>

          <Panel title="Nueva prioridad" className="mb-8">
            <PriorityForm dimensions={s.dimensions} people={people ?? []} kpis={kpis ?? []} approvedCount={approved.length} />
          </Panel>

          {rejected.length > 0 && (
            <details>
              <summary className="mb-3 cursor-pointer text-lg font-semibold text-navy">Rechazadas ({rejected.length})</summary>
              <div className="space-y-4">{rejected.map(card)}</div>
            </details>
          )}
        </>
      )}
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div>{children}</div>
    </div>
  );
}
