import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Empty, PageHeader, Panel, Stat, fmtDate, levelTone } from "@/components/ui";
import { Heatmap } from "@/components/heatmap";
import { ESCALATION_LABEL, LEVEL_LABEL, RISK_STATUS_LABEL, type EscalationCategory, type RiskStatus } from "@/lib/domain";
import { CRITICALITY_RULE, ESCALATION_RULE, riskCriticality } from "@/lib/risk";
import { getSession } from "@/lib/session";
import { deleteRisk } from "./actions";
import { RiskEditor, type RiskRow } from "./forms";

export const metadata: Metadata = { title: "Gestión de riesgos" };

export default async function RiesgosPage({ searchParams }: PageProps<"/riesgos">) {
  const s = await getSession();
  const sp = await searchParams;
  const f = {
    dim: typeof sp.dim === "string" ? sp.dim : "",
    estado: typeof sp.estado === "string" ? sp.estado : "activos",
    q: typeof sp.q === "string" ? sp.q : "",
    p: typeof sp.p === "string" ? Number(sp.p) : null,
    i: typeof sp.i === "string" ? Number(sp.i) : null,
  };

  if (!s.cycle) {
    return (
      <>
        <PageHeader title="Gestión de riesgos" />
        <Empty title="No hay un ciclo de evaluación activo" />
      </>
    );
  }

  const [{ data: all }, { data: people }] = await Promise.all([
    s.supabase
      .from("risks")
      .select("*, owner:profiles!risks_owner_id_fkey(full_name)")
      .eq("cycle_id", s.cycle.id)
      .order("escalated", { ascending: false })
      .order("score", { ascending: false }),
    s.supabase.from("profiles").select("id, full_name").eq("active", true).neq("role", "lector").order("full_name"),
  ]);
  const risks = all ?? [];
  const open = risks.filter((r) => r.status !== "cerrado");
  const escalated = open.filter((r) => r.escalated);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = open.filter((r) => r.due_date && r.due_date < today);

  const rows = risks.filter(
    (r) =>
      (!f.dim || r.dimension_code === f.dim) &&
      (f.estado === "todos" || (f.estado === "activos" ? r.status !== "cerrado" : r.status === f.estado)) &&
      (!f.q || r.description.toLowerCase().includes(f.q.toLowerCase())) &&
      (f.p == null || r.probability === f.p) &&
      (f.i == null || r.impact === f.i),
  );
  const canCreate = s.isMd || s.managedCodes.length > 0;
  const editableDims = s.dimensions.filter((d) => s.canEditDimension(d.code));
  const dimName = (c: string) => s.dimensions.find((d) => d.code === c)?.department_name ?? c;

  return (
    <>
      <PageHeader
        title="Gestión de riesgos"
        intro="Registro de riesgos del ciclo. Puntaje = probabilidad × impacto. Los riesgos críticos farmacéuticos se escalan siempre, sin importar el promedio del área."
        actions={canCreate ? <RiskEditor dimensions={editableDims} people={people ?? []} label="Registrar riesgo" /> : undefined}
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Resumen">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Stat label="Riesgos activos" value={open.length} />
            <Stat label="Escalados al MD" value={escalated.length} tone={escalated.length ? "rojo" : undefined} />
            <Stat label="Críticos (≥15)" value={open.filter((r) => r.score >= 15).length} tone={open.some((r) => r.score >= 15) ? "rojo" : undefined} />
            <Stat label="Mitigación vencida" value={overdue.length} tone={overdue.length ? "ambar" : undefined} />
          </div>
          <div className="mt-5 space-y-1 text-xs text-muted">
            <p>{CRITICALITY_RULE}</p>
            <p>{ESCALATION_RULE}</p>
          </div>
        </Panel>
        <Panel title="Mapa de calor" aside="Riesgos activos">
          <Heatmap risks={open} hrefBase={`/riesgos?estado=activos${f.dim ? `&dim=${f.dim}` : ""}`} />
        </Panel>
      </div>

      <form className="no-print mb-3 flex flex-wrap items-end gap-3" role="search">
        <div>
          <label className="field-label" htmlFor="f-dim">Departamento</label>
          <select id="f-dim" name="dim" className="input" defaultValue={f.dim}>
            <option value="">Todos</option>
            {s.dimensions.map((d) => <option key={d.code} value={d.code}>{d.department_name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="f-estado">Estado</label>
          <select id="f-estado" name="estado" className="input" defaultValue={f.estado}>
            <option value="activos">Activos</option>
            <option value="todos">Todos</option>
            {Object.entries(RISK_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="min-w-48 flex-1">
          <label className="field-label" htmlFor="f-q">Buscar</label>
          <input id="f-q" name="q" className="input" defaultValue={f.q} placeholder="Texto en la descripción" />
        </div>
        <button className="btn btn-secondary">Filtrar</button>
        {(f.dim || f.q || f.p || f.estado !== "activos") && <Link href="/riesgos" className="btn-quiet text-sm">Limpiar filtros</Link>}
        {f.p && f.i && <span className="text-sm text-muted">Celda P{f.p} × I{f.i}</span>}
      </form>

      {rows.length === 0 ? (
        <Empty title={risks.length ? "Ningún riesgo coincide con el filtro" : "Aún no hay riesgos registrados"}>
          {risks.length ? "Ajuste o limpie los filtros." : "Registre los riesgos identificados durante el diagnóstico."}
        </Empty>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="table min-w-[1000px]">
            <thead>
              <tr>
                <th>Riesgo</th>
                <th>Departamento</th>
                <th className="text-center">P</th>
                <th className="text-center">I</th>
                <th>Puntaje</th>
                <th>Controles y mitigación</th>
                <th>Responsable</th>
                <th>Compromiso</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const crit = riskCriticality(r.score);
                const late = r.status !== "cerrado" && r.due_date && r.due_date < today;
                return (
                  <tr key={r.id} className={r.escalated && r.status !== "cerrado" ? "[&>td:first-child]:border-l-4 [&>td:first-child]:border-l-rojo" : undefined}>
                    <td className="max-w-[300px]">
                      <div className="font-medium">{r.description}</div>
                      {r.escalation_category && (
                        <div className={`mt-0.5 text-xs ${r.escalated ? "font-semibold text-rojo" : "text-muted"}`}>
                          {ESCALATION_LABEL[r.escalation_category as EscalationCategory]}
                          {r.escalated ? " · escalado al MD" : ""}
                        </div>
                      )}
                    </td>
                    <td>{dimName(r.dimension_code)}</td>
                    <td className="text-center tabular-nums">{r.probability}</td>
                    <td className="text-center tabular-nums">{r.impact}</td>
                    <td><Badge tone={levelTone(crit)}>{r.score} · {LEVEL_LABEL[crit]}</Badge></td>
                    <td className="max-w-[280px] text-xs">
                      {r.existing_controls && <p><span className="text-muted">Controles:</span> {r.existing_controls}</p>}
                      {r.mitigation && <p className="mt-1"><span className="text-muted">Mitigación:</span> {r.mitigation}</p>}
                    </td>
                    <td>{(r.owner as { full_name: string } | null)?.full_name ?? "—"}</td>
                    <td className={`whitespace-nowrap ${late ? "font-semibold text-ambar" : ""}`}>{fmtDate(r.due_date)}{late ? " · vencido" : ""}</td>
                    <td>{RISK_STATUS_LABEL[r.status as RiskStatus]}</td>
                    <td className="whitespace-nowrap text-right">
                      {s.canEditDimension(r.dimension_code) && (
                        <RiskEditor risk={r as RiskRow} dimensions={editableDims} people={people ?? []} />
                      )}
                      {s.isMd && (
                        <form action={deleteRisk.bind(null, r.id)} className="inline">
                          <button className="btn-quiet text-sm text-muted">Eliminar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
